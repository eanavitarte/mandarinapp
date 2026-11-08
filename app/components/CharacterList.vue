<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Flashcard, Deck } from '~/types'
import Button from './Button.vue'

const { formatPinyinDisplay, normalizePinyinArray, convertPinyinToPlain, convertPinyinToNum } = usePinyin()

const props = defineProps<{
  deck: Flashcard[]
  decks?: Deck[]
  activeDeckId?: string
  activeDeck?: Deck
}>()

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'addCard', card: Flashcard): void
  (e: 'editCard', id: string, updates: Partial<Flashcard>): void
  (e: 'deleteCard', id: string): void
  (e: 'aiAddCard', word: string): void
  (e: 'openImport'): void
  (e: 'openDeckManager'): void
}>()

const availableDecks = computed(() => {
  if (props.decks && props.decks.length > 0) return props.decks
  return [{ id: 'mandarin-general', name: 'Mandarín General', language: 'zh', icon: '🇨🇳' }]
})

const getDeckInfo = (deckId?: string) => {
  const targetId = deckId || props.activeDeckId || 'mandarin-general'
  return availableDecks.value.find(d => d.id === targetId) || { name: 'Mandarín General', icon: '🇨🇳' }
}

const showAddModal = ref(false)
const aiWord = ref('')
const isAILoading = ref(false)

const typeFilter = ref<'all' | 'word' | 'sentence'>('all')
const hskFilter = ref<'all' | number>('all')
const deckFilter = ref<string>('all')
const sortBy = ref<'hsk' | 'status' | 'due' | 'alphabetical'>('hsk')

const newCard = ref({
  deckId: props.activeDeckId || 'mandarin-general',
  hanzi: '',
  pinyin: '',
  definition: '',
  hskLevel: 1,
  hskOrder: '',
  category: '',
  type: 'word' as 'word' | 'sentence'
})

const editingCard = ref<any | null>(null)
const showAdvancedFields = ref(false)

const startEdit = (card: Flashcard) => {
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
}

const autoDerivePinyin = () => {
  if (!editingCard.value || !editingCard.value.pinyin) return
  const plainArray = convertPinyinToPlain(editingCard.value.pinyin, editingCard.value.hanzi)
  const numArray = convertPinyinToNum(editingCard.value.pinyin, editingCard.value.hanzi)
  editingCard.value.pinyinPlain = plainArray.join(' ')
  editingCard.value.pinyinNum = numArray.join(' ')
}

const handleAddSubmit = () => {
  if (!newCard.value.hanzi || !newCard.value.definition) return

  const pinyinArray = newCard.value.pinyin ? normalizePinyinArray(newCard.value.pinyin) : undefined

  emit('addCard', {
    deckId: newCard.value.deckId || props.activeDeckId || 'mandarin-general',
    hanzi: newCard.value.hanzi,
    definition: newCard.value.definition,
    pinyin: pinyinArray && pinyinArray.length > 0 ? pinyinArray : undefined,
    hskLevel: Number(newCard.value.hskLevel),
    hskOrder: newCard.value.hskOrder ? Number(newCard.value.hskOrder) : undefined,
    category: newCard.value.category || undefined,
    type: newCard.value.type
  })

  newCard.value = { 
    deckId: props.activeDeckId || 'mandarin-general',
    hanzi: '', 
    pinyin: '', 
    definition: '', 
    hskLevel: 1, 
    hskOrder: '', 
    category: '', 
    type: 'word' 
  }
  showAddModal.value = false
}

