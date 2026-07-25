<script setup lang="ts">
import Button from './Button.vue'

defineProps<{
  roundLength: number
  isSyncing: boolean
}>()

const emit = defineEmits<{
  (e: 'nextRound'): void
  (e: 'goHome'): void
}>()
</script>

<template>
  <div class="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-fade-in">
    <div class="max-w-md w-full text-center space-y-8">
      <div class="space-y-2">
          <div class="text-5xl mb-4">🏁</div>
          <h2 class="text-4xl font-serif text-white font-bold">Round Complete</h2>
          <p class="text-slate-400 text-lg">You've practiced {{ roundLength }} cards.</p>
      </div>

      <div class="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <div v-if="isSyncing" class="flex flex-col items-center gap-3 text-indigo-300">
              <span class="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
              <span>Syncing progress to cloud...</span>
          </div>
          <div v-else class="text-green-400 flex items-center justify-center gap-2">
               <span>✓</span> <span>Progress Synced</span>
          </div>
      </div>

      <Button 
          variant="primary"
          @click="emit('nextRound')"
          :disabled="isSyncing"
          class="w-full py-4 text-lg shadow-xl"
      >
          Start Next Round
      </Button>
      <Button 
          variant="ghost"
          @click="emit('goHome')"
          :disabled="isSyncing"
          class="w-full py-4 text-lg text-slate-300 hover:text-white"
      >
          Inicio
      </Button>
    </div>
  </div>
</template>
