<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { Flashcard, Story } from '~/types'
import { useReinforce } from '~/composables/useReinforce'
import { TONE_STYLES } from '~/constants/tones'
import ToneChar from './ToneChar.vue'
import Button from './Button.vue'

const props = defineProps<{
  cards: Flashcard[]
  roundFailedCards?: Flashcard[]
  isSyncing?: boolean
}>()

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'saveStory', story: Story): void
}>()

const {
  selectedCard,
  currentStory,
  isGenerating,
  generationError,
  globalShowPinyin,
  promptInstruction,
  selectedTheme,
  themes,
  getFailedCards,
  generateStoryForCard,
  resetPromptToDefault
} = useReinforce()

const showPromptEditor = ref(false)
const savedSuccess = ref(false)

// Determine the list of cards to display in the sidebar
const failedCards = computed(() => {
  if (props.roundFailedCards && props.roundFailedCards.length > 0) {
    // If coming from a round with specific mistakes, show those first
    return props.roundFailedCards
  }
  return getFailedCards(props.cards)
})

// Fallback if no cards have errors yet: allow choosing from all cards
const displayCards = computed(() => {
  if (failedCards.value.length > 0) {
    return failedCards.value
  }
  return props.cards.slice(0, 30)
})

// Select the first card by default when loaded
onMounted(() => {
  if (displayCards.value.length > 0 && !selectedCard.value) {
    selectedCard.value = displayCards.value[0]
  }
})

// When selecting a card, reset story view unless already generated for it
const selectCard = (card: Flashcard) => {
  if (selectedCard.value?.hanzi === card.hanzi) return
  selectedCard.value = card
  currentStory.value = null
  savedSuccess.value = false
  generationError.value = null
}

const handleGenerate = async () => {
  if (!selectedCard.value) return
  savedSuccess.value = false
  await generateStoryForCard(selectedCard.value)
}

const handleSaveStory = () => {
  if (!currentStory.value || !selectedCard.value) return

  const storyItem: Story = {
    title: currentStory.value.title,
    titleTranslation: `Refuerzo: ${selectedCard.value.hanzi} (${selectedCard.value.definition})`,
    content: currentStory.value.paragraphs.join('\n\n'),
    translation: `Carácter reforzado: ${selectedCard.value.hanzi} - ${selectedCard.value.definition}`,
    hskLevel: selectedCard.value.hskLevel || 1,
    createdAt: new Date().toISOString()
  }

  emit('saveStory', storyItem)
  savedSuccess.value = true
  setTimeout(() => {
    savedSuccess.value = false
  }, 3500)
}

