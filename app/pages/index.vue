<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import type { Flashcard, QuizOption, Story } from '~/types'
import { GameState } from '~/types'

// Composables
const {
  decks,
  activeDeckId,
  activeDeck: currentActiveDeck,
  activeLanguage,
  currentLanguageDecks,
  currentLanguageCards,
  sessionCards,
  selectedReviewDeckIds,
  setSelectedReviewDeckIds,
  sessionScopeDescription,
  currentDeckCards,
  deck,
  stories,
  isSyncing,
  isDbActive,
  loadData,
  createDeck,
  editDeck,
  deleteDeck,
  setActiveDeck,
  setActiveLanguage,
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
const { stripToneMarks, extractCardTones, getSyllableDistractors, TONE_LABELS } = usePinyin()
const {
  streak,
  activeStreak,
  isStudiedToday,
  dailyWordGoal,
  todayUniqueWordsCount,
  todayCorrectUniqueWordsCount,
  yesterdayUniqueWordsCount,
  todaySessionsCount,
  yesterdaySessionsCount,
  dailyGoalProgress,
  isDailyGoalMet,
  todayStartingMastery,
  initDailyStartingMastery,
  setDailyWordGoal,
  seedTodayWordsFromCards,
  loadMetrics,
  recordAnswers,
  recordCompletedSession
} = useMetrics()

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
type ViewState = 'LANDING' | 'GAME' | 'LIST' | 'STORIES' | 'REINFORCE'
type QuizPhase = 'DEFINITION' | 'TONE' | 'PINYIN'

const view = ref<ViewState>('LANDING')
const phase = ref<QuizPhase>('DEFINITION')
const toneCharIndex = ref(0)
const pinyinCharIndex = ref(0)
const score = ref(0)
const mistakes = ref(0)
const currentCardIndex = ref(0)
const cardsPlayedInRound = ref(0)
const roundFailedCards = ref<Flashcard[]>([])

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
const showDeckManagerModal = ref(false)
const showRoundOver = ref(false)
const showFeedbackModal = ref(false)
const showMetricsModal = ref(false)
const failedCard = ref<Flashcard | null>(null)
const failedPhase = ref<QuizPhase>('DEFINITION')
const quickEditCard = ref<Flashcard | null>(null)

// Selectors
const dueCardsCount = computed(() => {
  const now = Date.now();
  return currentDeckCards.value.filter(c => {
    if (!c.srsNextDueDate) return true;
    return new Date(c.srsNextDueDate).getTime() <= now;
  }).length;
})

const failedCardsCount = computed(() => {
  return currentDeckCards.value.filter(c => (c.wrongCount || 0) > 0).length;
})

const masteredCardsCount = computed(() => {
  return currentDeckCards.value.filter(c => c.knowledgeStatus === 100).length;
})

const averageMastery = computed(() => {
  if (currentDeckCards.value.length === 0) return 0;
  const sum = currentDeckCards.value.reduce((acc, c) => acc + (c.knowledgeStatus || 0), 0);
  return Math.round(sum / currentDeckCards.value.length);
})

const allCategories = computed(() => {
  const cats = new Set<string>()
  currentDeckCards.value.forEach(c => {
    if (c.category) {
      c.category.split(',').forEach(cat => {
        const trimmed = cat.trim()
        if (trimmed) cats.add(trimmed)
      })
    }
  })
  return Array.from(cats).sort()
})

const handleBatchImport = async (cards: Flashcard[], targetDeckId?: string) => {
  await batchAddCards(cards, targetDeckId);
  showImportModal.value = false;
  alert(`¡Se importaron ${cards.length} tarjetas con éxito!`);
}

const progress = computed(() => {
  if (activeDeck.value.length === 0) return 100;
  return Math.round((currentCardIndex.value / activeDeck.value.length) * 100);
})

// Current game card
const currentCard = computed(() => {
  return activeDeck.value[currentCardIndex.value] || activeDeck.value[0] || null;
})

const currentCardTones = computed(() => {
  if (!currentCard.value) return [];
  return extractCardTones(currentCard.value.hanzi, currentCard.value.pinyin);
})

const currentPinyinReminderTone = computed<number | null>(() => {
  if (phase.value !== 'PINYIN' || !currentCard.value || currentCard.value.type === 'sentence') {
    return null;
  }
  if (currentCardTones.value.length === 0) return null;
  return currentCardTones.value[pinyinCharIndex.value]?.tone ?? null;
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

  if (phase.value === 'TONE') {
    const targetTone = currentCardTones.value[toneCharIndex.value]?.tone || 1;
    const distractorTones = shuffle([1, 2, 3, 4, 5].filter(t => t !== targetTone)).slice(0, 3);
    const selectedTones = [targetTone, ...distractorTones].sort((a, b) => a - b);

    return selectedTones.map((toneNum) => ({
      definition: TONE_LABELS[toneNum] || `${toneNum}° Tono`,
      isCorrect: toneNum === targetTone,
      originalCard: currentCard.value!,
      tone: toneNum
    }));
  }

  if (phase.value === 'PINYIN') {
    if (currentCardTones.value.length > 0 && currentCard.value.type !== 'sentence') {
      const targetCharObj = currentCardTones.value[pinyinCharIndex.value];
      const targetSyllable = (targetCharObj?.cleanSyllable || stripToneMarks(targetCharObj?.syllable) || '').toLowerCase();

      const correctOption: QuizOption = {
        definition: targetSyllable || "???",
        isCorrect: true,
        originalCard: currentCard.value
      };

      const distractorSyllables = getSyllableDistractors(targetSyllable, currentLanguageCards.value, 3);
      const distractorOptions: QuizOption[] = distractorSyllables.map((syl) => ({
        definition: syl,
        isCorrect: false,
        originalCard: currentCard.value!
      }));

      return shuffle([correctOption, ...distractorOptions]);
    }
  }

  const isPinyinPhase = phase.value === 'PINYIN';
  const targetValue = isPinyinPhase
    ? stripToneMarks(currentCard.value.pinyin)
    : currentCard.value.definition;
  
  const correctOption: QuizOption = {
    definition: targetValue || "???",
    isCorrect: true,
    originalCard: currentCard.value
  };

  const distractorsPool = currentLanguageCards.value.filter(c => {
    if (c._originalIndex === currentCard.value?._originalIndex) return false;
    if (isPinyinPhase) {
      return stripToneMarks(c.pinyin) !== targetValue;
    }
    return c.definition !== targetValue;
  });

  const shuffledDistractors = shuffle(distractorsPool).slice(0, 3);
  const distractorOptions: QuizOption[] = shuffledDistractors.map((d: Flashcard) => ({
      definition: (isPinyinPhase ? stripToneMarks(d.pinyin) : d.definition) || "???",
      isCorrect: false,
      originalCard: d
  }));
  return shuffle([correctOption, ...distractorOptions]);
})

// Loading on Mount
const isDataLoading = ref(true)
onMounted(async () => {
  isDataLoading.value = true;
  await Promise.all([loadData(), loadMetrics()]);
  seedTodayWordsFromCards(deck.value, activeLanguage.value);
  if (averageMastery.value > 0) {
    await initDailyStartingMastery(averageMastery.value, activeLanguage.value);
  }
  isDataLoading.value = false;
})

watch(averageMastery, (val) => {
  if (val > 0 && !isDataLoading.value) {
    initDailyStartingMastery(val, activeLanguage.value);
  }
})

// Round Generator
const generateRoundDeck = () => {
  roundFailedCards.value = [];
  if (sessionCards.value.length === 0) {
    activeDeck.value = [];
    return;
  }

  let filtered = sessionCards.value;
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
  phase.value = 'DEFINITION';
  toneCharIndex.value = 0;
  pinyinCharIndex.value = 0;
}

// Helper to log metrics and streak progress
const logCardResult = async (card: Flashcard, isCorrect: boolean) => {
  const cardDeckId = card.deckId || activeDeckId.value || 'mandarin-general';
  const targetDeck = decks.value.find(d => d.id === cardDeckId);
  const lang = targetDeck?.language || activeLanguage.value || 'zh';
  await recordAnswers([{
    deckId: cardDeckId,
    language: lang,
    correct: isCorrect ? 1 : 0,
    wrong: isCorrect ? 0 : 1,
    wordId: card.id || card.hanzi
  }]);
};

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
      const hasTones = hasPinyin && currentCard.value.type !== 'sentence' && currentCardTones.value.length > 0;
      const isLastPinyinChar = !hasTones || pinyinCharIndex.value + 1 >= currentCardTones.value.length;
      const cardFinishedCorrectly = isCorrect && (phase.value === 'PINYIN' ? isLastPinyinChar : !hasPinyin);

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
          if (phase.value === 'DEFINITION') {
              if (hasTones) {
                  phase.value = 'TONE';
                  toneCharIndex.value = 0;
              } else if (hasPinyin) {
                  phase.value = 'PINYIN';
                  pinyinCharIndex.value = 0;
              } else {
                  score.value += 1;
                  phase.value = 'DEFINITION';
                  toneCharIndex.value = 0;
                  pinyinCharIndex.value = 0;
                  currentCardIndex.value += 1;
              }
          } else if (phase.value === 'TONE') {
              if (toneCharIndex.value + 1 < currentCardTones.value.length) {
                  toneCharIndex.value += 1;
              } else {
                  phase.value = 'PINYIN';
                  toneCharIndex.value = 0;
                  pinyinCharIndex.value = 0;
              }
          } else {
              // phase.value === 'PINYIN'
              if (hasTones && pinyinCharIndex.value + 1 < currentCardTones.value.length) {
                  pinyinCharIndex.value += 1;
              } else {
                  score.value += 1;
                  phase.value = 'DEFINITION'; 
                  toneCharIndex.value = 0;
                  pinyinCharIndex.value = 0;
                  currentCardIndex.value += 1;
              }
          }

          if (cardFinishedCorrectly) {
              // Log hit into daily metrics & update streak
              if (currentCard.value) {
                await logCardResult(currentCard.value, true);
              }

              const nextRoundCount = cardsPlayedInRound.value + 1;
              cardsPlayedInRound.value = nextRoundCount;

              if (nextRoundCount >= activeDeck.value.length) {
                  showRoundOver.value = true;
                  const primaryDeckId = currentActiveDeck.value?.id || activeDeckId.value || 'mandarin-general';
                  const primaryLang = currentActiveDeck.value?.language || activeLanguage.value || 'zh';
                  await recordCompletedSession(primaryDeckId, primaryLang);
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
      } else {
          // Log error into daily metrics & update streak
          if (currentCard.value) {
            await logCardResult(currentCard.value, false);
          }

          mistakes.value += 1;
          failedCard.value = currentCard.value;
          if (currentCard.value && !roundFailedCards.value.some(c => c.hanzi === currentCard.value?.hanzi)) {
            roundFailedCards.value.push(currentCard.value);
          }
          failedPhase.value = phase.value;
          showFeedbackModal.value = true;

          isTransitioning.value = false;
          selectedOptionIndex.value = null;
          clickLock.value = false;
      }
  }, 600);
}

