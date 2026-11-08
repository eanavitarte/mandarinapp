<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePinyin } from '~/composables/usePinyin'
import { getToneStyle, TONE_STYLES } from '~/constants/tones'

const props = withDefaults(defineProps<{
  hanzi: string
  pinyin?: string | string[]
  definition?: string
  showPinyin?: boolean
  clickable?: boolean
}>(), {
  showPinyin: false,
  clickable: true
})

const { extractCardTones, formatPinyinDisplay } = usePinyin()

const isOpen = ref(false)
const containerRef = ref<HTMLElement | null>(null)

const tonesInfo = computed(() => {
  return extractCardTones(props.hanzi, props.pinyin)
})

const displayPinyin = computed(() => {
  return formatPinyinDisplay(props.pinyin)
})

const togglePopover = (event: MouseEvent) => {
  if (!props.clickable) return
  event.stopPropagation()
  isOpen.value = !isOpen.value
}

const speakCharacter = (event?: MouseEvent) => {
  if (event) event.stopPropagation()
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(props.hanzi)
    utter.lang = 'zh-CN'
    utter.rate = 0.85
    window.speechSynthesis.speak(utter)
  }
}

const handleClickOutside = (e: MouseEvent) => {
  if (isOpen.value && containerRef.value && !containerRef.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('click', handleClickOutside)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('click', handleClickOutside)
  }
})
</script>

<template>
  <span ref="containerRef" class="relative inline-block align-middle mx-1 my-0.5">
    <!-- Inline Character Badge -->
    <button
      type="button"
      @click="togglePopover"
      :class="[
        'group inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-xl border font-serif tracking-wider select-none shadow-sm transition-all',
        'bg-orange-50/90 hover:bg-orange-100/80 border-orange-200 hover:border-orange-400 hover:shadow-md cursor-pointer',
        clickable ? 'active:scale-95' : ''
      ]"
      :title="`Clic para ver pinyin y significado de ${hanzi}`"
    >
      <!-- Ruby-style Pinyin if global toggle is ON -->
      <span v-if="showPinyin && displayPinyin" class="text-[11px] font-sans font-mono text-orange-600 block -mt-1 mb-0.5">
        {{ displayPinyin }}
      </span>

      <!-- Characters colored by tone -->
      <span class="inline-flex items-center text-xl sm:text-2xl font-bold">
        <template v-if="tonesInfo.length > 0">
          <span
            v-for="(t, idx) in tonesInfo"
            :key="`${t.char}-${idx}`"
            :class="[getToneStyle(t.tone).textClass, 'transition-colors hover:brightness-110']"
            :style="{ color: getToneStyle(t.tone).hex }"
          >
            {{ t.char }}
          </span>
        </template>
        <template v-else>
          <span class="text-orange-600">{{ hanzi }}</span>
        </template>
      </span>

      <span class="text-[10px] text-orange-400 ml-1 group-hover:text-orange-600 select-none">🔍</span>
    </button>

    <!-- Interactive Popover upon Click -->
    <div
      v-if="isOpen"
      class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 bg-white/95 backdrop-blur-md border border-orange-200 rounded-2xl p-4 shadow-2xl text-left animate-fade-in"
      @click.stop
    >
      <!-- Arrow pointer -->
      <div class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-r border-b border-orange-200 rotate-45"></div>

      <!-- Character & Audio Header -->
      <div class="flex items-center justify-between border-b border-orange-100 pb-2 mb-2">
        <div class="flex items-center gap-1.5 font-serif text-3xl font-bold">
          <span
            v-for="(t, idx) in tonesInfo"
            :key="`pop-${t.char}-${idx}`"
            :class="getToneStyle(t.tone).textClass"
            :style="{ color: getToneStyle(t.tone).hex }"
          >
            {{ t.char }}
          </span>
        </div>

        <button
          @click="speakCharacter"
          type="button"
          class="p-2 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-600 text-sm transition-all"
          title="Escuchar pronunciación nativa"
        >
          🔊
        </button>
      </div>

      <!-- Breakdown of Tones -->
      <div v-if="tonesInfo.length > 0" class="space-y-1 mb-2">
        <div
          v-for="(t, idx) in tonesInfo"
          :key="`breakdown-${idx}`"
          class="flex items-center justify-between text-xs px-2 py-1 rounded bg-orange-50/70 border border-orange-100"
        >
          <span class="font-serif font-bold text-slate-800">{{ t.char }}</span>
          <span class="font-mono text-orange-600 font-semibold">{{ t.syllable }}</span>
          <span :class="[getToneStyle(t.tone).textClass, 'font-medium']" :style="{ color: getToneStyle(t.tone).hex }">
            {{ getToneStyle(t.tone).label }} ({{ getToneStyle(t.tone).name }})
          </span>
        </div>
      </div>

      <!-- Definition in Spanish -->
      <div v-if="definition" class="text-xs text-slate-700 bg-orange-50/50 rounded-xl p-2.5 border border-orange-100">
        <span class="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">Significado:</span>
        <span class="font-bold text-orange-700 text-sm">{{ definition }}</span>
      </div>

      <!-- Close button / hint -->
      <div class="mt-2 text-right">
        <button
          @click="isOpen = false"
          class="text-[10px] text-slate-400 hover:text-orange-600 uppercase font-bold tracking-wider"
        >
          Cerrar ✕
        </button>
      </div>
    </div>
  </span>
</template>
