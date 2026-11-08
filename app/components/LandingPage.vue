<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import Button from './Button.vue'
import type { Deck } from '~/types'

const props = defineProps<{
  totalCards: number
  dueCardsCount: number
  masteredCardsCount: number
  averageMastery: number
  startingMastery?: number
  isExpanding: boolean
  activeDeck?: Deck
  deckCount?: number
  sessionScopeText?: string
  sessionScopeTitle?: string
  isAllDecks?: boolean
  streakCount?: number
  isStudiedToday?: boolean
  longestStreak?: number
  failedCardsCount?: number
  todayUniqueWordsCount?: number
  todayCorrectUniqueWordsCount?: number
  yesterdayUniqueWordsCount?: number
  todaySessionsCount?: number
  yesterdaySessionsCount?: number
  dailyWordGoal?: number
  dailyGoalProgress?: number
  isDailyGoalMet?: boolean
}>()

const emit = defineEmits<{
  (e: 'startQuiz'): void
  (e: 'openDictionary'): void
  (e: 'openSettings'): void
  (e: 'openCloud'): void
  (e: 'openStories'): void
  (e: 'startAiExpansion'): void
  (e: 'openDeckManager'): void
  (e: 'openMetrics'): void
  (e: 'openReinforce'): void
  (e: 'updateDailyGoal', goal: number): void
}>()

const isEditingGoal = ref(false)
const customGoalInput = ref(props.dailyWordGoal || 30)

watch(() => props.dailyWordGoal, (val) => {
  if (val) customGoalInput.value = val
})

const handleSaveGoal = () => {
  const sanitized = Math.max(1, Math.min(500, Math.round(Number(customGoalInput.value) || 30)))
  customGoalInput.value = sanitized
  emit('updateDailyGoal', sanitized)
  isEditingGoal.value = false
}

const applyPresetGoal = (preset: number) => {
  customGoalInput.value = preset
  emit('updateDailyGoal', preset)
  isEditingGoal.value = false
}

// Daily Mastery Milestone Computeds
const effectiveStartingMastery = computed(() => {
  return typeof props.startingMastery === 'number' ? props.startingMastery : props.averageMastery
})

const masteryDelta = computed(() => {
  return (props.averageMastery || 0) - (effectiveStartingMastery.value || 0)
})

