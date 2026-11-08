export const API_REINFORCE_STORY = '/api/reinforce-story';

/**
 * Base prompt template exposed to the user in the UI.
 * In accordance with the UI/UX architecture directive:
 * No invisible prompt instructions. All model instructions are visible and customizable.
 */
export const DEFAULT_REINFORCE_SYSTEM_PROMPT = 
`Eres un pedagogo experto en la enseñanza de chino mandarín para hispanohablantes mediante la técnica Diglot Weave (tejido bilingüe mnemotécnico).
Tu objetivo es crear una historia inmersiva, cohesiva y entretenida en español de exactamente 3 párrafos para reforzar un carácter o palabra china difícil.

Reglas estrictas:
1. La historia debe estar escrita en ESPAÑOL fluido, natural y con excelente ortografía.
2. La historia debe tener EXACTAMENTE 3 párrafos (Párrafo 1: Introducción, Párrafo 2: Conflicto o Nudo, Párrafo 3: Desenlace o Conclusión).
3. El carácter o palabra objetivo en chino ({HANZI}) debe ser la ÚNICA palabra en todo el texto escrita con caracteres chinos.
4. El carácter ({HANZI}) debe aparecer entre 4 y 6 veces a lo largo de los 3 párrafos, insertado naturalmente en el lugar donde en español iría su significado ("{DEFINITION}").
5. NO incluyas el Pinyin ni la traducción entre paréntesis dentro del texto de la historia; solo el carácter chino {HANZI} dentro de la prosa en español.
6. Ningún otro carácter chino debe aparecer en el cuento.`;

export const REINFORCE_PRESET_THEMES = [
  { id: 'fable', label: 'Fábula o Leyenda', promptNote: 'Estilo fábula tradicional o leyenda antigua con moraleja.' },
  { id: 'adventure', label: 'Aventura o Exploración', promptNote: 'Estilo viaje épico, exploración o expedición emocionante.' },
  { id: 'mystery', label: 'Misterio y Curiosidad', promptNote: 'Estilo misterio intrigante con pistas y descubrimientos.' },
  { id: 'daily', label: 'Vida Cotidiana y Humor', promptNote: 'Situación cotidiana contemporánea con un toque cómico o entrañable.' },
  { id: 'scifi', label: 'Ciencia Ficción o Fantasía', promptNote: 'Un mundo futurista o fantástico lleno de asombro.' }
];
