import { Type } from "@google/genai";
import { useGemini, generateWithFallback } from "../utils/gemini";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { knownWords, targetHsk, category } = body || {};

  const knownWordsList = Array.isArray(knownWords) ? knownWords : [];
  const hskLevel = Number(targetHsk) || 1;
  const cardCategory = category || "AI Expansion";

  try {
    const knownWordsStr = knownWordsList.length > 0 ? knownWordsList.join(", ") : "None yet (beginner)";
    
    const response = await generateWithFallback({
      contents: `We have a student studying Mandarin Chinese.
      They already know the following Chinese words/characters: [${knownWordsStr}].
      We want to introduce:
      1. 3 new Chinese words suitable for HSK level ${hskLevel} in the category "${cardCategory}".
      2. 3 simple Chinese sentences that combine these new words with the words/characters they already know.
      
      Provide a list of 6 items (3 words, 3 sentences) in JSON format.
      For each item:
      - 'hanzi': Simplified Chinese characters.
      - 'definition': Spanish translation (concise, 1-4 words).
      - 'pinyin': Array of Pinyin syllables with tone marks, exactly one element per character (e.g. ["nǐ", "hǎo"]).
      - 'hskLevel': ${hskLevel}.
      - 'category': "${cardCategory}".
      - 'type': 'word' for the single words, 'sentence' for the sentences.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              hanzi: { type: Type.STRING, description: "Chinese simplified character or sentence" },
              definition: { type: Type.STRING, description: "Spanish meaning or translation" },
              pinyin: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING }, 
                description: "Array of Pinyin syllables with tone marks, one string per character" 
              },
              hskLevel: { type: Type.INTEGER, description: "Estimated HSK level" },
              category: { type: Type.STRING, description: "Card category" },
              type: { type: Type.STRING, enum: ["word", "sentence"], description: "Whether it is a word or a sentence" }
            },
            required: ["hanzi", "definition", "pinyin", "hskLevel", "type"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No text returned from Gemini");
    }

    const parsed = JSON.parse(text);
    return Array.isArray(parsed) 
      ? parsed.map((item: any) => ({
          ...item,
          pinyin: Array.isArray(item.pinyin)
            ? item.pinyin
            : (typeof item.pinyin === 'string' ? item.pinyin.trim().split(/\s+/).filter(Boolean) : [])
        }))
      : [];
  } catch (error: any) {
    console.error("Gemini smart expansion error:", error);
    throw createError({
      statusCode: 500,
      statusMessage: error.message || "Failed to generate expansion"
    });
  }
});
