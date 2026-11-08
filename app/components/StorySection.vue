<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Story, Flashcard, StoryGenre, StoryTargetCharacter } from '~/types'
import { useMasteryStories } from '~/composables/useMasteryStories'
import { MASTERY_BATCH_SIZE } from '~/constants/stories'
import Button from './Button.vue'
import ToneChar from './ToneChar.vue'

const props = defineProps<{
  stories: Story[]
  cards?: Flashcard[]
}>()

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'addStory', story: Story): void
  (e: 'editStory', id: string, updates: Partial<Story>): void
  (e: 'deleteStory', id: string): void
}>()

// Active tab in StorySection: 'AI_STUDIO' or 'LIBRARY'
const activeTab = ref<'AI_STUDIO' | 'LIBRARY'>('AI_STUDIO')

// Reading & Modal States
const readingStory = ref<Story | null>(null)
const showAddModal = ref(false)
const editingStory = ref<Story | null>(null)
const showPinyin = ref(false)
const showTranslation = ref(false)
const libraryGenreFilter = ref<string>('ALL')
const savedToast = ref(false)
const showPromptSettings = ref(false)
const showCharacterPicker = ref(false)

// Composable for 10-mastered-characters AI stories
const {
  selectedCards,
  currentStoryDraft,
  isGenerating,
  generationError,
  selectedGenre,
  userIdea,
  promptInstruction,
  selectedBatchIndex,
  globalShowPinyin,
  genres,
  readonlySchemaNote,
  getEligibleCards,
  getBatches,
  selectBatch,
  shuffleRandomBatch,
  toggleCardInSelection,
  generateStory,
  resetPromptToDefault
} = useMasteryStories()

// Get all eligible cards from props
const eligibleData = computed(() => {
  return getEligibleCards(props.cards || [])
})

const eligibleCards = computed(() => eligibleData.value.cards)
const isStrict100 = computed(() => eligibleData.value.isStrict100)

const mastered100Count = computed(() => {
  return (props.cards || []).filter(c => (c.knowledgeStatus || 0) >= 100).length
})

const batches = computed(() => {
  return getBatches(eligibleCards.value)
})

// Initialize first batch of 10 characters on mount
onMounted(() => {
  if (selectedCards.value.length === 0 && eligibleCards.value.length > 0) {
    selectBatch(0, eligibleCards.value)
  }
})

// Manual new story state
const newStory = ref<Story>({
  title: '',
  titlePinyin: '',
  titleTranslation: '',
  content: '',
  contentPinyin: '',
  translation: '',
  hskLevel: 1,
  genre: 'cuento'
})

const handleAddSubmit = () => {
  if (!newStory.value.title || !newStory.value.content) return
  emit('addStory', { ...newStory.value })
  showAddModal.value = false
  newStory.value = {
    title: '',
    titlePinyin: '',
    titleTranslation: '',
    content: '',
    contentPinyin: '',
    translation: '',
    hskLevel: 1,
    genre: 'cuento'
  }
}

const handleEditSubmit = () => {
  if (!editingStory.value || !editingStory.value.id) return
  emit('editStory', editingStory.value.id, { ...editingStory.value })
  editingStory.value = null
}

const handleDelete = (id: string) => {
  if (confirm('¿Estás seguro de que deseas eliminar este relato?')) {
    emit('deleteStory', id)
    if (readingStory.value?.id === id) {
      readingStory.value = null
    }
  }
}

// Generate story using AI Studio
const handleGenerateStory = async () => {
  if (selectedCards.value.length === 0) return
  savedToast.value = false
  await generateStory()
}

// Save draft from AI Studio into Firestore stories collection
const handleSaveDraft = () => {
  if (!currentStoryDraft.value) return
  emit('addStory', { ...currentStoryDraft.value })
  savedToast.value = true
  setTimeout(() => {
    savedToast.value = false
  }, 3500)
}

// Text Tokenizer for interactive ToneChar in reading mode
interface TextToken {
  text: string
  isTarget: boolean
  target?: StoryTargetCharacter
}

