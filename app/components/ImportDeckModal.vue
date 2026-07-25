<script setup lang="ts">
import { ref } from 'vue'
import Button from './Button.vue'
import type { Flashcard } from '~/types'

const props = defineProps<{
  existingDeck: Flashcard[]
}>()

const emit = defineEmits<{
  (e: 'import', cards: Flashcard[]): void
  (e: 'cancel'): void
}>()

const file = ref<File | null>(null)
const parsedCards = ref<Flashcard[]>([])
const error = ref<string | null>(null)
const isImporting = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const handleFileChange = (e: Event) => {
  error.value = null
  parsedCards.value = []
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    file.value = target.files[0]
    parseFile(target.files[0])
  }
}

const parseFile = (file: File) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string
      const data = JSON.parse(content)
      
      if (!Array.isArray(data)) {
        throw new Error("Invalid format: The JSON file must contain an array of objects.")
      }

      const validCards: Flashcard[] = []
      const errors: string[] = []

      data.forEach((item, index) => {
        if (!item.hanzi || typeof item.hanzi !== 'string') {
          errors.push(`Row ${index + 1}: Missing or invalid 'hanzi'.`)
        } else if (!item.definition || typeof item.definition !== 'string') {
          errors.push(`Row ${index + 1}: Missing or invalid 'definition' for '${item.hanzi}'.`)
        } else {
          const isDuplicate = props.existingDeck.some(
            existing => existing.hanzi === item.hanzi && existing.definition === item.definition
          )
          
          if (isDuplicate) {
            errors.push(`Row ${index + 1}: Skipped duplicate '${item.hanzi}' (${item.definition}).`)
          } else {
            validCards.push({
              hanzi: item.hanzi,
              definition: item.definition,
              pinyin: item.pinyin || undefined,
              hskLevel: item.hskLevel ? Number(item.hskLevel) : undefined,
              hskOrder: item.hskOrder ? Number(item.hskOrder) : undefined,
              category: item.category || undefined,
              correctCount: item.correctCount ? Number(item.correctCount) : 0,
              wrongCount: item.wrongCount ? Number(item.wrongCount) : 0,
            })
          }
        }
      })

      if (validCards.length === 0) {
        throw new Error(errors.length > 0 ? "No new valid flashcards found (all might be duplicates)." : "No valid flashcards found in the file.")
      }

      if (errors.length > 0) {
        console.warn("Import warnings:", errors)
        if (errors.some(e => e.includes("Skipped duplicate"))) {
          error.value = `Skipped some duplicate cards. Proceed to import ${validCards.length} new cards.`
        }
      }

      parsedCards.value = validCards
    } catch (err: any) {
      error.value = err.message || "Failed to parse JSON file."
    }
  }
  reader.onerror = () => {
    error.value = "Failed to read the file."
  }
  reader.readAsText(file)
}

const handleImport = async () => {
  if (parsedCards.value.length === 0) return
  isImporting.value = true
  try {
    emit('import', parsedCards.value)
  } catch (err) {
    error.value = "An error occurred while importing cards."
    isImporting.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in text-slate-900">
    <div class="bg-white rounded-2xl p-6 w-full max-w-xl shadow-2xl overflow-y-auto max-h-[90vh]">
      <div class="flex items-center gap-2 mb-4">
           <span class="text-2xl">📥</span>
           <h2 class="text-2xl font-bold">Import JSON Deck</h2>
      </div>
      
      <div class="space-y-6">
        <div class="bg-indigo-50 border border-indigo-100 rounded-xl p-6">
          <p class="text-slate-600 mb-4 text-sm">
              Select a JSON file containing an array of flashcard objects. Required fields for each object are <code class="bg-indigo-100 px-1 rounded">hanzi</code> and <code class="bg-indigo-100 px-1 rounded">definition</code>.
          </p>
          
          <input 
              type="file" 
              accept=".json" 
              ref="fileInputRef"
              @change="handleFileChange"
              class="hidden"
              id="json-upload"
          />
          <label 
              for="json-upload"
              class="w-full flex items-center justify-center py-8 border-2 border-dashed border-indigo-300 rounded-xl bg-white hover:bg-indigo-50 cursor-pointer transition-colors"
          >
              <div class="text-center">
                  <div class="text-3xl mb-2">📁</div>
                  <span class="font-medium text-indigo-600">
                      {{ file ? file.name : "Click to select a JSON file" }}
                  </span>
              </div>
          </label>
        </div>

        <div v-if="error && !error.includes('Skipped')" class="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
            <strong>Error:</strong> {{ error }}
        </div>
        <div v-if="error && error.includes('Skipped') && parsedCards.length > 0" class="p-4 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg text-sm">
            <strong>Warning:</strong> {{ error }}
        </div>

        <div v-if="parsedCards.length > 0" class="space-y-3">
            <div v-if="!error" class="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                <strong>Success!</strong> Found {{ parsedCards.length }} valid new cards.
            </div>
            
            <div class="max-h-40 overflow-y-auto border border-slate-200 rounded-lg custom-scrollbar">
                <table class="w-full text-left text-sm">
                    <thead class="bg-slate-50 sticky top-0">
                        <tr>
                            <th class="p-2 border-b border-slate-200">Hanzi</th>
                            <th class="p-2 border-b border-slate-200">Pinyin</th>
                            <th class="p-2 border-b border-slate-200">Definition</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <tr v-for="(c, i) in parsedCards.slice(0, 10)" :key="i">
                            <td class="p-2 font-serif text-lg">{{ c.hanzi }}</td>
                            <td class="p-2 text-slate-500 font-mono">{{ c.pinyin || '-' }}</td>
                            <td class="p-2">{{ c.definition }}</td>
                        </tr>
                        <tr v-if="parsedCards.length > 10">
                            <td colSpan="3" class="p-2 text-center text-slate-400 italic">
                                ...and {{ parsedCards.length - 10 }} more cards.
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div class="flex gap-3 pt-4 border-t border-slate-100">
          <Button variant="ghost" @click="emit('cancel')" class="flex-1" :disabled="isImporting">
              Cancel
          </Button>
          <Button 
              variant="primary" 
              @click="handleImport" 
              class="flex-1 shadow-md bg-gradient-to-r from-indigo-500 to-purple-600 border-none"
              :disabled="parsedCards.length === 0 || isImporting"
              :isLoading="isImporting"
          >
              {{ isImporting ? 'Importing...' : 'Confirm Import' }}
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