// Feedback Continue Handler
const handleFeedbackContinue = async () => {
  showFeedbackModal.value = false;
  failedCard.value = null;
  phase.value = 'DEFINITION';
  toneCharIndex.value = 0;
  pinyinCharIndex.value = 0;

  const nextRoundCount = cardsPlayedInRound.value + 1;
  cardsPlayedInRound.value = nextRoundCount;

  if (nextRoundCount >= activeDeck.value.length) {
      showRoundOver.value = true;
      const primaryDeckId = currentActiveDeck.value?.id || activeDeckId.value || 'mandarin-general';
      const primaryLang = currentActiveDeck.value?.language || activeLanguage.value || 'zh';
      await recordCompletedSession(primaryDeckId, primaryLang);
      if (isDbActive.value) {
        const practicedCards = deck.value.filter(c => 
          c._originalIndex !== undefined && modifiedIndices.value.has(c._originalIndex)
        );
        await syncStats(practicedCards);
      }
  } else {
      currentCardIndex.value += 1;
  }
}

// Exit Quiz Handler with session recording if cards were reviewed
const handleExitQuiz = async () => {
  if (cardsPlayedInRound.value >= Math.min(5, Math.ceil(roundLength.value / 2))) {
    const primaryDeckId = currentActiveDeck.value?.id || activeDeckId.value || 'mandarin-general';
    const primaryLang = currentActiveDeck.value?.language || activeLanguage.value || 'zh';
    await recordCompletedSession(primaryDeckId, primaryLang);
  }
  view.value = 'LANDING';
}

