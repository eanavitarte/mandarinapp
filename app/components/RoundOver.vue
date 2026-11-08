<script setup lang="ts">
import { computed } from 'vue'
import Button from './Button.vue'

const props = defineProps<{
  roundLength: number
  isSyncing: boolean
  streakCount?: number
  roundScore?: number
  roundMistakes?: number
  todayUniqueWordsCount?: number
  dailyWordGoal?: number
  dailyGoalProgress?: number
  isDailyGoalMet?: boolean
  startingMastery?: number
  averageMastery?: number
}>()

const effectiveStartingMastery = computed(() => {
  return typeof props.startingMastery === 'number' ? props.startingMastery : (props.averageMastery || 0)
})

const masteryDelta = computed(() => {
  return (props.averageMastery || 0) - (effectiveStartingMastery.value || 0)
})

const hasMasteryProgress = computed(() => {
  return masteryDelta.value > 0
})

const emit = defineEmits<{
  (e: 'nextRound'): void
  (e: 'goHome'): void
  (e: 'reinforceRound'): void
}>()
</script>

<template>
  <div class="absolute inset-0 z-50 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-fade-in overflow-y-auto">
    <div class="max-w-md w-full text-center space-y-5 bg-white p-7 sm:p-8 rounded-3xl border border-orange-200 shadow-2xl shadow-orange-500/10 my-auto">
      <div class="space-y-1.5">
          <div class="text-5xl mb-1">{{ isDailyGoalMet ? '🏆' : '🏁' }}</div>
          <h2 class="text-3xl sm:text-4xl font-serif text-slate-900 font-bold">Ronda Completada</h2>
          <p class="text-slate-500 text-sm sm:text-base">Has practicado {{ roundLength }} tarjetas en esta ronda.</p>
      </div>

      <!-- Daily Goal Progress Card -->
      <div
        class="p-4 rounded-2xl border text-left space-y-2 shadow-sm"
        :class="isDailyGoalMet ? 'bg-emerald-50 border-emerald-200' : 'bg-orange-50/70 border-orange-200'"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs uppercase font-extrabold tracking-wider" :class="isDailyGoalMet ? 'text-emerald-700' : 'text-orange-700'">
            🎯 Meta Diaria (Palabras Diferentes)
          </span>
          <span
            class="text-xs font-mono font-bold px-2 py-0.5 rounded-full border"
            :class="isDailyGoalMet ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-orange-600 border-orange-300'"
          >
            {{ todayUniqueWordsCount || 0 }} / {{ dailyWordGoal || 30 }}
          </span>
        </div>

        <div class="w-full h-2.5 bg-white rounded-full overflow-hidden p-0.5 border" :class="isDailyGoalMet ? 'border-emerald-300' : 'border-orange-200'">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="isDailyGoalMet ? 'bg-emerald-500' : 'bg-orange-500'"
            :style="{ width: `${Math.min(100, Math.max(4, dailyGoalProgress || 0))}%` }"
          />
        </div>

        <p class="text-xs" :class="isDailyGoalMet ? 'text-emerald-700 font-semibold' : 'text-slate-600'">
          <template v-if="isDailyGoalMet">
            ✓ ¡Has cumplido tu meta diaria de {{ dailyWordGoal || 30 }} palabras diferentes!
          </template>
          <template v-else>
            Te faltan <strong class="font-mono text-orange-600">{{ Math.max(0, (dailyWordGoal || 30) - (todayUniqueWordsCount || 0)) }}</strong> palabras diferentes hoy para alcanzar tu meta.
          </template>
        </p>

        <!-- Daily Mastery Growth Row -->
        <div
          v-if="averageMastery !== undefined"
          class="pt-2 border-t border-dashed flex items-center justify-between text-xs flex-wrap gap-1"
          :class="isDailyGoalMet ? 'border-emerald-200' : 'border-orange-200'"
        >
          <div class="flex items-center gap-1.5">
            <span>{{ hasMasteryProgress ? '🚀' : '📈' }}</span>
            <span class="text-slate-700">
              Hoy: <strong class="font-mono font-bold">{{ effectiveStartingMastery }}%</strong> ➔ <strong class="font-mono font-bold">{{ averageMastery }}%</strong>
            </span>
          </div>

          <span
            v-if="hasMasteryProgress"
            class="font-mono font-bold text-[10px] px-2 py-0.5 rounded-full bg-emerald-600 text-white"
          >
            +{{ masteryDelta }}% Dominio 🎉
          </span>
          <span v-else class="text-[10px] text-slate-400 font-mono italic">
            (sin variación)
          </span>
        </div>
      </div>

      <!-- Streak celebration card -->
      <div class="p-4 bg-orange-50 rounded-2xl border border-orange-200 flex items-center justify-between shadow-sm">
        <div class="flex items-center gap-3 text-left">
          <span class="text-3xl animate-bounce">🔥</span>
          <div>
            <div class="text-xs uppercase font-bold text-orange-600 tracking-wider">Racha Activa</div>
            <div class="text-lg font-bold text-slate-800">¡Racha de {{ streakCount || 1 }} días consecutivos!</div>
          </div>
        </div>
        <div class="text-2xl font-black font-mono text-orange-600">
          {{ streakCount || 1 }}d
        </div>
      </div>

      <!-- Round results breakdown -->
      <div v-if="roundScore !== undefined && roundMistakes !== undefined" class="grid grid-cols-2 gap-3">
        <div class="p-3 bg-orange-50 rounded-xl border border-orange-200 text-center">
          <span class="text-2xl font-bold font-mono text-emerald-600">+{{ roundScore }}</span>
          <span class="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mt-0.5">Aciertos</span>
        </div>
        <div class="p-3 bg-orange-50 rounded-xl border border-orange-200 text-center">
          <span class="text-2xl font-bold font-mono text-rose-600">-{{ roundMistakes }}</span>
          <span class="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mt-0.5">Fallos</span>
        </div>
      </div>

      <div class="bg-orange-50 rounded-xl p-4 border border-orange-200">
          <div v-if="isSyncing" class="flex flex-col items-center gap-2 text-orange-600 text-sm">
              <span class="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
              <span>Sincronizando progreso con la nube...</span>
          </div>
          <div v-else class="text-emerald-600 flex items-center justify-center gap-2 text-sm font-semibold">
               <span>✓</span> <span>Progreso y racha guardados</span>
          </div>
      </div>

      <Button 
          variant="primary"
          @click="emit('nextRound')"
          :disabled="isSyncing"
          class="w-full py-4 text-lg shadow-lg shadow-orange-500/20"
      >
          Siguiente Ronda
      </Button>
      <Button 
          v-if="roundMistakes && roundMistakes > 0"
          variant="secondary"
          @click="emit('reinforceRound')"
          :disabled="isSyncing"
          class="w-full py-3.5 text-base bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 flex items-center justify-center gap-2 shadow-sm"
      >
          <span>🎯</span>
          <span>Reforzar fallos de esta ronda con Historias IA</span>
      </Button>

      <Button 
          variant="ghost"
          @click="emit('goHome')"
          :disabled="isSyncing"
          class="w-full py-3 text-base text-slate-500 hover:text-orange-700"
      >
          Inicio
      </Button>
    </div>
  </div>
</template>
