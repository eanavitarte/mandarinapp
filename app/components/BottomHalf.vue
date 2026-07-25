<script setup lang="ts">
import { computed } from 'vue'
import type { QuizOption } from '~/types'

const props = defineProps<{
  options: QuizOption[]
  disabled: boolean
  selectedOptionIndex: number | null
  showFeedback: boolean
}>()

const emit = defineEmits<{
  (e: 'optionClick', option: QuizOption, index: number): void
}>()

const getFontSizeClass = (definition: string) => {
  const defLength = definition.length
  if (defLength < 15) return 'text-xl md:text-2xl'
  if (defLength < 35) return 'text-lg md:text-xl'
  return 'text-sm md:text-base'
}

const getButtonStyle = (option: QuizOption, index: number) => {
  if (props.showFeedback && props.selectedOptionIndex === index) {
    if (option.isCorrect) {
      return "bg-green-500 border-green-600 text-white shadow-md scale-[1.02]"
    } else {
      return "bg-red-500 border-red-600 text-white shadow-md scale-[0.98]"
    }
  }
  return "border-slate-100 bg-slate-50 text-slate-700 hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-900"
}
</script>

<template>
  <div class="h-1/2 w-full bg-white p-4 md:p-8 flex flex-col justify-center">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 h-full max-h-[500px] w-full max-w-4xl mx-auto">
      <button
        v-for="(option, index) in options"
        :key="`${option.definition}-${index}`"
        @click="emit('optionClick', option, index)"
        :disabled="disabled"
        :class="[
          'relative group flex items-center justify-center p-4 md:p-6 font-medium rounded-2xl border-2 transition-all duration-200 ease-out disabled:cursor-not-allowed animate-slide-up',
          getFontSizeClass(option.definition),
          getButtonStyle(option, index),
          disabled && !showFeedback ? 'opacity-70' : 'opacity-100'
        ]"
        :style="{ animationDelay: `${index * 50}ms` }"
      >
        <span class="z-10 text-center break-words max-w-full">
          {{ option.definition }}
        </span>
      </button>
    </div>
  </div>
</template>
