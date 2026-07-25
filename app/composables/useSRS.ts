import type { Flashcard } from '~/types';

/**
 * Calculates the updated SRS values for a flashcard based on whether it was answered correctly.
 */
export const calculateSRS = (card: Flashcard, isCorrect: boolean): Partial<Flashcard> => {
  const reps = card.srsRepetitions || 0;
  const prevInterval = card.srsInterval || 0;
  const ease = card.srsEase || 2.5;

  let newReps = 0;
  let newInterval = 0;
  let newEase = ease;

  if (isCorrect) {
    newReps = reps + 1;
    newEase = Math.min(3.0, Number((ease + 0.1).toFixed(2)));
    
    if (newReps === 1) {
      newInterval = 1;
    } else if (newReps === 2) {
      newInterval = 4;
    } else if (newReps === 3) {
      newInterval = 10;
    } else if (newReps === 4) {
      newInterval = 30; // 1 month threshold
    } else {
      newInterval = Math.min(365, Math.round(prevInterval * newEase));
    }
  } else {
    newReps = 0;
    newInterval = 0; // immediate review
    newEase = Math.max(1.3, Number((ease - 0.2).toFixed(2)));
  }

  // Determine knowledge level status (0% to 100%)
  let knowledgeStatus = 0;
  if (newReps === 1) knowledgeStatus = 25;
  else if (newReps === 2) knowledgeStatus = 50;
  else if (newReps === 3) knowledgeStatus = 75;
  else if (newReps >= 4) knowledgeStatus = 100;

  const now = Date.now();
  const srsNextDueDate = new Date(now + newInterval * 24 * 60 * 60 * 1000).toISOString();

  return {
    srsRepetitions: newReps,
    srsInterval: newInterval,
    srsEase: newEase,
    srsNextDueDate,
    srsLastReviewedDate: new Date(now).toISOString(),
    knowledgeStatus,
    correctCount: (card.correctCount || 0) + (isCorrect ? 1 : 0),
    wrongCount: (card.wrongCount || 0) + (isCorrect ? 0 : 1)
  };
};
