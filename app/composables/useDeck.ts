import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, writeBatch } from 'firebase/firestore';
import { computed } from 'vue';
import type { Flashcard, Story, Deck } from '~/types';

export const useDeck = () => {
  const { $db } = useNuxtApp();
  const { normalizePinyinArray } = usePinyin();
  
  // Shared States
  const decks = useState<Deck[]>('global_decks', () => []);
  const activeDeckId = useState<string>('active_deck_id', () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('active_deck_id') || 'mandarin-general';
    }
    return 'mandarin-general';
  });
  const activeLanguage = useState<string>('active_language', () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('active_language') || 'zh';
    }
    return 'zh';
  });
  const selectedReviewDeckIds = useState<string[]>('selected_review_deck_ids', () => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('selected_review_deck_ids');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return []; // Empty means all decks of the active language are included
  });
  const deck = useState<Flashcard[]>('global_deck', () => []);
  const stories = useState<Story[]>('global_stories', () => []);
  const isSyncing = useState<boolean>('global_isSyncing', () => false);
  const isDbActive = useState<boolean>('global_isDbActive', () => true);

  // Firestore Collection Names
  const DECKS_COLLECTION = 'decks';
  const COLLECTION_NAME = 'flashcards';
  const STORIES_COLLECTION = 'stories';

  const DEFAULT_DECK: Deck = {
    id: 'mandarin-general',
    name: 'Mandarín General',
    language: 'zh',
    icon: '🇨🇳',
    description: 'Vocabulario general de mandarín',
    createdAt: new Date().toISOString(),
    isDefault: true
  };

  const setSelectedReviewDeckIds = (ids: string[]) => {
    selectedReviewDeckIds.value = ids;
    if (typeof window !== 'undefined') {
      localStorage.setItem('selected_review_deck_ids', JSON.stringify(ids));
    }
  };

  const setActiveLanguage = (lang: string) => {
    activeLanguage.value = lang;
    if (typeof window !== 'undefined') {
      localStorage.setItem('active_language', lang);
    }
  };

  // Decks belonging to the active language (e.g. Mandarín)
  const currentLanguageDecks = computed(() => {
    const list = decks.value.filter(d => (d.language || 'zh') === activeLanguage.value);
    if (list.length === 0 && activeLanguage.value === 'zh') {
      return [DEFAULT_DECK];
    }
    return list;
  });

  // All cards belonging to the active language
  const currentLanguageCards = computed(() => {
    const langDeckIds = new Set(currentLanguageDecks.value.map(d => d.id));
    if (activeLanguage.value === 'zh') {
      langDeckIds.add('mandarin-general');
    }
    return deck.value.filter(c => langDeckIds.has(c.deckId || 'mandarin-general'));
  });

  // Cards included in the review session
  const sessionCards = computed(() => {
    if (selectedReviewDeckIds.value.length === 0) {
      return currentLanguageCards.value;
    }
    const selectedSet = new Set(selectedReviewDeckIds.value);
    return currentLanguageCards.value.filter(c => selectedSet.has(c.deckId || 'mandarin-general'));
  });

  // Scope description helper
  const sessionScopeDescription = computed(() => {
    const totalDecks = currentLanguageDecks.value.length;
    const isAll = selectedReviewDeckIds.value.length === 0 || selectedReviewDeckIds.value.length === totalDecks;
    if (isAll) {
      return {
        isAll: true,
        title: 'Todos los mazos',
        count: totalDecks,
        text: `Todos los mazos (${totalDecks})`
      };
    }
    const selected = currentLanguageDecks.value.filter(d => selectedReviewDeckIds.value.includes(d.id));
    return {
      isAll: false,
      title: selected.map(d => d.name).join(', '),
      count: selected.length,
      text: `${selected.length} mazo${selected.length > 1 ? 's' : ''} seleccionado${selected.length > 1 ? 's' : ''}`
    };
  });

  // Alias for backward compatibility
  const currentDeckCards = computed(() => sessionCards.value);

  const activeDeck = computed(() => {
    if (selectedReviewDeckIds.value.length === 1) {
      return decks.value.find(d => d.id === selectedReviewDeckIds.value[0]) || DEFAULT_DECK;
    }
    return {
      id: 'session-language',
      name: activeLanguage.value === 'zh' ? 'Chino Mandarín' : 'Idioma Activo',
      language: activeLanguage.value,
      icon: '🇨🇳',
      description: sessionScopeDescription.value.text,
      isDefault: true
    };
  });

  const setActiveDeck = (id: string) => {
    activeDeckId.value = id;
    if (typeof window !== 'undefined') {
      localStorage.setItem('active_deck_id', id);
    }
  };

  const loadData = async () => {
    if (!$db) return;
    try {
      // 1. Fetch Decks
      const decksSnapshot = await getDocs(collection($db, DECKS_COLLECTION));
      const tempDecks: Deck[] = [];
      decksSnapshot.forEach((docSnap) => {
        tempDecks.push({ id: docSnap.id, ...docSnap.data() } as Deck);
      });

      if (tempDecks.length === 0) {
        // Seed default deck
        await setDoc(doc($db, DECKS_COLLECTION, DEFAULT_DECK.id), {
          name: DEFAULT_DECK.name,
          language: DEFAULT_DECK.language,
          icon: DEFAULT_DECK.icon,
          description: DEFAULT_DECK.description,
          createdAt: DEFAULT_DECK.createdAt,
          isDefault: true
        });
        decks.value = [DEFAULT_DECK];
      } else {
        // Ensure default deck is present
        if (!tempDecks.some(d => d.id === DEFAULT_DECK.id)) {
          tempDecks.unshift(DEFAULT_DECK);
        }
        decks.value = tempDecks;
      }

      if (!decks.value.some(d => d.id === activeDeckId.value)) {
        setActiveDeck(decks.value[0].id);
      }

      // 2. Fetch Deck Flashcards
      const querySnapshot = await getDocs(collection($db, COLLECTION_NAME));
      const tempDeck: Flashcard[] = [];
      querySnapshot.forEach((docSnap) => {
        tempDeck.push({ id: docSnap.id, ...docSnap.data() } as Flashcard);
      });
      
      const processedDeck = tempDeck.map((c, i) => ({
        ...c,
        deckId: c.deckId || 'mandarin-general',
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

      // Sort deck: prioritize hskLevel first, then hskOrder
      processedDeck.sort((a, b) => {
        if (a.hskLevel !== b.hskLevel) return (a.hskLevel || 1) - (b.hskLevel || 1);
        if (a.hskOrder !== undefined && b.hskOrder !== undefined) return a.hskOrder - b.hskOrder;
        if (a.hskOrder !== undefined) return -1;
        if (b.hskOrder !== undefined) return 1;
        return (a._originalIndex || 0) - (b._originalIndex || 0);
      });

      deck.value = processedDeck;

      // 3. Fetch Stories
      const storiesSnapshot = await getDocs(collection($db, STORIES_COLLECTION));
      const tempStories: Story[] = [];
      storiesSnapshot.forEach((docSnap) => {
        tempStories.push({ id: docSnap.id, ...docSnap.data() } as Story);
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

  // Deck CRUD
  const createDeck = async (deckData: { name: string; language: string; icon?: string; description?: string }): Promise<string> => {
    const newDeck: Deck = {
      id: '',
      name: deckData.name,
      language: deckData.language || 'zh',
      icon: deckData.icon || '📁',
      description: deckData.description || '',
      createdAt: new Date().toISOString(),
      isDefault: false
    };

    if ($db && isDbActive.value) {
      try {
        const { id, ...dataToSave } = newDeck;
        const docRef = await addDoc(collection($db, DECKS_COLLECTION), dataToSave);
        newDeck.id = docRef.id;
      } catch (error) {
        console.error("Error creating deck in Firestore:", error);
        newDeck.id = 'deck_' + Date.now();
      }
    } else {
      newDeck.id = 'deck_' + Date.now();
    }

    decks.value = [...decks.value, newDeck];
    setActiveDeck(newDeck.id);
    return newDeck.id;
  };

  const editDeck = async (id: string, updates: Partial<Deck>) => {
    if ($db && isDbActive.value) {
      try {
        const { id: _, ...updateData } = updates;
        const docRef = doc($db, DECKS_COLLECTION, id);
        await updateDoc(docRef, updateData);
      } catch (error) {
        console.error("Error updating deck in Firestore:", error);
      }
    }
    decks.value = decks.value.map(d => d.id === id ? { ...d, ...updates } : d);
  };

  const deleteDeck = async (id: string) => {
    if (id === 'mandarin-general') {
      alert("No se puede eliminar el mazo principal por defecto.");
      return;
    }

    if ($db && isDbActive.value) {
      try {
        // Delete deck document
        await deleteDoc(doc($db, DECKS_COLLECTION, id));
        
        // Also delete associated cards or reassign to default deck
        const cardsToDelete = deck.value.filter(c => c.deckId === id);
        if (cardsToDelete.length > 0) {
          const CHUNK_SIZE = 450;
          for (let i = 0; i < cardsToDelete.length; i += CHUNK_SIZE) {
            const chunk = cardsToDelete.slice(i, i + CHUNK_SIZE);
            const batch = writeBatch($db);
            chunk.forEach(c => {
              if (c.id) {
                batch.delete(doc($db, COLLECTION_NAME, c.id));
              }
            });
            await batch.commit();
          }
        }
      } catch (error) {
        console.error("Error deleting deck from Firestore:", error);
      }
    }

    decks.value = decks.value.filter(d => d.id !== id);
    deck.value = deck.value.filter(c => c.deckId !== id);
    
    if (selectedReviewDeckIds.value.includes(id)) {
      setSelectedReviewDeckIds(selectedReviewDeckIds.value.filter(dId => dId !== id));
    }

    if (activeDeckId.value === id) {
      setActiveDeck(decks.value[0]?.id || 'mandarin-general');
    }
  };

  const addCard = async (card: Flashcard) => {
    const cardDeckId = card.deckId || activeDeckId.value || 'mandarin-general';
    const normalizedPinyin = card.pinyin ? normalizePinyinArray(card.pinyin, card.hanzi) : undefined;
    const normalizedPlain = card.pinyinPlain ? normalizePinyinArray(card.pinyinPlain, card.hanzi) : undefined;
    const normalizedNum = card.pinyinNum ? normalizePinyinArray(card.pinyinNum, card.hanzi) : undefined;
    let savedCard: Flashcard = {
      ...card,
      pinyin: normalizedPinyin,
      ...(normalizedPlain ? { pinyinPlain: normalizedPlain } : {}),
      ...(normalizedNum ? { pinyinNum: normalizedNum } : {}),
      deckId: cardDeckId
    };
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
        const { id, _originalIndex, ...cardData } = { ...savedCard, ...defaultSrs };
        const docRef = await addDoc(collection($db, COLLECTION_NAME), cardData);
        savedCard = { ...savedCard, ...defaultSrs, id: docRef.id };
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
    const normalizedUpdates = { ...updates };
    if (updates.pinyin !== undefined) {
      normalizedUpdates.pinyin = updates.pinyin ? normalizePinyinArray(updates.pinyin, updates.hanzi) : undefined;
    }
    if (updates.pinyinPlain !== undefined) {
      normalizedUpdates.pinyinPlain = updates.pinyinPlain ? normalizePinyinArray(updates.pinyinPlain, updates.hanzi) : undefined;
    }
    if (updates.pinyinNum !== undefined) {
      normalizedUpdates.pinyinNum = updates.pinyinNum ? normalizePinyinArray(updates.pinyinNum, updates.hanzi) : undefined;
    }

    if ($db && isDbActive.value) {
      try {
        const { id: _, _originalIndex, ...updateData } = normalizedUpdates;
        const cleanUpdate = Object.fromEntries(
          Object.entries(updateData).filter(([_, v]) => v !== undefined)
        );
        const docRef = doc($db, COLLECTION_NAME, id);
        await updateDoc(docRef, cleanUpdate);
      } catch (error) {
        console.error("Error updating card in Firestore:", error);
      }
    }
    deck.value = deck.value.map(card => card.id === id ? { ...card, ...normalizedUpdates } : card);
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

  const batchAddCards = async (importedCards: Flashcard[], targetDeckId?: string) => {
    const finalDeckId = targetDeckId || activeDeckId.value || 'mandarin-general';
    let savedCards = importedCards.map(c => ({ 
      ...c, 
      pinyin: c.pinyin ? normalizePinyinArray(c.pinyin) : undefined,
      deckId: c.deckId || finalDeckId 
    }));

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
            const normalizedPinyin = card.pinyin ? normalizePinyinArray(card.pinyin) : undefined;
            
            const finalData = {
              ...cardData,
              pinyin: normalizedPinyin,
              deckId: card.deckId || finalDeckId,
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
    
    // Deduplicate within the same deck by hanzi-definition
    const seen = new Set<string>();
    deck.value.forEach(c => {
      seen.add(`${c.deckId || 'mandarin-general'}-${c.hanzi}-${c.definition}`);
    });

    const uniqueNewCards = newCardsWithStats.filter(card => {
      const key = `${card.deckId || 'mandarin-general'}-${card.hanzi}-${card.definition}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    deck.value = [...deck.value, ...uniqueNewCards];
  };

  // Story Handlers
  const addStory = async (story: Story) => {
    if ($db && isDbActive.value) {
      try {
        const { id, ...storyData } = story;
        const dataToSave: Record<string, any> = {
          ...storyData,
          createdAt: story.createdAt || new Date().toISOString()
        };
        // Clean undefined values to prevent Firestore errors
        const cleanData = Object.fromEntries(
          Object.entries(dataToSave).filter(([_, v]) => v !== undefined)
        );
        const docRef = await addDoc(collection($db, STORIES_COLLECTION), cleanData);
        stories.value = [{ ...story, ...cleanData, id: docRef.id }, ...stories.value];
      } catch (error) {
        console.error("Error adding story:", error);
      }
    }
  };

  const editStory = async (id: string, updates: Partial<Story>) => {
    if ($db && isDbActive.value) {
      try {
        const { id: _, ...updateData } = updates;
        const cleanUpdate = Object.fromEntries(
          Object.entries(updateData).filter(([_, v]) => v !== undefined)
        );
        const docRef = doc($db, STORIES_COLLECTION, id);
        await updateDoc(docRef, cleanUpdate);
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

  const migratePinyinToChunks = async (): Promise<number> => {
    if (!$db || !isDbActive.value) return 0;
    try {
      const snapshot = await getDocs(collection($db, COLLECTION_NAME));
      const toUpdate: { id: string; pinyin: string[] }[] = [];
      
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.pinyin && !Array.isArray(data.pinyin)) {
          const chunks = normalizePinyinArray(data.pinyin);
          toUpdate.push({ id: docSnap.id, pinyin: chunks });
        }
      });

      if (toUpdate.length === 0) return 0;

      const CHUNK_SIZE = 450;
      for (let i = 0; i < toUpdate.length; i += CHUNK_SIZE) {
        const chunk = toUpdate.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch($db);
        chunk.forEach(item => {
          batch.update(doc($db, COLLECTION_NAME, item.id), { pinyin: item.pinyin });
        });
        await batch.commit();
      }

      await loadData();
      return toUpdate.length;
    } catch (error) {
      console.error("Error migrating pinyin in Firestore:", error);
      throw error;
    }
  };

  return {
    decks,
    activeDeckId,
    activeDeck,
    activeLanguage,
    currentLanguageDecks,
    currentLanguageCards,
    sessionCards,
    selectedReviewDeckIds,
    setSelectedReviewDeckIds,
    sessionScopeDescription,
    currentDeckCards,
    deck,
    stories,
    isSyncing,
    isDbActive,
    loadData,
    createDeck,
    editDeck,
    deleteDeck,
    setActiveDeck,
    setActiveLanguage,
    addCard,
    editCard,
    deleteCard,
    syncStats,
    batchAddCards,
    migratePinyinToChunks,
    addStory,
    editStory,
    deleteStory
  };
};
