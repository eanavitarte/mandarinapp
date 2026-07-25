<script setup lang="ts">
import Button from './Button.vue'

defineProps<{
  totalCards: number
  dueCardsCount: number
  masteredCardsCount: number
  averageMastery: number
  isExpanding: boolean
}>()

const emit = defineEmits<{
  (e: 'startQuiz'): void
  (e: 'openDictionary'): void
  (e: 'openSettings'): void
  (e: 'openCloud'): void
  (e: 'openStories'): void
  (e: 'startAiExpansion'): void
}>()
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-slate-900 text-slate-100 overflow-hidden font-sans relative items-center justify-center">
    <!-- Background decoration -->
    <div class="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-600/20 blur-3xl rounded-full mix-blend-screen pointer-events-none"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600/20 blur-3xl rounded-full mix-blend-screen pointer-events-none"></div>
    
    <div class="z-10 flex flex-col items-center animate-fade-in text-center max-w-lg w-full px-6">
      <div class="text-6xl mb-6">🇨🇳</div>
      <h1 class="text-5xl font-serif font-bold mb-2 bg-gradient-to-r from-indigo-400 to-purple-400 text-transparent bg-clip-text">Mandarin Flash</h1>
      <p class="text-slate-400 mb-8 text-lg">Master your Chinese vocabulary</p>
      
      <!-- SRS Stats Panel -->
      <div class="bg-slate-800/60 backdrop-blur-md rounded-2xl p-6 border border-slate-700/50 w-full mb-8 shadow-xl">
        <div class="grid grid-cols-2 gap-4 text-center">
          <div class="flex flex-col items-center justify-center p-3 bg-slate-900/40 rounded-xl border border-slate-700/30">
            <span class="text-3xl font-mono font-bold text-white">{{ totalCards }}</span>
            <span class="text-[10px] text-slate-400 uppercase tracking-wider mt-1">Total Mazo</span>
          </div>
          <div class="flex flex-col items-center justify-center p-3 bg-slate-900/40 rounded-xl border border-slate-700/30">
            <span class="text-3xl font-mono font-bold text-amber-400">{{ dueCardsCount }}</span>
            <span class="text-[10px] text-slate-400 uppercase tracking-wider mt-1">Para Repasar</span>
          </div>
          <div class="flex flex-col items-center justify-center p-3 bg-slate-900/40 rounded-xl border border-slate-700/30">
            <span class="text-3xl font-mono font-bold text-emerald-400">{{ masteredCardsCount }}</span>
            <span class="text-[10px] text-slate-400 uppercase tracking-wider mt-1">Dominadas</span>
          </div>
          <div class="flex flex-col items-center justify-center p-3 bg-slate-900/40 rounded-xl border border-slate-700/30">
            <span class="text-3xl font-mono font-bold text-indigo-400">{{ averageMastery }}%</span>
            <span class="text-[10px] text-slate-400 uppercase tracking-wider mt-1">Dominio Promedio</span>
          </div>
        </div>
      </div>

      <div class="w-full space-y-3">
        <Button 
          variant="primary" 
          @click="emit('startQuiz')" 
          class="w-full py-4 text-xl shadow-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 border-none transition-all"
          :disabled="totalCards === 0"
        >
          {{ dueCardsCount > 0 ? `Repasar Mazo (${dueCardsCount} vencidas)` : totalCards === 0 ? 'Mazo Vacío' : 'Practicar (Todo al día)' }}
        </Button>

        <Button 
          variant="outline" 
          @click="emit('startAiExpansion')" 
          class="w-full py-3.5 text-base font-bold shadow-sm bg-purple-900/20 hover:bg-purple-900/30 text-purple-300 border-purple-700/50 transition-all flex items-center justify-center gap-2"
          :isLoading="isExpanding"
          :disabled="isExpanding"
        >
          ✨ Expansión Inteligente con IA
        </Button>
        
        <div class="grid grid-cols-2 gap-3 pt-3">
          <Button variant="secondary" @click="emit('openDictionary')" class="flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 border-slate-600">
            <span class="text-xl">📖</span> Diccionario
          </Button>
          <Button variant="secondary" @click="emit('openStories')" class="flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 border-slate-600">
            <span class="text-xl">📚</span> Historias
          </Button>
          <Button variant="secondary" @click="emit('openCloud')" class="flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 border-slate-600">
            <span class="text-xl">☁️</span> Nube Sync
          </Button>
          <Button variant="secondary" @click="emit('openSettings')" class="flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 border-slate-600">
            <span class="text-xl">⚙️</span> Ajustes
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