// Restart game
const handleRestart = () => {
  mistakes.value = 0;
  score.value = 0;
  currentCardIndex.value = 0;
  cardsPlayedInRound.value = 0;
  phase.value = 'DEFINITION';
  toneCharIndex.value = 0;
  pinyinCharIndex.value = 0;
  selectedOptionIndex.value = null;
  isTransitioning.value = false;
  clickLock.value = false;
  showFeedbackModal.value = false;
  failedCard.value = null;
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
const handleSaveSettings = (
  threshold: number, 
  newIsRandom: boolean, 
  newIsSoundEnabled: boolean, 
  newHskLevels: number[], 
  newRoundLength: number, 
  newReviewRatio: number, 
  newCategoryFilters: string[],
  newSelectedDeckIds?: string[],
  newDailyWordGoal?: number
) => {
  masteryThreshold.value = threshold;
  isRandomOrder.value = newIsRandom;
  isSoundEnabled.value = newIsSoundEnabled;
  hskFilters.value = newHskLevels;
  categoryFilters.value = newCategoryFilters;
  roundLength.value = newRoundLength;
  reviewRatio.value = newReviewRatio;
  if (newSelectedDeckIds !== undefined) {
    setSelectedReviewDeckIds(newSelectedDeckIds);
  }
  if (newDailyWordGoal !== undefined) {
    setDailyWordGoal(newDailyWordGoal);
  }
  
  cardsPlayedInRound.value = 0;
  
  setTimeout(() => {
      if (view.value === 'GAME') handleRestart();
  }, 0);
  showSettings.value = false;
}

const getDeckName = (deckId?: string) => {
  const d = decks.value.find(item => item.id === (deckId || 'mandarin-general'));
  return d ? d.name : 'Mandarín General';
}

const openQuickEdit = () => {
  if (!currentCard.value || isTransitioning.value) return;
  quickEditCard.value = currentCard.value;
}

const handleQuickEditSave = async (id: string, updates: Partial<Flashcard>) => {
  await editCard(id, updates);

  const updatedCard = deck.value.find(c => c.id === id);
  if (updatedCard) {
    activeDeck.value = activeDeck.value.map(c => c.id === id ? updatedCard : c);
  }

  quickEditCard.value = null;
  phase.value = 'DEFINITION';
  toneCharIndex.value = 0;
  pinyinCharIndex.value = 0;
  selectedOptionIndex.value = null;
  isTransitioning.value = false;
  clickLock.value = false;
}
</script>

<template>
  <div class="h-screen w-screen bg-white text-slate-800 overflow-hidden font-sans">
    
    <!-- Loading screen -->
    <div v-if="isDataLoading" class="h-screen w-screen flex items-center justify-center bg-white text-slate-800">
      <div class="flex flex-col items-center gap-4">
        <span class="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></span>
        <p class="font-medium text-slate-600">Cargando tu mazo...</p>
      </div>
    </div>

    <!-- Active Views -->
    <template v-else>
      <LandingPage
        v-if="view === 'LANDING'"
        :totalCards="sessionCards.length"
        :dueCardsCount="dueCardsCount"
        :masteredCardsCount="masteredCardsCount"
        :averageMastery="averageMastery"
        :startingMastery="todayStartingMastery ?? averageMastery"
        :isExpanding="isExpanding"
        :activeDeck="currentActiveDeck"
        :deckCount="currentLanguageDecks.length"
        :sessionScopeText="sessionScopeDescription.text"
        :sessionScopeTitle="sessionScopeDescription.title"
        :isAllDecks="sessionScopeDescription.isAll"
        :streakCount="activeStreak"
        :isStudiedToday="isStudiedToday"
        :longestStreak="streak.longestStreak"
        :failedCardsCount="failedCardsCount"
        :todayUniqueWordsCount="todayUniqueWordsCount"
        :todayCorrectUniqueWordsCount="todayCorrectUniqueWordsCount"
        :yesterdayUniqueWordsCount="yesterdayUniqueWordsCount"
        :todaySessionsCount="todaySessionsCount"
        :yesterdaySessionsCount="yesterdaySessionsCount"
        :dailyWordGoal="dailyWordGoal"
        :dailyGoalProgress="dailyGoalProgress"
        :isDailyGoalMet="isDailyGoalMet"
        @startQuiz="generateRoundDeck(); view = 'GAME';"
        @openDictionary="view = 'LIST'"
        @openDeckManager="showDeckManagerModal = true"
        @openMetrics="showMetricsModal = true"
        @openSettings="showSettings = true"
        @openCloud="showCloudPanel = true"
        @openStories="view = 'STORIES'"
        @openReinforce="view = 'REINFORCE'"
        @startAiExpansion="handleStartAiExpansion"
        @updateDailyGoal="setDailyWordGoal"
      />

      <ReinforceSection
        v-if="view === 'REINFORCE'"
        :cards="currentDeckCards"
        :roundFailedCards="roundFailedCards"
        :isSyncing="isSyncing"
        @back="view = 'LANDING'"
        @saveStory="addStory"
      />

      <CharacterList
        v-if="view === 'LIST'"
        :deck="currentLanguageCards"
        :decks="currentLanguageDecks"
        :activeDeckId="activeDeckId"
        :activeDeck="currentActiveDeck"
        @back="view = 'LANDING'"
        @addCard="addCard"
        @editCard="editCard"
        @deleteCard="deleteCard"
        @aiAddCard="handleAIAddCard"
        @openImport="showImportModal = true"
        @openDeckManager="showDeckManagerModal = true"
      />

      <StorySection
        v-if="view === 'STORIES'"
        :stories="stories"
        :cards="currentDeckCards"
        @back="view = 'LANDING'"
        @addStory="addStory"
        @editStory="editStory"
        @deleteStory="deleteStory"
      />

      <div v-if="view === 'GAME'" class="h-screen w-screen flex flex-col bg-white text-slate-900 overflow-hidden font-sans relative">
        <!-- Quiz Header -->
        <div class="absolute top-0 left-0 w-full z-20 px-6 pt-4 pb-2 flex justify-between items-center gap-4 pointer-events-none">
          <!-- Izquierda: Idioma y mazo apilados verticalmente -->
          <div class="flex flex-col items-start gap-1 shrink-0">
             <h2 class="text-sm font-bold text-orange-600 tracking-wider uppercase leading-none">
               <span>🇨🇳 Chino Mandarín</span>
             </h2>
             <span v-if="currentCard?.deckId" class="text-[11px] px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 font-medium normal-case shadow-sm">
               {{ getDeckName(currentCard.deckId) }}
             </span>
          </div>

          <!-- Centro: Barra tipo Píldora + Aciertos y Errores al lado derecho -->
          <div class="flex-1 max-w-3xl mx-auto flex items-center gap-3">
            <div v-if="activeDeck.length > 0" class="flex-1 flex items-center gap-3 bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-200">
              <div class="flex-1 h-3.5 bg-orange-50 rounded-full overflow-hidden p-0.5 border border-orange-200">
                <div
                  class="h-full rounded-full bg-orange-500 transition-all duration-500 ease-out relative"
                  :style="{ width: `${Math.max(progress, 4)}%` }"
                />
              </div>

              <div class="flex items-baseline gap-1.5 shrink-0 font-mono text-xs">
                <span class="font-extrabold text-slate-800 text-sm">
                  {{ currentCardIndex + 1 }}<span class="text-slate-400 font-normal mx-0.5">/</span>{{ activeDeck.length }}
                </span>
                <span v-if="activeDeck.length !== sessionCards.length" class="text-[11px] font-sans font-medium text-slate-500">
                  (de {{ sessionCards.length }})
                </span>
                <span class="ml-1 px-1.5 py-0.5 rounded-md bg-orange-50 text-orange-600 font-bold text-[11px] border border-orange-200">
                  {{ progress }}%
                </span>
              </div>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <div
                class="hidden sm:flex items-center gap-1.5 animate-fade-in px-3 py-1.5 rounded-full border shadow-sm text-xs font-mono"
                :class="isDailyGoalMet
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-white border-orange-200 text-slate-700'"
                title="Palabras diferentes revisadas hoy vs. Meta diaria"
              >
                <span>{{ isDailyGoalMet ? '🏆' : '🎯' }}</span>
                <span class="font-bold">{{ todayUniqueWordsCount }}/{{ dailyWordGoal }}</span>
                <span class="text-[10px] font-sans uppercase font-bold tracking-wider" :class="isDailyGoalMet ? 'text-emerald-600' : 'text-orange-600'">
                  hoy
                </span>
              </div>
              <div class="flex items-center space-x-2 animate-fade-in bg-white px-3.5 py-1.5 rounded-full border border-slate-200 shadow-sm">
                 <span class="text-emerald-600 font-bold text-base">✓</span>
                 <span class="text-slate-800 font-bold font-mono min-w-[1.5ch] text-center">{{ score }}</span>
              </div>
              <div class="flex items-center space-x-2 animate-fade-in bg-white px-3.5 py-1.5 rounded-full border border-slate-200 shadow-sm">
                 <span class="text-rose-600 font-bold text-base">✗</span>
                 <span class="text-slate-800 font-bold font-mono min-w-[1.5ch] text-center">{{ mistakes }}</span>
              </div>
            </div>
          </div>

          <!-- Derecha: Botón Terminar y Ajuste Rápido -->
          <div class="pointer-events-auto flex items-center gap-2 shrink-0">
               <Button variant="ghost" @click="handleExitQuiz" class="bg-white hover:bg-orange-500 text-slate-700 hover:text-white border border-slate-200 hover:border-orange-500 shadow-sm transition-colors" title="Terminar Quiz">
                  Terminar
               </Button>
               <button
                 v-if="activeDeck.length > 0 && currentCard"
                 type="button"
                 @click="openQuickEdit"
                 :disabled="isTransitioning"
                 class="p-2.5 rounded-xl bg-white hover:bg-orange-50 text-slate-600 hover:text-orange-600 border border-slate-200 hover:border-orange-300 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                 title="Editar carácter actual"
                 aria-label="Editar carácter actual"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5">
                   <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                   <circle cx="12" cy="12" r="3" />
                 </svg>
               </button>
          </div>
        </div>

        <!-- Quiz Gameplay -->
        <main class="flex-1 flex flex-col h-full relative">
          <div v-if="activeDeck.length === 0" class="h-full w-full flex flex-col items-center justify-center bg-white text-slate-800 p-6 animate-fade-in">
             <div class="text-6xl mb-4">🎉</div>
             <h1 class="text-4xl md:text-5xl font-serif text-slate-900 mb-4 text-center">
                 {{ hskFilters.length > 0 ? "¡Niveles Completados!" : "¡Todo al día!" }}
             </h1>
             <p class="text-slate-600 text-center max-w-md mb-8">
               {{ hskFilters.length > 0 
                  ? `Has completado las tarjetas disponibles para los niveles seleccionados.` 
                  : `Has repasado o dominado todas las tarjetas disponibles en este mazo.`
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
              :showDefinition="phase !== 'DEFINITION'"
              :activeCharIndex="
                phase === 'TONE' 
                  ? (currentCardTones[toneCharIndex]?.charIndex ?? toneCharIndex) 
                  : phase === 'PINYIN' && currentCardTones.length > 0 && currentCard?.type !== 'sentence'
                    ? (currentCardTones[pinyinCharIndex]?.charIndex ?? pinyinCharIndex)
                    : null
              "
              :activeCharTone="currentPinyinReminderTone"
              :instruction="
                phase === 'DEFINITION'
                  ? 'Selecciona el Significado'
                  : phase === 'TONE'
                    ? `Selecciona el Tono (${toneCharIndex + 1}/${currentCardTones.length})`
                    : (currentCardTones.length > 1 && currentCard?.type !== 'sentence'
                        ? `Selecciona el Pinyin (${pinyinCharIndex + 1}/${currentCardTones.length})`
                        : 'Selecciona el Pinyin')
              " 
            />
            <BottomHalf 
              :options="currentOptions" 
              @optionClick="handleOptionClick" 
              :disabled="isTransitioning" 
              :selectedOptionIndex="selectedOptionIndex" 
              :showFeedback="isTransitioning" 
              :reminderTone="currentPinyinReminderTone"
            />
          </template>
        </main>
      </div>

      <!-- Modals -->
      <CardFeedbackModal
        v-if="showFeedbackModal && failedCard"
        :card="failedCard"
        :failedPhase="failedPhase"
        @continue="handleFeedbackContinue"
        @reinforce="showFeedbackModal = false; view = 'REINFORCE';"
      />

      <CardEditModal
        :card="quickEditCard"
        :decks="currentLanguageDecks"
        :activeDeckId="activeDeckId"
        @close="quickEditCard = null"
        @save="handleQuickEditSave"
        @openDeckManager="showDeckManagerModal = true"
      />

      <DeckManagerModal
        v-if="showDeckManagerModal"
        :decks="currentLanguageDecks"
        :activeDeckId="activeDeckId"
        :allCards="deck"
        :selectedReviewDeckIds="selectedReviewDeckIds"
        @selectDeck="(id) => { setActiveDeck(id); }"
        @createDeck="createDeck"
        @editDeck="editDeck"
        @deleteDeck="deleteDeck"
        @openSettings="showSettings = true"
        @close="showDeckManagerModal = false"
      />

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
        :availableDecks="currentLanguageDecks"
        :currentSelectedDeckIds="selectedReviewDeckIds"
        :currentDailyWordGoal="dailyWordGoal"
        @save="handleSaveSettings"
        @cancel="showSettings = false"
        @openImport="showSettings = false; showImportModal = true;"
      />

      <ImportDeckModal
        v-if="showImportModal"
        :existingDeck="deck"
        :decks="decks"
        :activeDeckId="activeDeckId"
        @import="handleBatchImport"
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
        :streakCount="activeStreak"
        :roundScore="score"
        :roundMistakes="mistakes"
        :todayUniqueWordsCount="todayUniqueWordsCount"
        :dailyWordGoal="dailyWordGoal"
        :dailyGoalProgress="dailyGoalProgress"
        :isDailyGoalMet="isDailyGoalMet"
        :startingMastery="todayStartingMastery ?? averageMastery"
        :averageMastery="averageMastery"
        @nextRound="handleNextRound"
        @reinforceRound="showRoundOver = false; view = 'REINFORCE';"
        @goHome="showRoundOver = false; view = 'LANDING';"
      />

      <MetricsModal
        v-if="showMetricsModal"
        :availableDecks="decks"
        :currentLanguage="activeLanguage"
        :currentDeckId="activeDeckId"
        @close="showMetricsModal = false"
      />
    </template>
  </div>
</template>