const parseParagraphTokens = (text: string, targets?: StoryTargetCharacter[]): TextToken[] => {
  if (!targets || targets.length === 0 || !text) {
    return [{ text, isTarget: false }]
  }

  const sorted = [...targets].sort((a, b) => b.hanzi.length - a.hanzi.length)
  const escaped = sorted.map(t => t.hanzi.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  const regex = new RegExp(`(${escaped})`, 'g')

  const parts = text.split(regex)
  const targetMap = new Map<string, StoryTargetCharacter>()
  sorted.forEach(t => targetMap.set(t.hanzi, t))

  return parts.filter(p => p.length > 0).map(p => {
    const target = targetMap.get(p)
    if (target) {
      return { text: p, isTarget: true, target }
    }
    return { text: p, isTarget: false }
  })
}

// Filtered stories in library
const filteredStories = computed(() => {
  if (libraryGenreFilter.value === 'ALL') return props.stories
  return props.stories.filter(s => s.genre === libraryGenreFilter.value)
})

const getGenreBadge = (genre?: StoryGenre) => {
  switch (genre) {
    case 'noticia':
      return { label: 'Noticia', icon: '📰', class: 'bg-orange-100 text-orange-800 border-orange-300' }
    case 'historia':
      return { label: 'Historia', icon: '☕', class: 'bg-amber-100 text-amber-800 border-amber-300' }
    case 'cuento':
    default:
      return { label: 'Cuento', icon: '📖', class: 'bg-orange-50 text-orange-700 border-orange-200' }
  }
}
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-white text-slate-800 font-sans overflow-hidden">
    <!-- VIEW 1: READING STORY -->
    <div v-if="readingStory" class="h-screen w-screen flex flex-col bg-white text-slate-800 font-sans">
      <!-- Reading Header -->
      <header class="flex-none p-3 sm:p-4 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm z-20">
        <Button variant="outline" @click="readingStory = null" class="flex items-center gap-2 border-orange-200 text-slate-700 hover:text-orange-700 hover:bg-orange-50 text-sm">
          <span class="text-base">←</span> Volver a la lista
        </Button>

        <div class="flex items-center gap-3">
          <button
            @click="showPinyin = !showPinyin"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer"
            :class="showPinyin 
              ? 'bg-orange-500 border-orange-500 text-white shadow-sm' 
              : 'bg-white border-orange-200 text-slate-600 hover:text-orange-700'"
            title="Alternar pinyin en los caracteres"
          >
            <span>{{ showPinyin ? '👁️ Pinyin visible' : '🙈 Pinyin oculto' }}</span>
          </button>

          <button
            v-if="readingStory.translation"
            @click="showTranslation = !showTranslation"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer"
            :class="showTranslation 
              ? 'bg-orange-500 border-orange-500 text-white shadow-sm' 
              : 'bg-white border-orange-200 text-slate-600 hover:text-orange-700'"
          >
            <span>Traducción / Glosario</span>
          </button>
        </div>
      </header>

      <!-- Reading Body -->
      <div class="flex-1 overflow-auto p-4 sm:p-8 md:p-12 custom-scrollbar">
        <div class="max-w-3xl mx-auto bg-white rounded-3xl p-6 sm:p-10 shadow-xl shadow-orange-500/5 border border-orange-200 space-y-8">
          <!-- Story Header -->
          <div class="border-b border-orange-100 pb-6 text-center space-y-3">
            <div class="flex items-center justify-center gap-2 flex-wrap">
              <span
                class="px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1"
                :class="getGenreBadge(readingStory.genre).class"
              >
                <span>{{ getGenreBadge(readingStory.genre).icon }}</span>
                <span>{{ getGenreBadge(readingStory.genre).label }}</span>
              </span>

              <span v-if="readingStory.targetCharacters && readingStory.targetCharacters.length > 0" class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 border border-orange-200 text-orange-700 font-mono">
                🎯 {{ readingStory.targetCharacters.length }} caracteres dominados
              </span>
            </div>

            <h1 class="text-3xl sm:text-4xl font-serif font-bold text-slate-900 tracking-wide">
              {{ readingStory.title }}
            </h1>

            <p v-if="readingStory.summary" class="text-sm sm:text-base text-slate-600 italic max-w-xl mx-auto leading-relaxed">
              {{ readingStory.summary }}
            </p>

            <p v-if="readingStory.titlePinyin" class="text-sm font-mono text-orange-600">
              {{ readingStory.titlePinyin }}
            </p>
          </div>

          <!-- Paragraphs with interactive ToneChar -->
          <div class="space-y-6 text-slate-800 text-lg leading-relaxed font-sans">
            <div
              v-for="(paragraph, pIdx) in (readingStory.paragraphs || readingStory.content.split('\n\n'))"
              :key="pIdx"
              class="p-4 sm:p-5 rounded-2xl bg-orange-50/40 border border-orange-100"
            >
              <p class="leading-loose">
                <template v-for="(token, tIdx) in parseParagraphTokens(paragraph, readingStory.targetCharacters)" :key="tIdx">
                  <ToneChar
                    v-if="token.isTarget && token.target"
                    :hanzi="token.target.hanzi"
                    :pinyin="token.target.pinyin"
                    :definition="token.target.definition"
                    :showPinyin="showPinyin"
                  />
                  <span v-else>{{ token.text }}</span>
                </template>
              </p>
            </div>
          </div>

          <!-- Mastered Characters Glossary at the bottom -->
          <div v-if="readingStory.targetCharacters && readingStory.targetCharacters.length > 0" class="p-5 rounded-2xl bg-orange-50/60 border border-orange-200/80 space-y-3">
            <div class="flex items-center justify-between border-b border-orange-200/60 pb-2">
              <span class="text-xs uppercase font-bold text-orange-700 tracking-wider flex items-center gap-1.5">
                <span>🎯</span> Caracteres Dominados en esta Historia ({{ readingStory.targetCharacters.length }})
              </span>
              <span class="text-[11px] text-slate-500">Toca cualquiera para escuchar su audio</span>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-1">
              <div
                v-for="char in readingStory.targetCharacters"
                :key="char.hanzi"
                class="flex items-center gap-2 p-2 rounded-xl bg-white border border-orange-200/80 shadow-sm"
              >
                <ToneChar
                  :hanzi="char.hanzi"
                  :pinyin="char.pinyin"
                  :definition="char.definition"
                  :showPinyin="false"
                />
                <div class="flex flex-col min-w-0">
                  <span class="text-xs font-semibold text-slate-800 truncate">{{ char.definition }}</span>
                  <span v-if="char.pinyin" class="text-[10px] font-mono text-slate-500 truncate">
                    {{ Array.isArray(char.pinyin) ? char.pinyin.join(' ') : char.pinyin }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Translation / Summary section if active -->
          <div v-if="showTranslation && readingStory.translation" class="p-5 rounded-2xl bg-orange-50 border border-orange-200">
            <h3 class="text-xs font-bold text-orange-700 uppercase tracking-widest mb-2">Traducción / Apuntes</h3>
            <div class="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {{ readingStory.translation }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- VIEW 2: AI STUDIO & STORIES LIBRARY -->
    <div v-else class="h-screen w-screen flex flex-col bg-white text-slate-800 font-sans">
      <!-- Main Header -->
      <header class="flex-none p-3 sm:p-4 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm z-20">
        <div class="flex items-center gap-3">
          <Button variant="outline" @click="emit('back')" class="border-orange-200 text-slate-700 hover:text-orange-700 hover:bg-orange-50 py-1.5 px-3 text-sm">
            ← Inicio
          </Button>

          <h1 class="text-base sm:text-lg font-bold text-orange-600 flex items-center gap-2">
            <span>📚</span> Cuentos, Historias y Noticias
          </h1>
        </div>

        <!-- Navigation Tabs: Redactor IA vs Biblioteca -->
        <div class="flex items-center gap-2">
          <div class="flex bg-orange-50 p-1 rounded-xl border border-orange-200">
            <button
              @click="activeTab = 'AI_STUDIO'"
              :class="[
                'px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                activeTab === 'AI_STUDIO'
                  ? 'bg-orange-500 text-white shadow'
                  : 'text-slate-600 hover:text-orange-700'
              ]"
            >
              <span>✨ Redactor IA</span>
              <span class="hidden sm:inline">(10 Dominados)</span>
            </button>

            <button
              @click="activeTab = 'LIBRARY'"
              :class="[
                'px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                activeTab === 'LIBRARY'
                  ? 'bg-orange-500 text-white shadow'
                  : 'text-slate-600 hover:text-orange-700'
              ]"
            >
              <span>📖 Mis Relatos</span>
              <span class="px-1.5 py-0.2 rounded-full bg-orange-100 text-[10px] text-orange-800">{{ stories.length }}</span>
            </button>
          </div>
        </div>
      </header>

      <!-- TAB CONTENT -->
      <main class="flex-1 overflow-auto p-4 sm:p-6 md:p-8 custom-scrollbar">
        <!-- TAB 1: AI STUDIO -->
        <div v-if="activeTab === 'AI_STUDIO'" class="max-w-4xl mx-auto space-y-6">
          <!-- Step 1: 10 Mastered Characters Batch Selector -->
          <div class="bg-white rounded-2xl p-5 border border-orange-200 shadow-lg shadow-orange-500/5 space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-orange-100 pb-3">
              <div class="space-y-0.5">
                <div class="flex items-center gap-2">
                  <span class="text-xs uppercase font-extrabold text-orange-600 tracking-wider">Paso 1: Lote de Caracteres Dominados</span>
                  <span class="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-300 font-mono font-bold">
                    {{ mastered100Count }} al 100%
                  </span>
                </div>
                <p class="text-xs text-slate-500">
                  Selecciona un lote de {{ MASTERY_BATCH_SIZE }} caracteres para tejerlos en una narración con significado.
                </p>
              </div>

              <!-- Quick action buttons: Batches & Random -->
              <div class="flex items-center gap-2 flex-wrap">
                <button
                  v-for="(batch, bIdx) in batches.slice(0, 5)"
                  :key="bIdx"
                  @click="selectBatch(bIdx, eligibleCards)"
                  :class="[
                    'px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer',
                    selectedBatchIndex === bIdx
                      ? 'bg-orange-500 border-orange-500 text-white'
                      : 'bg-white border-orange-200 text-slate-600 hover:text-orange-700 hover:bg-orange-50'
                  ]"
                >
                  Lote {{ bIdx + 1 }}
                </button>

                <button
                  @click="shuffleRandomBatch(eligibleCards)"
                  class="px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-50 hover:bg-orange-100 border border-orange-300 text-orange-700 transition-all cursor-pointer flex items-center gap-1"
                  title="Elegir 10 caracteres dominados al azar"
                >
                  <span>🎲 Al Azar</span>
                </button>
              </div>
            </div>

            <!-- Notice if fallback cards used -->
            <div v-if="!isStrict100 && eligibleCards.length > 0" class="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
              <span>💡</span>
              <span>
                Aún tienes menos de {{ MASTERY_BATCH_SIZE }} tarjetas al 100%. Complementamos el lote con tus tarjetas más repasadas para que puedas generar el relato.
              </span>
            </div>

            <!-- Active Selected 10 Characters Chips -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs text-slate-600 font-medium">
                  Caracteres seleccionados para el relato: <strong class="text-orange-600">{{ selectedCards.length }}</strong>/{{ MASTERY_BATCH_SIZE }}
                </span>
                <button
                  @click="showCharacterPicker = !showCharacterPicker"
                  class="text-xs text-orange-600 hover:text-orange-700 underline cursor-pointer"
                >
                  {{ showCharacterPicker ? 'Ocultar selector individual ▲' : 'Elegir manualmente ▼' }}
                </button>
              </div>

              <!-- Interactive Selected Characters Grid -->
              <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div
                  v-for="card in selectedCards"
                  :key="card.hanzi"
                  class="flex items-center justify-between p-2 rounded-xl bg-orange-50/40 border border-orange-200/80 group"
                >
                  <div class="flex items-center gap-2 min-w-0">
                    <ToneChar
                      :hanzi="card.hanzi"
                      :pinyin="card.pinyin"
                      :definition="card.definition"
                      :showPinyin="false"
                    />
                    <div class="flex flex-col min-w-0">
                      <span class="text-xs font-semibold text-slate-800 truncate">{{ card.definition }}</span>
                      <span v-if="card.pinyin" class="text-[10px] font-mono text-slate-500 truncate">
                        {{ Array.isArray(card.pinyin) ? card.pinyin.join(' ') : card.pinyin }}
                      </span>
                    </div>
                  </div>

                  <button
                    @click="toggleCardInSelection(card)"
                    class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 text-xs px-1 transition-opacity cursor-pointer"
                    title="Quitar del lote"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <!-- Collapsible Character Picker -->
              <div v-if="showCharacterPicker" class="mt-3 p-3 bg-orange-50/50 rounded-xl border border-orange-200 space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                <span class="text-[11px] text-slate-600 block mb-1">Haz clic para agregar o remover del lote:</span>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="card in eligibleCards"
                    :key="card.hanzi"
                    @click="toggleCardInSelection(card)"
                    :class="[
                      'px-2 py-1 rounded-lg text-xs font-serif flex items-center gap-1.5 border transition-all cursor-pointer',
                      selectedCards.some(c => c.hanzi === card.hanzi)
                        ? 'bg-orange-500 border-orange-500 text-white font-bold'
                        : 'bg-white border-orange-200 text-slate-700 hover:bg-orange-50'
                    ]"
                  >
                    <span>{{ card.hanzi }}</span>
                    <span class="text-[10px] font-sans" :class="selectedCards.some(c => c.hanzi === card.hanzi) ? 'text-orange-100' : 'text-slate-500'">({{ card.definition }})</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 2: Format & Topic Configuration -->
          <div class="bg-white rounded-2xl p-5 border border-orange-200 shadow-lg shadow-orange-500/5 space-y-4">
            <div class="border-b border-orange-100 pb-3">
              <span class="text-xs uppercase font-extrabold text-orange-600 tracking-wider">Paso 2: Formato y Temática</span>
              <p class="text-xs text-slate-500">Elige si quieres un cuento tradicional, una anécdota o una noticia informativa.</p>
            </div>

            <!-- Genre Selection Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                v-for="g in genres"
                :key="g.id"
                type="button"
                @click="selectedGenre = g.id"
                :class="[
                  'p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1',
                  selectedGenre === g.id
                    ? 'bg-orange-50 border-orange-500 shadow-sm ring-1 ring-orange-400'
                    : 'bg-white hover:bg-orange-50/40 border-orange-200 text-slate-600 hover:text-slate-800'
                ]"
              >
                <div class="flex items-center gap-2">
                  <span class="text-xl">{{ g.icon }}</span>
                  <span class="text-sm font-bold text-slate-900">{{ g.label }}</span>
                </div>
                <p class="text-[11px] text-slate-500 leading-snug">{{ g.description }}</p>
              </button>
            </div>

            <!-- User Topic / Idea Prompt Input -->
            <div class="space-y-1">
              <label class="block text-xs font-semibold text-slate-700">
                💡 Idea o tema opcional para la historia (guía a la IA):
              </label>
              <input
                type="text"
                v-model="userIdea"
                placeholder="Ej. 'Un restaurante misterioso en Shanghai que sirve té gratis' o 'Una noticia sobre arqueología china'"
                class="w-full px-3.5 py-2 bg-white border border-orange-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>

            <!-- UI/UX Transparency Directive: System Prompt & Readonly Schema Accordion -->
            <div class="border border-orange-200 rounded-xl overflow-hidden bg-orange-50/40">
              <button
                type="button"
                @click="showPromptSettings = !showPromptSettings"
                class="w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-slate-600 hover:text-orange-700 transition-colors cursor-pointer"
              >
                <span class="flex items-center gap-1.5 font-semibold">
                  <span>⚙️</span> Transparencia de IA (Instrucciones & Esquema Estructural)
                </span>
                <span class="text-orange-600 font-mono text-[11px]">
                  {{ showPromptSettings ? 'Ocultar ▲' : 'Ver / Editar ▼' }}
                </span>
              </button>

              <div v-if="showPromptSettings" class="p-3 border-t border-orange-200/70 space-y-3">
                <!-- Editable System Prompt -->
                <div class="space-y-1">
                  <span class="text-[11px] font-bold text-orange-700">1. System Prompt Pedagógico (Editable):</span>
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

                <!-- Readonly Structural Schema with Lock Icon & Justification -->
                <div class="space-y-1 border-t border-orange-200/60 pt-2">
                  <div class="flex items-center gap-1 text-[11px] font-bold text-amber-700">
                    <span>🔒</span>
                    <span>2. Esquema Estructural del Modelo (Solo Lectura):</span>
                  </div>
                  <pre class="w-full p-2.5 bg-white/80 text-slate-600 text-[10px] font-mono rounded-lg border border-orange-200 whitespace-pre-wrap select-all cursor-not-allowed">{{ readonlySchemaNote }}</pre>
                </div>
              </div>
            </div>

            <!-- Action Button: Redactar con IA -->
            <div class="pt-2">
              <Button
                variant="primary"
                @click="handleGenerateStory"
                :isLoading="isGenerating"
                :disabled="isGenerating || selectedCards.length === 0"
                class="w-full py-3.5 bg-orange-500 hover:bg-orange-600 border-none text-white font-bold shadow-sm flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <span>✨</span>
                <span>{{ currentStoryDraft ? 'Regenerar otra versión con este lote' : 'Redactar con IA (' + selectedCards.length + ' caracteres dominados)' }}</span>
              </Button>
            </div>

            <!-- Error Banner -->
            <div v-if="generationError" class="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center justify-between">
              <span>⚠️ {{ generationError }}</span>
              <button @click="handleGenerateStory" class="underline font-bold ml-2">Reintentar</button>
            </div>
          </div>

          <!-- Step 3: Generated Story Draft Preview -->
          <div v-if="currentStoryDraft" class="bg-white rounded-3xl p-6 sm:p-10 border border-orange-200 shadow-xl shadow-orange-500/5 space-y-6 animate-fade-in">
            <!-- Story Header & Controls -->
            <div class="border-b border-orange-100 pb-6 text-center space-y-3">
              <div class="flex items-center justify-center gap-2">
                <span class="px-3 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1" :class="getGenreBadge(currentStoryDraft.genre).class">
                  <span>{{ getGenreBadge(currentStoryDraft.genre).icon }}</span>
                  <span>{{ getGenreBadge(currentStoryDraft.genre).label }}</span>
                </span>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 border border-orange-300 text-orange-700 font-mono">
                  Borrador Listo
                </span>
              </div>

              <h2 class="text-3xl sm:text-4xl font-serif font-bold text-slate-900 tracking-wide">
                {{ currentStoryDraft.title }}
              </h2>

              <p v-if="currentStoryDraft.summary" class="text-sm sm:text-base text-slate-600 italic max-w-xl mx-auto leading-relaxed">
                {{ currentStoryDraft.summary }}
              </p>

              <!-- Global Pinyin Toggle -->
              <div class="pt-2 flex justify-center">
                <button
                  @click="globalShowPinyin = !globalShowPinyin"
                  class="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                >
                  <span>{{ globalShowPinyin ? '👁️ Pinyin visible' : '🙈 Pinyin oculto' }}</span>
                </button>
              </div>
            </div>

            <!-- Rendered Paragraphs with ToneChar -->
            <div class="space-y-5 text-slate-800 text-lg leading-relaxed font-sans">
              <div
                v-for="(paragraph, pIdx) in currentStoryDraft.paragraphs"
                :key="pIdx"
                class="p-4 sm:p-5 rounded-2xl bg-orange-50/40 border border-orange-100"
              >
                <div class="text-[10px] uppercase font-bold tracking-widest text-orange-600 mb-1 font-mono">
                  Párrafo {{ pIdx + 1 }}
                </div>
                <p class="leading-loose">
                  <template v-for="(token, tIdx) in parseParagraphTokens(paragraph, currentStoryDraft.targetCharacters)" :key="tIdx">
                    <ToneChar
                      v-if="token.isTarget && token.target"
                      :hanzi="token.target.hanzi"
                      :pinyin="token.target.pinyin"
                      :definition="token.target.definition"
                      :showPinyin="globalShowPinyin"
                    />
                    <span v-else>{{ token.text }}</span>
                  </template>
                </p>
              </div>
            </div>

            <!-- Footer Actions -->
            <div class="pt-4 border-t border-orange-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div class="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="primary"
                  @click="handleSaveDraft"
                  class="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 border-none text-white font-bold"
                >
                  <span>{{ savedToast ? '✓ ¡Guardado en Biblioteca!' : '💾 Guardar en mis Historias' }}</span>
                </Button>

                <Button
                  variant="outline"
                  @click="readingStory = currentStoryDraft"
                  class="flex-1 sm:flex-none flex items-center justify-center gap-1.5 border-orange-300 text-orange-700 hover:bg-orange-50"
                >
                  <span>📖 Modo Lectura</span>
                </Button>
              </div>

              <Button
                variant="ghost"
                @click="handleGenerateStory"
                :disabled="isGenerating"
                class="w-full sm:w-auto text-slate-500 hover:text-orange-700 text-xs"
              >
                <span>🔄 Probar otra redacción</span>
              </Button>
            </div>
          </div>
        </div>

        <!-- TAB 2: LIBRARY -->
        <div v-else class="max-w-6xl mx-auto space-y-6">
          <!-- Library Filter & New Button Bar -->
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <!-- Filter Pills -->
            <div class="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-orange-200 shadow-sm">
              <button
                @click="libraryGenreFilter = 'ALL'"
                :class="[
                  'px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
                  libraryGenreFilter === 'ALL'
                    ? 'bg-orange-500 text-white shadow'
                    : 'text-slate-600 hover:text-orange-700'
                ]"
              >
                Todos ({{ stories.length }})
              </button>
              <button
                @click="libraryGenreFilter = 'cuento'"
                :class="[
                  'px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1',
                  libraryGenreFilter === 'cuento'
                    ? 'bg-orange-100 text-orange-800 border border-orange-300'
                    : 'text-slate-600 hover:text-orange-700'
                ]"
              >
                <span>📖 Cuentos</span>
              </button>
              <button
                @click="libraryGenreFilter = 'historia'"
                :class="[
                  'px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1',
                  libraryGenreFilter === 'historia'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'text-slate-600 hover:text-orange-700'
                ]"
              >
                <span>☕ Historias</span>
              </button>
              <button
                @click="libraryGenreFilter = 'noticia'"
                :class="[
                  'px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1',
                  libraryGenreFilter === 'noticia'
                    ? 'bg-orange-100 text-orange-800 border border-orange-300'
                    : 'text-slate-600 hover:text-orange-700'
                ]"
              >
                <span>📰 Noticias</span>
              </button>
            </div>

            <!-- Manual Add Story Button -->
            <Button variant="secondary" @click="showAddModal = true" class="flex items-center gap-1 text-xs">
              <span class="text-sm">+</span> Añadir Cuento Manual
            </Button>
          </div>

          <!-- Empty State -->
          <div v-if="filteredStories.length === 0" class="p-12 text-center text-slate-500 bg-white rounded-3xl border border-orange-200 border-dashed space-y-3">
            <span class="text-5xl block">📖</span>
            <p class="text-xl font-medium text-slate-700">No hay historias guardadas en esta categoría.</p>
            <p class="text-sm text-slate-500 max-w-md mx-auto">
              Utiliza el <button @click="activeTab = 'AI_STUDIO'" class="text-orange-600 underline font-bold">Redactor IA</button> para crear un cuento o noticia a partir de tus caracteres dominados.
            </p>
          </div>

          <!-- Stories Grid -->
          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div
              v-for="story in filteredStories"
              :key="story.id"
              class="bg-white rounded-2xl p-6 border border-orange-200/80 shadow-lg shadow-orange-500/5 hover:border-orange-400 transition-all flex flex-col group justify-between"
            >
              <div class="space-y-3">
                <div class="flex items-start justify-between gap-2">
                  <span
                    class="px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1"
                    :class="getGenreBadge(story.genre).class"
                  >
                    <span>{{ getGenreBadge(story.genre).icon }}</span>
                    <span>{{ getGenreBadge(story.genre).label }}</span>
                  </span>

                  <span v-if="story.targetCharacters && story.targetCharacters.length > 0" class="text-[11px] text-orange-600 font-mono font-semibold">
                    🎯 {{ story.targetCharacters.length }} caracteres
                  </span>
                </div>

                <h2 class="text-xl font-serif font-bold text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-2">
                  {{ story.title }}
                </h2>

                <p v-if="story.summary" class="text-xs text-slate-500 line-clamp-2 leading-relaxed italic">
                  {{ story.summary }}
                </p>
                <p v-else-if="story.titleTranslation" class="text-xs text-slate-500 line-clamp-2">
                  {{ story.titleTranslation }}
                </p>

                <!-- Character Chips Preview -->
                <div v-if="story.targetCharacters && story.targetCharacters.length > 0" class="flex flex-wrap gap-1 pt-1">
                  <span
                    v-for="c in story.targetCharacters.slice(0, 7)"
                    :key="c.hanzi"
                    class="px-1.5 py-0.5 rounded bg-orange-50 border border-orange-200 text-[11px] font-serif text-orange-800"
                  >
                    {{ c.hanzi }}
                  </span>
                  <span v-if="story.targetCharacters.length > 7" class="text-[10px] text-slate-400 self-center">
                    +{{ story.targetCharacters.length - 7 }}
                  </span>
                </div>
              </div>

              <div class="pt-6 mt-4 border-t border-orange-100 flex items-center gap-2">
                <Button variant="primary" @click="readingStory = story" class="flex-1 bg-orange-500 hover:bg-orange-600 border-none text-white text-xs py-2">
                  Leer Relato
                </Button>
                <Button variant="outline" @click="editingStory = { ...story }" class="border-orange-200 text-slate-700 hover:bg-orange-50 text-xs px-3">
                  Editar
                </Button>
                <Button v-if="story.id" variant="outline" @click="handleDelete(story.id)" class="border-orange-200 text-rose-500 hover:bg-rose-50 text-xs px-2.5">
                  ✕
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- Add Story Modal (Manual) -->
      <div v-if="showAddModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
        <div class="bg-white border border-orange-200 rounded-2xl p-6 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar text-slate-900">
          <h2 class="text-2xl font-bold mb-4">Añadir Cuento Manual</h2>
          <form @submit.prevent="handleAddSubmit" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium mb-1">Título</label>
                <input type="text" required v-model="newStory.title" class="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">Género</label>
                <select v-model="newStory.genre" class="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none">
                  <option value="cuento">Cuento</option>
                  <option value="historia">Historia</option>
                  <option value="noticia">Noticia</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium mb-1">Contenido</label>
              <textarea required rows="6" v-model="newStory.content" class="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Párrafos del cuento o noticia..." />
            </div>

            <div>
              <label class="block text-sm font-medium mb-1">Traducción o Notas</label>
              <textarea rows="3" v-model="newStory.translation" class="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
            </div>

            <div class="flex gap-3 pt-2">
              <Button type="button" variant="ghost" @click="showAddModal = false" class="flex-1">Cancelar</Button>
              <Button type="submit" variant="primary" class="flex-1 bg-orange-500 text-white">Guardar</Button>
            </div>
          </form>
        </div>
      </div>

      <!-- Edit Story Modal -->
      <div v-if="editingStory" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
        <div class="bg-white border border-orange-200 rounded-2xl p-6 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar text-slate-900">
          <h2 class="text-2xl font-bold mb-4">Editar Relato</h2>
          <form @submit.prevent="handleEditSubmit" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium mb-1">Título</label>
                <input type="text" required v-model="editingStory.title" class="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">Género</label>
                <select v-model="editingStory.genre" class="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none">
                  <option value="cuento">Cuento</option>
                  <option value="historia">Historia</option>
                  <option value="noticia">Noticia</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium mb-1">Bajada / Resumen</label>
              <input type="text" v-model="editingStory.summary" class="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
            </div>

            <div>
              <label class="block text-sm font-medium mb-1">Contenido</label>
              <textarea required rows="6" v-model="editingStory.content" class="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
            </div>

            <div>
              <label class="block text-sm font-medium mb-1">Traducción o Notas</label>
              <textarea rows="3" v-model="editingStory.translation" class="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
            </div>

            <div class="flex gap-3 pt-2">
              <Button type="button" variant="ghost" @click="editingStory = null" class="flex-1">Cancelar</Button>
              <Button type="submit" variant="primary" class="flex-1 bg-orange-500 text-white">Guardar Cambios</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
