import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

export const GEMINI_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.1-pro-preview"
];

export const STORY_GEMINI_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-pro-preview"
];

export const useGemini = () => {
  if (!aiInstance) {
    const config = useRuntimeConfig();
    const apiKey = config.geminiApiKey || '';
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

/**
 * Executes a Gemini content generation request with automatic fallback
 * across active models to withstand high-demand spikes (HTTP 503/429/404).
 */
export const generateWithFallback = async (params: { contents: any; config?: any; models?: string[] }) => {
  const ai = useGemini();
  let lastError: any = null;
  const modelsToTry = params.models && params.models.length > 0 ? params.models : GEMINI_MODELS;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config
      });

      if (response && response.text) {
        return response;
      }
    } catch (err: any) {
      console.warn(`[Gemini Fallback] Model '${model}' failed with status:`, err?.status || err?.message);
      lastError = err;
      // If temporary overload, quota or model unavailable, try next model
      if (err?.status === 503 || err?.status === 404 || err?.status === 429) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error("All Gemini models failed to generate content.");
};
