import { ref, computed } from 'vue';
import type { Flashcard, ReinforceStory, ReinforceStoryResponse } from '~/types';
import { API_REINFORCE_STORY, DEFAULT_REINFORCE_SYSTEM_PROMPT, REINFORCE_PRESET_THEMES } from '~/constants/reinforce';
import { usePinyin } from '~/composables/usePinyin';

export const useReinforce = () => {
  const { formatPinyinDisplay } = usePinyin();

  const selectedCard = ref<Flashcard | null>(null);
  const currentStory = ref<ReinforceStory | null>(null);
  const isGenerating = ref(false);
  const generationError = ref<string | null>(null);
  const globalShowPinyin = ref(false);
  
  // Instruction transparent to user (Architecture UI/UX guideline)
  const promptInstruction = ref<string>(DEFAULT_REINFORCE_SYSTEM_PROMPT);
  const selectedTheme = ref<string>(REINFORCE_PRESET_THEMES[0].promptNote);

  /**
   * Filters and sorts flashcards that have accumulated errors
   */
  const getFailedCards = (cards: Flashcard[]): Flashcard[] => {
    return [...cards]
      .filter(c => (c.wrongCount || 0) > 0)
      .sort((a, b) => (b.wrongCount || 0) - (a.wrongCount || 0));
  };

  /**
   * Generates a 3-paragraph reinforcement story using Gemini
   */
  const generateStoryForCard = async (card: Flashcard, themeNote?: string): Promise<ReinforceStory | null> => {
    selectedCard.value = card;
    isGenerating.value = true;
    generationError.value = null;

    try {
      const activeTheme = themeNote !== undefined ? themeNote : selectedTheme.value;
      const res = await $fetch<ReinforceStoryResponse>(API_REINFORCE_STORY, {
        method: 'POST',
        body: {
          hanzi: card.hanzi,
          pinyin: card.pinyin,
          definition: card.definition,
          customPrompt: promptInstruction.value,
          themeNote: activeTheme
        }
      });

      const storyResult: ReinforceStory = {
        targetHanzi: card.hanzi,
        targetPinyin: formatPinyinDisplay(card.pinyin),
        targetDefinition: card.definition,
        title: res.title,
        paragraphs: res.paragraphs,
        occurrences: res.occurrences,
        theme: activeTheme,
        createdAt: new Date().toISOString()
      };

      currentStory.value = storyResult;
      return storyResult;
    } catch (err: any) {
      console.error('Error generating reinforcement story:', err);
      generationError.value = err?.data?.statusMessage || err?.message || 'Error al conectar con la IA.';
      return null;
    } finally {
      isGenerating.value = false;
    }
  };

  /**
   * Resets the prompt instruction back to the default
   */
  const resetPromptToDefault = () => {
    promptInstruction.value = DEFAULT_REINFORCE_SYSTEM_PROMPT;
  };

  return {
    selectedCard,
    currentStory,
    isGenerating,
    generationError,
    globalShowPinyin,
    promptInstruction,
    selectedTheme,
    themes: REINFORCE_PRESET_THEMES,
    getFailedCards,
    generateStoryForCard,
    resetPromptToDefault
  };
};
