<script setup lang="ts">
import type { QuizOption } from '~/types'
import { getToneStyle } from '~/constants/tones'

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
  if (defLength < 15) return 'text-2xl md:text-3xl'
  if (defLength < 35) return 'text-xl md:text-2xl'
  return 'text-base md:text-lg'
}

const isOptionHighlighted = (option: QuizOption, index: number) => {
  if (!props.showFeedback || props.selectedOptionIndex === null) return false
  return props.selectedOptionIndex === index || option.isCorrect
}

const getButtonStyle = (option: QuizOption, index: number) => {
  if (props.showFeedback && props.selectedOptionIndex !== null) {
    if (props.selectedOptionIndex === index) {
      if (option.isCorrect) {
        return "bg-green-500 border-green-600 text-white shadow-md scale-[1.02]"
      } else {
        return "bg-red-500 border-red-600 text-white shadow-md scale-[0.98]"
      }
    } else if (option.isCorrect) {
      return "bg-emerald-500 border-emerald-600 text-white shadow-md scale-[1.01] ring-2 ring-emerald-400"
    }
  }

  if (option.tone) {
    const toneStyle = getToneStyle(option.tone)
    return `border-slate-200 bg-white ${toneStyle.hoverBorderClass} ${toneStyle.hoverBgClass} shadow-sm`
  }

  return "border-slate-200 bg-white text-slate-800 hover:border-orange-500 hover:bg-orange-50 hover:text-orange-600 shadow-sm"
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
        :aria-label="option.definition"
        :class="[
          'relative group flex items-center justify-center p-4 md:p-6 font-medium rounded-2xl border-2 transition-all duration-200 ease-out disabled:cursor-not-allowed animate-slide-up',
          !option.tone ? getFontSizeClass(option.definition) : '',
          getButtonStyle(option, index),
          disabled && !showFeedback ? 'opacity-70' : 'opacity-100'
        ]"
        :style="{ animationDelay: `${index * 50}ms` }"
      >
        <div
          v-if="option.tone"
          :class="[
            'z-10 flex items-center justify-center transition-transform duration-200 group-hover:scale-110',
            isOptionHighlighted(option, index) ? 'text-white' : getToneStyle(option.tone).textClass
          ]"
          :style="{
            color: isOptionHighlighted(option, index) ? '#ffffff' : getToneStyle(option.tone).hex
          }"
        >
          <svg
            viewBox="0 0 100 100"
            class="w-16 h-16 md:w-20 md:h-20 overflow-visible"
            fill="none"
            stroke="currentColor"
            stroke-width="8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <!-- 1° Tono: Barra horizontal plana (alto sostenido) -->
            <template v-if="option.tone === 1">
              <path d="M 16 50 L 84 50" />
            </template>

            <!-- 2° Tono: Flecha diagonal ascendente -->
            <template v-else-if="option.tone === 2">
              <path d="M 20 76 L 78 22" />
              <path d="M 52 22 L 78 22 L 78 48" />
            </template>

            <!-- 3° Tono: Flecha quebrada que baja y sube -->
            <template v-else-if="option.tone === 3">
              <path d="M 14 30 L 48 74 L 84 24" />
              <path d="M 60 24 L 84 24 L 84 48" />
            </template>

            <!-- 4° Tono: Flecha diagonal descendente -->
            <template v-else-if="option.tone === 4">
              <path d="M 20 22 L 78 76" />
              <path d="M 52 76 L 78 76 L 78 50" />
            </template>

            <!-- 5° Tono (Neutro): Punto circular sólido -->
            <template v-else>
              <circle cx="50" cy="50" r="11" fill="currentColor" stroke="none" />
            </template>
          </svg>
        </div>

        <span v-else class="z-10 text-center break-words max-w-full">
          {{ option.definition }}
        </span>
      </button>
    </div>
  </div>
</template>
