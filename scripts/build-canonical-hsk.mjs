import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';

// 1. Load environment variables
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    envVars[match[1]] = (match[2] || '').trim().replace(/^['"]|['"]$/g, '');
  }
});

const apiKey = envVars.GEMINI_API_KEY || envVars.VITE_GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });
const MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-3.1-pro-preview'];

// 2. Deterministic mapping from Chinese syntax to Spanish category
const SYNTAX_MAP = {
  '名': 'Sustantivo',
  '动': 'Verbo',
  '形': 'Adjetivo',
  '副': 'Adverbio',
  '量': 'Clasificador',
  '代': 'Pronombre',
  '数': 'Numeral',
  '数量': 'Numeral / Clasificador',
  '介': 'Preposición',
  '连': 'Conjunción',
  '助': 'Partícula',
  '助动': 'Verbo modal',
  '叹': 'Interjección',
  '区别': 'Distintivo',
  '关联': 'Estructura correlativa',
  '行': 'Verbo / Sufijo'
};

export function mapSyntaxToCategory(syntaxStr) {
  const raw = (syntaxStr || '').trim();
  if (!raw) return 'Expresión';
  if (SYNTAX_MAP[raw]) return SYNTAX_MAP[raw];
  const parts = raw.split('/').map(p => p.trim()).filter(Boolean);
  const mapped = parts.map(p => SYNTAX_MAP[p] || p);
  return mapped.join(' / ');
}

// 3. Target Deck IDs by HSK level
export const HSK_DECK_IDS = {
  1: 'Upx2EcmT3HKvtea7RkDZ',
  2: 'p9HtNHiupdILOPdnqkaF',
  3: 'v7oTRGG3hSnBeKCwEwEB',
  4: 'dCPYVeYDBRrXnWGdF3cV',
  5: 'gM0Rpyqmt8VytaUeZJVK'
};

async function translateBatch(items) {
  const prompt = `Eres un experto lexicógrafo de chino mandarín-español para el examen HSK.
Traduce al español el significado en inglés ("en") de cada palabra china considerando su carácter ("w"), pinyin ("p") y categoría gramatical ("c").
Reglas:
1. Devuelve ÚNICAMENTE un objeto JSON válido donde cada clave sea el "id" numérico (como string) y el valor sea la traducción al español concisa, clara y natural para una tarjeta de estudio (flashcard), iniciando con mayúscula (ej. "Amar", "Taza; vaso", "Tía (hermana menor de la madre)").
2. No agregues bloques markdown ni texto adicional, solo el JSON puro.

Palabras a traducir:
${JSON.stringify(items)}`;

  let lastErr = null;
  for (const model of MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      });
      const text = (response.text || '').trim();
      const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      return JSON.parse(cleaned);
    } catch (err) {
      console.warn(`  [Retry] Model ${model} failed:`, err?.status || err?.message);
      lastErr = err;
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  throw lastErr || new Error('Failed to translate batch');
}

