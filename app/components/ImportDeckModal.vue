<script setup lang="ts">
import { ref, watch } from 'vue'
import Button from './Button.vue'
import type { Flashcard, Deck } from '~/types'

const { normalizePinyinArray } = usePinyin()

const props = defineProps<{
  existingDeck: Flashcard[]
  decks?: Deck[]
  activeDeckId?: string
}>()

const emit = defineEmits<{
  (e: 'import', cards: Flashcard[], targetDeckId?: string): void
  (e: 'cancel'): void
}>()

const inputMode = ref<'paste' | 'file'>('paste')
const jsonText = ref('')
const file = ref<File | null>(null)
const parsedCards = ref<Flashcard[]>([])
const error = ref<string | null>(null)
const isImporting = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const targetDeckId = ref(props.activeDeckId || 'mandarin-general')

watch(() => props.activeDeckId, (newId) => {
  if (newId) targetDeckId.value = newId
})

const processJsonData = (data: any) => {
  if (!Array.isArray(data)) {
    throw new Error("Formato inválido: El JSON debe ser un arreglo de objetos [...]")
  }

  const validCards: Flashcard[] = []
  const errors: string[] = []
  const currentDeckId = targetDeckId.value || 'mandarin-general'

  data.forEach((item, index) => {
    const hanzi = item.hanzi || item.word || item.front
    const definition = item.definition || item.meaning || item.translation || item.back

    if (!hanzi || typeof hanzi !== 'string') {
      errors.push(`Fila ${index + 1}: Falta o es inválido el campo 'hanzi' / 'word'.`)
    } else if (!definition || typeof definition !== 'string') {
      errors.push(`Fila ${index + 1}: Falta o es inválido el campo 'definition' para '${hanzi}'.`)
    } else {
      const isDuplicate = props.existingDeck.some(
        existing => (existing.deckId || 'mandarin-general') === currentDeckId &&
                    existing.hanzi === hanzi && 
                    existing.definition === definition
      )
      
      if (isDuplicate) {
        errors.push(`Fila ${index + 1}: Omitida tarjeta duplicada '${hanzi}' (${definition}).`)
      } else {
        validCards.push({
          deckId: currentDeckId,
          hanzi: hanzi.trim(),
          definition: definition.trim(),
          pinyin: item.pinyin ? normalizePinyinArray(item.pinyin) : undefined,
          hskLevel: item.hskLevel ? Number(item.hskLevel) : undefined,
          hskOrder: item.hskOrder ? Number(item.hskOrder) : undefined,
          category: item.category ? String(item.category).trim() : undefined,
          type: item.type === 'sentence' ? 'sentence' : 'word',
          correctCount: item.correctCount ? Number(item.correctCount) : 0,
          wrongCount: item.wrongCount ? Number(item.wrongCount) : 0,
        })
      }
    }
  })

  if (validCards.length === 0) {
    throw new Error(errors.length > 0 ? "No se encontraron tarjetas nuevas válidas (todas podrían ser duplicadas)." : "No se encontraron tarjetas válidas en el JSON.")
  }

  if (errors.length > 0) {
    console.warn("Advertencias de importación:", errors)
    if (errors.some(e => e.includes("Omitida tarjeta duplicada"))) {
      error.value = `Se omitieron algunas tarjetas duplicadas en este mazo. Listas para importar ${validCards.length} tarjetas nuevas.`
    }
  }

  parsedCards.value = validCards
}

const handleFileChange = (e: Event) => {
  error.value = null
  parsedCards.value = []
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    file.value = target.files[0]
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const content = ev.target?.result as string
        const data = JSON.parse(content)
        processJsonData(data)
      } catch (err: any) {
        error.value = err.message || "Error al parsear el archivo JSON."
      }
    }
    reader.onerror = () => {
      error.value = "Error al leer el archivo seleccionado."
    }
    reader.readAsText(target.files[0])
  }
}

const handleParseText = () => {
  error.value = null
  parsedCards.value = []
  if (!jsonText.value.trim()) {
    error.value = "Por favor pega el contenido JSON antes de procesar."
    return
  }
  try {
    const data = JSON.parse(jsonText.value.trim())
    processJsonData(data)
  } catch (err: any) {
    error.value = err.message || "Sintaxis JSON inválida. Verifica comas y comillas."
  }
}

