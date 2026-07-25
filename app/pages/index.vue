<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import type { Flashcard, QuizOption, Story } from '~/types'
import { GameState } from '~/types'

// Composables
const {
  deck,
  stories,
  isSyncing,
  isDbActive,
  loadData,
  addCard,
  editCard,
  deleteCard,
  syncStats,
  batchAddCards,
  addStory,
  editStory,
  deleteStory
} = useDeck()

const { playCorrect, playWrong } = useAudio()

// Local storage helper
const getLocalStorageItem = (key: string, defaultValue: any) => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const saved = localStorage.getItem(key);
    if (saved === null) return defaultValue;
    if (typeof defaultValue === 'number') return parseInt(saved, 10);
    if (typeof defaultValue === 'boolean') return saved === 'true';
    if (Array.isArray(defaultValue)) return JSON.parse(saved);
    return saved;
  } catch {
    return defaultValue;
  }
}

const setLocalStorageItem = (key: string, value: any) => {
  if (typeof window === 'undefined') return;
  try {
    if (typeof value === 'object') {
      localStorage.setItem(key, JSON.stringify(value));
    } else {
      localStorage.setItem(key, String(value));
    }
  } catch {}
}

// Settings States
const masteryThreshold = ref(getLocalStorageItem('mastery_threshold', 5))
const isRandomOrder = ref(getLocalStorageItem('random_order', false))
const isSoundEnabled = ref(getLocalStorageItem('sound_enabled', true))
const hskFilters = ref<number[]>(getLocalStorageItem('hsk_filters', []))
const categoryFilters = ref<string[]>(getLocalStorageItem('category_filters', []))
const roundLength = ref(getLocalStorageItem('round_length', 30))
const reviewRatio = ref(getLocalStorageItem('review_ratio', 60))

// Watchers to update local storage
watch(masteryThreshold, (val) => setLocalStorageItem('mastery_threshold', val))
watch(isRandomOrder, (val) => setLocalStorageItem('random_order', val))
watch(isSoundEnabled, (val) => setLocalStorageItem('sound_enabled', val))
watch(hskFilters, (val) => setLocalStorageItem('hsk_filters', val), { deep: true })
watch(categoryFilters, (val) => setLocalStorageItem('category_filters', val), { deep: true })
watch(roundLength, (val) => setLocalStorageItem('round_length', val))
watch(reviewRatio, (val) => setLocalStorageItem('review_ratio', val))

// Game States
type ViewState = 'LANDING' | 'GAME' | 'LIST' | 'STORIES'
type QuizPhase = 'DEFINITION' | 'PINYIN'

const view = ref<ViewState>('LANDING')
const phase = ref<QuizPhase>('DEFINITION')
const score = ref(0)
const mistakes = ref(0)
const currentCardIndex = ref(0)
const cardsPlayedInRound = ref(0)

const activeDeck = ref<Flashcard[]>([])
const selectedOptionIndex = ref<number | null>(null)
const isTransitioning = ref(false)
const clickLock = ref(false)

const modifiedIndices = ref<Set<number>>(new Set())
const isExpanding = ref(false)

// Modal states
const showSettings = ref(false)
const showCloudPanel = ref(false)
const showImportModal = ref(false)
const showRoundOver = ref(false)

// Selectors
const dueCardsCount = computed(() => {
  const now = Date.now();
  return deck.value.filter(c => {
    if (!c.srsNextDueDate) return true;
    return new Date(c.srsNextDueDate).getTime() <= now;
  }).length;
})

const masteredCardsCount = computed(() => {
  return deck.value.filter(c => c.knowledgeStatus === 100).length;
})

const averageMastery = computed(() => {
  if (deck.value.length === 0) return 0;
  const sum = deck.value.reduce((acc, c) => acc + (c.knowledgeStatus || 0), 0);
  return Math.round(sum / deck.value.length);
})

