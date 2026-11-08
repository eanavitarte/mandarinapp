<script setup lang="ts">
import { ref } from 'vue'
import type { Deck, Flashcard } from '~/types'
import Button from './Button.vue'

const props = defineProps<{
  decks: Deck[]
  activeDeckId?: string
  allCards: Flashcard[]
  selectedReviewDeckIds?: string[]
}>()

const emit = defineEmits<{
  (e: 'selectDeck', id: string): void
  (e: 'createDeck', deckData: { name: string; language: string; icon?: string; description?: string }): void
  (e: 'editDeck', id: string, updates: Partial<Deck>): void
  (e: 'deleteDeck', id: string): void
  (e: 'openSettings'): void
  (e: 'close'): void
}>()

const isDeckInReview = (deckId: string) => {
  if (!props.selectedReviewDeckIds || props.selectedReviewDeckIds.length === 0) return true
  return props.selectedReviewDeckIds.includes(deckId)
}

const showCreateForm = ref(false)
const isSubmitting = ref(false)

const newDeck = ref({
  name: '',
  language: 'zh',
  icon: '🇨🇳',
  description: ''
})

const editingDeckId = ref<string | null>(null)
const editForm = ref({
  name: '',
  icon: '',
  description: ''
})

const languagePresets = [
  { code: 'zh', name: 'Chino Mandarín', icon: '🇨🇳' },
  { code: 'de', name: 'Alemán', icon: '🇩🇪' },
  { code: 'en', name: 'Inglés', icon: '🇬🇧' },
  { code: 'es', name: 'Español', icon: '🇪🇸' },
  { code: 'fr', name: 'Francés', icon: '🇫🇷' },
  { code: 'ja', name: 'Japonés', icon: '🇯🇵' },
  { code: 'ko', name: 'Coreano', icon: '🇰🇷' },
  { code: 'it', name: 'Italiano', icon: '🇮🇹' },
]

const handleLanguageChange = () => {
  const preset = languagePresets.find(p => p.code === newDeck.value.language)
  if (preset && (!newDeck.value.icon || languagePresets.some(p => p.icon === newDeck.value.icon))) {
    newDeck.value.icon = preset.icon
  }
}

// Stats helper per deck
const getDeckStats = (deckId: string) => {
  const cards = props.allCards.filter(c => (c.deckId || 'mandarin-general') === deckId)
  const now = Date.now()
  const due = cards.filter(c => !c.srsNextDueDate || new Date(c.srsNextDueDate).getTime() <= now).length
  return {
    total: cards.length,
    due
  }
}

const handleCreateSubmit = async () => {
  if (!newDeck.value.name.trim()) return
  isSubmitting.value = true
  try {
    emit('createDeck', {
      name: newDeck.value.name.trim(),
      language: newDeck.value.language,
      icon: newDeck.value.icon.trim() || '📁',
      description: newDeck.value.description.trim() || undefined
    })
    newDeck.value = { name: '', language: 'zh', icon: '🇨🇳', description: '' }
    showCreateForm.value = false
  } finally {
    isSubmitting.value = false
  }
}

const startEdit = (deck: Deck) => {
  editingDeckId.value = deck.id
  editForm.value = {
    name: deck.name,
    icon: deck.icon || '📁',
    description: deck.description || ''
  }
}

const handleEditSubmit = (id: string) => {
  if (!editForm.value.name.trim()) return
  emit('editDeck', id, {
    name: editForm.value.name.trim(),
    icon: editForm.value.icon.trim() || '📁',
    description: editForm.value.description.trim() || undefined
  })
  editingDeckId.value = null
}

const handleDelete = (deck: Deck) => {
  if (deck.id === 'mandarin-general' || deck.isDefault) {
    alert("No se puede eliminar el mazo principal predeterminado.")
    return
  }
  const stats = getDeckStats(deck.id)
  const confirmMsg = stats.total > 0 
    ? `¿Estás seguro de eliminar el mazo "${deck.name}"? Se eliminarán también sus ${stats.total} tarjetas asociadas.`
    : `¿Estás seguro de eliminar el mazo "${deck.name}"?`
  if (window.confirm(confirmMsg)) {
    emit('deleteDeck', deck.id)
  }
}
</script>

