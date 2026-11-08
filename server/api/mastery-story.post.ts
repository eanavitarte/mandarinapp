import { Type } from "@google/genai";
import { generateWithFallback, STORY_GEMINI_MODELS } from "../utils/gemini";
import type { StoryTargetCharacter } from "~/types";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { characters, genre = 'cuento', userIdea, customPrompt } = body || {};

  if (!characters || !Array.isArray(characters) || characters.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Se requiere un arreglo de caracteres dominados (characters)."
    });
  }

  const targetChars: StoryTargetCharacter[] = characters.slice(0, 15);
  const charsDescription = targetChars
    .map((c, i) => `${i + 1}. "${c.hanzi}" (Pinyin: ${Array.isArray(c.pinyin) ? c.pinyin.join(' ') : (c.pinyin || '')}, Significado en español: "${c.definition}")`)
    .join("\n");

  const genreLabels: Record<string, string> = {
    cuento: "Cuento o Fábula tradicional con moraleja o aventura.",
    historia: "Historia o Crónica moderna de la vida cotidiana.",
    noticia: "Noticia periodística o reportaje ameno de actualidad con titular y entradilla."
  };

  const selectedGenreDesc = genreLabels[genre] || genreLabels.cuento;

  const baseInstruction = customPrompt?.trim() || 
`Eres un educador y escritor experto en la enseñanza del chino mandarín mediante la técnica Diglot Weave (tejido bilingüe mnemotécnico).
Tu objetivo es redactar un texto entretenido, coherente y fluido en español que integre de manera natural y con pleno sentido semántico una lista de caracteres chinos que el estudiante ya domina al 100%.

Reglas pedagógicas:
1. El texto principal debe redactarse en ESPAÑOL impecable, natural y contextualizado según el formato solicitado.
2. Cada carácter o palabra china de la lista provista debe ser insertada en Hanzi exactamente donde en español correspondería su significado.
3. Asegúrate de incluir TODOS los caracteres de la lista dentro de los párrafos (pueden repetirse si la trama lo amerita naturalmente).
4. Ningún otro carácter chino aparte de los especificados en la lista debe figurar en el texto.
5. No coloques pinyin ni traducciones entre paréntesis en el cuerpo del texto para permitir que el estudiante active su memoria y use los componentes interactivos.`;

  const ideaInstruction = userIdea?.trim() 
    ? `\nIdea o temática sugerida por el usuario para co-redactar: "${userIdea.trim()}"`
    : "";

  const fullPrompt = `${baseInstruction}

Formato / Género requerido: ${selectedGenreDesc}${ideaInstruction}

Lista de caracteres dominados al 100% que DEBEN aparecer integrados en el texto:
${charsDescription}

Genera una respuesta en formato JSON con la siguiente estructura:
- 'title': Título o titular llamativo en español.
- 'summary': Resumen breve o entradilla informativa (1 o 2 oraciones).
- 'paragraphs': Arreglo de 3 a 5 párrafos narrativos en español con los caracteres en Hanzi incrustados en su posición natural.
- 'usedCharacters': Arreglo con cada 'hanzi' y el número de 'occurrences' en el texto.`;

  try {
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
              description: "Título o titular atractivo en español" 
            },
            summary: { 
              type: Type.STRING, 
              description: "Breve bajada o resumen en español (1-2 oraciones)" 
            },
            paragraphs: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Arreglo de 3 a 5 párrafos narrativos en español con los caracteres chinos insertados" 
            },
            usedCharacters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  hanzi: { type: Type.STRING },
                  occurrences: { type: Type.INTEGER }
                },
                required: ["hanzi", "occurrences"]
              },
              description: "Lista de caracteres utilizados y su conteo de apariciones"
            }
          },
          required: ["title", "paragraphs"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No se recibió respuesta del modelo Gemini");
    }

    const parsed = JSON.parse(text);

    let paragraphs = Array.isArray(parsed.paragraphs) ? parsed.paragraphs : [];
    if (paragraphs.length === 0 && typeof parsed.paragraphs === 'string') {
      paragraphs = [parsed.paragraphs];
    }

    const fullText = paragraphs.join(" ");

    // Conteo preciso en servidor de cada carácter en los párrafos
    const usedCharacters = targetChars.map(c => {
      const count = fullText.split(c.hanzi).length - 1;
      return {
        hanzi: c.hanzi,
        occurrences: count
      };
    });

    return {
      title: parsed.title || `Historia con ${targetChars.map(c => c.hanzi).slice(0, 3).join(', ')}`,
      summary: parsed.summary || "",
      paragraphs,
      usedCharacters
    };

  } catch (error: any) {
    console.error("Error al generar historia de dominio en /api/mastery-story:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "No fue posible generar el cuento o noticia con IA. Por favor, inténtalo de nuevo."
    });
  }
});
