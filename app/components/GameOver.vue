<script setup lang="ts">
import Button from './Button.vue'

defineProps<{
  score: number
}>()

const emit = defineEmits<{
  (e: 'restart'): void
}>()
</script>

<template>
  <div class="h-full w-full flex flex-col items-center justify-center bg-white text-slate-800 p-6 animate-fade-in z-50">
    <div class="text-center space-y-6">
      <div class="text-6xl mb-2">👾</div>
      <h1 class="text-5xl md:text-7xl font-serif text-slate-900 drop-shadow-sm">Game Over</h1>
      <p class="text-xl md:text-2xl text-slate-600">
        You mastered <span class="text-orange-600 font-bold">{{ score }}</span> characters!
      </p>
      <div class="pt-8">
        <Button 
          @click="emit('restart')" 
          variant="primary" 
          class="px-10 py-4 text-lg shadow-xl hover:scale-105 transition-transform"
        >
          Restart Quiz
        </Button>
      </div>
    </div>
  </div>
</template>