<template>
  <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in text-slate-800">
    <div class="bg-white border border-orange-200 rounded-2xl p-6 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
      
      <!-- Header -->
      <div class="flex items-center justify-between pb-4 border-b border-orange-100">
        <div class="flex items-center gap-3">
          <span class="text-3xl">🗂️</span>
          <div>
            <h2 class="text-2xl font-serif font-bold text-slate-900">Gestor de Mazos</h2>
            <p class="text-xs text-slate-500">Organiza tus tarjetas por idiomas, exámenes o temáticas</p>
          </div>
        </div>
        <button 
          @click="emit('close')"
          class="text-slate-400 hover:text-orange-600 p-2 rounded-lg hover:bg-orange-50 transition-colors"
        >
          ✕
        </button>
      </div>

      <!-- Content -->
      <div class="space-y-6 mt-6">
        
        <!-- Action Bar -->
        <div class="flex items-center justify-between">
          <span class="text-sm font-semibold text-slate-700">
            Mazos disponibles ({{ decks.length }})
          </span>
          <Button 
            v-if="!showCreateForm"
            variant="primary" 
            @click="showCreateForm = true"
            class="text-sm py-1.5 px-3 bg-orange-500 hover:bg-orange-600 border-none text-white"
          >
            + Nuevo Mazo
          </Button>
        </div>

        <!-- Form: Crear Nuevo Mazo -->
        <div v-if="showCreateForm" class="p-5 bg-orange-50 rounded-xl border border-orange-200 space-y-4 animate-fade-in">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-orange-600 text-sm flex items-center gap-2">
              <span>✨</span> Crear Nuevo Mazo
            </h3>
            <button @click="showCreateForm = false" class="text-xs text-slate-500 hover:text-orange-700">
              Cancelar
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div class="md:col-span-2">
              <label class="block text-xs font-medium text-slate-700 mb-1">Nombre del Mazo</label>
              <input 
                type="text" 
                v-model="newDeck.name"
                placeholder="Ej: Mandarín HSK 2, Alemán A1..." 
                class="w-full px-3 py-2 bg-white border border-orange-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-700 mb-1">Idioma</label>
              <select 
                v-model="newDeck.language" 
                @change="handleLanguageChange"
                class="w-full px-3 py-2 bg-white border border-orange-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 outline-none"
              >
                <option v-for="lang in languagePresets" :key="lang.code" :value="lang.code">
                  {{ lang.icon }} {{ lang.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-700 mb-1">Icono / Emoji</label>
              <input 
                type="text" 
                v-model="newDeck.icon"
                placeholder="🇨🇳, 🇩🇪, 📚..." 
                class="w-full px-3 py-2 bg-white border border-orange-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 outline-none text-center text-lg"
              />
            </div>
            <div class="md:col-span-3">
              <label class="block text-xs font-medium text-slate-700 mb-1">Descripción (Opcional)</label>
              <input 
                type="text" 
                v-model="newDeck.description"
                placeholder="Breve descripción del mazo..." 
                class="w-full px-3 py-2 bg-white border border-orange-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <Button variant="ghost" @click="showCreateForm = false" class="text-xs py-1.5 px-3 text-slate-500">
              Cancelar
            </Button>
            <Button 
              variant="primary" 
              @click="handleCreateSubmit"
              :disabled="!newDeck.name.trim() || isSubmitting"
              :isLoading="isSubmitting"
              class="text-xs py-1.5 px-4 bg-orange-500 hover:bg-orange-600 border-none text-white"
            >
              Guardar Mazo
            </Button>
          </div>
        </div>

        <!-- Explanatory note linking internal decks to review settings -->
        <div class="p-3 bg-orange-50 border border-orange-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-700">
          <div class="flex items-center gap-2.5">
            <span class="text-base">💡</span>
            <span>Los mazos son agrupaciones internas de vocabulario. Para elegir cuáles mezclar en tu sesión de repaso, configúralo en <strong>Ajustes</strong>.</span>
          </div>
          <Button 
            variant="outline" 
            @click="emit('openSettings'); emit('close');"
            class="text-xs py-1 px-3 border-orange-300 text-orange-700 hover:bg-orange-100 whitespace-nowrap self-end sm:self-auto"
          >
            ⚙️ Ir a Ajustes
          </Button>
        </div>

        <!-- Decks List -->
        <div class="space-y-3">
          <div 
            v-for="deck in decks" 
            :key="deck.id"
            class="p-4 rounded-xl border transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border-orange-100 hover:border-orange-300 shadow-sm"
          >
            <!-- Deck info (View or Edit Mode) -->
            <div v-if="editingDeckId !== deck.id" class="flex items-start gap-3 flex-1 min-w-0">
              <span class="text-3xl p-2 bg-orange-50 rounded-xl border border-orange-200/70">
                {{ deck.icon || '📁' }}
              </span>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <h4 class="font-bold text-slate-900 text-base truncate">{{ deck.name }}</h4>
                  <span 
                    v-if="isDeckInReview(deck.id)" 
                    class="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-orange-100 text-orange-700 border border-orange-300"
                  >
                    En Sesión de Repaso
                  </span>
                  <span 
                    v-if="deck.isDefault" 
                    class="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-200"
                  >
                    Principal
                  </span>
                </div>
                <p v-if="deck.description" class="text-xs text-slate-500 mt-0.5 truncate">
                  {{ deck.description }}
                </p>
                <div class="flex items-center gap-3 mt-2 text-xs text-slate-500">
                  <span class="flex items-center gap-1">
                    <strong class="text-slate-800">{{ getDeckStats(deck.id).total }}</strong> tarjetas
                  </span>
                  <span>•</span>
                  <span class="flex items-center gap-1">
                    <strong class="text-orange-600">{{ getDeckStats(deck.id).due }}</strong> por repasar hoy
                  </span>
                </div>
              </div>
            </div>

            <!-- Edit Form Mode -->
            <div v-else class="flex-1 space-y-2">
              <div class="flex gap-2">
                <input 
                  type="text" 
                  v-model="editForm.icon" 
                  class="w-12 px-2 py-1 bg-white border border-orange-200 rounded text-center text-lg"
                />
                <input 
                  type="text" 
                  v-model="editForm.name" 
                  class="flex-1 px-3 py-1 bg-white border border-orange-200 rounded text-sm text-slate-900"
                />
              </div>
              <input 
                type="text" 
                v-model="editForm.description" 
                placeholder="Descripción..." 
                class="w-full px-3 py-1 bg-white border border-orange-200 rounded text-xs text-slate-700"
              />
              <div class="flex justify-end gap-2 pt-1">
                <button @click="editingDeckId = null" class="text-xs text-slate-500 hover:text-slate-800 px-2 py-1">
                  Cancelar
                </button>
                <button 
                  @click="handleEditSubmit(deck.id)" 
                  class="text-xs bg-orange-500 hover:bg-orange-600 text-white font-medium px-3 py-1 rounded"
                >
                  Guardar
                </button>
              </div>
            </div>

            <!-- Action Buttons -->
            <div v-if="editingDeckId !== deck.id" class="flex items-center gap-2 self-end md:self-center">
              <button 
                @click="startEdit(deck)"
                class="p-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors text-sm"
                title="Editar mazo"
              >
                ✏️
              </button>
              <button 
                v-if="!deck.isDefault && deck.id !== 'mandarin-general'"
                @click="handleDelete(deck)"
                class="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
                title="Eliminar mazo"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>

      </div>

      <!-- Footer -->
      <div class="mt-8 pt-4 border-t border-orange-100 flex items-center justify-between">
        <Button 
          variant="outline" 
          @click="emit('openSettings'); emit('close');"
          class="text-xs py-1.5 px-3 border-orange-300 text-orange-700 hover:bg-orange-50"
        >
          ⚙️ Ajustes de la Sesión
        </Button>
        <Button variant="ghost" @click="emit('close')" class="text-sm">
          Cerrar
        </Button>
      </div>

    </div>
  </div>
</template>
