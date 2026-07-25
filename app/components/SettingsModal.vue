<script setup lang="ts">
import { ref } from 'vue'
import Button from './Button.vue'

const props = defineProps<{
  currentThreshold: number
  currentIsRandom: boolean
  currentSoundEnabled: boolean
  currentHskLevels: number[]
  currentRoundLength: number
  currentReviewRatio: number
  currentCategoryFilters: string[]
  allCategories: string[]
}>()

const emit = defineEmits<{
  (e: 'save', threshold: number, isRandom: boolean, isSoundEnabled: boolean, hskLevels: number[], roundLength: number, reviewRatio: number, categoryFilters: string[]): void
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
  emit('save', threshold.value, isRandom.value, isSoundEnabled.value, hskLevels.value, roundLength.value, reviewRatio.value, categoryFilters.value)
}
</script>

<template>
  <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
    <div class="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl text-slate-900 overflow-y-auto max-h-[90vh]">
      <h2 class="text-2xl font-bold mb-4 text-slate-900">Game Settings</h2>
      
      <form @submit.prevent="handleSubmit" class="space-y-6">
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
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                  : 'bg-slate-100 text-slate-500 border-slate-100 hover:bg-slate-200'
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
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-200' 
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
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
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                  : 'bg-slate-100 text-slate-500 border-slate-100 hover:bg-slate-200'
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
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-200' 
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
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

        <div class="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
          <div>
             <label class="block text-sm font-medium text-slate-700 mb-1">
               Mastery Threshold
             </label>
             <input
               type="number"
               min="0"
               max="100"
               v-model.number="threshold"
               class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 font-mono text-lg"
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
               class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 font-mono text-lg"
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
               class="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
           />
           <p class="text-xs text-slate-500 mt-2">
               Percentage of each round dedicated to reviewing mistakes vs introducing new cards.
           </p>
        </div>

        <div class="border-t border-b border-slate-100 divide-y divide-slate-100 mt-4">
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
                  :class="['w-12 h-6 rounded-full transition-colors duration-200 ease-in-out relative', isRandom ? 'bg-indigo-600' : 'bg-slate-300']"
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
                  :class="['w-12 h-6 rounded-full transition-colors duration-200 ease-in-out relative', isSoundEnabled ? 'bg-indigo-600' : 'bg-slate-300']"
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
                  class="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
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
