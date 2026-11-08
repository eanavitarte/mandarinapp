export interface Deck {
  id: string;
  name: string;
  language: string;
  icon?: string;
  description?: string;
  createdAt?: string;
  isDefault?: boolean;
}

export interface FlashcardLevelRef {
  id: number;
  level_id: number;
  level_type: number;
  type_name: string;
  level_name: string;
}

export interface FlashcardMeta {
  hanbanId?: number;
  ttsUrl?: string;
  syntax?: string;
  levels?: FlashcardLevelRef[];
}

export interface Flashcard {
  id?: string;
  deckId?: string;
  hanzi: string;
  definition: string;
  definitionEn?: string;
  pinyin?: string | string[];
  pinyinPlain?: string[] | string;
  pinyinNum?: string[] | string;
  hskLevel?: number;
  hskOrder?: number;
  category?: string;
  meta?: FlashcardMeta;
  correctCount?: number;
  wrongCount?: number;
  _originalIndex?: number;
  srsInterval?: number;
  srsEase?: number;
  srsRepetitions?: number;
  srsNextDueDate?: string;
  srsLastReviewedDate?: string | null;
  knowledgeStatus?: number;
  type?: 'word' | 'sentence';
}

export type StoryGenre = 'cuento' | 'historia' | 'noticia';

export interface StoryTargetCharacter {
  hanzi: string;
  pinyin?: string | string[];
  definition: string;
  hskLevel?: number;
}

export interface Story {
  id?: string;
  title: string;
  titlePinyin?: string;
  titleTranslation?: string;
  content: string;
  contentPinyin?: string;
  translation?: string;
  hskLevel?: number;
  createdAt?: string;
  genre?: StoryGenre;
  targetCharacters?: StoryTargetCharacter[];
  paragraphs?: string[];
  summary?: string;
}

export interface MasteryStoryPayload {
  characters: StoryTargetCharacter[];
  genre: StoryGenre;
  userIdea?: string;
  customPrompt?: string;
}

export interface MasteryStoryResponse {
  title: string;
  summary?: string;
  paragraphs: string[];
  usedCharacters: { hanzi: string; occurrences: number }[];
}

export interface ReinforceStory {
  id?: string;
  targetHanzi: string;
  targetPinyin: string;
  targetDefinition: string;
  title: string;
  paragraphs: string[]; // Exactamente 3 párrafos en español
  occurrences: number;
  theme?: string;
  createdAt?: string;
}

export interface ReinforceStoryPayload {
  hanzi: string;
  pinyin?: string | string[];
  definition: string;
  customPrompt?: string;
  themeNote?: string;
}

export interface ReinforceStoryResponse {
  title: string;
  paragraphs: string[];
  occurrences: number;
}

export enum GameState {
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  ERROR = 'ERROR',
  GAME_OVER = 'GAME_OVER'
}

export interface QuizOption {
  definition: string;
  isCorrect: boolean;
  originalCard: Flashcard;
  tone?: number;
}

export interface DailyMasterySnapshot {
  date: string; // 'YYYY-MM-DD' en hora Bogotá (UTC-5)
  startingMastery: number; // Porcentaje entero sin decimales (ej. 17)
  deckScope?: string; // Idioma o mazo asociado (ej. 'zh')
  updatedAt?: string;
}

export interface DailyMetric {
  id?: string;
  date: string; // 'YYYY-MM-DD'
  deckId: string;
  language: string;
  correct: number;
  wrong: number;
  reviewedWordIds?: string[];
  correctWordIds?: string[];
  uniqueWordsCount?: number;
  sessionsCount?: number;
  startingMastery?: number;
  endingMastery?: number;
  updatedAt?: string;
}

export interface UserStreak {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string; // 'YYYY-MM-DD'
  totalDaysStudied: number;
  dailyWordGoal?: number;
  todayStartingMastery?: number;
  todayStartingMasteryDate?: string;
}

export interface DaySummaryMetric {
  date: string; // 'YYYY-MM-DD'
  label: string; // e.g. '08 Oct'
  dayOfWeek: string; // e.g. 'Jue'
  correct: number;
  wrong: number;
  total: number;
  accuracy: number; // 0 - 100
  uniqueWords: number;
  correctUniqueWords: number;
  sessionsCount?: number;
  goalMet: boolean;
}

export interface MetricsSummary {
  totalCorrect: number;
  totalWrong: number;
  totalReviews: number;
  accuracy: number;
  activeDaysCount: number;
  todayUniqueWords: number;
  todayCorrectUniqueWords: number;
  todaySessionsCount?: number;
  averageDailyUniqueWords: number;
  daysGoalMetCount: number;
}

