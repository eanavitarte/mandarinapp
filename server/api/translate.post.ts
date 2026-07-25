import { Type } from "@google/genai";
import { useGemini } from "../utils/gemini";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { word } = body || {};

  if (!word) {
    throw createError({
      statusCode: 400,
      statusMessage: "Word parameter is required"
    });
  }

  try {
    const ai = useGemini();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Translate the Spanish word "${word}" into Mandarin Chinese and create a flashcard.
      Return the Simplified Chinese characters (hanzi), the Spanish definition (concise, 1-3 words), the pinyin (with tone marks, e.g. léng), and the estimated HSK level (1-6).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hanzi: { type: Type.STRING, description: "The simplified Chinese characters" },
            definition: { type: Type.STRING, description: "The Spanish meaning" },
            pinyin: { type: Type.STRING, description: "The pinyin pronunciation with tone marks" },
            hskLevel: { type: Type.INTEGER, description: "The HSK level (1-6)" }
          },
          required: ["hanzi", "definition", "pinyin"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No text returned from Gemini");
    }

    return JSON.parse(text);
  } catch (error: any) {
    console.error("Gemini individual translation error:", error);
    throw createError({
      statusCode: 500,
      statusMessage: error.message || "Failed to translate word"
    });
  }
});
