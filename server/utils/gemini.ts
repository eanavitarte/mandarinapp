import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

export const useGemini = () => {
  if (!aiInstance) {
    const config = useRuntimeConfig();
    const apiKey = config.geminiApiKey || '';
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};