const allCategories = computed(() => {
  const cats = new Set<string>()
  deck.value.forEach(c => {
    if (c.category) {
      c.category.split(',').forEach(cat => {
        const trimmed = cat.trim()
        if (trimmed) cats.add(trimmed)
      })
    }
  })
  return Array.from(cats).sort()
})

const progress = computed(() => {
  if (activeDeck.value.length === 0) return 100;
  return Math.round((currentCardIndex.value / activeDeck.value.length) * 100);
})

// Current game card
const currentCard = computed(() => {
  return activeDeck.value[currentCardIndex.value] || activeDeck.value[0] || null;
})

// Multiple Choice Shuffler helper
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Current options
const currentOptions = computed<QuizOption[]>(() => {
  if (!currentCard.value || deck.value.length < 4) return [];
  const isPinyinPhase = phase.value === 'PINYIN';
  const targetValue = isPinyinPhase ? currentCard.value.pinyin : currentCard.value.definition;
  
  const correctOption: QuizOption = {
    definition: targetValue || "???",
    isCorrect: true,
    originalCard: currentCard.value
  };

  const distractorsPool = deck.value.filter(c => c._originalIndex !== currentCard.value?._originalIndex);
  const shuffledDistractors = shuffle(distractorsPool).slice(0, 3);
  const distractorOptions: QuizOption[] = shuffledDistractors.map((d: Flashcard) => ({
      definition: (isPinyinPhase ? d.pinyin : d.definition) || "???",
      isCorrect: false,
      originalCard: d
  }));
  return shuffle([correctOption, ...distractorOptions]);
})

// Loading on Mount
const isDataLoading = ref(true)
onMounted(async () => {
  isDataLoading.value = true;
  await loadData();
  isDataLoading.value = false;
})

// Round Generator
const generateRoundDeck = () => {
  if (deck.value.length === 0) {
    activeDeck.value = [];
    return;
  }

  let filtered = deck.value;
  if (hskFilters.value.length > 0) {
    filtered = filtered.filter(c => hskFilters.value.includes(c.hskLevel || 1));
  }
  if (categoryFilters.value.length > 0) {
    filtered = filtered.filter(c => {
      if (!c.category) return false;
      const cardCats = c.category.split(',').map(cat => cat.trim());
      return cardCats.some(cat => categoryFilters.value.includes(cat));
    });
  }

  const now = Date.now();

  // 1. Due Cards: cards scheduled for review now or in the past
  const dueCards = filtered.filter(c => {
    if (!c.srsNextDueDate) return true;
    return new Date(c.srsNextDueDate).getTime() <= now;
  });

  // 2. New Cards: cards that have never been reviewed yet and are not in dueCards
  const newCards = filtered.filter(c => {
    const isNew = !c.srsLastReviewedDate || (c.srsRepetitions || 0) === 0;
    return isNew && !dueCards.some(d => d.id === c.id);
  });

  // 3. Future Cards: cards scheduled in the future
  const futureCards = filtered.filter(c => {
    return !dueCards.some(d => d.id === c.id) && !newCards.some(n => n.id === c.id);
  });

  // Sort future cards by earliest due date so we study the ones closest to review if needed
  futureCards.sort((a, b) => {
    const timeA = a.srsNextDueDate ? new Date(a.srsNextDueDate).getTime() : Infinity;
    const timeB = b.srsNextDueDate ? new Date(b.srsNextDueDate).getTime() : Infinity;
    return timeA - timeB;
  });

  // Pick cards based on SRS priority: Due -> New -> Future (overstudy)
  let combinedDeck: Flashcard[] = [...dueCards];

  if (combinedDeck.length < roundLength.value) {
    const neededNew = roundLength.value - combinedDeck.length;
    const selectedNew = shuffle(newCards).slice(0, neededNew);
    combinedDeck = [...combinedDeck, ...selectedNew];
  }

  if (combinedDeck.length < roundLength.value) {
    const neededFuture = roundLength.value - combinedDeck.length;
    const selectedFuture = futureCards.slice(0, neededFuture);
    combinedDeck = [...combinedDeck, ...selectedFuture];
  }

  // Limit to roundLength
  combinedDeck = combinedDeck.slice(0, roundLength.value);

  activeDeck.value = isRandomOrder.value ? shuffle(combinedDeck) : combinedDeck;
  currentCardIndex.value = 0;
  cardsPlayedInRound.value = 0;
}

