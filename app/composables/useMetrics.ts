import { collection, doc, getDoc, getDocs, setDoc, query, where } from 'firebase/firestore';
import { computed } from 'vue';
import type { DailyMetric, UserStreak, DaySummaryMetric, MetricsSummary, DailyMasterySnapshot } from '~/types';

export const useMetrics = () => {
  const { $db } = useNuxtApp();

  // Storage / Collection keys
  const DAILY_METRICS_COLLECTION = 'daily_metrics';
  const USER_STATS_COLLECTION = 'user_stats';
  const STREAK_DOC_ID = 'streak';
  const LOCAL_METRICS_KEY = 'mandarin_daily_metrics';
  const LOCAL_STREAK_KEY = 'mandarin_user_streak';
  const LOCAL_GOAL_KEY = 'mandarin_daily_word_goal';
  const LOCAL_STARTING_MASTERY_KEY = 'mandarin_starting_mastery';
  const DEFAULT_DAILY_GOAL = 30;

  // Shared reactive states
  const rawMetrics = useState<DailyMetric[]>('global_daily_metrics', () => []);
  const dailyWordGoal = useState<number>('global_daily_word_goal', () => {
    if (typeof window !== 'undefined') {
      try {
        const savedGoal = localStorage.getItem(LOCAL_GOAL_KEY);
        if (savedGoal) {
          const parsed = parseInt(savedGoal, 10);
          if (!isNaN(parsed) && parsed > 0) return parsed;
        }
        const savedStreak = localStorage.getItem(LOCAL_STREAK_KEY);
        if (savedStreak) {
          const parsedStreak = JSON.parse(savedStreak) as UserStreak;
          if (parsedStreak.dailyWordGoal && parsedStreak.dailyWordGoal > 0) {
            return parsedStreak.dailyWordGoal;
          }
        }
      } catch {}
    }
    return DEFAULT_DAILY_GOAL;
  });

  const streak = useState<UserStreak>('global_user_streak', () => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(LOCAL_STREAK_KEY);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: '',
      totalDaysStudied: 0,
      dailyWordGoal: DEFAULT_DAILY_GOAL
    };
  });
  const isMetricsLoading = useState<boolean>('global_metrics_loading', () => false);

  // Timezone configuration: strictly UTC-5 (America/Bogota)
  const BOGOTA_TIMEZONE = 'America/Bogota';

  // Helper date functions strictly locked to UTC-5 (America/Bogota)
  const getBogotaDateString = (d: Date | string | number = new Date()): string => {
    const dateObj = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: BOGOTA_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(dateObj);
  };

  // Backwards compatible alias for getLocalDateString locked to Bogota time
  const getLocalDateString = getBogotaDateString;

  const getYesterdayBogotaString = (): string => {
    const todayStr = getBogotaDateString();
    const [y, m, day] = todayStr.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1, day - 1, 12, 0, 0));
    return getBogotaDateString(d);
  };

  const getYesterdayString = getYesterdayBogotaString;

  // Initial average mastery snapshot for today (integer percentage)
  const todayStartingMastery = useState<number | null>('global_today_starting_mastery', () => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(LOCAL_STARTING_MASTERY_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as DailyMasterySnapshot;
          const today = getBogotaDateString();
          if (parsed.date === today && typeof parsed.startingMastery === 'number') {
            return parsed.startingMastery;
          }
        }
      } catch {}
    }
    return null;
  });

  // Capture / ensure baseline average mastery snapshot for today
  const initDailyStartingMastery = async (currentMastery: number, scopeKey: string = 'zh'): Promise<number | null> => {
    if (typeof currentMastery !== 'number' || isNaN(currentMastery) || currentMastery <= 0) {
      return todayStartingMastery.value;
    }
    const today = getBogotaDateString();

    // 1. If localStorage already has today's baseline, keep it intact
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(LOCAL_STARTING_MASTERY_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as DailyMasterySnapshot;
          if (parsed.date === today && typeof parsed.startingMastery === 'number') {
            todayStartingMastery.value = parsed.startingMastery;
            return parsed.startingMastery;
          }
        }
      } catch {}
    }

    // 2. If streak has today's baseline saved, use it
    if (streak.value.todayStartingMasteryDate === today && typeof streak.value.todayStartingMastery === 'number') {
      todayStartingMastery.value = streak.value.todayStartingMastery;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(LOCAL_STARTING_MASTERY_KEY, JSON.stringify({
            date: today,
            startingMastery: streak.value.todayStartingMastery,
            deckScope: scopeKey
          }));
        } catch {}
      }
      return streak.value.todayStartingMastery;
    }

    // 3. Otherwise, set today's starting baseline to currentMastery
    const rounded = Math.round(currentMastery);
    todayStartingMastery.value = rounded;

    const snapshot: DailyMasterySnapshot = {
      date: today,
      startingMastery: rounded,
      deckScope: scopeKey,
      updatedAt: new Date().toISOString()
    };

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STARTING_MASTERY_KEY, JSON.stringify(snapshot));
      } catch {}
    }

    streak.value = {
      ...streak.value,
      todayStartingMastery: rounded,
      todayStartingMasteryDate: today
    };

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STREAK_KEY, JSON.stringify(streak.value));
      } catch {}
    }

    if ($db) {
      try {
        const streakRef = doc($db, USER_STATS_COLLECTION, STREAK_DOC_ID);
        await setDoc(streakRef, {
          todayStartingMastery: rounded,
          todayStartingMasteryDate: today
        }, { merge: true });
      } catch (e) {
        console.warn('Error syncing startingMastery to Firestore:', e);
      }
    }

    return rounded;
  };

  // Helper to compute unique words for a specific date from rawMetrics
  const getUniqueWordsForDate = (dateStr: string, language?: string, deckId: string = 'all') => {
    const reviewedSet = new Set<string>();
    const correctSet = new Set<string>();
    let fallbackUnique = 0;
    let fallbackCorrect = 0;

    for (const m of rawMetrics.value) {
      if (m.date !== dateStr) continue;
      if (language && m.language && m.language !== language) continue;
      if (deckId !== 'all' && m.deckId !== deckId) continue;

      if (m.reviewedWordIds && m.reviewedWordIds.length > 0) {
        m.reviewedWordIds.forEach(id => reviewedSet.add(id));
      } else {
        fallbackUnique += m.uniqueWordsCount ?? (m.correct + m.wrong);
      }

      if (m.correctWordIds && m.correctWordIds.length > 0) {
        m.correctWordIds.forEach(id => correctSet.add(id));
      } else {
        fallbackCorrect += m.correct || 0;
      }
    }

    const uniqueWords = reviewedSet.size > 0 ? reviewedSet.size + fallbackUnique : fallbackUnique;
    const correctUniqueWords = correctSet.size > 0
      ? Math.min(uniqueWords, correctSet.size + fallbackCorrect)
      : Math.min(uniqueWords, fallbackCorrect);

    return {
      uniqueWords,
      correctUniqueWords
    };
  };

  const todayUniqueStats = computed(() => {
    const today = getBogotaDateString();
    return getUniqueWordsForDate(today);
  });

  const yesterdayUniqueStats = computed(() => {
    const yesterday = getYesterdayBogotaString();
    return getUniqueWordsForDate(yesterday);
  });

  const todayUniqueWordsCount = computed(() => todayUniqueStats.value.uniqueWords);
  const todayCorrectUniqueWordsCount = computed(() => todayUniqueStats.value.correctUniqueWords);
  const yesterdayUniqueWordsCount = computed(() => yesterdayUniqueStats.value.uniqueWords);

  // Helper to compute sessions count for a given date
  const getSessionsForDate = (dateStr: string, language?: string, deckId: string = 'all'): number => {
    let count = 0;
    for (const m of rawMetrics.value) {
      if (m.date !== dateStr) continue;
      if (language && m.language && m.language !== language) continue;
      if (deckId !== 'all' && m.deckId !== deckId) continue;
      count += (m.sessionsCount || 0);
    }
    return count;
  };

  const todaySessionsCount = computed(() => {
    const today = getBogotaDateString();
    const explicit = getSessionsForDate(today);
    if (explicit > 0) return explicit;

    // Inferencia de sesiones del día según mazos estudiados en hora Bogotá (-5)
    let inferred = 0;
    for (const m of rawMetrics.value) {
      if (m.date !== today) continue;
      const words = m.uniqueWordsCount || (m.reviewedWordIds?.length || 0) || ((m.correct || 0) + (m.wrong || 0));
      if (words > 0) {
        inferred += Math.max(1, Math.round(words / 30));
      }
    }
    return inferred;
  });

  const yesterdaySessionsCount = computed(() => {
    const yesterday = getYesterdayBogotaString();
    const explicit = getSessionsForDate(yesterday);
    if (explicit > 0) return explicit;

    let inferred = 0;
    for (const m of rawMetrics.value) {
      if (m.date !== yesterday) continue;
      const words = m.uniqueWordsCount || (m.reviewedWordIds?.length || 0) || ((m.correct || 0) + (m.wrong || 0));
      if (words > 0) {
        inferred += Math.max(1, Math.round(words / 30));
      }
    }
    return inferred;
  });

  const dailyGoalProgress = computed(() => {
    const goal = Math.max(1, dailyWordGoal.value || DEFAULT_DAILY_GOAL);
    return Math.min(100, Math.round((todayUniqueWordsCount.value / goal) * 100));
  });

  const remainingWordsForGoal = computed(() => {
    const goal = Math.max(1, dailyWordGoal.value || DEFAULT_DAILY_GOAL);
    return Math.max(0, goal - todayUniqueWordsCount.value);
  });

  const isDailyGoalMet = computed(() => {
    const goal = Math.max(1, dailyWordGoal.value || DEFAULT_DAILY_GOAL);
    return todayUniqueWordsCount.value >= goal;
  });

  const isStudiedToday = computed(() => {
    const today = getLocalDateString();
    return streak.value.lastActiveDate === today || todayUniqueWordsCount.value > 0;
  });

  const activeStreak = computed(() => {
    const today = getLocalDateString();
    const yesterday = getYesterdayString();
    if (!streak.value.lastActiveDate) return 0;
    if (streak.value.lastActiveDate === today || streak.value.lastActiveDate === yesterday) {
      return streak.value.currentStreak;
    }
    return 0;
  });

  // Update and persist self-managed daily word goal
  const setDailyWordGoal = async (newGoal: number) => {
    const sanitized = Math.max(1, Math.min(500, Math.round(Number(newGoal) || DEFAULT_DAILY_GOAL)));
    dailyWordGoal.value = sanitized;
    streak.value = {
      ...streak.value,
      dailyWordGoal: sanitized
    };

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_GOAL_KEY, String(sanitized));
        localStorage.setItem(LOCAL_STREAK_KEY, JSON.stringify(streak.value));
      } catch {}
    }

    if ($db) {
      try {
        const streakRef = doc($db, USER_STATS_COLLECTION, STREAK_DOC_ID);
        await setDoc(streakRef, { dailyWordGoal: sanitized }, { merge: true });
      } catch (e) {
        console.warn('Error syncing dailyWordGoal to Firestore:', e);
      }
    }
  };

  // Backfill today's unique words from loaded flashcards if reviewed today
  const seedTodayWordsFromCards = (
    cards: { id?: string; hanzi: string; deckId?: string; srsLastReviewedDate?: string | null; srsRepetitions?: number }[],
    defaultLanguage: string = 'zh'
  ) => {
    if (!cards || cards.length === 0) return;
    const today = getLocalDateString();
    const byDeck = new Map<string, { reviewed: Set<string>; correct: Set<string> }>();

    for (const c of cards) {
      if (!c.srsLastReviewedDate) continue;
      const reviewedDate = getBogotaDateString(c.srsLastReviewedDate);
      if (reviewedDate !== today) continue;

      const deckId = c.deckId || 'mandarin-general';
      const wordId = c.id || c.hanzi;
      if (!wordId) continue;

      const entry = byDeck.get(deckId) || { reviewed: new Set<string>(), correct: new Set<string>() };
      entry.reviewed.add(wordId);
      if ((c.srsRepetitions || 0) > 0) {
        entry.correct.add(wordId);
      }
      byDeck.set(deckId, entry);
    }

    if (byDeck.size === 0) return;

    let changed = false;
    const updated = [...rawMetrics.value];

    for (const [deckId, sets] of byDeck.entries()) {
      const docId = `${today}_${deckId}`;
      const idx = updated.findIndex(m => m.id === docId || (m.date === today && m.deckId === deckId));
      if (idx >= 0) {
        const cur = updated[idx];
        const mergedReviewed = Array.from(new Set([...(cur.reviewedWordIds || []), ...sets.reviewed]));
        const mergedCorrect = Array.from(new Set([...(cur.correctWordIds || []), ...sets.correct]));
        if (mergedReviewed.length !== (cur.reviewedWordIds?.length || 0) || mergedCorrect.length !== (cur.correctWordIds?.length || 0)) {
          updated[idx] = {
            ...cur,
            reviewedWordIds: mergedReviewed,
            correctWordIds: mergedCorrect,
            uniqueWordsCount: mergedReviewed.length,
            sessionsCount: cur.sessionsCount || Math.max(1, Math.round(mergedReviewed.length / 30))
          };
          changed = true;
        }
      } else {
        const reviewedArr = Array.from(sets.reviewed);
        const correctArr = Array.from(sets.correct);
        updated.push({
          id: docId,
          date: today,
          deckId,
          language: defaultLanguage,
          correct: correctArr.length,
          wrong: Math.max(0, reviewedArr.length - correctArr.length),
          reviewedWordIds: reviewedArr,
          correctWordIds: correctArr,
          uniqueWordsCount: reviewedArr.length,
          sessionsCount: Math.max(1, Math.round(reviewedArr.length / 30)),
          updatedAt: new Date().toISOString()
        });
        changed = true;
      }
    }

    if (changed) {
      rawMetrics.value = updated;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(LOCAL_METRICS_KEY, JSON.stringify(updated));
        } catch {}
      }
    }
  };

  // Load metrics from LocalStorage and Firestore
  const loadMetrics = async () => {
    // 1. Initial local load
    if (typeof window !== 'undefined') {
      try {
        const localData = localStorage.getItem(LOCAL_METRICS_KEY);
        if (localData) {
          const parsed = JSON.parse(localData) as DailyMetric[];
          // Backfill sessionsCount para métricas de hoy que aún no tenían sessionsCount explícito
          const today = getBogotaDateString();
          let needsLocalSave = false;
          parsed.forEach(m => {
            if (m.date === today && (m.sessionsCount === undefined || m.sessionsCount === 0)) {
              const words = m.uniqueWordsCount || (m.reviewedWordIds?.length || 0) || ((m.correct || 0) + (m.wrong || 0));
              if (words > 0) {
                m.sessionsCount = Math.max(1, Math.round(words / 30));
                needsLocalSave = true;
              }
            }
          });
          rawMetrics.value = parsed;
          if (needsLocalSave) {
            localStorage.setItem(LOCAL_METRICS_KEY, JSON.stringify(parsed));
          }
        }
        const localStreak = localStorage.getItem(LOCAL_STREAK_KEY);
        if (localStreak) {
          const parsedStreak = JSON.parse(localStreak) as UserStreak;
          streak.value = parsedStreak;
          if (parsedStreak.dailyWordGoal && parsedStreak.dailyWordGoal > 0) {
            dailyWordGoal.value = parsedStreak.dailyWordGoal;
          }
        }
        const localGoal = localStorage.getItem(LOCAL_GOAL_KEY);
        if (localGoal) {
          const parsedGoal = parseInt(localGoal, 10);
          if (!isNaN(parsedGoal) && parsedGoal > 0) {
            dailyWordGoal.value = parsedGoal;
          }
        }
      } catch (err) {
        console.warn('Error reading local metrics:', err);
      }
    }

    if (!$db) return;

    isMetricsLoading.value = true;
    try {
      // 2. Load streak from Firestore
      const streakDocRef = doc($db, USER_STATS_COLLECTION, STREAK_DOC_ID);
      const streakSnap = await getDoc(streakDocRef);
      if (streakSnap.exists()) {
        const cloudStreak = streakSnap.data() as UserStreak;
        const resolvedGoal = dailyWordGoal.value || cloudStreak.dailyWordGoal || DEFAULT_DAILY_GOAL;
        dailyWordGoal.value = resolvedGoal;

        const today = getBogotaDateString();
        const startingMasteryForToday = (cloudStreak.todayStartingMasteryDate === today && typeof cloudStreak.todayStartingMastery === 'number')
          ? cloudStreak.todayStartingMastery
          : (streak.value.todayStartingMasteryDate === today ? streak.value.todayStartingMastery : undefined);

        if (startingMasteryForToday !== undefined && todayStartingMastery.value === null) {
          todayStartingMastery.value = startingMasteryForToday;
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(LOCAL_STARTING_MASTERY_KEY, JSON.stringify({
                date: today,
                startingMastery: startingMasteryForToday
              }));
            } catch {}
          }
        }

        // Merge choosing the highest values
        streak.value = {
          currentStreak: Math.max(streak.value.currentStreak, cloudStreak.currentStreak || 0),
          longestStreak: Math.max(streak.value.longestStreak, cloudStreak.longestStreak || 0),
          lastActiveDate: cloudStreak.lastActiveDate > streak.value.lastActiveDate ? cloudStreak.lastActiveDate : (streak.value.lastActiveDate || cloudStreak.lastActiveDate),
          totalDaysStudied: Math.max(streak.value.totalDaysStudied || 0, cloudStreak.totalDaysStudied || 0),
          dailyWordGoal: resolvedGoal,
          todayStartingMastery: startingMasteryForToday,
          todayStartingMasteryDate: startingMasteryForToday !== undefined ? today : undefined
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_STREAK_KEY, JSON.stringify(streak.value));
          localStorage.setItem(LOCAL_GOAL_KEY, String(resolvedGoal));
        }
      }

      // 3. Load daily metrics of the last 100 days from Firestore
      const minDate = new Date();
      minDate.setDate(minDate.getDate() - 100);
      const minDateStr = getLocalDateString(minDate);

      const metricsQuery = query(
        collection($db, DAILY_METRICS_COLLECTION),
        where('date', '>=', minDateStr)
      );
      const querySnap = await getDocs(metricsQuery);

      const cloudMetricsMap = new Map<string, DailyMetric>();
      querySnap.forEach((docSnap) => {
        cloudMetricsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as DailyMetric);
      });

      // Merge with local metrics
      const mergedMap = new Map<string, DailyMetric>();
      rawMetrics.value.forEach(m => {
        const key = m.id || `${m.date}_${m.deckId}`;
        mergedMap.set(key, m);
      });

      cloudMetricsMap.forEach((cloudM, key) => {
        const localM = mergedMap.get(key);
        if (!localM) {
          mergedMap.set(key, cloudM);
        } else {
          const mergedReviewed = Array.from(new Set([
            ...(localM.reviewedWordIds || []),
            ...(cloudM.reviewedWordIds || [])
          ]));
          const mergedCorrect = Array.from(new Set([
            ...(localM.correctWordIds || []),
            ...(cloudM.correctWordIds || [])
          ]));

          // Keep highest counts and union of unique word IDs
          mergedMap.set(key, {
            ...localM,
            correct: Math.max(localM.correct, cloudM.correct),
            wrong: Math.max(localM.wrong, cloudM.wrong),
            reviewedWordIds: mergedReviewed,
            correctWordIds: mergedCorrect,
            uniqueWordsCount: Math.max(
              mergedReviewed.length,
              localM.uniqueWordsCount || 0,
              cloudM.uniqueWordsCount || 0
            ),
            sessionsCount: Math.max(localM.sessionsCount || 0, cloudM.sessionsCount || 0),
            updatedAt: (localM.updatedAt || '') > (cloudM.updatedAt || '') ? localM.updatedAt : cloudM.updatedAt
          });
        }
      });

      const finalMetrics = Array.from(mergedMap.values());
      rawMetrics.value = finalMetrics;
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_METRICS_KEY, JSON.stringify(finalMetrics));
      }
    } catch (err) {
      console.warn('Error syncing metrics with Firestore:', err);
    } finally {
      isMetricsLoading.value = false;
    }
  };

  // Record batch answers at the end of a round or after answering
  const recordAnswers = async (
    items: { deckId: string; language: string; correct: number; wrong: number; wordId?: string }[]
  ) => {
    if (items.length === 0) return;

    const today = getLocalDateString();
    const yesterday = getYesterdayString();
    const nowIso = new Date().toISOString();

    // 1. Update streak
    const hasReviews = items.some(i => i.correct > 0 || i.wrong > 0);
    if (hasReviews) {
      if (streak.value.lastActiveDate === today) {
        // Already active today, streak remains unchanged
      } else if (streak.value.lastActiveDate === yesterday) {
        // Consecutive day!
        streak.value.currentStreak += 1;
        streak.value.longestStreak = Math.max(streak.value.longestStreak, streak.value.currentStreak);
        streak.value.lastActiveDate = today;
        streak.value.totalDaysStudied = (streak.value.totalDaysStudied || 0) + 1;
      } else {
        // Reset or first day
        streak.value.currentStreak = 1;
        streak.value.longestStreak = Math.max(streak.value.longestStreak, 1);
        streak.value.lastActiveDate = today;
        streak.value.totalDaysStudied = (streak.value.totalDaysStudied || 0) + 1;
      }

      streak.value.dailyWordGoal = dailyWordGoal.value;

      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STREAK_KEY, JSON.stringify(streak.value));
      }

      // Sync streak to Firestore
      if ($db) {
        try {
          const streakRef = doc($db, USER_STATS_COLLECTION, STREAK_DOC_ID);
          setDoc(streakRef, streak.value, { merge: true }).catch(e => console.warn('Streak save error:', e));
        } catch {}
      }
    }

    // 2. Aggregate items by deckId
    const aggregated = new Map<string, {
      deckId: string;
      language: string;
      correct: number;
      wrong: number;
      reviewedWordIds: Set<string>;
      correctWordIds: Set<string>;
    }>();

    for (const item of items) {
      const prev = aggregated.get(item.deckId) || {
        deckId: item.deckId,
        language: item.language,
        correct: 0,
        wrong: 0,
        reviewedWordIds: new Set<string>(),
        correctWordIds: new Set<string>()
      };

      if (item.wordId) {
        prev.reviewedWordIds.add(item.wordId);
        if (item.correct > 0) {
          prev.correctWordIds.add(item.wordId);
        }
      }

      aggregated.set(item.deckId, {
        deckId: item.deckId,
        language: item.language,
        correct: prev.correct + item.correct,
        wrong: prev.wrong + item.wrong,
        reviewedWordIds: prev.reviewedWordIds,
        correctWordIds: prev.correctWordIds
      });
    }

    // 3. Update rawMetrics
    const updatedMetrics = [...rawMetrics.value];
    for (const [deckId, data] of aggregated.entries()) {
      const docId = `${today}_${deckId}`;
      const existingIdx = updatedMetrics.findIndex(m => m.id === docId || (m.date === today && m.deckId === deckId));

      let newRecord: DailyMetric;
      if (existingIdx >= 0) {
        const cur = updatedMetrics[existingIdx];
        const mergedReviewed = Array.from(new Set([
          ...(cur.reviewedWordIds || []),
          ...data.reviewedWordIds
        ]));
        const mergedCorrect = Array.from(new Set([
          ...(cur.correctWordIds || []),
          ...data.correctWordIds
        ]));

        newRecord = {
          ...cur,
          id: docId,
          language: data.language || cur.language,
          correct: cur.correct + data.correct,
          wrong: cur.wrong + data.wrong,
          reviewedWordIds: mergedReviewed,
          correctWordIds: mergedCorrect,
          uniqueWordsCount: mergedReviewed.length > 0 ? mergedReviewed.length : (cur.uniqueWordsCount || 0) + data.correct + data.wrong,
          sessionsCount: cur.sessionsCount || 0,
          updatedAt: nowIso
        };
        updatedMetrics[existingIdx] = newRecord;
      } else {
        const reviewedArr = Array.from(data.reviewedWordIds);
        const correctArr = Array.from(data.correctWordIds);
        newRecord = {
          id: docId,
          date: today,
          deckId,
          language: data.language,
          correct: data.correct,
          wrong: data.wrong,
          reviewedWordIds: reviewedArr,
          correctWordIds: correctArr,
          uniqueWordsCount: reviewedArr.length > 0 ? reviewedArr.length : data.correct + data.wrong,
          sessionsCount: 0,
          updatedAt: nowIso
        };
        updatedMetrics.push(newRecord);
      }

      // Sync metric document to Firestore
      if ($db) {
        try {
          const metricRef = doc($db, DAILY_METRICS_COLLECTION, docId);
          setDoc(metricRef, newRecord, { merge: true }).catch(e => console.warn('Metric save error:', e));
        } catch {}
      }
    }

    rawMetrics.value = updatedMetrics;
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_METRICS_KEY, JSON.stringify(updatedMetrics));
    }
  };

  // Record completion of a study/review session
  const recordCompletedSession = async (deckId: string = 'mandarin-general', language: string = 'zh') => {
    const today = getLocalDateString();
    const nowIso = new Date().toISOString();
    const docId = `${today}_${deckId}`;

    const updatedMetrics = [...rawMetrics.value];
    const existingIdx = updatedMetrics.findIndex(m => m.id === docId || (m.date === today && m.deckId === deckId));

    let newRecord: DailyMetric;
    if (existingIdx >= 0) {
      const cur = updatedMetrics[existingIdx];
      newRecord = {
        ...cur,
        sessionsCount: (cur.sessionsCount || 0) + 1,
        updatedAt: nowIso
      };
      updatedMetrics[existingIdx] = newRecord;
    } else {
      newRecord = {
        id: docId,
        date: today,
        deckId,
        language,
        correct: 0,
        wrong: 0,
        reviewedWordIds: [],
        correctWordIds: [],
        uniqueWordsCount: 0,
        sessionsCount: 1,
        updatedAt: nowIso
      };
      updatedMetrics.push(newRecord);
    }

    rawMetrics.value = updatedMetrics;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_METRICS_KEY, JSON.stringify(updatedMetrics));
      } catch {}
    }

    if ($db) {
      try {
        const metricRef = doc($db, DAILY_METRICS_COLLECTION, docId);
        await setDoc(metricRef, newRecord, { merge: true });
      } catch (e) {
        console.warn('Error syncing completed session to Firestore:', e);
      }
    }
  };

  // Helper to generate a full 90-day (3 months) time series
  const getHistoricalMetrics = (selectedLanguage: string, selectedDeckId: string = 'all') => {
    const days: DaySummaryMetric[] = [];
    const today = new Date();
    const todayStr = getLocalDateString(today);
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const goal = Math.max(1, dailyWordGoal.value || DEFAULT_DAILY_GOAL);

    // Map metrics for fast lookup by date
    const dateMap = new Map<string, {
      correct: number;
      wrong: number;
      reviewedSet: Set<string>;
      correctSet: Set<string>;
      fallbackUnique: number;
      fallbackCorrect: number;
      sessionsCount: number;
    }>();

    for (const m of rawMetrics.value) {
      const matchLang = !selectedLanguage || m.language === selectedLanguage;
      const matchDeck = selectedDeckId === 'all' || m.deckId === selectedDeckId;
      if (matchLang && matchDeck) {
        const prev = dateMap.get(m.date) || {
          correct: 0,
          wrong: 0,
          reviewedSet: new Set<string>(),
          correctSet: new Set<string>(),
          fallbackUnique: 0,
          fallbackCorrect: 0,
          sessionsCount: 0
        };

        if (m.reviewedWordIds && m.reviewedWordIds.length > 0) {
          m.reviewedWordIds.forEach(id => prev.reviewedSet.add(id));
        } else {
          prev.fallbackUnique += m.uniqueWordsCount ?? ((m.correct || 0) + (m.wrong || 0));
        }

        if (m.correctWordIds && m.correctWordIds.length > 0) {
          m.correctWordIds.forEach(id => prev.correctSet.add(id));
        } else {
          prev.fallbackCorrect += m.correct || 0;
        }

        prev.correct += m.correct || 0;
        prev.wrong += m.wrong || 0;
        prev.sessionsCount += m.sessionsCount || 0;
        dateMap.set(m.date, prev);
      }
    }

    // Generate 90 days from (today - 89 days) up to today strictly in Bogota time (-5)
    const [todayY, todayM, todayD] = todayStr.split('-').map(Number);
    for (let i = 89; i >= 0; i--) {
      const curDate = new Date(Date.UTC(todayY, todayM - 1, todayD - i, 12, 0, 0));
      const dateStr = getBogotaDateString(curDate);
      const entry = dateMap.get(dateStr);

      const correct = entry ? entry.correct : 0;
      const wrong = entry ? entry.wrong : 0;
      const total = correct + wrong;
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

      const uniqueWords = entry
        ? (entry.reviewedSet.size > 0 ? entry.reviewedSet.size + entry.fallbackUnique : entry.fallbackUnique)
        : 0;
      const correctUniqueWords = entry
        ? (entry.correctSet.size > 0
            ? Math.min(uniqueWords, entry.correctSet.size + entry.fallbackCorrect)
            : Math.min(uniqueWords, entry.fallbackCorrect))
        : 0;

      const [curY, curM, curD] = dateStr.split('-').map(Number);
      const monthStr = monthNames[curM - 1];
      const dowDate = new Date(Date.UTC(curY, curM - 1, curD, 12, 0, 0));
      const dayOfWeek = dayNames[dowDate.getUTCDay()];

      days.push({
        date: dateStr,
        label: `${curD} ${monthStr}`,
        dayOfWeek,
        correct,
        wrong,
        total,
        accuracy,
        uniqueWords,
        correctUniqueWords,
        sessionsCount: entry ? entry.sessionsCount : 0,
        goalMet: uniqueWords >= goal
      });
    }

    // Calculate Summary KPIs
    let totalCorrect = 0;
    let totalWrong = 0;
    let activeDaysCount = 0;
    let totalUniqueAcrossDays = 0;
    let daysGoalMetCount = 0;

    for (const d of days) {
      totalCorrect += d.correct;
      totalWrong += d.wrong;
      totalUniqueAcrossDays += d.uniqueWords;
      if (d.total > 0 || d.uniqueWords > 0) {
        activeDaysCount++;
      }
      if (d.goalMet) {
        daysGoalMetCount++;
      }
    }

    const todayEntry = days.find(d => d.date === todayStr);
    const totalReviews = totalCorrect + totalWrong;
    const accuracy = totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0;
    const averageDailyUniqueWords = activeDaysCount > 0 ? Math.round(totalUniqueAcrossDays / activeDaysCount) : 0;

    const summary: MetricsSummary = {
      totalCorrect,
      totalWrong,
      totalReviews,
      accuracy,
      activeDaysCount,
      todayUniqueWords: todayEntry ? todayEntry.uniqueWords : 0,
      todayCorrectUniqueWords: todayEntry ? todayEntry.correctUniqueWords : 0,
      todaySessionsCount: todayEntry ? (todayEntry.sessionsCount || (todayEntry.uniqueWords > 0 ? 1 : 0)) : 0,
      averageDailyUniqueWords,
      daysGoalMetCount
    };

    return {
      days,
      summary
    };
  };

  return {
    rawMetrics,
    streak,
    activeStreak,
    isStudiedToday,
    isMetricsLoading,
    dailyWordGoal,
    todayUniqueWordsCount,
    todayCorrectUniqueWordsCount,
    yesterdayUniqueWordsCount,
    todaySessionsCount,
    yesterdaySessionsCount,
    dailyGoalProgress,
    remainingWordsForGoal,
    isDailyGoalMet,
    todayStartingMastery,
    initDailyStartingMastery,
    setDailyWordGoal,
    seedTodayWordsFromCards,
    loadMetrics,
    recordAnswers,
    recordCompletedSession,
    getHistoricalMetrics,
    getLocalDateString,
    getBogotaDateString,
    getYesterdayBogotaString,
    BOGOTA_TIMEZONE
  };
};