const handleImport = async () => {
  if (parsedCards.value.length === 0) return
  isImporting.value = true
  try {
    emit('import', parsedCards.value, targetDeckId.value)
  } catch (err) {
    error.value = "Ocurrió un error al guardar las tarjetas en el mazo."
    isImporting.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in text-slate-800">
    <div class="bg-white border border-orange-200 rounded-2xl p-6 w-full max-w-xl shadow-2xl overflow-y-auto max-h-[90vh]">
      
      <!-- Header -->
      <div class="flex items-center justify-between pb-4 border-b border-orange-100">
        <div class="flex items-center gap-3">
          <span class="text-3xl">📥</span>
          <div>
            <h2 class="text-2xl font-serif font-bold text-slate-900">Importar Lote de Tarjetas</h2>
            <p class="text-xs text-slate-500">Añade múltiples tarjetas mediante JSON</p>
          </div>
        </div>
        <button 
          @click="emit('cancel')"
          class="text-slate-400 hover:text-orange-600 p-2 rounded-lg hover:bg-orange-50 transition-colors"
        >
          ✕
        </button>
      </div>
      
      <div class="space-y-5 mt-5">

        <!-- Target Deck Selection -->
        <div v-if="decks && decks.length > 0" class="p-3.5 bg-orange-50/60 rounded-xl border border-orange-200/70">
          <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Mazo de destino:
          </label>
          <select 
            v-model="targetDeckId"
            class="w-full px-3 py-2 bg-white border border-orange-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 outline-none"
          >
            <option v-for="d in decks" :key="d.id" :value="d.id">
              {{ d.icon || '📁' }} {{ d.name }}
            </option>
          </select>
        </div>

        <!-- Mode Selector Tabs -->
        <div class="flex rounded-xl bg-orange-50 p-1 border border-orange-200/80">
          <button 
            type="button"
            @click="inputMode = 'paste'; error = null; parsedCards = [];"
            class="flex-1 py-2 text-xs font-semibold rounded-lg transition-all"
            :class="inputMode === 'paste' ? 'bg-orange-500 text-white shadow' : 'text-slate-600 hover:text-orange-700'"
          >
            📋 Pegar Texto JSON
          </button>
          <button 
            type="button"
            @click="inputMode = 'file'; error = null; parsedCards = [];"
            class="flex-1 py-2 text-xs font-semibold rounded-lg transition-all"
            :class="inputMode === 'file' ? 'bg-orange-500 text-white shadow' : 'text-slate-600 hover:text-orange-700'"
          >
            📁 Subir Archivo .json
          </button>
        </div>

        <!-- Mode 1: Paste JSON -->
        <div v-if="inputMode === 'paste'" class="space-y-3">
          <p class="text-xs text-slate-600">
            Pega un arreglo JSON con objetos que contengan al menos <code class="bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded text-orange-700 font-mono">hanzi</code> y <code class="bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded text-orange-700 font-mono">definition</code> (opcional: <code class="text-slate-500">pinyin, hskLevel, category, type</code>):
          </p>
          <textarea
            v-model="jsonText"
            rows="6"
            placeholder='[&#10;  { "hanzi": "你好", "definition": "Hola", "pinyin": "nǐ hǎo", "hskLevel": 1, "type": "word" }&#10;]'
            class="w-full px-3 py-2 bg-orange-50/30 border border-orange-200 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-orange-500 outline-none resize-y"
          ></textarea>
          <div class="flex justify-end">
            <Button 
              variant="outline" 
              @click="handleParseText"
              class="text-xs py-1.5 px-3 border-orange-300 text-orange-700 hover:bg-orange-50"
              :disabled="!jsonText.trim()"
            >
              🔍 Validar y Previsualizar
            </Button>
          </div>
        </div>

        <!-- Mode 2: File Upload -->
        <div v-else class="p-6 border-2 border-dashed border-orange-200 hover:border-orange-500 rounded-xl bg-orange-50/40 transition-colors">
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
              class="w-full flex flex-col items-center justify-center cursor-pointer"
          >
              <div class="text-3xl mb-2">📁</div>
              <span class="font-medium text-sm text-orange-600 hover:underline">
                  {{ file ? file.name : "Haz clic para seleccionar un archivo .json" }}
              </span>
              <span class="text-xs text-slate-500 mt-1">Formato: arreglo de objetos JSON</span>
          </label>
        </div>

        <!-- Error & Warning Messages -->
        <div v-if="error && !error.includes('omitieron')" class="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
            <strong>Error:</strong> {{ error }}
        </div>
        <div v-if="error && error.includes('omitieron') && parsedCards.length > 0" class="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs">
            <strong>Aviso:</strong> {{ error }}
        </div>

        <!-- Preview Table -->
        <div v-if="parsedCards.length > 0" class="space-y-3 animate-fade-in">
            <div v-if="!error" class="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center justify-between">
                <span>✓ Se encontraron <strong>{{ parsedCards.length }}</strong> tarjetas listas para importar.</span>
            </div>
            
            <div class="max-h-44 overflow-y-auto border border-orange-200 rounded-xl custom-scrollbar bg-white">
                <table class="w-full text-left text-xs">
                    <thead class="bg-orange-50 sticky top-0 text-slate-600">
                        <tr>
                            <th class="p-2 border-b border-orange-100">Caracter</th>
                            <th class="p-2 border-b border-orange-100">Tipo</th>
                            <th class="p-2 border-b border-orange-100">Pinyin</th>
                            <th class="p-2 border-b border-orange-100">Definición</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-orange-100 text-slate-700">
                        <tr v-for="(c, i) in parsedCards.slice(0, 10)" :key="i">
                            <td class="p-2 font-serif text-base text-orange-600">{{ c.hanzi }}</td>
                            <td class="p-2 text-[10px] text-slate-500">{{ c.type || 'word' }}</td>
                            <td class="p-2 font-mono text-slate-600">{{ c.pinyin || '-' }}</td>
                            <td class="p-2 text-slate-800">{{ c.definition }}</td>
                        </tr>
                        <tr v-if="parsedCards.length > 10">
                            <td colspan="4" class="p-2 text-center text-slate-500 italic">
                                ...y {{ parsedCards.length - 10 }} tarjetas más.
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-3 pt-3 border-t border-orange-100">
          <Button variant="ghost" @click="emit('cancel')" class="flex-1 text-sm text-slate-500" :disabled="isImporting">
              Cancelar
          </Button>
          <Button 
              variant="primary" 
              @click="handleImport" 
              class="flex-1 shadow-sm bg-orange-500 hover:bg-orange-600 border-none text-white text-sm"
              :disabled="parsedCards.length === 0 || isImporting"
              :isLoading="isImporting"
          >
              {{ isImporting ? 'Importando...' : `Confirmar Importación (${parsedCards.length})` }}
          </Button>
        </div>

      </div>
    </div>
  </div>
</template>