// Option selection handler
const handleOptionClick = (option: QuizOption, index: number) => {
  if (clickLock.value || isTransitioning.value || !currentCard.value) return;

  clickLock.value = true;
  isTransitioning.value = true;
  selectedOptionIndex.value = index;
  
  const isCorrect = option.isCorrect;

  if (isSoundEnabled.value) {
      if (isCorrect) playCorrect();
      else playWrong();
  }

  setTimeout(async () => {
      const hasPinyin = !!currentCard.value.pinyin;
      const cardFinishedCorrectly = isCorrect && (phase.value === 'PINYIN' || !hasPinyin);

      // Track modified card index
      if (currentCard.value._originalIndex !== undefined) {
        modifiedIndices.value.add(currentCard.value._originalIndex);
      }

      const nextDeck = deck.value.map(card => {
          if (card._originalIndex === currentCard.value?._originalIndex) {
              if (cardFinishedCorrectly || !isCorrect) {
                  const srsUpdates = calculateSRS(card, cardFinishedCorrectly);
                  return {
                      ...card,
                      ...srsUpdates
                  };
              }
          }
          return card;
      });

      deck.value = nextDeck;

      if (isCorrect) {
          if (phase.value === 'DEFINITION' && hasPinyin) {
              phase.value = 'PINYIN';
          } else {
              score.value += 1;
              phase.value = 'DEFINITION'; 
              currentCardIndex.value += 1;
          }
      } else {
          mistakes.value += 1;
          phase.value = 'DEFINITION';
          currentCardIndex.value += 1;
      }

      if (cardFinishedCorrectly || !isCorrect) {
          const nextRoundCount = cardsPlayedInRound.value + 1;
          cardsPlayedInRound.value = nextRoundCount;

          if (nextRoundCount >= activeDeck.value.length) {
              showRoundOver.value = true;
              if (isDbActive.value) {
                // Pass only cards modified in this session
                const practicedCards = nextDeck.filter(c => 
                  c._originalIndex !== undefined && modifiedIndices.value.has(c._originalIndex)
                );
                await syncStats(practicedCards);
              }
          }
      }

      isTransitioning.value = false;
      selectedOptionIndex.value = null;
      clickLock.value = false;
  }, 600);
}

// Restart game
const handleRestart = () => {
  mistakes.value = 0;
  score.value = 0;
  currentCardIndex.value = 0;
  cardsPlayedInRound.value = 0;
  phase.value = 'DEFINITION';
  selectedOptionIndex.value = null;
  isTransitioning.value = false;
  clickLock.value = false;
  generateRoundDeck();
  modifiedIndices.value.clear();
}

const handleNextRound = () => {
  showRoundOver.value = false;
  generateRoundDeck();
}

// AI Expansion Booster handler
const handleStartAiExpansion = async () => {
  isExpanding.value = true;
  try {
    const knownWords = deck.value
      .filter(c => (c.knowledgeStatus || 0) >= 75 && (c.type || 'word') === 'word')
      .map(c => c.hanzi);
    
    const targetHsk = hskFilters.value.length > 0 ? Math.min(...hskFilters.value) : 1;
    const category = categoryFilters.value.length > 0 ? categoryFilters.value[0] : "Booster IA";
    
    console.log("Generating smart vocabulary expansion with Gemini endpoint...");
    
    // Call secure backend endpoint
    const newCards = await $fetch<Flashcard[]>('/api/expand', {
      method: 'POST',
      body: { knownWords, targetHsk, category }
    });
    
    if (newCards && newCards.length > 0) {
      await batchAddCards(newCards);
      
      const wordsCount = newCards.filter(c => c.type === 'word').length;
      const sentsCount = newCards.filter(c => c.type === 'sentence').length;
      alert(`¡Expansión generada con éxito! Se añadieron ${wordsCount} palabras y ${sentsCount} oraciones nuevas.`);
    } else {
      alert("No se pudieron generar nuevas tarjetas.");
    }
  } catch (e) {
    console.error("AI Expansion Error:", e);
    alert("Hubo un error al generar la expansión de vocabulario con IA.");
  } finally {
    isExpanding.value = false;
  }
}

