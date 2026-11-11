<script setup lang="ts">
import { computed } from 'vue'
import type { Flashcard } from '~/types'
import { getToneStyle } from '~/constants/tones'

const props = withDefaults(defineProps<{
  card: Flashcard
  isAnimating: boolean
  showPinyin?: boolean
  showDefinition?: boolean
  instruction?: string
  activeCharIndex?: number | null
  activeCharTone?: number | null
}>(), {
  showPinyin: true,
  showDefinition: false,
  instruction: "Identify Character",
  activeCharIndex: null,
  activeCharTone: null
})

const { formatPinyinDisplay } = usePinyin()

const activeCharBadgeStyle = computed(() => {
  if (!props.activeCharTone) return undefined
  return { backgroundColor: getToneStyle(props.activeCharTone).badgeBgHex }
})

const hanziChars = computed(() => Array.from(props.card?.hanzi || ''))
const textLength = computed(() => hanziChars.value.length)
const pinyinText = computed(() => formatPinyinDisplay(props.card?.pinyin))
const fontSizeClass = computed(() => {
  if (textLength.value <= 4) return 'text-7xl md:text-9xl'
  if (textLength.value <= 12) return 'text-4xl md:text-5xl'
  return 'text-2xl md:text-3xl'
})
const definitionFontSizeClass = computed(() => {
  const defLength = (props.card?.definition || '').length
  if (defLength < 35) return 'text-[20px] md:text-[22px]'
  if (defLength < 70) return 'text-[18px] md:text-[20px]'
  return 'text-[16px] md:text-[18px]'
})
</script>

<template>
  <div class="h-1/2 w-full bg-white flex flex-col items-center justify-center pt-16 pb-10 relative overflow-hidden border-b border-slate-200">
    <div class="transition-all duration-300 transform flex flex-col items-center w-full px-4" :class="isAnimating ? 'opacity-0 scale-95 translate-y-4' : 'opacity-100 scale-100 translate-y-0'">
      <h1 v-if="activeCharIndex === null" :class="[fontSizeClass, 'font-serif text-slate-900 mb-3 select-none text-center px-4 leading-tight break-all']">
        {{ card?.hanzi }}
      </h1>
      <h1 v-else :class="[fontSizeClass, 'font-serif mb-3 select-none text-center px-4 leading-tight break-all']">
        <span
          v-for="(char, idx) in hanziChars"
          :key="`${char}-${idx}`"
          :class="[
            'transition-all duration-200 inline-block',
            idx === activeCharIndex
              ? [
                  'text-white rounded-[0.18em] px-[0.14em] py-[0.03em] mx-[0.06em] shadow-md scale-105',
                  activeCharTone ? '' : 'bg-slate-900'
                ]
              : 'text-slate-300'
          ]"
          :style="idx === activeCharIndex ? activeCharBadgeStyle : undefined"
        >{{ char }}</span>
      </h1>
      <div
        class="w-full max-w-2xl h-16 px-4 bg-white border-0 flex items-center justify-center overflow-hidden"
        aria-live="polite"
      >
        <p
          v-if="showDefinition && card?.definition"
          :class="[definitionFontSizeClass, 'text-slate-600 font-sans font-medium text-center leading-snug line-clamp-2 animate-fade-in']"
          :title="card.definition"
        >
          {{ card.definition }}
        </p>
      </div>
      <p v-if="showPinyin && pinyinText" class="text-xl text-orange-600 font-sans text-center">{{ pinyinText }}</p>
    </div>
    
    <div class="absolute bottom-3 inset-x-0 flex justify-center pointer-events-none">
      <span class="text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-3 py-1 rounded-full uppercase tracking-widest">{{ instruction }}</span>
    </div>
  </div>
</template>
