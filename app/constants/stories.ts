import type { StoryGenre } from '~/types';

export const API_MASTERY_STORY = '/api/mastery-story';
export const MASTERY_BATCH_SIZE = 10;
export const MASTERY_TARGET_STATUS = 100;

export interface StoryGenreConfig {
  id: StoryGenre;
  label: string;
  icon: string;
  description: string;
  guideline: string;
}

export const STORY_GENRES: StoryGenreConfig[] = [
  {
    id: 'cuento',
    label: 'Cuento o Fábula',
    icon: '📖',
    description: 'Relato imaginativo con moraleja, aventura o fantasía.',
    guideline: 'Redacta un cuento o fábula tradicional con planteamiento, conflicto y moraleja o desenlace conmovedor.'
  },
  {
    id: 'historia',
    label: 'Historia Cotidiana',
    icon: '☕',
    description: 'Crónica moderna, vivencia diaria o anécdota realista.',
    guideline: 'Redacta una historia contemporánea, anécdota o crónica realista de la vida cotidiana.'
  },
  {
    id: 'noticia',
    label: 'Noticia Periodística',
    icon: '📰',
    description: 'Artículo informativo, reporte de actualidad o crónica periodística.',
    guideline: 'Redacta un artículo o crónica periodística con titular llamativo, entradilla informativa y desarrollo detallado de los hechos como una noticia verosímil y amena.'
  }
];

export const DEFAULT_MASTERY_STORY_PROMPT = 
`Eres un educador y escritor experto en la enseñanza del chino mandarín mediante la técnica Diglot Weave (tejido bilingüe mnemotécnico).
Tu objetivo es redactar un texto entretenido, coherente y fluido en español que integre de manera natural y con pleno sentido semántico una lista de caracteres chinos que el estudiante ya domina al 100%.

Reglas pedagógicas:
1. El texto principal debe redactarse en ESPAÑOL impecable, natural y contextualizado según el formato solicitado.
2. Cada carácter o palabra china de la lista provista debe ser insertada en Hanzi exactamente donde en español correspondería su significado.
3. Asegúrate de incluir TODOS los caracteres de la lista dentro de los párrafos (pueden repetirse si la trama lo amerita naturalmente).
4. Ningún otro carácter chino aparte de los especificados en la lista debe figurar en el texto.
5. No coloques pinyin ni traducciones entre paréntesis en el cuerpo del texto para permitir que el estudiante active su memoria y use los componentes interactivos.`;

export const READONLY_MASTERY_SCHEMA_INSTRUCTION = 
`[Estructura Inmutable del Modelo]: El modelo responderá estrictamente en formato JSON con la siguiente estructura:
- 'title': Titular o título principal del texto.
- 'summary': Breve entradilla periodística o resumen en 1 a 2 oraciones.
- 'paragraphs': Arreglo de 3 a 5 párrafos narrativos en español con los caracteres chinos provistos incrustados.
- 'usedCharacters': Arreglo de objetos con 'hanzi' y el conteo de 'occurrences' en el texto.

(Justificación Técnica de Inmutabilidad: Este contrato es estricto y de Solo Lectura para garantizar que los componentes de la aplicación puedan parsear de forma fiable los párrafos, enlazar cada carácter a su sonido y popover de pronunciación, y persistirlo en Firestore sin corrupción de datos).`;