// Individual word generation
const handleAIAddCard = async (word: string) => {
  try {
    const generatedCard = await $fetch<Flashcard>('/api/translate', {
      method: 'POST',
      body: { word }
    });
    if (generatedCard) {
      await addCard(generatedCard);
    }
  } catch (err) {
    console.error("Failed to add AI card:", err);
    alert("Error generating card.");
  }
}

// Config save handler
const handleSaveSettings = (threshold: number, newIsRandom: boolean, newIsSoundEnabled: boolean, newHskLevels: number[], newRoundLength: number, newReviewRatio: number, newCategoryFilters: string[]) => {
  masteryThreshold.value = threshold;
  isRandomOrder.value = newIsRandom;
  isSoundEnabled.value = newIsSoundEnabled;
  hskFilters.value = newHskLevels;
  categoryFilters.value = newCategoryFilters;
  roundLength.value = newRoundLength;
  reviewRatio.value = newReviewRatio;
  
  cardsPlayedInRound.value = 0;
  
  setTimeout(() => {
      if (view.value === 'GAME') handleRestart();
  }, 0);
  showSettings.value = false;
}
</script>

<template>
  <div class="h-screen w-screen bg-slate-900 text-slate-100 overflow-hidden font-sans">
    
    <!-- Loading screen -->
    <div v-if="isDataLoading" class="h-screen w-screen flex items-center justify-center bg-slate-900 text-white">
      <div class="flex flex-col items-center gap-4">
        <span class="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
        <p>Loading your deck...</p>
      </div>
    </div>

    <!-- Active Views -->
    <template v-else>
      <LandingPage
        v-if="view === 'LANDING'"
        :totalCards="deck.length"
        :dueCardsCount="dueCardsCount"
        :masteredCardsCount="masteredCardsCount"
        :averageMastery="averageMastery"
        :isExpanding="isExpanding"
        @startQuiz="generateRoundDeck(); view = 'GAME';"
        @openDictionary="view = 'LIST'"
        @openSettings="showSettings = true"
        @openCloud="showCloudPanel = true"
        @openStories="view = 'STORIES'"
        @startAiExpansion="handleStartAiExpansion"
      />

      <CharacterList
        v-if="view === 'LIST'"
        :deck="deck"
        @back="view = 'LANDING'"
        @addCard="addCard"
        @editCard="editCard"
        @deleteCard="deleteCard"
        @aiAddCard="handleAIAddCard"
      />

      <StorySection
        v-if="view === 'STORIES'"
        :stories="stories"
        @back="view = 'LANDING'"
        @addStory="addStory"
        @editStory="editStory"
        @deleteStory="deleteStory"
      />

      <div v-if="view === 'GAME'" class="h-screen w-screen flex flex-col bg-slate-900 text-slate-900 overflow-hidden font-sans relative">
        <!-- Quiz Header -->
        <div class="absolute top-0 left-0 w-full z-20 px-6 py-4 flex justify-between items-center pointer-events-none">
          <div class="flex flex-col">
             <h2 class="text-sm font-bold text-slate-400 tracking-wider uppercase">Mandarin Flash</h2>
             <span class="text-xs text-slate-300">
               {{ activeDeck.length > 0 ? currentCardIndex + 1 : 0 }} / {{ activeDeck.length }} 
               <span v-if="activeDeck.length !== deck.length">(of {{ deck.length }})</span>
             </span>
          </div>
          <div class="flex items-center gap-3">
            <div class="flex items-center space-x-2 animate-fade-in bg-slate-900/50 px-3 py-1.5 rounded-full backdrop-blur-sm border border-slate-700/50">
               <span class="text-green-400 font-bold text-lg">✓</span>
               <span class="text-slate-100 font-bold font-mono min-w-[1.5ch] text-center">{{ score }}</span>
            </div>
            <div class="flex items-center space-x-2 animate-fade-in bg-slate-900/50 px-3 py-1.5 rounded-full backdrop-blur-sm border border-slate-700/50">
               <span class="text-red-500 font-bold text-lg">✗</span>
               <span class="text-slate-100 font-bold font-mono min-w-[1.5ch] text-center">{{ mistakes }}</span>
            </div>
          </div>
          <div class="pointer-events-auto flex items-center gap-2">
               <Button variant="ghost" @click="view = 'LANDING'" class="bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 shadow-sm backdrop-blur-md" title="Terminar Quiz">
                  Terminar
               </Button>
          </div>
        </div>

        <div class="absolute top-0 left-0 w-full h-1 bg-slate-800 z-30">
          <div class="h-full bg-indigo-500 transition-all duration-300 ease-out" :style="{ width: `${progress}%` }" />
        </div>

        <!-- Quiz Gameplay -->
        <main class="flex-1 flex flex-col h-full relative">
          <div v-if="activeDeck.length === 0" class="h-full w-full flex flex-col items-center justify-center bg-slate-900 text-white p-6 animate-fade-in">
             <div class="text-6xl mb-4">🎉</div>
             <h1 class="text-4xl md:text-5xl font-serif text-slate-100 mb-4 text-center">
                 {{ hskFilters.length > 0 ? "Levels Complete!" : "All Mastered!" }}
             </h1>
             <p class="text-slate-400 text-center max-w-md mb-8">
               {{ hskFilters.length > 0 
                  ? `You have finished all available cards for HSK Levels: ${hskFilters.join(', ')}.` 
                  : `You have mastered all characters in the current deck based on your threshold settings.`
               }}
             </p>
             <div class="flex gap-4">
               <Button @click="view = 'LANDING'" variant="secondary">Inicio</Button>
             </div>
          </div>
          
          <template v-else-if="currentCard">
            <TopHalf 
              :card="currentCard" 
              :isAnimating="isTransitioning && selectedOptionIndex === null" 
              :showPinyin="false" 
              :instruction="phase === 'DEFINITION' ? 'Select Meaning' : 'Select Pinyin'" 
            />
            <BottomHalf 
              :options="currentOptions" 
              @optionClick="handleOptionClick" 
              :disabled="isTransitioning" 
              :selectedOptionIndex="selectedOptionIndex" 
              :showFeedback="isTransitioning" 
            />
          </template>
        </main>
      </div>

      <!-- Modals -->
      <SettingsModal 
        v-if="showSettings" 
        :currentThreshold="masteryThreshold"
        :currentIsRandom="isRandomOrder"
        :currentSoundEnabled="isSoundEnabled"
        :currentHskLevels="hskFilters"
        :currentRoundLength="roundLength"
        :currentReviewRatio="reviewRatio"
        :currentCategoryFilters="categoryFilters"
        :allCategories="allCategories"
        @save="handleSaveSettings"
        @cancel="showSettings = false"
        @openImport="showSettings = false; showImportModal = true;"
      />

      <ImportDeckModal
        v-if="showImportModal"
        :existingDeck="deck"
        @import="batchAddCards"
        @cancel="showImportModal = false"
      />

      <CloudPanel
        v-if="showCloudPanel"
        :isSyncing="isSyncing"
        @sync="syncStats(deck.filter(c => c._originalIndex !== undefined && modifiedIndices.has(c._originalIndex)))"
        @cancel="showCloudPanel = false"
      />

      <RoundOver
        v-if="showRoundOver"
        :roundLength="roundLength"
        :isSyncing="isSyncing"
        @nextRound="handleNextRound"
        @goHome="showRoundOver = false; view = 'LANDING';"
      />
    </template>
  </div>
</template>
