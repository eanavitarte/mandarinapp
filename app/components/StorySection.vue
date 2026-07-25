<script setup lang="ts">
import { ref } from 'vue'
import type { Story } from '~/types'
import Button from './Button.vue'

defineProps<{
  stories: Story[]
}>()

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'addStory', story: Story): void
  (e: 'editStory', id: string, updates: Partial<Story>): void
  (e: 'deleteStory', id: string): void
}>()

const readingStory = ref<Story | null>(null)
const showAddModal = ref(false)
const editingStory = ref<Story | null>(null)
const showPinyin = ref(false)
const showTranslation = ref(false)

const newStory = ref<Story>({
  title: '',
  titlePinyin: '',
  titleTranslation: '',
  content: '',
  contentPinyin: '',
  translation: '',
  hskLevel: 1
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
    hskLevel: 1
  }
}

const handleEditSubmit = () => {
  if (!editingStory.value || !editingStory.value.id) return
  emit('editStory', editingStory.value.id, { ...editingStory.value })
  editingStory.value = null
}

const handleDelete = (id: string) => {
  if (confirm('Are you sure you want to delete this story?')) {
    emit('deleteStory', id)
  }
}
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-slate-900 text-slate-100 font-sans">
    <div v-if="readingStory" class="h-screen w-screen flex flex-col bg-slate-900 text-slate-100 font-sans">
      <div class="flex-none p-4 md:p-6 bg-slate-950 border-b border-slate-800 flex justify-between items-center shadow-md">
        <Button variant="outline" @click="readingStory = null" class="flex items-center gap-2 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700">
          <span class="text-xl">←</span> Volver
        </Button>
        <div class="flex gap-4">
           <label class="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
             <input type="checkbox" v-model="showPinyin" class="rounded bg-slate-800 border-slate-600 text-indigo-500 focus:ring-indigo-500" />
             Show Pinyin
           </label>
           <label class="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
             <input type="checkbox" v-model="showTranslation" class="rounded bg-slate-800 border-slate-600 text-indigo-500 focus:ring-indigo-500" />
             Show Translation
           </label>
        </div>
      </div>

      <div class="flex-1 overflow-auto p-6 md:p-12 custom-scrollbar">
        <div class="max-w-3xl mx-auto bg-slate-800 rounded-2xl p-8 md:p-12 shadow-2xl border border-slate-700">
           <div class="mb-12 border-b border-slate-700 pb-8 text-center">
              <h1 class="text-4xl md:text-5xl font-serif text-indigo-400 mb-4">{{ readingStory.title }}</h1>
              <p v-if="showPinyin && readingStory.titlePinyin" class="text-xl font-mono text-slate-400 mb-2">{{ readingStory.titlePinyin }}</p>
              <p v-if="showTranslation && readingStory.titleTranslation" class="text-lg text-slate-300 italic">{{ readingStory.titleTranslation }}</p>
           </div>

           <div class="space-y-8">
              <div class="prose prose-invert max-w-none">
                 <div v-for="(paragraph, idx) in readingStory.content.split('\n')" :key="idx" class="mb-8">
                   <p v-if="paragraph.trim()" class="text-2xl md:text-3xl font-serif leading-relaxed text-slate-200 tracking-wide mb-2">
                     {{ paragraph }}
                   </p>
                 </div>
              </div>

              <div v-if="showPinyin && readingStory.contentPinyin" class="mt-12 p-6 bg-slate-900/50 rounded-xl border border-slate-700">
                <h3 class="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Pinyin</h3>
                <div class="text-lg font-mono text-slate-400 leading-relaxed whitespace-pre-wrap">
                  {{ readingStory.contentPinyin }}
                </div>
              </div>

              <div v-if="showTranslation && readingStory.translation" class="mt-8 p-6 bg-indigo-900/20 rounded-xl border border-indigo-900/50">
                <h3 class="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-4">Translation</h3>
                <div class="text-lg text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {{ readingStory.translation }}
                </div>
              </div>
           </div>
        </div>
      </div>
    </div>

    <div v-else class="h-screen w-screen flex flex-col bg-slate-900 text-slate-100 font-sans">
      <div class="flex-none p-4 md:p-6 bg-slate-950 border-b border-slate-800 flex justify-between items-center shadow-md">
        <h1 class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 flex items-center gap-2">
          <span>📚</span> Historias Cortas
        </h1>
        <div class="flex gap-4">
            <Button variant="secondary" @click="showAddModal = true" class="flex items-center gap-1">
              <span class="text-lg">+</span> Añadir Cuento
            </Button>
            <Button variant="outline" @click="emit('back')" class="flex items-center gap-2 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700">
              <span class="text-xl">←</span> Inicio
            </Button>
        </div>
      </div>
      
      <div class="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar">
        <div class="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-if="stories.length === 0" class="col-span-full p-12 text-center text-slate-500 bg-slate-800/50 rounded-2xl border border-slate-700 border-dashed">
             <span class="text-4xl mb-4 block">📖</span>
             <p class="text-xl">No hay cuentos disponibles.</p>
             <p class="text-sm mt-2 text-slate-600">Añade uno para empezar a practicar tu lectura.</p>
          </div>
          
          <div v-else v-for="story in stories" :key="story.id" class="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl hover:border-indigo-500/50 transition-colors group flex flex-col">
            <div class="flex justify-between items-start mb-4">
              <h2 class="text-2xl font-serif text-slate-200 group-hover:text-indigo-400 transition-colors line-clamp-2">
                {{ story.title }}
              </h2>
              <span v-if="story.hskLevel" class="px-2 py-1 bg-slate-900 rounded text-xs font-bold text-slate-400 whitespace-nowrap ml-4 border border-slate-700">
                HSK {{ story.hskLevel }}
              </span>
            </div>
            <p v-if="story.titlePinyin" class="text-sm font-mono text-slate-500 mb-2">{{ story.titlePinyin }}</p>
            <p v-if="story.titleTranslation" class="text-sm text-slate-400 mb-6 line-clamp-2">{{ story.titleTranslation }}</p>
            
            <div class="mt-auto pt-6 flex gap-3">
              <Button variant="primary" @click="readingStory = story" class="flex-1 bg-indigo-600 hover:bg-indigo-500 border-none">
                Leer
              </Button>
              <Button variant="outline" @click="editingStory = { ...story }" class="border-slate-600 text-slate-300 hover:bg-slate-700">
                Edit
              </Button>
              <Button v-if="story.id" variant="outline" @click="handleDelete(story.id)" class="border-slate-600 text-red-400 hover:bg-slate-700 hover:text-red-300">
                Del
              </Button>
            </div>
          </div>
        </div>
      </div>

      <!-- Add Story Modal -->
      <div v-if="showAddModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
        <div class="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
          <h2 class="text-2xl font-bold text-slate-900 mb-6">Añadir Cuento</h2>
          
          <form @submit.prevent="handleAddSubmit" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Título (Hanzi)</label>
                  <input
                    type="text" required
                    v-model="newStory.title"
                    class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
                  />
              </div>
              <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Nivel HSK</label>
                  <select 
                    v-model="newStory.hskLevel"
                    class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
                  >
                      <option v-for="level in [1, 2, 3, 4, 5, 6]" :key="level" :value="level">HSK {{ level }}</option>
                  </select>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Pinyin del Título (Opcional)</label>
                  <input
                    type="text"
                    v-model="newStory.titlePinyin"
                    class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
                  />
              </div>
              <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Traducción del Título (Opcional)</label>
                  <input
                    type="text"
                    v-model="newStory.titleTranslation"
                    class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
                  />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Contenido (Hanzi)</label>
              <textarea
                required rows="6"
                v-model="newStory.content"
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 resize-y"
                placeholder="Escribe el cuento en caracteres chinos aquí..."
              />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Contenido Pinyin (Opcional)</label>
                <textarea
                  rows="4"
                  v-model="newStory.contentPinyin"
                  class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 resize-y"
                  placeholder="Pinyin correspondiente..."
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Traducción (Opcional)</label>
                <textarea
                  rows="4"
                  v-model="newStory.translation"
                  class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 resize-y"
                  placeholder="Traducción al Español..."
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
                Guardar Cuento
              </Button>
            </div>
          </form>
        </div>
      </div>

      <!-- Edit Story Modal -->
      <div v-if="editingStory" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
        <div class="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
          <h2 class="text-2xl font-bold text-slate-900 mb-6">Editar Cuento</h2>
          
          <form @submit.prevent="handleEditSubmit" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Título (Hanzi)</label>
                  <input
                    type="text" required
                    v-model="editingStory.title"
                    class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
                  />
              </div>
              <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Nivel HSK</label>
                  <select 
                    v-model="editingStory.hskLevel"
                    class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
                  >
                      <option v-for="level in [1, 2, 3, 4, 5, 6]" :key="level" :value="level">HSK {{ level }}</option>
                  </select>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Pinyin del Título</label>
                  <input
                    type="text"
                    v-model="editingStory.titlePinyin"
                    class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
                  />
              </div>
              <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Traducción del Título</label>
                  <input
                    type="text"
                    v-model="editingStory.titleTranslation"
                    class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900"
                  />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Contenido (Hanzi)</label>
              <textarea
                required rows="6"
                v-model="editingStory.content"
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 resize-y"
              />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Contenido Pinyin</label>
                <textarea
                  rows="4"
                  v-model="editingStory.contentPinyin"
                  class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 resize-y"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Traducción</label>
                <textarea
                  rows="4"
                  v-model="editingStory.translation"
                  class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 resize-y"
                />
              </div>
            </div>

            <div class="flex gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                @click="editingStory = null"
                class="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="secondary"
                class="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 border-none text-white hover:from-indigo-650 hover:to-purple-750"
              >
                Guardar Cambios
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
