<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue'
import type { Flashcard } from '~/types'
import { getToneStyle } from '~/constants/tones'
import Button from './Button.vue'

const props = defineProps<{
  card: Flashcard
  failedPhase: 'DEFINITION' | 'TONE' | 'PINYIN'
}>()

const emit = defineEmits<{
  (e: 'continue'): void
  (e: 'reinforce'): void
}>()

const { extractCardTones, TONE_LABELS, formatPinyinDisplay } = usePinyin()

const cardTones = computed(() => {
  return extractCardTones(props.card?.hanzi, props.card?.pinyin)
})

const coloredHanziChars = computed(() => {
  if (!props.card?.hanzi) return []
  const chars = Array.from(props.card.hanzi)
  const toneByCharIndex = new Map<number, number>()
  cardTones.value.forEach(t => {
    toneByCharIndex.set(t.charIndex, t.tone)
  })

  return chars.map((char, idx) => {
    const tone = toneByCharIndex.get(idx)
    return {
      char,
      textClass: tone !== undefined ? getToneStyle(tone).textClass : '',
      color: tone !== undefined ? getToneStyle(tone).hex : undefined
    }
  })
})

const phaseLabel = computed(() => {
  switch (props.failedPhase) {
    case 'DEFINITION': return 'Significado'
    case 'TONE': return 'Tono'
    case 'PINYIN': return 'Pinyin'
    default: return 'Respuesta'
  }
})

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    emit('continue')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
    <div class="w-full max-w-lg bg-white border border-orange-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col p-6 md:p-8 space-y-6 animate-slide-up">
      
      <!-- Encabezado con estado del fallo -->
      <div class="flex items-center justify-between border-b border-orange-100 pb-4">
        <div class="flex items-center gap-2">
          <span class="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 font-bold text-lg">
            ✕
          </span>
          <div class="flex flex-col">
            <span class="text-xs font-semibold uppercase tracking-wider text-red-600">
              Incorrecto en {{ phaseLabel }}
            </span>
            <span class="text-sm font-medium text-slate-600">
              Respuestas correctas de este carácter:
            </span>
          </div>
        </div>

        <span v-if="card.hskLevel" class="text-xs px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 font-semibold">
          HSK {{ card.hskLevel }}
        </span>
      </div>

      <!-- Carácter Hanzi Principal -->
      <div class="flex flex-col items-center justify-center py-2">
        <h2 class="text-6xl md:text-8xl font-serif text-slate-900 tracking-wider text-center drop-shadow-sm select-none">
          <template v-if="cardTones.length > 0">
            <span
              v-for="(item, idx) in coloredHanziChars"
              :key="`${item.char}-${idx}`"
              :class="item.textClass"
              :style="item.color ? { color: item.color } : undefined"
            >{{ item.char }}</span>
          </template>
          <template v-else>
            {{ card.hanzi }}
          </template>
        </h2>
        <p class="text-2xl md:text-3xl text-orange-600 font-sans font-semibold mt-2 tracking-wide">
          {{ formatPinyinDisplay(card.pinyin) || '—' }}
        </p>
      </div>

      <!-- Desglose de Tonos (si aplica) -->
      <div v-if="cardTones.length > 0" class="flex flex-wrap items-center justify-center gap-2">
        <div
          v-for="(t, idx) in cardTones"
          :key="`${t.char}-${idx}`"
          class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-50/70 border border-orange-200 text-sm"
        >
          <span :class="[getToneStyle(t.tone).textClass, 'font-serif text-lg font-bold']" :style="{ color: getToneStyle(t.tone).hex }">{{ t.char }}</span>
          <span class="text-orange-700 font-mono font-semibold">{{ t.syllable }}</span>
          <span :class="[getToneStyle(t.tone).textClass, 'font-medium text-xs']" :style="{ color: getToneStyle(t.tone).hex }">
            ({{ getToneStyle(t.tone).label }} - {{ getToneStyle(t.tone).name }})
          </span>
        </div>
      </div>

      <!-- Definición / Significado Correcto -->
      <div class="bg-orange-50/60 border border-orange-200/80 rounded-2xl p-4 text-center space-y-1">
        <span class="text-xs uppercase tracking-wider text-slate-500 font-semibold">Significado correcto</span>
        <p class="text-xl md:text-2xl font-bold text-orange-700">
          {{ card.definition }}
        </p>
      </div>

      <!-- Botón de Continuar y Refuerzo -->
      <div class="pt-2 space-y-2">
        <Button
          variant="primary"
          @click="emit('continue')"
          class="w-full py-4 text-lg font-semibold shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 hover:scale-[1.01] transition-transform"
        >
          <span>Continuar</span>
          <span class="text-xs px-2 py-0.5 rounded bg-orange-700/40 text-orange-50 border border-orange-400/40">Enter ↵</span>
        </Button>

        <Button
          variant="ghost"
          @click="emit('reinforce')"
          class="w-full py-2.5 text-xs text-orange-700 hover:text-orange-800 hover:bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-center gap-1.5"
        >
          <span>🎯</span>
          <span>Reforzar este carácter con Historia IA</span>
        </Button>
      </div>

    </div>
  </div>
</template>
