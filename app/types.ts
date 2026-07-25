export interface Flashcard {
  id?: string;
  hanzi: string;
  definition: string;
  pinyin?: string;
  hskLevel?: number;
  hskOrder?: number;
  category?: string;
  correctCount?: number;
  wrongCount?: number;
  _originalIndex?: number;
  srsInterval?: number;
  srsEase?: number;
  srsRepetitions?: number;
  srsNextDueDate?: string;
  srsLastReviewedDate?: string;
  knowledgeStatus?: number;
  type?: 'word' | 'sentence';
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
}
