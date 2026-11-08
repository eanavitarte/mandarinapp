<script setup lang="ts">
import { ref, computed } from 'vue'
import Button from './Button.vue'
import type { Deck } from '~/types'

const props = defineProps<{
  currentThreshold: number
  currentIsRandom: boolean
  currentSoundEnabled: boolean
  currentHskLevels: number[]
  currentRoundLength: number
  currentReviewRatio: number
  currentCategoryFilters: string[]
  allCategories: string[]
  availableDecks?: Deck[]
  currentSelectedDeckIds?: string[]
  currentDailyWordGoal?: number
}>()

const emit = defineEmits<{
  (e: 'save', threshold: number, isRandom: boolean, isSoundEnabled: boolean, hskLevels: number[], roundLength: number, reviewRatio: number, categoryFilters: string[], selectedDeckIds: string[], dailyWordGoal: number): void
  (e: 'cancel'): void
  (e: 'openImport'): void
}>()

const threshold = ref(props.currentThreshold)
const isRandom = ref(props.currentIsRandom)
const isSoundEnabled = ref(props.currentSoundEnabled)
const hskLevels = ref<number[]>([...props.currentHskLevels])
const categoryFilters = ref<string[]>([...props.currentCategoryFilters])
const roundLength = ref(props.currentRoundLength)
const reviewRatio = ref(props.currentReviewRatio)
const selectedDeckIds = ref<string[]>([...(props.currentSelectedDeckIds || [])])
const dailyWordGoal = ref(props.currentDailyWordGoal || 30)

const isAllDecksSelected = computed(() => {
  return selectedDeckIds.value.length === 0 || (props.availableDecks && selectedDeckIds.value.length === props.availableDecks.length)
})

const isDeckActive = (deckId: string) => {
  if (isAllDecksSelected.value) return true
  return selectedDeckIds.value.includes(deckId)
}

const selectAllDecks = () => {
  selectedDeckIds.value = []
}

const toggleDeck = (deckId: string) => {
  if (selectedDeckIds.value.length === 0) {
    selectedDeckIds.value = [deckId]
    return
  }

  if (selectedDeckIds.value.includes(deckId)) {
    selectedDeckIds.value = selectedDeckIds.value.filter(id => id !== deckId)
    if (selectedDeckIds.value.length === 0) {
      selectedDeckIds.value = []
    }
  } else {
    selectedDeckIds.value = [...selectedDeckIds.value, deckId]
    if (props.availableDecks && selectedDeckIds.value.length === props.availableDecks.length) {
      selectedDeckIds.value = []
    }
  }
}

const toggleHskLevel = (level: number) => {
  if (hskLevels.value.includes(level)) {
    hskLevels.value = hskLevels.value.filter(l => l !== level)
  } else {
    hskLevels.value = [...hskLevels.value, level].sort((a, b) => a - b)
  }
}

const toggleCategoryFilter = (category: string) => {
  if (categoryFilters.value.includes(category)) {
    categoryFilters.value = categoryFilters.value.filter(c => c !== category)
  } else {
    categoryFilters.value = [...categoryFilters.value, category].sort()
  }
}

const handleSubmit = () => {
  emit('save', threshold.value, isRandom.value, isSoundEnabled.value, hskLevels.value, roundLength.value, reviewRatio.value, categoryFilters.value, selectedDeckIds.value, dailyWordGoal.value)
}
</script>

