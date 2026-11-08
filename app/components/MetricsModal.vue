<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import type { Deck, DaySummaryMetric } from '~/types';
import Button from './Button.vue';

const props = defineProps<{
  availableDecks: Deck[];
  currentLanguage: string;
  currentDeckId?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const {
  streak,
  activeStreak,
  isStudiedToday,
  isMetricsLoading,
  dailyWordGoal,
  setDailyWordGoal,
  getHistoricalMetrics,
  getLocalDateString
} = useMetrics();

const isEditingGoal = ref(false);
const goalInput = ref(dailyWordGoal.value || 30);

watch(dailyWordGoal, (val) => {
  if (val) goalInput.value = val;
});

const handleSaveGoal = async () => {
  await setDailyWordGoal(goalInput.value);
  isEditingGoal.value = false;
};

// Filters state
const selectedLanguage = ref(props.currentLanguage || 'zh');
const selectedDeckId = ref('all');

// Unique languages available
const availableLanguages = computed(() => {
  const langs = new Set<string>();
  props.availableDecks.forEach(d => {
    if (d.language) langs.add(d.language);
  });
  if (langs.size === 0) langs.add('zh');
  return Array.from(langs);
});

// Decks for current selected language
const filteredDecks = computed(() => {
  return props.availableDecks.filter(d => (d.language || 'zh') === selectedLanguage.value);
});

// Watch language change to reset deck selection if necessary
watch(selectedLanguage, () => {
  selectedDeckId.value = 'all';
});

// Metrics calculation for the 90-day range
const metricsData = computed(() => {
  return getHistoricalMetrics(selectedLanguage.value, selectedDeckId.value);
});

const days = computed(() => metricsData.value.days);
const summary = computed(() => metricsData.value.summary);

// Maximum total in any day to calculate chart bar heights
const maxDayTotal = computed(() => {
  const max = Math.max(...days.value.map(d => d.total), 0);
  return max > 0 ? max : 10;
});

// Selected day detail for inspection (defaults to today)
const todayStr = getLocalDateString();
const hoveredDay = ref<DaySummaryMetric | null>(null);

const activeDayDetail = computed(() => {
  if (hoveredDay.value) return hoveredDay.value;
  return days.value.find(d => d.date === todayStr) || days.value[days.value.length - 1];
});

// Container ref for auto-scrolling chart to the end (today)
const chartScrollContainer = ref<HTMLElement | null>(null);

const scrollToToday = () => {
  nextTick(() => {
    if (chartScrollContainer.value) {
      chartScrollContainer.value.scrollLeft = chartScrollContainer.value.scrollWidth;
    }
  });
};

onMounted(() => {
  scrollToToday();
});

watch([selectedLanguage, selectedDeckId], () => {
  scrollToToday();
});

const getLanguageName = (code: string) => {
  switch (code) {
    case 'zh': return '🇨🇳 Chino Mandarín';
    case 'en': return '🇺🇸 Inglés';
    case 'ja': return '🇯🇵 Japonés';
    case 'fr': return '🇫🇷 Francés';
    default: return code.toUpperCase();
  }
};
</script>

<template>
  <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-6 animate-fade-in">
    <div class="bg-white border border-orange-200 rounded-2xl w-full max-w-4xl shadow-2xl text-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
      
      <!-- Header -->
      <div class="p-5 sm:p-6 border-b border-orange-100 flex items-center justify-between flex-wrap gap-4 bg-white">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-xl shadow-sm">
            📊
          </div>
          <div>
            <h2 class="text-xl sm:text-2xl font-bold text-orange-600">
              Métricas & Rendimiento
            </h2>
            <p class="text-xs text-slate-500">
              Historial de aciertos y errores de los últimos 3 meses (90 días)
            </p>
          </div>
        </div>

        <button 
          @click="emit('close')"
          class="p-2 text-slate-400 hover:text-orange-600 rounded-lg hover:bg-orange-50 transition-colors"
          title="Cerrar modal"
        >
          <span class="text-lg">✕</span>
        </button>
      </div>

      <!-- Main Content (Scrollable) -->
      <div class="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
        
        <!-- Filter Controls -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-orange-50/50 rounded-xl border border-orange-100">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <span>🌐</span> Idioma:
            </label>
            <select
              v-model="selectedLanguage"
              class="w-full bg-white border border-orange-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            >
              <option v-for="lang in availableLanguages" :key="lang" :value="lang">
                {{ getLanguageName(lang) }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <span>🗂️</span> Mazo:
            </label>
            <select
              v-model="selectedDeckId"
              class="w-full bg-white border border-orange-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            >
              <option value="all">Todos los mazos del idioma</option>
              <option v-for="deck in filteredDecks" :key="deck.id" :value="deck.id">
                {{ deck.icon || '📁' }} {{ deck.name }}
              </option>
            </select>
          </div>
        </div>

        <!-- Daily Goal & Reference Banner -->
        <div
          class="p-4 rounded-xl border flex flex-col gap-3 shadow-sm"
          :class="summary.todayUniqueWords >= dailyWordGoal ? 'bg-emerald-50/70 border-emerald-300' : 'bg-orange-50/70 border-orange-200'"
        >
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-2.5">
              <span class="text-2xl">{{ summary.todayUniqueWords >= dailyWordGoal ? '🏆' : '🎯' }}</span>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-sm font-extrabold uppercase tracking-wider" :class="summary.todayUniqueWords >= dailyWordGoal ? 'text-emerald-700' : 'text-orange-700'">
                    Meta Diaria Autogestionada
                  </h3>
                  <span
                    class="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border"
                    :class="summary.todayUniqueWords >= dailyWordGoal
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-orange-600 border-orange-300'"
                  >
                    {{ summary.todayUniqueWords >= dailyWordGoal ? '✓ Meta Cumplida Hoy' : 'En progreso hoy' }}
                  </span>
                </div>
                <p class="text-xs text-slate-600 mt-0.5">
                  Hoy has revisado <strong class="font-mono text-slate-900">{{ summary.todayUniqueWords }}</strong> de <strong class="font-mono text-slate-900">{{ dailyWordGoal }}</strong> palabras diferentes ({{ summary.todayCorrectUniqueWords }} acertadas).
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <template v-if="!isEditingGoal">
                <div class="text-right hidden sm:block mr-2">
                  <div class="text-[11px] text-slate-500">Referencia (Promedio diario):</div>
                  <div class="text-xs font-mono font-bold text-slate-800">
                    {{ summary.averageDailyUniqueWords }} palabras/día • {{ summary.daysGoalMetCount }} días con meta cumplida
                  </div>
                </div>
                <button
                  type="button"
                  @click="isEditingGoal = true"
                  class="px-3 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-orange-100 text-orange-600 border border-orange-200 transition-colors cursor-pointer"
                >
                  ✏️ Cambiar Meta ({{ dailyWordGoal }})
                </button>
              </template>
              <template v-else>
                <input
                  type="number"
                  min="1"
                  max="500"
                  v-model.number="goalInput"
                  @keyup.enter="handleSaveGoal"
                  class="w-20 px-2.5 py-1 text-sm font-mono font-bold bg-white border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                  class="px-2 py-1.5 rounded-lg text-xs text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </template>
            </div>
          </div>

          <div class="w-full h-2.5 bg-white rounded-full overflow-hidden p-0.5 border" :class="summary.todayUniqueWords >= dailyWordGoal ? 'border-emerald-300' : 'border-orange-200'">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="summary.todayUniqueWords >= dailyWordGoal ? 'bg-emerald-500' : 'bg-orange-500'"
              :style="{ width: `${Math.min(100, Math.round((summary.todayUniqueWords / Math.max(1, dailyWordGoal)) * 100))}%` }"
            />
          </div>
        </div>

        <!-- KPI Cards Grid -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          <!-- Racha Card -->
          <div class="p-4 bg-orange-50 border border-orange-200 rounded-xl flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div class="absolute -right-3 -top-3 text-5xl opacity-10 select-none">🔥</div>
            <div class="flex items-center justify-between">
              <span class="text-xs uppercase font-bold tracking-wider text-orange-600">Racha Actual</span>
              <span class="text-xs font-mono px-2 py-0.5 rounded-full bg-white text-orange-600 border border-orange-300">
                {{ isStudiedToday ? '✓ Hoy' : '⏳ Pendiente' }}
              </span>
            </div>
            <div class="my-2">
              <div class="text-3xl sm:text-4xl font-extrabold text-slate-900 flex items-baseline gap-1.5">
                <span>🔥 {{ activeStreak }}</span>
                <span class="text-sm font-normal text-slate-500">días</span>
              </div>
            </div>
            <div class="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-orange-200">
              <span>Récord histórico:</span>
              <span class="font-bold text-orange-600">{{ streak.longestStreak }} días</span>
            </div>
          </div>

          <!-- Precisión Card -->
          <div class="p-4 bg-orange-50 border border-orange-200 rounded-xl flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div class="absolute -right-3 -top-3 text-5xl opacity-10 select-none">🎯</div>
            <span class="text-xs uppercase font-bold tracking-wider text-orange-600">Precisión</span>
            <div class="my-2">
              <div class="text-3xl sm:text-4xl font-extrabold text-slate-900 flex items-baseline gap-1.5">
                <span>{{ summary.accuracy }}%</span>
              </div>
            </div>
            <div class="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-orange-200">
              <span>Total repasos:</span>
              <span class="font-mono font-bold text-orange-600">{{ summary.totalReviews }}</span>
            </div>
          </div>

          <!-- Aciertos vs Errores Card -->
          <div class="p-4 bg-orange-50 border border-orange-200 rounded-xl flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div class="absolute -right-3 -top-3 text-5xl opacity-10 select-none">⚖️</div>
            <span class="text-xs uppercase font-bold tracking-wider text-orange-600">Aciertos / Fallos</span>
            <div class="my-2 flex items-baseline gap-3">
              <span class="text-2xl sm:text-3xl font-extrabold text-emerald-600">
                +{{ summary.totalCorrect }}
              </span>
              <span class="text-base sm:text-xl font-bold text-rose-600">
                -{{ summary.totalWrong }}
              </span>
            </div>
            <div class="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-orange-200">
              <span>Ratio acierto:</span>
              <span class="font-mono font-bold" :class="summary.totalReviews > 0 ? 'text-emerald-600' : 'text-slate-400'">
                {{ summary.totalReviews > 0 ? (summary.totalCorrect / summary.totalReviews).toFixed(2) : '0.00' }}
              </span>
            </div>
          </div>

          <!-- Días Activos Card -->
          <div class="p-4 bg-orange-50 border border-orange-200 rounded-xl flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div class="absolute -right-3 -top-3 text-5xl opacity-10 select-none">📅</div>
            <span class="text-xs uppercase font-bold tracking-wider text-orange-600">Días de Estudio</span>
            <div class="my-2">
              <div class="text-3xl sm:text-4xl font-extrabold text-slate-900 flex items-baseline gap-1.5">
                <span>{{ summary.activeDaysCount }}</span>
                <span class="text-sm font-normal text-slate-500">/ 90 días</span>
              </div>
            </div>
            <div class="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-orange-200">
              <span>Frecuencia:</span>
              <span class="font-bold text-orange-600">{{ Math.round((summary.activeDaysCount / 90) * 100) }}% activo</span>
            </div>
          </div>

        </div>

        <!-- Timeline Chart Section -->
        <div class="bg-orange-50/40 rounded-xl border border-orange-100 p-4 sm:p-5">
          <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h3 class="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span>📈</span> Actividad diaria (Últimos 90 días)
              </h3>
              <p class="text-xs text-slate-500">
                Pasa el ratón o toca un día para inspeccionar el detalle
              </p>
            </div>
            
            <!-- Legend -->
            <div class="flex items-center gap-3 text-xs flex-wrap">
              <div class="flex items-center gap-1.5">
                <span class="w-3 h-3 rounded bg-orange-500"></span>
                <span class="text-slate-600">Aciertos</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="w-3 h-3 rounded bg-rose-500"></span>
                <span class="text-slate-600">Errores</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span class="text-slate-600">Meta cumplida ({{ dailyWordGoal }}+)</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                <span class="text-slate-500">Hoy</span>
              </div>
            </div>
          </div>

          <!-- Chart Scroll Container -->
          <div 
            ref="chartScrollContainer"
            class="overflow-x-auto pb-3 pt-2 scrollbar-thin scrollbar-thumb-orange-300 scrollbar-track-transparent cursor-grab active:cursor-grabbing"
          >
            <div class="flex items-end gap-1 sm:gap-1.5 min-w-[760px] h-48 px-2 relative border-b border-orange-200/80 pb-1">
              
              <!-- 90 Days Columns -->
              <div
                v-for="day in days"
                :key="day.date"
                @mouseenter="hoveredDay = day"
                @click="hoveredDay = day"
                class="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
              >
                <!-- Indicator for today or goal met -->
                <div 
                  v-if="day.date === todayStr"
                  class="absolute -top-1 w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]"
                  title="Hoy"
                ></div>
                <div
                  v-else-if="day.goalMet"
                  class="absolute -top-1 w-2 h-2 rounded-full bg-emerald-500"
                  title="Meta diaria cumplida"
                ></div>

                <!-- Bar Column -->
                <div class="w-full max-w-[14px] flex flex-col justify-end items-center h-40">
                  <div
                    v-if="day.total > 0"
                    class="w-full rounded-t-sm flex flex-col-reverse overflow-hidden transition-all duration-200 group-hover:scale-110 group-hover:brightness-110"
                    :style="{
                      height: `${Math.max(12, Math.round((day.total / maxDayTotal) * 150))}px`
                    }"
                  >
                    <!-- Correct segment (bottom) -->
                    <div
                      class="w-full bg-orange-500"
                      :style="{
                        height: `${day.total > 0 ? (day.correct / day.total) * 100 : 0}%`
                      }"
                    ></div>
                    <!-- Wrong segment (top) -->
                    <div
                      class="w-full bg-rose-500"
                      :style="{
                        height: `${day.total > 0 ? (day.wrong / day.total) * 100 : 0}%`
                      }"
                    ></div>
                  </div>

                  <!-- Empty day placeholder dot/bar -->
                  <div
                    v-else
                    class="w-full h-1.5 rounded-full bg-orange-200/70 group-hover:bg-orange-300 transition-colors"
                  ></div>
                </div>

                <!-- Date marker (only show periodically or for today) -->
                <div class="mt-2 text-[9px] font-mono text-slate-500 group-hover:text-orange-700 transition-colors truncate">
                  {{ day.date.endsWith('01') || day.date.endsWith('15') || day.date === todayStr ? day.label.split(' ')[0] : '' }}
                </div>
              </div>

            </div>
          </div>

          <!-- Active Day Inspector Panel -->
          <div class="mt-4 p-3 bg-white rounded-xl border border-orange-200/80 flex items-center justify-between flex-wrap gap-3 shadow-sm">
            <div class="flex items-center gap-2.5">
              <span class="text-lg">🗓️</span>
              <div>
                <div class="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <span>{{ activeDayDetail.dayOfWeek }}, {{ activeDayDetail.label }}</span>
                  <span v-if="activeDayDetail.date === todayStr" class="text-[10px] bg-orange-100 text-orange-700 border border-orange-300 px-1.5 py-0.2 rounded font-mono">
                    HOY
                  </span>
                </div>
                <div class="text-[11px] text-slate-500 font-mono">
                  Fecha: {{ activeDayDetail.date }}
                </div>
              </div>
            </div>

            <div class="flex items-center gap-3 sm:gap-4 text-xs font-mono flex-wrap">
              <div
                class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border"
                :class="activeDayDetail.goalMet
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-orange-50/70 border-orange-200 text-slate-700'"
              >
                <span>{{ activeDayDetail.goalMet ? '🏆' : '🎯' }}</span>
                <span class="font-bold">{{ activeDayDetail.uniqueWords }}/{{ dailyWordGoal }}</span>
                <span class="text-[11px] font-sans">{{ activeDayDetail.goalMet ? 'Meta cumplida' : 'palabras únicas' }}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="text-orange-600 font-bold">✓ {{ activeDayDetail.correct }}</span>
                <span class="text-slate-500">aciertos</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="text-rose-600 font-bold">✗ {{ activeDayDetail.wrong }}</span>
                <span class="text-slate-500">fallos</span>
              </div>
              <div class="flex items-center gap-1.5 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200">
                <span class="text-slate-700">Precisión:</span>
                <span class="font-bold" :class="activeDayDetail.accuracy >= 70 ? 'text-orange-600' : activeDayDetail.total > 0 ? 'text-amber-600' : 'text-slate-400'">
                  {{ activeDayDetail.total > 0 ? `${activeDayDetail.accuracy}%` : 'Sin actividad' }}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

      <!-- Footer -->
      <div class="p-4 border-t border-orange-100 bg-orange-50/30 flex justify-end">
        <Button variant="secondary" @click="emit('close')" class="py-2.5 px-6 text-sm">
          Cerrar
        </Button>
      </div>

    </div>
  </div>
</template>