const handleNextCard = () => {
  if (!selectedCard.value) return
  const currentIndex = displayCards.value.findIndex(c => c.hanzi === selectedCard.value?.hanzi)
  if (currentIndex >= 0 && currentIndex < displayCards.value.length - 1) {
    selectCard(displayCards.value[currentIndex + 1])
  } else if (displayCards.value.length > 0) {
    selectCard(displayCards.value[0])
  }
}
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-white text-slate-800 font-sans overflow-hidden">
    <!-- Top Header -->
    <header class="flex-none p-3 sm:p-4 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm z-20">
      <div class="flex items-center gap-3">
        <Button variant="outline" @click="emit('back')" class="border-orange-200 text-slate-700 hover:text-orange-700 hover:bg-orange-50 py-1.5 px-3 text-sm">
          ← Inicio
        </Button>
        <div>
          <h1 class="text-base sm:text-lg font-bold text-orange-600 flex items-center gap-1.5">
            <span>🎯</span> Refuerzo de Errores con Historias IA
          </h1>
        </div>
      </div>

      <!-- Tone Colors Legend & Pinyin Toggle -->
      <div class="flex items-center gap-2 sm:gap-4">
        <!-- Interactive Tone Legend -->
        <div class="hidden lg:flex items-center gap-2 text-xs bg-orange-50/70 px-3 py-1.5 rounded-xl border border-orange-200">
          <span class="text-slate-500 font-medium mr-1">Tonos:</span>
          <span v-for="(s, tNum) in TONE_STYLES" :key="tNum" :class="[s.textClass, 'font-mono font-bold flex items-center gap-0.5']" :style="{ color: s.hex }">
            <span class="w-2 h-2 rounded-full inline-block" :style="{ backgroundColor: s.hex }"></span>
            {{ tNum }}°
          </span>
        </div>

        <!-- Global Pinyin Toggle -->
        <button
          @click="globalShowPinyin = !globalShowPinyin"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer"
          :class="globalShowPinyin 
            ? 'bg-orange-500 text-white border-orange-500 shadow-sm' 
            : 'bg-white border-orange-200 text-slate-600 hover:text-orange-700 hover:bg-orange-50'"
          title="Alternar visibilidad del pinyin"
        >
          <span>{{ globalShowPinyin ? '👁️ Pinyin visible' : '🙈 Pinyin oculto' }}</span>
        </button>
      </div>
    </header>

    <!-- Main Workspace -->
    <div class="flex-1 flex flex-col md:flex-row overflow-hidden">
      <!-- Left Column: Character List (Mistakes) -->
      <aside class="w-full md:w-80 flex-none bg-white border-r border-orange-200/70 flex flex-col max-h-[35vh] md:max-h-full">
        <div class="p-3 border-b border-orange-100 flex items-center justify-between bg-orange-50/40">
          <div class="flex items-center gap-2">
            <span class="text-xs uppercase font-bold text-slate-600 tracking-wider">
              {{ failedCards.length > 0 ? 'Tus Errores Registrados' : 'Mazo de Caracteres' }}
            </span>
            <span class="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-mono font-bold border border-orange-300">
              {{ displayCards.length }}
            </span>
          </div>
          <span class="text-[10px] text-slate-500">Selecciona uno</span>
        </div>

        <div class="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
          <div v-if="displayCards.length === 0" class="p-6 text-center text-slate-500 text-sm">
            No hay tarjetas registradas en este mazo.
          </div>

          <button
            v-for="card in displayCards"
            :key="card.hanzi"
            @click="selectCard(card)"
            type="button"
            :class="[
              'w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer',
              selectedCard?.hanzi === card.hanzi
                ? 'bg-orange-50 border-orange-400 shadow-sm ring-1 ring-orange-300'
                : 'bg-white hover:bg-orange-50/50 border-orange-100 hover:border-orange-200'
            ]"
          >
            <div class="flex items-center gap-2.5">
              <span class="text-2xl font-serif font-bold tracking-wide">
                <ToneChar
                  :hanzi="card.hanzi"
                  :pinyin="card.pinyin"
                  :definition="card.definition"
                  :showPinyin="false"
                  :clickable="false"
                />
              </span>
              <div class="flex flex-col min-w-0">
                <span class="text-xs font-semibold text-slate-800 truncate max-w-[130px]">
                  {{ card.definition }}
                </span>
                <span v-if="card.pinyin" class="text-[10px] font-mono text-slate-500 truncate">
                  {{ Array.isArray(card.pinyin) ? card.pinyin.join(' ') : card.pinyin }}
                </span>
              </div>
            </div>

            <div class="flex flex-col items-end gap-1">
              <span
                v-if="(card.wrongCount || 0) > 0"
                class="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-mono font-bold border border-orange-300"
                title="Cantidad de errores acumulados"
              >
                -{{ card.wrongCount }} fallos
              </span>
              <span v-if="card.hskLevel" class="text-[9px] px-1.5 py-0.2 rounded bg-orange-50 text-orange-700 border border-orange-200">
                HSK {{ card.hskLevel }}
              </span>
            </div>
          </button>
        </div>
      </aside>

      <!-- Right Column: Generation Panel & Story Reader -->
      <main class="flex-1 flex flex-col bg-white overflow-y-auto custom-scrollbar p-4 md:p-8">
        <div class="max-w-3xl w-full mx-auto space-y-6">
          <!-- Card Selected Header & AI Generation Bar -->
          <div v-if="selectedCard" class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-orange-100 pb-4">
              <div class="flex items-center gap-3">
                <div class="p-3 bg-orange-50/70 rounded-2xl border border-orange-200">
                  <ToneChar
                    :hanzi="selectedCard.hanzi"
                    :pinyin="selectedCard.pinyin"
                    :definition="selectedCard.definition"
                    :showPinyin="true"
                  />
                </div>
                <div>
                  <div class="text-xs uppercase font-bold text-slate-500 tracking-wider">Carácter a Reforzar</div>
                  <div class="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <span>{{ selectedCard.definition }}</span>
                    <span v-if="(selectedCard.wrongCount || 0) > 0" class="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-mono border border-orange-300">
                      {{ selectedCard.wrongCount }} errores registrados
                    </span>
                  </div>
                </div>
              </div>

              <!-- Theme Selector -->
              <div class="flex items-center gap-2">
                <label class="text-xs text-slate-600 font-medium">Temática:</label>
                <select
                  v-model="selectedTheme"
                  class="bg-white text-slate-800 text-xs px-3 py-2 rounded-xl border border-orange-200 outline-none focus:border-orange-500 cursor-pointer"
                >
                  <option v-for="t in themes" :key="t.id" :value="t.promptNote">
                    {{ t.label }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Transparency UI Directive: View/Edit System Prompt Accordion -->
            <div class="border border-orange-200/80 rounded-xl overflow-hidden bg-orange-50/40">
              <button
                type="button"
                @click="showPromptEditor = !showPromptEditor"
                class="w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-slate-600 hover:text-orange-700 transition-colors cursor-pointer"
              >
                <span class="flex items-center gap-1.5 font-semibold">
                  <span>⚙️</span> Instrucciones de la IA (Prompt Transparente)
                </span>
                <span class="text-orange-600 font-mono text-[11px]">
                  {{ showPromptEditor ? 'Ocultar ▲' : 'Ver / Editar ▼' }}
                </span>
              </button>

              <div v-if="showPromptEditor" class="p-3 border-t border-orange-200/60 space-y-2">
                <p class="text-[11px] text-slate-600">
                  Cumpliendo la directiva de transparencia: estas son las instrucciones exactas enviadas al modelo para generar la historia de 3 párrafos en español con el ideograma coloreado.
                </p>
                <textarea
                  v-model="promptInstruction"
                  rows="6"
                  class="w-full p-2.5 bg-white text-slate-800 text-xs font-mono rounded-lg border border-orange-200 focus:border-orange-500 outline-none resize-y"
                ></textarea>
                <div class="flex justify-end">
                  <button
                    type="button"
                    @click="resetPromptToDefault"
                    class="text-[10px] text-slate-500 hover:text-orange-700 underline"
                  >
                    Restablecer al prompt original
                  </button>
                </div>
              </div>
            </div>

            <!-- Generate Action Button -->
            <div class="flex gap-2">
              <Button
                variant="primary"
                @click="handleGenerate"
                :isLoading="isGenerating"
                :disabled="isGenerating"
                class="flex-1 py-3 bg-orange-500 hover:bg-orange-600 border-none text-white font-bold shadow-sm flex items-center justify-center gap-2"
              >
                <span>✨</span>
                <span>{{ currentStory ? 'Regenerar otra Historia (3 párrafos)' : 'Generar Historia de Refuerzo con IA' }}</span>
              </Button>
            </div>

            <!-- Error Banner if API fails -->
            <div v-if="generationError" class="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center justify-between">
              <span>⚠️ {{ generationError }}</span>
              <button @click="handleGenerate" class="underline font-bold ml-2">Reintentar</button>
            </div>
          </div>

          <!-- Story Reading View (3 Paragraphs) -->
          <div v-if="currentStory && selectedCard" class="bg-white rounded-3xl p-6 sm:p-10 border border-orange-200 shadow-xl shadow-orange-500/5 space-y-8 animate-fade-in">
            <!-- Story Header -->
            <div class="text-center border-b border-orange-100 pb-6 space-y-2">
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold">
                <span>📖 Historia de 3 Párrafos</span>
                <span>•</span>
                <span>{{ currentStory.occurrences }} apariciones del carácter</span>
              </div>
              <h2 class="text-3xl sm:text-4xl font-serif font-bold text-slate-900 tracking-wide">
                {{ currentStory.title }}
              </h2>
              <p class="text-xs text-slate-500">
                Toca o haz clic sobre el carácter coloreado en el texto para escuchar su audio y ver sus tonos.
              </p>
            </div>

            <!-- 3 Paragraphs with ToneChar embedded -->
            <div class="space-y-6 text-slate-800 text-lg sm:text-xl leading-relaxed font-sans">
              <div
                v-for="(paragraph, pIdx) in currentStory.paragraphs"
                :key="pIdx"
                class="p-4 rounded-2xl bg-orange-50/40 border border-orange-100"
              >
                <div class="text-xs uppercase font-bold tracking-widest text-orange-600 mb-2 font-mono">
                  Párrafo {{ pIdx + 1 }}
                </div>
                <p class="leading-loose">
                  <template v-for="(part, partIdx) in paragraph.split(selectedCard.hanzi)" :key="partIdx">
                    <span>{{ part }}</span>
                    <ToneChar
                      v-if="partIdx < paragraph.split(selectedCard.hanzi).length - 1"
                      :hanzi="selectedCard.hanzi"
                      :pinyin="selectedCard.pinyin"
                      :definition="selectedCard.definition"
                      :showPinyin="globalShowPinyin"
                    />
                  </template>
                </p>
              </div>
            </div>

            <!-- Footer Story Actions -->
            <div class="pt-4 border-t border-orange-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div class="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="secondary"
                  @click="handleSaveStory"
                  class="flex-1 sm:flex-none flex items-center justify-center gap-1.5"
                >
                  <span>{{ savedSuccess ? '✓ Guardado' : '💾 Guardar en mis Historias' }}</span>
                </Button>

                <Button
                  variant="outline"
                  @click="handleGenerate"
                  :disabled="isGenerating"
                  class="flex-1 sm:flex-none flex items-center justify-center gap-1.5 border-orange-300 text-orange-700"
                >
                  <span>🔄 Otra versión</span>
                </Button>
              </div>

              <Button
                variant="primary"
                @click="handleNextCard"
                class="w-full sm:w-auto flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 border-none text-white"
              >
                <span>Siguiente carácter difícil →</span>
              </Button>
            </div>
          </div>

          <!-- Empty State: When no story is generated yet -->
          <div
            v-else-if="selectedCard && !isGenerating"
            class="p-12 text-center bg-white rounded-3xl border border-orange-200 border-dashed space-y-4"
          >
            <div class="text-5xl animate-bounce">💡</div>
            <h3 class="text-xl font-bold text-slate-900">Refuerza "{{ selectedCard.hanzi }}" con una Historia IA</h3>
            <p class="text-slate-600 max-w-md mx-auto text-sm leading-relaxed">
              Gemini creará un relato entretenido de 3 párrafos en español. Cada vez que aparezca <span class="font-bold text-orange-600">{{ selectedCard.hanzi }}</span>, estará coloreado según su tono de pronunciación y el pinyin estará oculto para potenciar tu retención mnemotécnica.
            </p>
            <div class="pt-2">
              <Button variant="primary" @click="handleGenerate" class="px-8 py-3 bg-orange-500 hover:bg-orange-600 border-none text-white font-bold shadow-sm">
                Generar Historia Ahora
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
