<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Flashcard } from '~/types'
import Button from './Button.vue'

const props = defineProps<{
  deck: Flashcard[]
}>()

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'addCard', card: Flashcard): void
  (e: 'editCard', id: string, updates: Partial<Flashcard>): void
  (e: 'deleteCard', id: string): void
  (e: 'aiAddCard', word: string): void
}>()

const showAddModal = ref(false)
const aiWord = ref('')
const isAILoading = ref(false)

const typeFilter = ref<'all' | 'word' | 'sentence'>('all')
const sortBy = ref<'hsk' | 'status' | 'due' | 'alphabetical'>('hsk')

const newCard = ref({
  hanzi: '',
  pinyin: '',
  definition: '',
  hskLevel: 1,
  hskOrder: '',
  category: '',
  type: 'word' as 'word' | 'sentence'
})

const editingCard = ref<Flashcard | null>(null)

const handleAddSubmit = () => {
  if (!newCard.value.hanzi || !newCard.value.definition) return

  emit('addCard', {
    hanzi: newCard.value.hanzi,
    definition: newCard.value.definition,
    pinyin: newCard.value.pinyin || undefined,
    hskLevel: Number(newCard.value.hskLevel),
    hskOrder: newCard.value.hskOrder ? Number(newCard.value.hskOrder) : undefined,
    category: newCard.value.category || undefined,
    type: newCard.value.type
  })

  newCard.value = { hanzi: '', pinyin: '', definition: '', hskLevel: 1, hskOrder: '', category: '', type: 'word' }
  showAddModal.value = false
}