<template>
  <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
    <div class="bg-white border border-orange-200 rounded-2xl p-6 w-full max-w-lg shadow-2xl text-slate-900 overflow-y-auto max-h-[90vh]">
      <h2 class="text-2xl font-bold mb-4 text-slate-900">Ajustes de la Sesión</h2>
      
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Mazos de la Sesión de Repaso -->
        <div v-if="availableDecks && availableDecks.length > 0">
          <div class="flex items-center justify-between mb-1.5">
            <label class="block text-sm font-bold text-slate-800">
              Mazos para la Sesión de Repaso
            </label>
            <span class="text-xs text-orange-600 font-semibold bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
              {{ isAllDecksSelected ? 'Mezclando todos' : `${selectedDeckIds.length} seleccionado(s)` }}
            </span>
          </div>
          <p class="text-xs text-slate-500 mb-3">
            Elige qué mazos de este idioma mezclar en tu sesión de estudio:
          </p>

          <div class="space-y-2">
            <!-- All Decks Button -->
            <button
              type="button"
              @click="selectAllDecks"
              :class="[
                'w-full py-2.5 px-4 rounded-xl text-sm font-bold transition-all border-2 flex items-center justify-between',
                isAllDecksSelected
                  ? 'bg-orange-500 text-white border-orange-500 shadow-md ring-2 ring-orange-200' 
                  : 'bg-orange-50/40 text-slate-700 border-orange-200 hover:bg-orange-50 hover:border-orange-300'
              ]"
            >
              <div class="flex items-center gap-2">
                <span class="text-lg">🗂️</span>
                <span>Todos los mazos del idioma</span>
              </div>
              <span class="text-xs font-normal" :class="isAllDecksSelected ? 'text-orange-100' : 'text-slate-500'">
                Mezcla completa
              </span>
            </button>

            <!-- Individual Decks Chips/Buttons -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                v-for="d in availableDecks"
                :key="d.id"
                type="button"
                @click="toggleDeck(d.id)"
                :class="[
                  'py-2 px-3 rounded-xl text-xs font-semibold transition-all border-2 flex items-center justify-between text-left',
                  isDeckActive(d.id)
                    ? (isAllDecksSelected 
                        ? 'bg-orange-50/80 border-orange-300 text-orange-950 font-bold' 
                        : 'bg-orange-500 text-white border-orange-500 shadow-sm ring-1 ring-orange-300')
                    : 'bg-white text-slate-500 border-slate-200 opacity-60 hover:opacity-100'
                ]"
              >
                <div class="flex items-center gap-2 truncate">
                  <span class="text-base">{{ d.icon || '🇨🇳' }}</span>
                  <span class="truncate">{{ d.name }}</span>
                </div>
                <span 
                  class="text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold"
                  :class="isDeckActive(d.id) && !isAllDecksSelected ? 'bg-orange-600 text-white' : 'bg-orange-100 text-orange-700'"
                >
                  ✓
                </span>
              </button>
            </div>
          </div>
        </div>
        <!-- HSK Level Filter - Multiple Select -->
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-3">
            HSK Level Training Selection
          </label>
          <div class="grid grid-cols-4 gap-2">
            <button
              type="button"
              @click="hskLevels = []"
              :class="[
                'col-span-4 py-2 rounded-lg text-sm font-bold transition-all border-2',
                hskLevels.length === 0 
                  ? 'bg-orange-500 text-white border-orange-500 shadow-md' 
                  : 'bg-orange-50/50 text-slate-600 border-orange-100 hover:bg-orange-100/60'
              ]"
            >
              All Levels
            </button>
            <button
              v-for="level in [1, 2, 3, 4, 5, 6]"
              :key="level"
              type="button"
              @click="toggleHskLevel(level)"
              :class="[
                'h-12 rounded-lg text-sm font-bold transition-all flex items-center justify-center border-2',
                hskLevels.includes(level) 
                  ? 'bg-orange-500 text-white border-orange-500 shadow-md ring-2 ring-orange-200' 
                  : 'bg-white text-slate-600 border-orange-200 hover:border-orange-300'
              ]"
              :title="`HSK ${level}`"
            >
              HSK {{ level }}
            </button>
          </div>
          <p class="text-xs text-slate-500 mt-3 italic text-center">
              {{ hskLevels.length === 0 
                ? "Showing cards from all proficiency levels." 
                : `Training Levels: ${hskLevels.join(', ')}` }}
          </p>
        </div>

        <!-- Category Filter - Multiple Select -->
        <div v-if="allCategories.length > 0">
          <label class="block text-sm font-medium text-slate-700 mb-3">
            Category Training Selection
          </label>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              @click="categoryFilters = []"
              :class="[
                'px-4 py-2 rounded-lg text-sm font-bold transition-all border-2',
                categoryFilters.length === 0 
                  ? 'bg-orange-500 text-white border-orange-500 shadow-md' 
                  : 'bg-orange-50/50 text-slate-600 border-orange-100 hover:bg-orange-100/60'
              ]"
            >
              All Categories
            </button>
            <button
              v-for="category in allCategories"
              :key="category"
              type="button"
              @click="toggleCategoryFilter(category)"
              :class="[
                'px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center border-2',
                categoryFilters.includes(category) 
                  ? 'bg-orange-500 text-white border-orange-500 shadow-md ring-2 ring-orange-200' 
                  : 'bg-white text-slate-600 border-orange-200 hover:border-orange-300'
              ]"
            >
              {{ category }}
            </button>
          </div>
          <p class="text-xs text-slate-500 mt-3 italic text-center">
              {{ categoryFilters.length === 0 
                ? "Showing cards from all categories." 
                : `Selected Categories: ${categoryFilters.join(', ')}` }}
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-orange-100 pt-4">
          <div>
             <label class="block text-sm font-medium text-slate-700 mb-1">
               Meta Diaria
             </label>
             <input
               type="number"
               min="1"
               max="500"
               v-model.number="dailyWordGoal"
               class="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 font-mono text-lg"
             />
             <p class="text-xs text-slate-500 mt-1">
               Palabras diferentes / día.
             </p>
          </div>
          <div>
             <label class="block text-sm font-medium text-slate-700 mb-1">
               Mastery Threshold
             </label>
             <input
               type="number"
               min="0"
               max="100"
               v-model.number="threshold"
               class="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 font-mono text-lg"
             />
             <p class="text-xs text-slate-500 mt-1">
               Hide after {{ threshold === 0 ? "∞" : threshold }} correct answers.
             </p>
          </div>
          <div>
             <label class="block text-sm font-medium text-slate-700 mb-1">
               Round Length
             </label>
             <input
               type="number"
               min="5"
               max="500"
               v-model.number="roundLength"
               class="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 font-mono text-lg"
             />
             <p class="text-xs text-slate-500 mt-1">
               Cards per round.
             </p>
          </div>
        </div>

        <div class="pt-2">
           <div class="flex justify-between mb-1">
               <label class="block text-sm font-medium text-slate-700">
                   Review Ratio ({{ reviewRatio }}%)
               </label>
               <span class="text-xs text-slate-500">{{ 100 - reviewRatio }}% New Cards</span>
           </div>
           <input
               type="range"
               min="0"
               max="100"
               step="10"
               v-model.number="reviewRatio"
               class="w-full h-2 bg-orange-100 rounded-lg appearance-none cursor-pointer accent-orange-500"
           />
           <p class="text-xs text-slate-500 mt-2">
               Percentage of each round dedicated to reviewing mistakes vs introducing new cards.
           </p>
        </div>

        <div class="border-t border-b border-orange-100 divide-y divide-orange-100 mt-4">
          <!-- Random Order Toggle -->
          <div class="flex items-center justify-between py-4">
              <div>
              <label class="block text-sm font-medium text-slate-700 mb-0.5">
                  Randomize Card Order
              </label>
              <p class="text-xs text-slate-500">
                  Shuffle the deck instead of following the list order.
              </p>
              </div>
              <button
                  type="button"
                  @click="isRandom = !isRandom"
                  :class="['w-12 h-6 rounded-full transition-colors duration-200 ease-in-out relative', isRandom ? 'bg-orange-500' : 'bg-slate-300']"
              >
                  <span :class="['absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow transition-transform duration-200 ease-in-out', isRandom ? 'translate-x-6' : 'translate-x-0']" />
              </button>
          </div>

          <!-- Sound Effects Toggle -->
          <div class="flex items-center justify-between py-4">
              <div>
              <label class="block text-sm font-medium text-slate-700 mb-0.5">
                  Sound Effects
              </label>
              <p class="text-xs text-slate-500">
                  Play audio feedback for correct/wrong answers.
              </p>
              </div>
              <button
                  type="button"
                  @click="isSoundEnabled = !isSoundEnabled"
                  :class="['w-12 h-6 rounded-full transition-colors duration-200 ease-in-out relative', isSoundEnabled ? 'bg-orange-500' : 'bg-slate-300']"
              >
                  <span :class="['absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow transition-transform duration-200 ease-in-out', isSoundEnabled ? 'translate-x-6' : 'translate-x-0']" />
              </button>
          </div>

          <!-- Import Deck Button -->
          <div class="flex items-center justify-between py-4">
              <div>
              <label class="block text-sm font-medium text-slate-700 mb-0.5">
                  Import JSON Deck
              </label>
              <p class="text-xs text-slate-500">
                  Upload a JSON file containing flashcards to add to your database.
              </p>
              </div>
              <Button
                  type="button"
                  variant="outline"
                  @click="emit('openImport')"
                  class="border-orange-300 text-orange-600 hover:bg-orange-50"
              >
                  Import Deck
              </Button>
          </div>
        </div>

        <div class="flex gap-3 pt-4">
          <Button
            type="button"
            variant="ghost"
            @click="emit('cancel')"
            class="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            class="flex-1"
          >
            Save Configuration
          </Button>
        </div>
      </form>
    </div>
  </div>
</template>
