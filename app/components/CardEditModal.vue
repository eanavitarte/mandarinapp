<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Flashcard, Deck } from '~/types'
import Button from './Button.vue'

const props = defineProps<{
  card: Flashcard | null
  decks?: Deck[]
  activeDeckId?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', id: string, updates: Partial<Flashcard>): void
  (e: 'openDeckManager'): void
}>()

const { formatPinyinDisplay, normalizePinyinArray, convertPinyinToPlain, convertPinyinToNum } = usePinyin()

const availableDecks = computed(() => {
  if (props.decks && props.decks.length > 0) return props.decks
  return [{ id: 'mandarin-general', name: 'Mandarín General', language: 'zh', icon: '🇨🇳' }]
})

const editingCard = ref<any | null>(null)
const showAdvancedFields = ref(false)

watch(
  () => props.card,
  (card) => {
    if (!card) {
      editingCard.value = null
      return
    }
    showAdvancedFields.value = false
    editingCard.value = {
      ...card,
      pinyin: formatPinyinDisplay(card.pinyin),
      pinyinPlain: formatPinyinDisplay(card.pinyinPlain),
      pinyinNum: formatPinyinDisplay(card.pinyinNum),
      definitionEn: card.definitionEn || '',
      deckId: card.deckId || props.activeDeckId || 'mandarin-general',
      category: card.category || '',
      hskLevel: card.hskLevel ?? 1,
      hskOrder: card.hskOrder ?? '',
      meta: {
        ttsUrl: card.meta?.ttsUrl || '',
        syntax: card.meta?.syntax || '',
        hanbanId: card.meta?.hanbanId ?? '',
        levels: card.meta?.levels || []
      },
      knowledgeStatus: card.knowledgeStatus ?? 0,
      srsInterval: card.srsInterval ?? 0,
      srsEase: card.srsEase ?? 2.5,
      srsRepetitions: card.srsRepetitions ?? 0,
      correctCount: card.correctCount ?? 0,
      wrongCount: card.wrongCount ?? 0
    }
  },
  { immediate: true }
)

const autoDerivePinyin = () => {
  if (!editingCard.value || !editingCard.value.pinyin) return
  const plainArray = convertPinyinToPlain(editingCard.value.pinyin, editingCard.value.hanzi)
  const numArray = convertPinyinToNum(editingCard.value.pinyin, editingCard.value.hanzi)
  editingCard.value.pinyinPlain = plainArray.join(' ')
  editingCard.value.pinyinNum = numArray.join(' ')
}

const handleEditSubmit = () => {
  if (!editingCard.value || !editingCard.value.id) return

  const pinyinArray = editingCard.value.pinyin
    ? normalizePinyinArray(editingCard.value.pinyin, editingCard.value.hanzi)
    : undefined
  const pinyinPlainArray = editingCard.value.pinyinPlain
    ? normalizePinyinArray(editingCard.value.pinyinPlain, editingCard.value.hanzi)
    : undefined
  const pinyinNumArray = editingCard.value.pinyinNum
    ? normalizePinyinArray(editingCard.value.pinyinNum, editingCard.value.hanzi)
    : undefined

  const rawMeta = editingCard.value.meta
  const cleanMeta = rawMeta
    ? {
        ttsUrl: rawMeta.ttsUrl ? String(rawMeta.ttsUrl).trim() : '',
        syntax: rawMeta.syntax ? String(rawMeta.syntax).trim() : '',
        ...(rawMeta.hanbanId !== '' && rawMeta.hanbanId !== undefined && rawMeta.hanbanId !== null
          ? { hanbanId: Number(rawMeta.hanbanId) }
          : {}),
        levels: rawMeta.levels || []
      }
    : undefined

  emit('save', editingCard.value.id, {
    deckId: editingCard.value.deckId || props.activeDeckId || 'mandarin-general',
    type: editingCard.value.type || 'word',
    hanzi: editingCard.value.hanzi,
    definition: editingCard.value.definition,
    definitionEn: editingCard.value.definitionEn ? String(editingCard.value.definitionEn).trim() : undefined,
    pinyin: pinyinArray && pinyinArray.length > 0 ? pinyinArray : undefined,
    pinyinPlain: pinyinPlainArray && pinyinPlainArray.length > 0 ? pinyinPlainArray : undefined,
    pinyinNum: pinyinNumArray && pinyinNumArray.length > 0 ? pinyinNumArray : undefined,
    category: editingCard.value.category || undefined,
    hskLevel: Number(editingCard.value.hskLevel),
    hskOrder: editingCard.value.hskOrder ? Number(editingCard.value.hskOrder) : undefined,
    meta: cleanMeta,
    knowledgeStatus: editingCard.value.knowledgeStatus !== undefined ? Number(editingCard.value.knowledgeStatus) : 0,
    srsInterval: editingCard.value.srsInterval !== undefined ? Number(editingCard.value.srsInterval) : 0,
    srsEase: editingCard.value.srsEase !== undefined ? Number(editingCard.value.srsEase) : 2.5,
    srsRepetitions: editingCard.value.srsRepetitions !== undefined ? Number(editingCard.value.srsRepetitions) : 0,
    correctCount: editingCard.value.correctCount !== undefined ? Number(editingCard.value.correctCount) : 0,
    wrongCount: editingCard.value.wrongCount !== undefined ? Number(editingCard.value.wrongCount) : 0
  })
}
</script>