async function main() {
  const dataDir = path.resolve(process.cwd(), 'scripts/data');
  const backupFile = path.join(dataDir, 'backup_firestore_pre_hsk2500.json');
  const cacheFile = path.join(dataDir, 'es_translations_cache.json');
  const outFile = path.join(dataDir, 'hsk_canonical_2500.json');

  const backup = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
  const existingCards = backup.flashcards || [];

  // Load translation cache if exists
  let transCache = {};
  if (fs.existsSync(cacheFile)) {
    transCache = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
  }

  // Load all 2500 API words across HSK 1..5
  const rawEntries = [];
  const wordCountMap = new Map();

  for (const level of [1, 2, 3, 4, 5]) {
    const file = path.join(dataDir, `hsk${level}_words.json`);
    const list = JSON.parse(fs.readFileSync(file, 'utf-8'));
    list.forEach((w, idx) => {
      const cleanWord = w.word.trim();
      wordCountMap.set(cleanWord, (wordCountMap.get(cleanWord) || 0) + 1);
      rawEntries.push({
        api: w,
        hskLevel: level,
        hskOrder: idx + 1
      });
    });
  }

  // Index existing Firestore cards by hanzi
  const dbByHanzi = new Map();
  for (const c of existingCards) {
    const h = (c.hanzi || '').trim();
    if (h && !dbByHanzi.has(h)) {
      dbByHanzi.set(h, c);
    }
  }

  // Pre-populate cache from non-polysemic existing Firestore cards
  let reusedFromDb = 0;
  for (const entry of rawEntries) {
    const { api } = entry;
    const hanbanIdStr = String(api.id);
    const cleanWord = api.word.trim();
    const isPolysemic = (wordCountMap.get(cleanWord) || 0) > 1;

    if (!isPolysemic && dbByHanzi.has(cleanWord)) {
      const dbCard = dbByHanzi.get(cleanWord);
      if (dbCard.definition && dbCard.definition.trim()) {
        transCache[hanbanIdStr] = dbCard.definition.trim();
        reusedFromDb++;
      }
    }
  }

  console.log(`Total palabras API: ${rawEntries.length}`);
  console.log(`Definiciones en español reutilizadas de Firestore: ${reusedFromDb}`);

  // Find entries still needing Spanish translation
  const toTranslate = rawEntries.filter(e => !transCache[String(e.api.id)]);
  console.log(`Palabras pendientes de traducir con Gemini: ${toTranslate.length}`);

  const BATCH_SIZE = 100;
  for (let i = 0; i < toTranslate.length; i += BATCH_SIZE) {
    const chunk = toTranslate.slice(i, i + BATCH_SIZE);
    const payload = chunk.map(e => ({
      id: e.api.id,
      w: e.api.word.trim(),
      p: e.api.pinyin_tone.trim(),
      c: mapSyntaxToCategory(e.api.syntax),
      en: e.api.translation.trim()
    }));

    console.log(`  Traduciendo lote ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(toTranslate.length / BATCH_SIZE)} (${chunk.length} palabras)...`);
    const resultObj = await translateBatch(payload);

    for (const item of chunk) {
      const k = String(item.api.id);
      if (resultObj[k] && String(resultObj[k]).trim()) {
        transCache[k] = String(resultObj[k]).trim();
      } else {
        // Fallback to English if missing in response
        transCache[k] = item.api.translation.trim();
      }
    }

    fs.writeFileSync(cacheFile, JSON.stringify(transCache, null, 2), 'utf-8');
  }

  // Build final canonical 2500 dataset
  const canonical = rawEntries.map(({ api, hskLevel, hskOrder }) => {
    const pinyinPlain = api.pinyin.trim().split(/\s+/).filter(Boolean);
    const pinyin = api.pinyin_tone.replace(/\u2026+/g, ' ').trim().split(/\s+/).filter(Boolean);
    const pinyinNum = api.pinyin_num.trim().split(/\s+/).filter(Boolean);
    const category = mapSyntaxToCategory(api.syntax);
    const definitionEn = api.translation.trim();
    const definition = (transCache[String(api.id)] || definitionEn).trim();

    return {
      deckId: HSK_DECK_IDS[hskLevel],
      hanzi: api.word.trim(),
      definition,
      definitionEn,
      pinyin,
      pinyinPlain,
      pinyinNum,
      category,
      hskLevel,
      hskOrder,
      type: 'word',
      meta: {
        hanbanId: Number(api.id),
        ttsUrl: api.tts_url || '',
        syntax: (api.syntax || '').trim(),
        levels: Array.isArray(api.levels) ? api.levels : []
      }
    };
  });

  fs.writeFileSync(outFile, JSON.stringify(canonical, null, 2), 'utf-8');
  console.log(`\n✅ Dataset canónico generado exitosamente en: ${outFile} (${canonical.length} registros).`);
}

main().catch(err => {
  console.error('Error en build-canonical-hsk:', err);
  process.exit(1);
});
