<script setup lang="ts">
import { computed } from 'vue'
import type { Flashcard } from '~/types'

const props = withDefaults(defineProps<{
  card: Flashcard
  isAnimating: boolean
  showPinyin?: boolean
  instruction?: string
}>(), {
  showPinyin: true,
  instruction: "Identify Character"
})

const textLength = computed(() => props.card?.hanzi?.length || 0)
const fontSizeClass = computed(() => {
  if (textLength.value <= 4) return 'text-7xl md:text-9xl'
  if (textLength.value <= 12) return 'text-4xl md:text-5xl'
  return 'text-2xl md:text-3xl'
})
</script>

<template>
  <div class="h-1/2 w-full bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden border-b border-slate-200">
    <!-- Background decoration -->
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-50/50 via-transparent to-transparent opacity-50 pointer-events-none" />
    
    <div class="transition-all duration-300 transform flex flex-col items-center w-full px-4" :class="isAnimating ? 'opacity-0 scale-95 translate-y-4' : 'opacity-100 scale-100 translate-y-0'">
      <h1 :class="[fontSizeClass, 'font-serif text-slate-900 mb-4 select-none drop-shadow-sm text-center px-4 leading-tight break-all']">
        {{ card?.hanzi }}
      </h1>
      <p v-if="showPinyin && card?.pinyin" class="text-xl text-slate-400 font-sans text-center">{{ card?.pinyin }}</p>
    </div>
    
    <div class="absolute top-4 right-4">
      <span class="text-xs font-semibold text-slate-300 uppercase tracking-widest">{{ instruction }}</span>
    </div>
  </div>
</template>