const handleEditSubmit = () => {
  if (!editingCard.value || !editingCard.value.id) return
  
  const pinyinArray = editingCard.value.pinyin ? normalizePinyinArray(editingCard.value.pinyin, editingCard.value.hanzi) : undefined
  const pinyinPlainArray = editingCard.value.pinyinPlain ? normalizePinyinArray(editingCard.value.pinyinPlain, editingCard.value.hanzi) : undefined
  const pinyinNumArray = editingCard.value.pinyinNum ? normalizePinyinArray(editingCard.value.pinyinNum, editingCard.value.hanzi) : undefined

  const rawMeta = editingCard.value.meta
  const cleanMeta = rawMeta ? {
    ttsUrl: rawMeta.ttsUrl ? String(rawMeta.ttsUrl).trim() : '',
    syntax: rawMeta.syntax ? String(rawMeta.syntax).trim() : '',
    ...(rawMeta.hanbanId !== '' && rawMeta.hanbanId !== undefined && rawMeta.hanbanId !== null
      ? { hanbanId: Number(rawMeta.hanbanId) }
      : {}),
    levels: rawMeta.levels || []
  } : undefined

  emit('editCard', editingCard.value.id, {
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
  editingCard.value = null
}

const handleDelete = (id: string) => {
  if (window.confirm("Are you sure you want to delete this card?")) {
    emit('deleteCard', id)
  }
}

const handleAIAddSubmit = async () => {
  if (!aiWord.value.trim()) return
  
  isAILoading.value = true
  try {
    emit('aiAddCard', aiWord.value.trim())
    aiWord.value = ''
  } catch (err) {
    console.error("Failed to add AI card:", err)
    alert("Error generating card. Please try again.")
  } finally {
    isAILoading.value = false
  }
}

// Helper to format due date
const formatDueDate = (dateStr?: string) => {
  if (!dateStr) return 'Pendiente'
  const diff = new Date(dateStr).getTime() - Date.now()
  if (diff <= 0) return 'Hoy'
  const days = Math.ceil(diff / (24 * 60 * 60 * 1000))
  if (days === 1) return 'Mañana'
  if (days >= 30) {
    const months = Math.floor(days / 30)
    return `En ${months} mes${months > 1 ? 'es' : ''}`
  }
  return `En ${days} días`
}

// Helper to determine status color
const getStatusColor = (status: number = 0) => {
  if (status >= 100) return 'bg-orange-100 text-orange-700 border-orange-300'
  if (status >= 75) return 'bg-amber-100 text-amber-700 border-amber-300'
  if (status >= 50) return 'bg-orange-50 text-orange-600 border-orange-200'
  if (status >= 25) return 'bg-amber-50 text-amber-600 border-amber-200'
  return 'bg-slate-100 text-slate-500 border-slate-200'
}

// Filter and sort deck
const filteredAndSortedDeck = computed(() => {
  let result = [...props.deck]
  
  if (typeFilter.value !== 'all') {
    result = result.filter(c => (c.type || 'word') === typeFilter.value)
  }

  if (hskFilter.value !== 'all') {
    result = result.filter(c => (c.hskLevel || 1) === Number(hskFilter.value))
  }

  if (deckFilter.value !== 'all') {
    result = result.filter(c => (c.deckId || 'mandarin-general') === deckFilter.value)
  }
  
  result.sort((a, b) => {
    if (sortBy.value === 'status') {
      return (a.knowledgeStatus || 0) - (b.knowledgeStatus || 0)
    }
    if (sortBy.value === 'due') {
      const dateA = a.srsNextDueDate ? new Date(a.srsNextDueDate).getTime() : 0
      const dateB = b.srsNextDueDate ? new Date(b.srsNextDueDate).getTime() : 0
      return dateA - dateB
    }
    if (sortBy.value === 'alphabetical') {
      return a.hanzi.localeCompare(b.hanzi)
    }
    // HSK Order: Prioritize hskLevel first, then hskOrder
    const levelA = a.hskLevel || 1
    const levelB = b.hskLevel || 1
    if (levelA !== levelB) return levelA - levelB

    if (a.hskOrder !== undefined && b.hskOrder !== undefined) return a.hskOrder - b.hskOrder
    if (a.hskOrder !== undefined) return -1
    if (b.hskOrder !== undefined) return 1

    return (a._originalIndex || 0) - (b._originalIndex || 0)
  })
  
  return result
})
</script>

<template>
  <div class="flex flex-col h-full bg-white text-slate-800 overflow-hidden animate-fade-in relative z-40">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between p-6 border-b border-slate-200 bg-white z-10 gap-4 shadow-sm">
      <div class="flex items-center gap-3">
          <span class="text-3xl p-1.5 bg-orange-50 rounded-xl border border-orange-200">
            📖
          </span>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h2 class="text-2xl font-serif font-bold text-slate-900">Vocabulario & Diccionario</h2>
              <span class="text-xs px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200 font-semibold">
                🇨🇳 Chino Mandarín
              </span>
            </div>
            <p class="text-xs text-slate-500">Gestiona, filtra y revisa las tarjetas de todos tus mazos</p>
          </div>
      </div>
      
      <div class="flex flex-wrap gap-2 items-center">
          <form @submit.prevent="handleAIAddSubmit" class="flex gap-2">
              <input 
                  type="text" 
                  v-model="aiWord" 
                  placeholder="Palabra en Español..." 
                  class="px-3 py-1.5 border border-orange-200 bg-white text-slate-800 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm w-40"
                  :disabled="isAILoading"
              />
              <Button type="submit" variant="primary" class="flex items-center gap-1 bg-orange-500 hover:bg-orange-600 border-none text-white" :isLoading="isAILoading">
                  ✨ IA Add
              </Button>
          </form>
          <div class="w-px h-6 bg-orange-200 mx-1 hidden md:block"></div>
          <Button variant="outline" @click="emit('openDeckManager')" class="flex items-center gap-1.5 border-orange-200 text-slate-700 hover:text-orange-700 hover:bg-orange-50">
            🗂️ Mazos
          </Button>
          <Button variant="outline" @click="emit('openImport')" class="flex items-center gap-1.5 border-orange-300 text-orange-700 hover:bg-orange-50">
            📥 Importar Lote
          </Button>
          <Button variant="secondary" @click="showAddModal = true" class="flex items-center gap-1">
            <span class="text-lg">+</span> Añadir Tarjeta
          </Button>
          <Button variant="outline" @click="emit('back')" class="flex items-center gap-2 border-orange-200 text-slate-700 hover:text-orange-700 hover:bg-orange-50">
            <span class="text-xl">←</span> Inicio
          </Button>
      </div>
    </div>
    
    <!-- Filters and Sorting Row -->
    <div class="flex flex-wrap items-center justify-between px-6 py-3.5 bg-orange-50/60 border-b border-orange-100 gap-4">
      <div class="flex items-center gap-4 flex-wrap">
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-600 uppercase tracking-widest font-semibold">Mazo:</span>
          <select 
            v-model="deckFilter"
            class="bg-white border border-orange-200 text-slate-800 text-xs rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-orange-500 outline-none"
          >
            <option value="all">Todos los mazos</option>
            <option v-for="d in availableDecks" :key="d.id" :value="d.id">
              {{ d.icon || '📁' }} {{ d.name }}
            </option>
          </select>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-600 uppercase tracking-widest font-semibold">Tipo:</span>
          <select 
            v-model="typeFilter"
            class="bg-white border border-orange-200 text-slate-800 text-xs rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-orange-500 outline-none"
          >
            <option value="all">Todos</option>
            <option value="word">Palabras</option>
            <option value="sentence">Oraciones</option>
          </select>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-600 uppercase tracking-widest font-semibold">Nivel HSK:</span>
          <select 
            v-model="hskFilter"
            class="bg-white border border-orange-200 text-slate-800 text-xs rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-orange-500 outline-none"
          >
            <option value="all">Todos los niveles</option>
            <option v-for="lvl in [1, 2, 3, 4, 5, 6]" :key="lvl" :value="lvl">HSK {{ lvl }}</option>
          </select>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-600 uppercase tracking-widest font-semibold">Ordenar por:</span>
          <select 
            v-model="sortBy"
            class="bg-white border border-orange-200 text-slate-800 text-xs rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-orange-500 outline-none"
          >
            <option value="hsk">HSK (Nivel y Orden)</option>
            <option value="status">Dominio (0% - 100%)</option>
            <option value="due">Próximo Repaso</option>
            <option value="alphabetical">Alfabético</option>
          </select>
        </div>
      </div>
      
      <div class="text-xs text-slate-500">
        Mostrando <span class="font-mono font-bold text-orange-600">{{ filteredAndSortedDeck.length }}</span> de <span class="font-mono font-bold text-slate-800">{{ deck.length }}</span> tarjetas
      </div>
    </div>
    
    <!-- Table -->
    <div class="flex-1 overflow-auto p-3 md:p-6 custom-scrollbar">
      <div class="w-full bg-white rounded-xl overflow-x-auto shadow-lg shadow-orange-500/5 border border-orange-200/80 custom-scrollbar">
        <table class="w-full text-left border-collapse min-w-[950px]">
          <thead class="bg-orange-50 text-slate-600 uppercase text-xs tracking-wider font-semibold sticky top-0 z-20">
            <tr>
              <th class="px-3.5 py-3 border-b border-orange-200">Caracter / Oración</th>
              <th class="px-3 py-3 border-b border-orange-200">Tipo</th>
              <th class="px-3 py-3 border-b border-orange-200">Mazo</th>
              <th class="px-3 py-3 border-b border-orange-200">Pinyin</th>
              <th class="px-3 py-3 border-b border-orange-200">Definición / Traducción</th>
              <th class="px-2.5 py-3 border-b border-orange-200 text-center">Dominio</th>
              <th class="px-2.5 py-3 border-b border-orange-200 text-center">Próximo Repaso</th>
              <th class="px-2.5 py-3 border-b border-orange-200 text-center">HSK / Orden</th>
              <th class="px-2.5 py-3 border-b border-orange-200 text-center">Historial</th>
              <th class="px-3 py-3 border-b border-orange-200 text-center sticky right-0 bg-orange-50 z-30 border-l border-orange-200 shadow-[-4px_0_8px_rgba(249,115,22,0.06)]">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-orange-100">
            <tr v-for="(card, idx) in filteredAndSortedDeck" :key="idx" class="hover:bg-orange-50/40 transition-colors group">
              <td class="px-3.5 py-3">
                  <span :class="['font-serif text-orange-600 group-hover:text-orange-700 transition-colors', (card.type || 'word') === 'word' ? 'text-3xl' : 'text-xl']">{{ card.hanzi }}</span>
              </td>
              <td class="px-3 py-3">
                <span :class="['px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap', (card.type || 'word') === 'word' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-amber-50 text-amber-700 border-amber-200']">
                  {{ (card.type || 'word') === 'word' ? 'Palabra' : 'Oración' }}
                </span>
              </td>
              <td class="px-3 py-3">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-orange-50/70 border border-orange-200 text-slate-700 shadow-sm whitespace-nowrap">
                  <span>{{ getDeckInfo(card.deckId).icon || '📁' }}</span>
                  <span class="truncate max-w-[95px]">{{ getDeckInfo(card.deckId).name }}</span>
                </span>
              </td>
              <td class="px-3 py-3 text-slate-600 font-mono text-sm whitespace-nowrap">
                   {{ formatPinyinDisplay(card.pinyin) || '-' }}
              </td>
              <td class="px-3 py-3 text-slate-800 font-medium text-sm max-w-xs truncate" :title="card.definition">
                {{ card.definition }}
              </td>
              <td class="px-2.5 py-3 text-center">
                <span :class="['inline-flex items-center justify-center min-w-[2.75rem] px-2 py-0.5 rounded text-xs font-mono font-bold border', getStatusColor(card.knowledgeStatus)]">
                  {{ card.knowledgeStatus || 0 }}%
                </span>
              </td>
              <td class="px-2.5 py-3 text-center text-slate-600 text-xs whitespace-nowrap">
                {{ formatDueDate(card.srsNextDueDate) }}
              </td>
              <td class="px-2.5 py-3 text-center text-slate-500 text-xs whitespace-nowrap">
                <div class="flex flex-col gap-0.5 items-center">
                  <span v-if="card.hskLevel" class="font-semibold text-slate-700">HSK {{ card.hskLevel }}</span>
                  <span v-if="card.hskOrder" class="text-[10px] text-slate-400">Orden #{{ card.hskOrder }}</span>
                </div>
              </td>
              <td class="px-2.5 py-3 text-center text-xs whitespace-nowrap">
                <div class="flex justify-center gap-2">
                  <span class="text-emerald-600 font-semibold">✓ {{ card.correctCount || 0 }}</span>
                  <span class="text-red-500 font-semibold">✗ {{ card.wrongCount || 0 }}</span>
                </div>
              </td>
              <td class="px-3 py-3 text-center sticky right-0 bg-white group-hover:bg-orange-50/60 transition-colors z-10 border-l border-orange-100 shadow-[-4px_0_8px_rgba(249,115,22,0.04)]">
                <div class="flex justify-center items-center gap-1.5 text-xs whitespace-nowrap">
                  <button 
                    @click="startEdit(card)" 
                    class="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-md border border-orange-200 transition-colors font-medium text-xs"
                  >
                    Editar
                  </button>
                  <button 
                    v-if="card.id" 
                    @click="handleDelete(card.id)" 
                    class="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-md border border-red-200 transition-colors font-mono text-xs"
                    title="Eliminar tarjeta"
                  >
                    Del
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="filteredAndSortedDeck.length === 0" class="p-8 text-center text-slate-500">No hay tarjetas que coincidan con los filtros.</div>
      </div>
    </div>

    <!-- Add Character Modal -->
    <div v-if="showAddModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div class="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 class="text-2xl font-bold text-slate-900 mb-4">Añadir Nueva Tarjeta</h2>
        
        <form @submit.prevent="handleAddSubmit" class="space-y-4">
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-sm font-medium text-slate-700">Mazo de Destino</label>
              <button 
                type="button" 
                @click="emit('openDeckManager')"
                class="text-xs text-orange-600 hover:text-orange-800 font-medium"
              >
                + Gestionar Mazos
              </button>
            </div>
            <select 
              v-model="newCard.deckId"
              class="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 bg-white font-medium"
            >
              <option v-for="d in availableDecks" :key="d.id" :value="d.id">
                {{ d.icon || '📁' }} {{ d.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Tipo de Tarjeta</label>
            <select 
              v-model="newCard.type"
              class="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900"
            >
              <option value="word">Palabra</option>
              <option value="sentence">Oración (Sentence)</option>
            </select>
          </div>

          <div class="grid grid-cols-1 gap-4">
            <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">
                  {{ newCard.type === 'word' ? 'Palabra (Hanzi)' : 'Oración (Hanzi)' }}
                </label>
                <input
                  type="text"
                  required
                  v-model="newCard.hanzi"
                  class="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900"
                  :placeholder="newCard.type === 'word' ? 'e.g. 龙' : 'e.g. 龙在天上飞。'"
                />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Pinyin</label>
                <input
                  type="text"
                  v-model="newCard.pinyin"
                  class="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900"
                  :placeholder="newCard.type === 'word' ? 'e.g. lóng' : 'e.g. lóng zài tiān shàng fēi.'"
                />
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                <input
                  type="text"
                  v-model="newCard.category"
                  class="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900"
                  placeholder="e.g. Animales, Verbos"
                />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">
              {{ newCard.type === 'word' ? 'Definición (Español)' : 'Traducción (Español)' }}
            </label>
            <input
              type="text"
              required
              v-model="newCard.definition"
              class="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900"
              :placeholder="newCard.type === 'word' ? 'e.g. Dragón' : 'e.g. El dragón vuela en el cielo.'"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Nivel HSK</label>
              <select 
                  v-model="newCard.hskLevel"
                  class="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900"
              >
                  <option v-for="level in [1, 2, 3, 4, 5, 6]" :key="level" :value="level">HSK {{ level }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Orden HSK (#)</label>
              <input
                type="number"
                v-model="newCard.hskOrder"
                class="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900"
                placeholder="e.g. 152"
              />
            </div>
          </div>

          <div class="flex gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              @click="showAddModal = false"
              class="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              class="flex-1 bg-orange-500 hover:bg-orange-600 border-none text-white"
            >
              Añadir
            </Button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Character Modal -->
    <div v-if="editingCard" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div class="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl">
        <div class="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <div>
            <h2 class="text-xl font-bold text-slate-900">Editar Tarjeta</h2>
            <p class="text-xs text-slate-500">Modifica los detalles básicos y los campos avanzados de la palabra.</p>
          </div>
          <button 
            type="button" 
            @click="editingCard = null"
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
              @click="editingCard = null"
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
  </div>
</template>
