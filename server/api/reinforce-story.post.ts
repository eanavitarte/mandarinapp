import { Type } from "@google/genai";
import { generateWithFallback, STORY_GEMINI_MODELS } from "../utils/gemini";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { hanzi, pinyin, definition, customPrompt, themeNote } = body || {};

  if (!hanzi || !definition) {
    throw createError({
      statusCode: 400,
      statusMessage: "Se requiere el carácter (hanzi) y su significado (definition)."
    });
  }

  const pinyinStr = Array.isArray(pinyin) ? pinyin.join(" ") : (pinyin || "");

  try {
    const baseInstruction = customPrompt?.trim() || 
`Eres un pedagogo experto en la enseñanza de chino mandarín para hispanohablantes mediante la técnica Diglot Weave (tejido bilingüe mnemotécnico).
Tu objetivo es crear una historia inmersiva, cohesiva y entretenida en español de exactamente 3 párrafos para reforzar un carácter o palabra china difícil.

Reglas estrictas:
1. La historia debe estar escrita en ESPAÑOL fluido, natural y con excelente ortografía.
2. La historia debe tener EXACTAMENTE 3 párrafos (Párrafo 1: Introducción, Párrafo 2: Conflicto o Nudo, Párrafo 3: Desenlace o Conclusión).
3. El carácter o palabra objetivo en chino ("${hanzi}") debe ser la ÚNICA palabra en todo el texto escrita con caracteres chinos.
4. El carácter ("${hanzi}") debe aparecer entre 4 y 6 veces a lo largo de los 3 párrafos, insertado naturalmente en el lugar donde en español iría su significado ("${definition}").
5. NO incluyas el Pinyin ni la traducción entre paréntesis dentro del texto de la historia; solo el carácter chino "${hanzi}" dentro de la prosa en español.
6. Ningún otro carácter chino debe aparecer en el cuento.`;

    const themeInstruction = themeNote ? `\nTemática deseada para la historia: ${themeNote}` : "";

    const fullPrompt = `${baseInstruction}${themeInstruction}

Información del carácter a reforzar:
- Carácter/Palabra en chino: "${hanzi}"
- Pinyin: "${pinyinStr}"
- Significado en español: "${definition}"

Genera una respuesta en formato JSON con la siguiente estructura:
- 'title': Título atractivo del cuento en español (puede incluir opcionalmente el carácter "${hanzi}").
- 'paragraphs': Array con EXACTAMENTE 3 cadenas de texto (los 3 párrafos del cuento en español con "${hanzi}" integrado).
- 'occurrences': Número entero con el conteo de veces que insertaste el carácter "${hanzi}" en el texto.`;

    const response = await generateWithFallback({
      models: STORY_GEMINI_MODELS,
      contents: fullPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { 
              type: Type.STRING, 
              description: "Título del cuento en español" 
            },
            paragraphs: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Array de exactamente 3 párrafos en español con el carácter chino insertado" 
            },
            occurrences: { 
              type: Type.INTEGER, 
              description: "Cantidad de veces que aparece el carácter en los párrafos" 
            }
          },
          required: ["title", "paragraphs", "occurrences"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No se recibió respuesta del modelo Gemini");
    }

    const parsed = JSON.parse(text);

    // Validar que paragraphs sea un array de al menos 1 elemento
    let paragraphs = Array.isArray(parsed.paragraphs) ? parsed.paragraphs : [];
    if (paragraphs.length === 0 && typeof parsed.paragraphs === 'string') {
      paragraphs = [parsed.paragraphs];
    }

    // Asegurar que sean exactamente 3 párrafos si es posible
    if (paragraphs.length > 3) {
      paragraphs = paragraphs.slice(0, 3);
    }

    // Contar apariciones reales del carácter en el texto para precisión
    const fullText = paragraphs.join(" ");
    const matches = fullText.split(hanzi).length - 1;

    return {
      title: parsed.title || `Historia con ${hanzi}`,
      paragraphs,
      occurrences: matches > 0 ? matches : (parsed.occurrences || 1)
    };

  } catch (error: any) {
    console.error("Error al generar historia de refuerzo en /api/reinforce-story:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "No fue posible generar la historia de refuerzo con IA. Inténtalo de nuevo."
    });
  }
});