const handleEditSubmit = () => {
  if (!editingCard.value || !editingCard.value.id) return
  
  emit('editCard', editingCard.value.id, {
    hanzi: editingCard.value.hanzi,
    pinyin: editingCard.value.pinyin || undefined,
    definition: editingCard.value.definition,
    hskLevel: Number(editingCard.value.hskLevel),
    hskOrder: editingCard.value.hskOrder ? Number(editingCard.value.hskOrder) : undefined,
    category: editingCard.value.category || undefined,
    type: editingCard.value.type || 'word'
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
  if (status >= 100) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
  if (status >= 75) return 'bg-teal-500/20 text-teal-400 border-teal-500/30'
  if (status >= 50) return 'bg-sky-500/20 text-sky-400 border-sky-500/30'
  if (status >= 25) return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
  return 'bg-slate-700/40 text-slate-400 border-slate-700/50'
}

// Filter and sort deck
const filteredAndSortedDeck = computed(() => {
  let result = [...props.deck]
  
  if (typeFilter.value !== 'all') {
    result = result.filter(c => (c.type || 'word') === typeFilter.value)
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
    // HSK Order
    if (a.hskOrder !== undefined && b.hskOrder !== undefined) return a.hskOrder - b.hskOrder
    if (a.hskOrder !== undefined) return -1
    if (b.hskOrder !== undefined) return 1
    
    const levelA = a.hskLevel || 1
    const levelB = b.hskLevel || 1
    if (levelA !== levelB) return levelA - levelB

    return (a._originalIndex || 0) - (b._originalIndex || 0)
  })
  
  return result
})
</script>

<template>
  <div class="flex flex-col h-full bg-slate-900 text-slate-100 overflow-hidden animate-fade-in relative z-40">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between p-6 border-b border-slate-800 bg-slate-900/95 backdrop-blur z-10 gap-4">
      <div class="flex items-center gap-3">
          <span class="text-2xl">📖</span>
          <h2 class="text-2xl font-serif font-bold text-slate-100">Dictionary & Stats</h2>
      </div>
      
      <div class="flex flex-wrap gap-2 items-center">
          <form @submit.prevent="handleAIAddSubmit" class="flex gap-2">
              <input 
                  type="text" 
                  v-model="aiWord" 
                  placeholder="Palabra en Español..." 
                  class="px-3 py-1.5 border border-slate-700 bg-slate-800 text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm w-40"
                  :disabled="isAILoading"
              />
              <Button type="submit" variant="primary" class="flex items-center gap-1 bg-gradient-to-r from-purple-500 to-indigo-600 border-none" :isLoading="isAILoading">
                  ✨ IA Add
              </Button>
          </form>
          <div class="w-px h-6 bg-slate-700 mx-1 hidden md:block"></div>
          <Button variant="secondary" @click="showAddModal = true" class="flex items-center gap-1">
            <span class="text-lg">+</span> Añadir Tarjeta
          </Button>
          <Button variant="outline" @click="emit('back')" class="flex items-center gap-2 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700">
            <span class="text-xl">←</span> Inicio
          </Button>
      </div>
    </div>
    
    <!-- Filters and Sorting Row -->
    <div class="flex flex-wrap items-center justify-between px-6 py-3.5 bg-slate-850 border-b border-slate-800 gap-4">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-400 uppercase tracking-widest font-semibold">Tipo:</span>
          <select 
            v-model="typeFilter"
            class="bg-slate-800 border border-slate-750 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="all">Todos</option>
            <option value="word">Palabras</option>
            <option value="sentence">Oraciones</option>
          </select>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-400 uppercase tracking-widest font-semibold">Ordenar por:</span>
          <select 
            v-model="sortBy"
            class="bg-slate-800 border border-slate-750 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="hsk">HSK / Nivel</option>
            <option value="status">Dominio (0% - 100%)</option>
            <option value="due">Próximo Repaso</option>
            <option value="alphabetical">Alfabético</option>
          </select>
        </div>
      </div>
      
      <div class="text-xs text-slate-400">
        Mostrando <span class="font-mono text-slate-200">{{ filteredAndSortedDeck.length }}</span> de <span class="font-mono text-slate-200">{{ deck.length }}</span> tarjetas
      </div>
    </div>
    
    <!-- Table -->
    <div class="flex-1 overflow-auto p-4 md:p-6 custom-scrollbar">
      <div class="max-w-6xl mx-auto bg-slate-800 rounded-xl overflow-hidden shadow-xl border border-slate-700">
        <table class="w-full text-left border-collapse">
          <thead class="bg-slate-950 text-slate-400 uppercase text-xs tracking-wider font-semibold sticky top-0 z-10">
            <tr>
              <th class="p-4 border-b border-slate-700">Caracter / Oración</th>
              <th class="p-4 border-b border-slate-700">Tipo</th>
              <th class="p-4 border-b border-slate-700">Pinyin</th>
              <th class="p-4 border-b border-slate-700">Definición / Traducción</th>
              <th class="p-4 border-b border-slate-700 text-center">Dominio</th>
              <th class="p-4 border-b border-slate-700">Próximo Repaso</th>
              <th class="p-4 border-b border-slate-700">HSK / Orden</th>
              <th class="p-4 border-b border-slate-700 text-center">Historial</th>
              <th class="p-4 border-b border-slate-700 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-700">
            <tr v-for="(card, idx) in filteredAndSortedDeck" :key="idx" class="hover:bg-slate-700/50 transition-colors group">
              <td class="p-4">
                  <span :class="['font-serif text-indigo-400 group-hover:text-indigo-300 transition-colors', (card.type || 'word') === 'word' ? 'text-3xl' : 'text-xl']">{{ card.hanzi }}</span>
              </td>
              <td class="p-4">
                <span :class="['px-2 py-0.5 rounded text-[10px] font-bold border', (card.type || 'word') === 'word' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20']">
                  {{ (card.type || 'word') === 'word' ? 'Palabra' : 'Oración' }}
                </span>
              </td>
              <td class="p-4 text-slate-300 font-mono text-sm">
                   {{ card.pinyin || '-' }}
              </td>
              <td class="p-4 text-slate-200 font-medium text-sm max-w-xs truncate" :title="card.definition">
                {{ card.definition }}
              </td>
              <td class="p-4 text-center">
                <span :class="['inline-flex items-center justify-center min-w-[3rem] px-2 py-1 rounded text-xs font-mono font-bold border', getStatusColor(card.knowledgeStatus)]">
                  {{ card.knowledgeStatus || 0 }}%
                </span>
              </td>
              <td class="p-4 text-slate-300 text-xs">
                {{ formatDueDate(card.srsNextDueDate) }}
              </td>
              <td class="p-4 text-slate-400 text-xs">
                <div class="flex flex-col gap-0.5">
                  <span v-if="card.hskLevel" class="font-semibold text-slate-300">HSK {{ card.hskLevel }}</span>
                  <span v-if="card.hskOrder" class="text-[10px] text-slate-500">Orden #{{ card.hskOrder }}</span>
                </div>
              </td>
              <td class="p-4 text-center text-xs">
                <div class="flex justify-center gap-2">
                  <span class="text-green-400">✓ {{ card.correctCount || 0 }}</span>
                  <span class="text-red-400">✗ {{ card.wrongCount || 0 }}</span>
                </div>
              </td>
              <td class="p-4 text-center">
                <div class="flex justify-center gap-2 text-xs">
                  <button @click="editingCard = { ...card }" class="text-blue-400 hover:text-blue-300 font-semibold">Editar</button>
                  <button v-if="card.id" @click="handleDelete(card.id)" class="text-red-400 hover:text-red-300 font-semibold font-mono">Del</button>
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
            <label class="block text-sm font-medium text-slate-700 mb-1">Tipo de Tarjeta</label>
            <select 
              v-model="newCard.type"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
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
                  class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
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
                  class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
                  :placeholder="newCard.type === 'word' ? 'e.g. lóng' : 'e.g. lóng zài tiān shàng fēi.'"
                />
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                <input
                  type="text"
                  v-model="newCard.category"
                  class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
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
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
              :placeholder="newCard.type === 'word' ? 'e.g. Dragón' : 'e.g. El dragón vuela en el cielo.'"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Nivel HSK</label>
              <select 
                  v-model="newCard.hskLevel"
                  class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
              >
                  <option v-for="level in [1, 2, 3, 4, 5, 6]" :key="level" :value="level">HSK {{ level }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Orden HSK (#)</label>
              <input
                type="number"
                v-model="newCard.hskOrder"
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
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
              variant="secondary"
              class="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 border-none text-white hover:from-indigo-650 hover:to-purple-750"
            >
              Añadir
            </Button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Character Modal -->
    <div v-if="editingCard" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div class="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 class="text-2xl font-bold text-slate-900 mb-4">Editar Tarjeta</h2>
        
        <form @submit.prevent="handleEditSubmit" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Tipo de Tarjeta</label>
            <select 
              v-model="editingCard.type"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
            >
              <option value="word">Palabra</option>
              <option value="sentence">Oración (Sentence)</option>
            </select>
          </div>

          <div class="grid grid-cols-1 gap-4">
            <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Caracter (Hanzi)</label>
                <input
                  type="text"
                  required
                  v-model="editingCard.hanzi"
                  class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
                />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Pinyin</label>
                <input
                  type="text"
                  v-model="editingCard.pinyin"
                  class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
                />
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                <input
                  type="text"
                  v-model="editingCard.category"
                  class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
                />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Definición / Traducción</label>
            <input
              type="text"
              required
              v-model="editingCard.definition"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Nivel HSK</label>
              <select 
                  v-model="editingCard.hskLevel"
                  class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
              >
                  <option v-for="level in [1, 2, 3, 4, 5, 6]" :key="level" :value="level">HSK {{ level }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Orden HSK (#)</label>
              <input
                type="number"
                v-model="editingCard.hskOrder"
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
              />
            </div>
          </div>

          <div class="flex gap-3 pt-4">
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
              variant="secondary"
              class="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 border-none text-white hover:from-indigo-650 hover:to-purple-750"
            >
              Guardar
            </Button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
