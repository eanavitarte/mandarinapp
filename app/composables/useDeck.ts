import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import type { Flashcard, Story } from '~/types';

export const useDeck = () => {
  const { $db } = useNuxtApp();
  
  // Shared States
  const deck = useState<Flashcard[]>('global_deck', () => []);
  const stories = useState<Story[]>('global_stories', () => []);
  const isSyncing = useState<boolean>('global_isSyncing', () => false);
  const isDbActive = useState<boolean>('global_isDbActive', () => true);

  // Firestore Collection Names
  const COLLECTION_NAME = 'flashcards';
  const STORIES_COLLECTION = 'stories';

  const loadData = async () => {
    if (!$db) return;
    try {
      // 1. Fetch Deck
      const querySnapshot = await getDocs(collection($db, COLLECTION_NAME));
      const tempDeck: Flashcard[] = [];
      querySnapshot.forEach((doc) => {
        tempDeck.push({ id: doc.id, ...doc.data() } as Flashcard);
      });
      
      const processedDeck = tempDeck.map((c, i) => ({
        ...c,
        hskLevel: c.hskLevel ? Number(c.hskLevel) : 1,
        correctCount: Number(c.correctCount) || 0,
        wrongCount: Number(c.wrongCount) || 0,
        srsInterval: c.srsInterval !== undefined ? Number(c.srsInterval) : 0,
        srsEase: c.srsEase !== undefined ? Number(c.srsEase) : 2.5,
        srsRepetitions: c.srsRepetitions !== undefined ? Number(c.srsRepetitions) : 0,
        srsNextDueDate: c.srsNextDueDate || new Date().toISOString(),
        knowledgeStatus: c.knowledgeStatus !== undefined ? Number(c.knowledgeStatus) : 0,
        type: c.type || 'word',
        _originalIndex: i
      }));

      // Sort deck
      processedDeck.sort((a, b) => {
        if (a.hskOrder !== undefined && b.hskOrder !== undefined) return a.hskOrder - b.hskOrder;
        if (a.hskOrder !== undefined) return -1;
        if (b.hskOrder !== undefined) return 1;
        if (a.hskLevel !== b.hskLevel) return (a.hskLevel || 1) - (b.hskLevel || 1);
        return (a._originalIndex || 0) - (b._originalIndex || 0);
      });

      deck.value = processedDeck;

      // 2. Fetch Stories
      const storiesSnapshot = await getDocs(collection($db, STORIES_COLLECTION));
      const tempStories: Story[] = [];
      storiesSnapshot.forEach((doc) => {
        tempStories.push({ id: doc.id, ...doc.data() } as Story);
      });
      tempStories.sort((a, b) => {
        if (a.createdAt && b.createdAt) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return 0;
      });
      stories.value = tempStories;
    } catch (error) {
      console.error("Error loading data from Firestore:", error);
    }
  };

  const addCard = async (card: Flashcard) => {
    let savedCard = card;
    const defaultSrs = {
      srsInterval: card.srsInterval !== undefined ? card.srsInterval : 0,
      srsEase: card.srsEase !== undefined ? card.srsEase : 2.5,
      srsRepetitions: card.srsRepetitions !== undefined ? card.srsRepetitions : 0,
      srsNextDueDate: card.srsNextDueDate !== undefined ? card.srsNextDueDate : new Date().toISOString(),
      srsLastReviewedDate: card.srsLastReviewedDate || null,
      knowledgeStatus: card.knowledgeStatus !== undefined ? card.knowledgeStatus : 0,
      type: card.type || 'word'
    };

    if ($db && isDbActive.value) {
      try {
        const { id, _originalIndex, ...cardData } = { ...card, ...defaultSrs };
        const docRef = await addDoc(collection($db, COLLECTION_NAME), cardData);
        savedCard = { ...card, ...defaultSrs, id: docRef.id };
      } catch (error) {
        console.error("Error adding card to Firestore:", error);
      }
    }

    const maxIndex = deck.value.reduce((max, c) => Math.max(max, c._originalIndex || 0), -1);
    const newCardWithStats = {
      ...savedCard,
      correctCount: 0,
      wrongCount: 0,
      _originalIndex: maxIndex + 1
    };

    deck.value = [...deck.value, newCardWithStats];
  };

  const editCard = async (id: string, updates: Partial<Flashcard>) => {
    if ($db && isDbActive.value) {
      try {
        const { id: _, _originalIndex, ...updateData } = updates;
        const docRef = doc($db, COLLECTION_NAME, id);
        await updateDoc(docRef, updateData);
      } catch (error) {
        console.error("Error updating card in Firestore:", error);
      }
    }
    deck.value = deck.value.map(card => card.id === id ? { ...card, ...updates } : card);
  };

  const deleteCard = async (id: string) => {
    if ($db && isDbActive.value) {
      try {
        await deleteDoc(doc($db, COLLECTION_NAME, id));
      } catch (error) {
        console.error("Error deleting card from Firestore:", error);
      }
    }
    deck.value = deck.value.filter(card => card.id !== id);
  };

  const syncStats = async (cardsToSync: Flashcard[]) => {
    if (!$db || !isDbActive.value || cardsToSync.length === 0) return;
    isSyncing.value = true;
    try {
      const batch = writeBatch($db);
      cardsToSync.forEach(card => {
        if (card.id) {
          const docRef = doc($db, COLLECTION_NAME, card.id);
          batch.update(docRef, {
            correctCount: card.correctCount || 0,
            wrongCount: card.wrongCount || 0,
            srsInterval: card.srsInterval !== undefined ? card.srsInterval : 0,
            srsEase: card.srsEase !== undefined ? card.srsEase : 2.5,
            srsRepetitions: card.srsRepetitions !== undefined ? card.srsRepetitions : 0,
            srsNextDueDate: card.srsNextDueDate || new Date().toISOString(),
            srsLastReviewedDate: card.srsLastReviewedDate || null,
            knowledgeStatus: card.knowledgeStatus !== undefined ? card.knowledgeStatus : 0,
            type: card.type || 'word'
          });
        }
      });
      await batch.commit();
    } catch (error) {
      console.error("Error syncing stats in batch:", error);
    } finally {
      isSyncing.value = false;
    }
  };

  const batchAddCards = async (importedCards: Flashcard[]) => {
    let savedCards = importedCards;
    if ($db && isDbActive.value && importedCards.length > 0) {
      try {
        const results: Flashcard[] = [];
        const CHUNK_SIZE = 450;
        
        for (let i = 0; i < importedCards.length; i += CHUNK_SIZE) {
          const chunk = importedCards.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch($db);
          
          const chunkResults = chunk.map(card => {
            const { id, _originalIndex, ...cardData } = card;
            const newDocRef = doc(collection($db, COLLECTION_NAME));
            
            const finalData = {
              ...cardData,
              correctCount: cardData.correctCount || 0,
              wrongCount: cardData.wrongCount || 0,
              srsInterval: cardData.srsInterval !== undefined ? cardData.srsInterval : 0,
              srsEase: cardData.srsEase !== undefined ? cardData.srsEase : 2.5,
              srsRepetitions: cardData.srsRepetitions !== undefined ? cardData.srsRepetitions : 0,
              srsNextDueDate: cardData.srsNextDueDate || new Date().toISOString(),
              srsLastReviewedDate: cardData.srsLastReviewedDate || null,
              knowledgeStatus: cardData.knowledgeStatus !== undefined ? cardData.knowledgeStatus : 0,
              type: cardData.type || 'word'
            };
            
            batch.set(newDocRef, finalData);
            return { ...card, ...finalData, id: newDocRef.id };
          });
          
          await batch.commit();
          results.push(...chunkResults as Flashcard[]);
        }
        savedCards = results;
      } catch (error) {
        console.error("Error batch adding cards:", error);
      }
    }

    const maxIndex = deck.value.reduce((max, c) => Math.max(max, c._originalIndex || 0), -1);
    const newCardsWithStats = savedCards.map((card, idx) => ({
      ...card,
      _originalIndex: maxIndex + 1 + idx
    }));
    
    // Deduplicate
    const seen = new Set<string>();
    const combined = [...deck.value, ...newCardsWithStats].filter(card => {
      const key = `${card.hanzi}-${card.definition}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    deck.value = combined;
  };

  // Story Handlers
  const addStory = async (story: Story) => {
    if ($db && isDbActive.value) {
      try {
        const { id, ...storyData } = story;
        const dataToSave = {
          ...storyData,
          createdAt: new Date().toISOString()
        };
        const docRef = await addDoc(collection($db, STORIES_COLLECTION), dataToSave);
        stories.value = [{ ...story, ...dataToSave, id: docRef.id }, ...stories.value];
      } catch (error) {
        console.error("Error adding story:", error);
      }
    }
  };

  const editStory = async (id: string, updates: Partial<Story>) => {
    if ($db && isDbActive.value) {
      try {
        const { id: _, ...updateData } = updates;
        const docRef = doc($db, STORIES_COLLECTION, id);
        await updateDoc(docRef, updateData);
        stories.value = stories.value.map(s => s.id === id ? { ...s, ...updates } : s);
      } catch (error) {
        console.error("Error updating story:", error);
      }
    }
  };

  const deleteStory = async (id: string) => {
    if ($db && isDbActive.value) {
      try {
        await deleteDoc(doc($db, STORIES_COLLECTION, id));
        stories.value = stories.value.filter(s => s.id !== id);
      } catch (error) {
        console.error("Error deleting story:", error);
      }
    }
  };

  return {
    deck,
    stories,
    isSyncing,
    isDbActive,
    loadData,
    addCard,
    editCard,
    deleteCard,
    syncStats,
    batchAddCards,
    addStory,
    editStory,
    deleteStory
  };
};
