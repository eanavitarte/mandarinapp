import { ref, computed } from 'vue';
import type { Flashcard, Story, StoryGenre, StoryTargetCharacter, MasteryStoryResponse } from '~/types';
import { 
  API_MASTERY_STORY, 
  MASTERY_BATCH_SIZE, 
  MASTERY_TARGET_STATUS,
  STORY_GENRES, 
  DEFAULT_MASTERY_STORY_PROMPT,
  READONLY_MASTERY_SCHEMA_INSTRUCTION
} from '~/constants/stories';

export const useMasteryStories = () => {
  const selectedCards = ref<Flashcard[]>([]);
  const currentStoryDraft = ref<Story | null>(null);
  const isGenerating = ref(false);
  const generationError = ref<string | null>(null);
  const selectedGenre = ref<StoryGenre>('cuento');
  const userIdea = ref<string>('');
  const promptInstruction = ref<string>(DEFAULT_MASTERY_STORY_PROMPT);
  const selectedBatchIndex = ref<number>(0);
  const globalShowPinyin = ref<boolean>(false);

  /**
   * Obtiene las tarjetas dominadas al 100% (knowledgeStatus === 100).
   * Si hay menos de 10 tarjetas al 100%, complementa con las de mayor conocimiento (75, 50)
   * para asegurar que el estudiante siempre pueda generar historias ricas de 10 palabras.
   */
  const getEligibleCards = (cards: Flashcard[]): { cards: Flashcard[]; isStrict100: boolean } => {
    const perfectMastery = cards.filter(c => (c.knowledgeStatus || 0) >= MASTERY_TARGET_STATUS);
    
    if (perfectMastery.length >= MASTERY_BATCH_SIZE) {
      return { cards: perfectMastery, isStrict100: true };
    }

    // Si aún no hay 10 con 100%, incluir las de mayor conocimiento o más repasos
    const sortedByKnowledge = [...cards].sort((a, b) => {
      const diff = (b.knowledgeStatus || 0) - (a.knowledgeStatus || 0);
      if (diff !== 0) return diff;
      return (b.correctCount || 0) - (a.correctCount || 0);
    });

    return {
      cards: sortedByKnowledge,
      isStrict100: perfectMastery.length === cards.length && perfectMastery.length > 0
    };
  };

  /**
   * Divide las tarjetas disponibles en lotes consecutivos de tamaño 10
   */
  const getBatches = (cards: Flashcard[]): Flashcard[][] => {
    const batches: Flashcard[][] = [];
    for (let i = 0; i < cards.length; i += MASTERY_BATCH_SIZE) {
      batches.push(cards.slice(i, i + MASTERY_BATCH_SIZE));
    }
    return batches;
  };

  /**
   * Carga un lote específico por su índice
   */
  const selectBatch = (batchIndex: number, allEligibleCards: Flashcard[]) => {
    const batches = getBatches(allEligibleCards);
    if (batches[batchIndex]) {
      selectedBatchIndex.value = batchIndex;
      selectedCards.value = [...batches[batchIndex]];
      currentStoryDraft.value = null;
      generationError.value = null;
    }
  };

  /**
   * Selecciona 10 tarjetas al azar de la bolsa de caracteres disponibles
   */
  const shuffleRandomBatch = (allEligibleCards: Flashcard[]) => {
    const shuffled = [...allEligibleCards].sort(() => 0.5 - Math.random());
    selectedCards.value = shuffled.slice(0, MASTERY_BATCH_SIZE);
    currentStoryDraft.value = null;
    generationError.value = null;
  };

  /**
   * Permite agregar o remover manualmente una tarjeta del lote activo (máximo 10)
   */
  const toggleCardInSelection = (card: Flashcard) => {
    const existsIndex = selectedCards.value.findIndex(c => c.hanzi === card.hanzi);
    if (existsIndex >= 0) {
      selectedCards.value = selectedCards.value.filter((_, idx) => idx !== existsIndex);
    } else {
      if (selectedCards.value.length < MASTERY_BATCH_SIZE) {
        selectedCards.value = [...selectedCards.value, card];
      }
    }
  };

  /**
   * Genera el cuento, historia o noticia con IA usando los caracteres del lote
   */
  const generateStory = async (): Promise<Story | null> => {
    if (selectedCards.value.length === 0) return null;

    isGenerating.value = true;
    generationError.value = null;

    const targetCharacters: StoryTargetCharacter[] = selectedCards.value.map(c => ({
      hanzi: c.hanzi,
      pinyin: c.pinyin,
      definition: c.definition,
      hskLevel: c.hskLevel
    }));

    try {
      const res = await $fetch<MasteryStoryResponse>(API_MASTERY_STORY, {
        method: 'POST',
        body: {
          characters: targetCharacters,
          genre: selectedGenre.value,
          userIdea: userIdea.value,
          customPrompt: promptInstruction.value
        }
      });

      const draft: Story = {
        title: res.title,
        summary: res.summary,
        genre: selectedGenre.value,
        paragraphs: res.paragraphs,
        content: res.paragraphs.join('\n\n'),
        targetCharacters,
        translation: `Vocabulario practicado (${targetCharacters.length}): ${targetCharacters.map(c => `${c.hanzi} (${c.definition})`).join(', ')}`,
        createdAt: new Date().toISOString()
      };

      currentStoryDraft.value = draft;
      return draft;
    } catch (err: any) {
      console.error('Error al generar historia con caracteres dominados:', err);
      generationError.value = err?.data?.statusMessage || err?.message || 'Error al conectar con la IA.';
      return null;
    } finally {
      isGenerating.value = false;
    }
  };

  const resetPromptToDefault = () => {
    promptInstruction.value = DEFAULT_MASTERY_STORY_PROMPT;
  };

  return {
    selectedCards,
    currentStoryDraft,
    isGenerating,
    generationError,
    selectedGenre,
    userIdea,
    promptInstruction,
    selectedBatchIndex,
    globalShowPinyin,
    genres: STORY_GENRES,
    readonlySchemaNote: READONLY_MASTERY_SCHEMA_INSTRUCTION,
    getEligibleCards,
    getBatches,
    selectBatch,
    shuffleRandomBatch,
    toggleCardInSelection,
    generateStory,
    resetPromptToDefault
  };
};