const hasMasteryProgress = computed(() => {
  return masteryDelta.value > 0
})
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-white text-slate-800 overflow-y-auto font-sans relative items-center justify-center py-6">
    <div class="z-10 flex flex-col items-center animate-fade-in text-center max-w-lg w-full px-6 my-auto">
      
      <!-- Top Control Badges: Streak, Daily Goal Pill & Language Scope -->
      <div class="flex items-center justify-center gap-2 mb-3 flex-wrap">
        <!-- Streak Badge -->
        <button
          @click="emit('openMetrics')"
          class="group flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-orange-50 border border-orange-300 shadow-sm transition-colors cursor-pointer"
          title="Ver métricas de rendimiento y racha"
        >
          <span class="text-base select-none">🔥</span>
          <span class="text-xs font-black text-orange-600 font-mono">{{ streakCount || 0 }}</span>
          <span class="text-[10px] uppercase font-bold tracking-wider text-orange-600">
            {{ isStudiedToday ? 'Al día' : 'Pendiente' }}
          </span>
        </button>

        <!-- Language Session & Scope Switcher pill -->
        <button 
          @click="emit('openSettings')"
          class="group flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white hover:bg-orange-50 border border-slate-200 hover:border-orange-400 shadow-sm transition-colors cursor-pointer"
          title="Configurar mazos y opciones del repaso"
        >
          <span class="text-base">🇨🇳</span>
          <div class="flex items-center gap-1.5 text-xs">
            <span class="font-bold text-slate-800">Mandarín</span>
            <span class="text-slate-300">•</span>
            <span class="text-orange-600 font-semibold truncate max-w-[140px]">{{ sessionScopeText || 'Todos los mazos' }}</span>
          </div>
          <span class="text-[10px] text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200 group-hover:bg-orange-100 transition-colors">
            ⚙️
          </span>
        </button>
      </div>

      <h1 class="text-4xl sm:text-5xl font-serif font-bold mb-1.5 text-orange-600">
        Chino Mandarín
      </h1>
      <p class="text-slate-500 mb-4 text-sm sm:text-base">
        {{ isAllDecks !== false ? 'Mezclando tarjetas de todos los mazos con repetición espaciada' : `Repasando: ${sessionScopeTitle || 'Mazos seleccionados'}` }}
      </p>

      <!-- Daily Unique Words Goal & Self-Managed Reference Card -->
      <div
        class="w-full rounded-2xl p-4 mb-4 border transition-all shadow-sm text-left"
        :class="isDailyGoalMet ? 'bg-emerald-50/70 border-emerald-300' : 'bg-orange-50/60 border-orange-200'"
      >
        <div class="flex items-center justify-between gap-2 mb-2">
          <div class="flex items-center gap-2">
            <span class="text-lg">{{ isDailyGoalMet ? '🏆' : '🎯' }}</span>
            <div>
              <span class="text-xs font-extrabold uppercase tracking-wider" :class="isDailyGoalMet ? 'text-emerald-700' : 'text-orange-700'">
                Meta Diaria de Vocabulario
              </span>
            </div>
          </div>

          <div class="flex items-center gap-1.5">
            <span
              class="text-[11px] font-bold px-2.5 py-0.5 rounded-full border"
              :class="isDailyGoalMet
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-orange-600 border-orange-300'"
            >
              {{ isDailyGoalMet ? '✓ Meta Cumplida' : `${dailyGoalProgress || 0}%` }}
            </span>
            <button
              type="button"
              @click="isEditingGoal = !isEditingGoal"
              class="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-white hover:bg-orange-100 text-slate-600 hover:text-orange-700 border border-slate-200 transition-colors cursor-pointer"
              title="Autogestionar mi meta diaria de palabras"
            >
              ✏️ Meta
            </button>
          </div>
        </div>

        <!-- Inline Self-Managed Goal Editor -->
        <div v-if="isEditingGoal" class="mb-3 p-3 bg-white rounded-xl border border-orange-200 space-y-2.5 animate-fade-in">
          <div class="flex items-center justify-between">
            <label class="text-xs font-bold text-slate-700">
              Palabras diferentes por día:
            </label>
            <div class="flex items-center gap-1">
              <button
                v-for="preset in [15, 30, 50, 100]"
                :key="preset"
                type="button"
                @click="applyPresetGoal(preset)"
                class="text-[11px] font-mono font-bold px-2 py-0.5 rounded border transition-colors cursor-pointer"
                :class="(dailyWordGoal || 30) === preset
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'"
              >
                {{ preset }}
              </button>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="500"
              v-model.number="customGoalInput"
              @keyup.enter="handleSaveGoal"
              class="flex-1 px-3 py-1.5 text-sm font-mono font-bold border border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900"
            />
            <button
              type="button"
              @click="handleSaveGoal"
              class="px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white transition-colors cursor-pointer"
            >
              Guardar
            </button>
            <button
              type="button"
              @click="isEditingGoal = false"
              class="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>

        <!-- Orientative Daily Sessions Indicator (Above Word Count) -->
        <div
          class="flex items-center justify-between text-xs mb-2.5 pt-1.5 border-t border-dashed"
          :class="isDailyGoalMet ? 'border-emerald-200 text-emerald-800/80' : 'border-orange-200 text-slate-600'"
        >
          <div class="flex items-center gap-1.5">
            <span class="text-sm select-none">🔄</span>
            <span class="font-bold text-slate-700">Sesiones hoy:</span>
            <span
              class="font-mono font-black text-xs px-2 py-0.5 rounded-md bg-white border shadow-2xs"
              :class="isDailyGoalMet ? 'border-emerald-300 text-emerald-700' : 'border-orange-300 text-orange-600'"
            >
              {{ todaySessionsCount || 0 }}
            </span>
            <span class="text-[11px] text-slate-500 font-normal">
              {{ (todaySessionsCount || 0) === 1 ? 'sesión completada' : 'sesiones completadas' }}
            </span>
          </div>

          <span class="text-[10px] text-slate-400 font-medium italic select-none">
            (orientativo)
          </span>
        </div>

        <!-- Counter & Reference Details -->
        <div class="flex items-baseline justify-between gap-2 mb-2">
          <div class="flex items-baseline gap-1.5">
            <span class="text-2xl sm:text-3xl font-mono font-black" :class="isDailyGoalMet ? 'text-emerald-700' : 'text-slate-900'">
              {{ todayUniqueWordsCount || 0 }}
            </span>
            <span class="text-sm font-mono font-bold text-slate-400">
              / {{ dailyWordGoal || 30 }}
            </span>
            <span class="text-xs font-medium text-slate-600 ml-1">
              palabras diferentes hoy
            </span>
          </div>

          <span class="text-[11px] font-mono font-semibold text-emerald-700 bg-white/80 px-2 py-0.5 rounded-md border border-emerald-200">
            ✓ {{ todayCorrectUniqueWordsCount || 0 }} acertadas
          </span>
        </div>

        <!-- Progress bar -->
        <div class="w-full h-2.5 bg-white rounded-full overflow-hidden p-0.5 border" :class="isDailyGoalMet ? 'border-emerald-300' : 'border-orange-200'">
          <div
            class="h-full rounded-full transition-all duration-500 ease-out"
            :class="isDailyGoalMet ? 'bg-emerald-500' : 'bg-orange-500'"
            :style="{ width: `${Math.min(100, Math.max(todayUniqueWordsCount ? 4 : 0, dailyGoalProgress || 0))}%` }"
          />
        </div>

        <!-- Reference Footer Line -->
        <div class="mt-2 flex items-center justify-between text-[11px] text-slate-600 flex-wrap gap-1">
          <span v-if="!isDailyGoalMet" class="font-medium">
            Faltan <strong class="text-orange-600 font-mono">{{ Math.max(0, (dailyWordGoal || 30) - (todayUniqueWordsCount || 0)) }}</strong> palabras diferentes para cumplir tu meta de hoy
          </span>
          <span v-else class="font-semibold text-emerald-700">
            🎉 ¡Meta diaria cumplida correctamente!
            <template v-if="(todayUniqueWordsCount || 0) > (dailyWordGoal || 30)">
              (+{{ (todayUniqueWordsCount || 0) - (dailyWordGoal || 30) }} extra sobre la meta)
            </template>
          </span>

          <span class="text-slate-500 font-mono">
            Ref. ayer: <strong>{{ yesterdayUniqueWordsCount || 0 }}</strong> pal.
          </span>
        </div>

        <!-- Daily Mastery Growth Indicator (Starting vs Current) -->
        <div
          class="mt-2.5 pt-2 border-t border-dashed flex items-center justify-between text-[11px] transition-all flex-wrap gap-1.5"
          :class="hasMasteryProgress
            ? 'border-emerald-300 text-emerald-800'
            : isDailyGoalMet
              ? 'border-emerald-200 text-slate-600'
              : 'border-orange-200 text-slate-600'"
        >
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-xs select-none">{{ hasMasteryProgress ? '🚀' : '📈' }}</span>
            <span>
              Hoy comenzamos en <strong class="font-mono font-bold" :class="hasMasteryProgress ? 'text-emerald-900' : 'text-slate-800'">{{ effectiveStartingMastery }}%</strong> y terminamos en <strong class="font-mono font-bold" :class="hasMasteryProgress ? 'text-emerald-700' : 'text-slate-800'">{{ averageMastery }}%</strong>
            </span>
          </div>

          <span
            v-if="hasMasteryProgress"
            class="font-mono font-extrabold text-[10px] px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-2xs border border-emerald-500 animate-pulse"
            title="¡Has aumentado el dominio promedio hoy!"
          >
            +{{ masteryDelta }}% ¡Hito alcanzado! 🎉
          </span>
          <span
            v-else
            class="text-[10px] text-slate-400 font-mono italic select-none"
          >
            (sin variación)
          </span>
        </div>
      </div>
      
      <!-- SRS Stats Panel -->
      <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 w-full mb-5 shadow-sm">
        <div class="grid grid-cols-2 gap-3 text-center">
          <div class="flex flex-col items-center justify-center p-2.5 bg-orange-50 rounded-xl border border-orange-200">
            <span class="text-2xl sm:text-3xl font-mono font-bold text-slate-900">{{ totalCards }}</span>
            <span class="text-[10px] text-slate-600 uppercase tracking-wider mt-1 font-semibold">Total Sesión</span>
          </div>
          <div class="flex flex-col items-center justify-center p-2.5 bg-orange-50 rounded-xl border border-orange-200">
            <span class="text-2xl sm:text-3xl font-mono font-bold text-orange-600">{{ dueCardsCount }}</span>
            <span class="text-[10px] text-slate-600 uppercase tracking-wider mt-1 font-semibold">Para Repasar</span>
          </div>
          <div class="flex flex-col items-center justify-center p-2.5 bg-orange-50 rounded-xl border border-orange-200">
            <span class="text-2xl sm:text-3xl font-mono font-bold text-orange-600">{{ masteredCardsCount }}</span>
            <span class="text-[10px] text-slate-600 uppercase tracking-wider mt-1 font-semibold">Dominadas</span>
          </div>
          <div class="flex flex-col items-center justify-center p-2.5 bg-orange-50 rounded-xl border border-orange-200">
            <span class="text-2xl sm:text-3xl font-mono font-bold text-orange-500">{{ averageMastery }}%</span>
            <span class="text-[10px] text-slate-600 uppercase tracking-wider mt-1 font-semibold">Dominio Promedio</span>
          </div>
        </div>
      </div>

      <div class="w-full space-y-3">
        <Button 
          variant="primary" 
          @click="emit('startQuiz')" 
          class="w-full py-4 text-xl shadow-md bg-orange-500 hover:bg-orange-600 text-white border border-orange-500 transition-colors"
          :disabled="totalCards === 0"
        >
          {{ dueCardsCount > 0 ? `Repasar Sesión (${dueCardsCount} vencidas)` : totalCards === 0 ? 'Sin Tarjetas' : 'Practicar (Todo al día)' }}
        </Button>

        <Button 
          variant="outline" 
          @click="emit('startAiExpansion')" 
          class="w-full py-3 text-sm font-bold bg-white hover:bg-orange-50 text-orange-600 border border-orange-300 hover:border-orange-400 transition-colors flex items-center justify-center gap-2"
          :isLoading="isExpanding"
          :disabled="isExpanding"
        >
          ✨ Expansión Inteligente con IA
        </Button>

        <Button 
          variant="outline" 
          @click="emit('openReinforce')" 
          class="w-full py-3 text-sm font-bold bg-white hover:bg-orange-50 text-orange-600 border border-orange-300 hover:border-orange-400 transition-colors flex items-center justify-center gap-2"
        >
          <span>🎯</span>
          <span>Reforzar Errores con Historias</span>
          <span v-if="failedCardsCount && failedCardsCount > 0" class="text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 font-mono font-bold border border-orange-300 ml-1">
            {{ failedCardsCount }} pendientes
          </span>
        </Button>
        
        <!-- Navigation Grid (6 Items) -->
        <div class="grid grid-cols-3 gap-2.5 pt-2">
          <Button variant="secondary" @click="emit('openDictionary')" class="flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 bg-white hover:bg-orange-50 border-slate-200 hover:border-orange-300 text-slate-700 hover:text-orange-600 text-xs sm:text-sm">
            <span class="text-base">📖</span> <span>Diccionario</span>
          </Button>
          <Button variant="secondary" @click="emit('openDeckManager')" class="flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 bg-white hover:bg-orange-50 border-slate-200 hover:border-orange-300 text-slate-700 hover:text-orange-600 text-xs sm:text-sm">
            <span class="text-base">🗂️</span> <span>Mazos</span>
          </Button>
          <Button variant="secondary" @click="emit('openStories')" class="flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 bg-white hover:bg-orange-50 border-slate-200 hover:border-orange-300 text-slate-700 hover:text-orange-600 text-xs sm:text-sm" title="Cuentos, historias y noticias con caracteres 100% dominados">
            <span class="text-base">📚</span> <span>Historias</span>
            <span v-if="masteredCardsCount > 0" class="hidden sm:inline text-[9px] px-1.5 py-0.2 rounded-full bg-orange-50 text-orange-600 font-mono font-bold border border-orange-300">
              {{ masteredCardsCount }}
            </span>
          </Button>
          <Button variant="secondary" @click="emit('openMetrics')" class="flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 bg-white hover:bg-orange-50 border-slate-200 hover:border-orange-300 text-slate-700 hover:text-orange-600 text-xs sm:text-sm">
            <span class="text-base">📊</span> <span>Métricas</span>
          </Button>
          <Button variant="secondary" @click="emit('openSettings')" class="flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 bg-white hover:bg-orange-50 border-slate-200 hover:border-orange-300 text-slate-700 hover:text-orange-600 text-xs sm:text-sm">
            <span class="text-base">⚙️</span> <span>Ajustes</span>
          </Button>
          <Button variant="secondary" @click="emit('openCloud')" class="flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 bg-white hover:bg-orange-50 border-slate-200 hover:border-orange-300 text-slate-700 hover:text-orange-600 text-xs sm:text-sm">
            <span class="text-base">☁️</span> <span>Nube</span>
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