<template>
  <div v-if="editingCard" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
    <div class="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl">
      <div class="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
        <div>
          <h2 class="text-xl font-bold text-slate-900">Editar Tarjeta</h2>
          <p class="text-xs text-slate-500">Modifica los detalles básicos y los campos avanzados de la palabra.</p>
        </div>
        <button
          type="button"
          @click="emit('close')"
          class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg text-lg transition-colors"
        >
          ✕
        </button>
      </div>

      <form @submit.prevent="handleEditSubmit" class="flex flex-col flex-1 overflow-hidden">
        <div class="overflow-y-auto pr-2 space-y-4 max-h-[calc(92vh-180px)]">
          <!-- Mazo -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-sm font-medium text-slate-700">Mazo de Pertenencia</label>
              <button
                type="button"
                @click="emit('openDeckManager')"
                class="text-xs text-orange-600 hover:text-orange-800 font-medium"
              >
                + Crear / Gestionar Mazos
              </button>
            </div>
            <select
              v-model="editingCard.deckId"
              class="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 bg-white font-medium"
            >
              <option v-for="d in availableDecks" :key="d.id" :value="d.id">
                {{ d.icon || '📁' }} {{ d.name }}
              </option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Tipo de Tarjeta</label>
              <select
                v-model="editingCard.type"
                class="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 bg-white"
              >
                <option value="word">Palabra</option>
                <option value="sentence">Oración (Sentence)</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Caracter (Hanzi)</label>
              <input
                type="text"
                required
                v-model="editingCard.hanzi"
                class="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 font-medium"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Pinyin (con tildes)</label>
              <input
                type="text"
                v-model="editingCard.pinyin"
                placeholder="ej. xiǎo péng yǒu"
                class="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
              <input
                type="text"
                v-model="editingCard.category"
                placeholder="ej. Sustantivo, Verbo"
                class="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Definición / Traducción (Español)</label>
            <input
              type="text"
              required
              v-model="editingCard.definition"
              class="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Nivel HSK</label>
              <select
                v-model="editingCard.hskLevel"
                class="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 bg-white"
              >
                <option v-for="level in [1, 2, 3, 4, 5, 6]" :key="level" :value="level">HSK {{ level }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Orden HSK (#)</label>
              <input
                type="number"
                v-model="editingCard.hskOrder"
                class="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900"
              />
            </div>
          </div>

          <!-- Botón Desplegable para Campos Avanzados -->
          <div class="pt-2">
            <button
              type="button"
              @click="showAdvancedFields = !showAdvancedFields"
              class="w-full flex items-center justify-between px-4 py-2.5 bg-orange-50/60 hover:bg-orange-100/60 border border-orange-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors"
            >
              <span class="flex items-center gap-2">
                <span>⚙️</span>
                <span>{{ showAdvancedFields ? 'Ocultar campos avanzados' : 'Mostrar todos los campos (Pinyin detallado, Meta Hanban, SRS)' }}</span>
              </span>
              <span class="text-xs text-orange-600 font-bold">{{ showAdvancedFields ? '▲ Plegar' : '▼ Ver todo' }}</span>
            </button>
          </div>

          <!-- Sección Avanzada -->
          <div v-if="showAdvancedFields" class="space-y-4 pt-1 animate-fade-in">
            <!-- Bloque 1: Fonética Detallada -->
            <div class="bg-orange-50/70 border border-orange-200 rounded-xl p-3.5 space-y-3">
              <div class="flex items-center justify-between">
                <h3 class="text-xs font-bold uppercase tracking-wider text-orange-900 flex items-center gap-1.5">
                  <span>🔊</span> Fonética Detallada
                </h3>
                <button
                  type="button"
                  @click="autoDerivePinyin"
                  class="text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 font-medium px-2.5 py-1 rounded-md transition-colors flex items-center gap-1"
                  title="Calcula automáticamente el Pinyin plano y numérico a partir del Pinyin con tildes"
                >
                  <span>⚡</span> Autocalcular desde Pinyin
                </button>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-slate-600 mb-1">Pinyin Plano (sin tonos)</label>
                  <input
                    type="text"
                    v-model="editingCard.pinyinPlain"
                    placeholder="ej. xiao peng you"
                    class="w-full px-3 py-1.5 text-sm border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 bg-white"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-600 mb-1">Pinyin Numérico (1-5)</label>
                  <input
                    type="text"
                    v-model="editingCard.pinyinNum"
                    placeholder="ej. xiao3 peng2 you5"
                    class="w-full px-3 py-1.5 text-sm border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 bg-white"
                  />
                </div>
              </div>
            </div>

            <!-- Bloque 2: Metadatos Oficiales Hanban -->
            <div class="bg-amber-50/70 border border-amber-100 rounded-xl p-3.5 space-y-3">
              <h3 class="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                <span>🏛️</span> Metadatos Oficiales Hanban
              </h3>
              <div>
                <label class="block text-xs font-medium text-slate-600 mb-1">Traducción Oficial en Inglés</label>
                <input
                  type="text"
                  v-model="editingCard.definitionEn"
                  placeholder="ej. child; children"
                  class="w-full px-3 py-1.5 text-sm border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 bg-white"
                />
              </div>
              <div class="grid grid-cols-3 gap-3">
                <div>
                  <label class="block text-xs font-medium text-slate-600 mb-1">Sintaxis China</label>
                  <input
                    type="text"
                    v-model="editingCard.meta.syntax"
                    placeholder="ej. 名, 动"
                    class="w-full px-3 py-1.5 text-sm border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 bg-white"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-600 mb-1">Hanban ID (#)</label>
                  <input
                    type="number"
                    v-model="editingCard.meta.hanbanId"
                    placeholder="ej. 1025"
                    class="w-full px-3 py-1.5 text-sm border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 bg-white"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-600 mb-1">URL Audio TTS</label>
                  <input
                    type="text"
                    v-model="editingCard.meta.ttsUrl"
                    placeholder="https://..."
                    class="w-full px-3 py-1.5 text-sm border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 bg-white"
                  />
                </div>
              </div>
            </div>

            <!-- Bloque 3: Algoritmo SRS y Progreso -->
            <div class="bg-orange-50/70 border border-orange-200 rounded-xl p-3.5 space-y-3">
              <h3 class="text-xs font-bold uppercase tracking-wider text-orange-900 flex items-center gap-1.5">
                <span>📈</span> Progreso y Algoritmo SRS
              </h3>
              <div class="grid grid-cols-3 gap-3">
                <div>
                  <label class="block text-xs font-medium text-slate-600 mb-1">Estado Estudio</label>
                  <select
                    v-model="editingCard.knowledgeStatus"
                    class="w-full px-3 py-1.5 text-sm border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 bg-white"
                  >
                    <option :value="0">0 - Nuevo</option>
                    <option :value="1">1 - En Aprendizaje</option>
                    <option :value="2">2 - Dominado</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-600 mb-1">Intervalo (días)</label>
                  <input
                    type="number"
                    v-model="editingCard.srsInterval"
                    class="w-full px-3 py-1.5 text-sm border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 bg-white"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-600 mb-1">Facilidad (Ease)</label>
                  <input
                    type="number"
                    step="0.1"
                    v-model="editingCard.srsEase"
                    class="w-full px-3 py-1.5 text-sm border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 bg-white"
                  />
                </div>
              </div>
              <div class="grid grid-cols-3 gap-3">
                <div>
                  <label class="block text-xs font-medium text-slate-600 mb-1">Repeticiones</label>
                  <input
                    type="number"
                    v-model="editingCard.srsRepetitions"
                    class="w-full px-3 py-1.5 text-sm border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 bg-white"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-600 mb-1">Aciertos (#)</label>
                  <input
                    type="number"
                    v-model="editingCard.correctCount"
                    class="w-full px-3 py-1.5 text-sm border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 bg-white"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-600 mb-1">Fallos (#)</label>
                  <input
                    type="number"
                    v-model="editingCard.wrongCount"
                    class="w-full px-3 py-1.5 text-sm border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex gap-3 pt-4 border-t border-slate-100 mt-2">
          <Button
            type="button"
            variant="ghost"
            @click="emit('close')"
            class="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            class="flex-1 bg-orange-500 hover:bg-orange-600 border-none text-white"
          >
            Guardar
          </Button>
        </div>
      </form>
    </div>
  </div>
</template>
