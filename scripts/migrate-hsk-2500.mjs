import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, writeBatch } from 'firebase/firestore';
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

const app = initializeApp({
  apiKey: envVars.VITE_FIREBASE_API_KEY,
  authDomain: envVars.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: envVars.VITE_FIREBASE_PROJECT_ID,
  storageBucket: envVars.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envVars.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: envVars.VITE_FIREBASE_APP_ID,
  measurementId: envVars.VITE_FIREBASE_MEASUREMENT_ID
});

const db = getFirestore(app);

async function migrate() {
  const isApply = process.argv.includes('--apply');
  console.log('================================================================');
  console.log(' Migración Oficial HSK 1–5 (2,500 Palabras) + Mandarín General ');
  console.log(` Modo: ${isApply ? '🚀 APLICANDO CAMBIOS EN FIRESTORE' : '🔍 SIMULACIÓN (DRY-RUN)'}`);
  console.log('================================================================\n');

  const canonicalPath = path.resolve(process.cwd(), 'scripts/data/hsk_canonical_2500.json');
  if (!fs.existsSync(canonicalPath)) {
    throw new Error(`No existe el archivo ${canonicalPath}. Ejecuta primero build-canonical-hsk.mjs.`);
  }

  const canonicalWords = JSON.parse(fs.readFileSync(canonicalPath, 'utf-8'));
  console.log(`Registros canónicos HSK 1–5 cargados: ${canonicalWords.length}`);

  // Fetch all existing flashcards from Firestore
  const snap = await getDocs(collection(db, 'flashcards'));
  const dbCards = [];
  snap.forEach(d => dbCards.push({ id: d.id, ...d.data() }));
  console.log(`Tarjetas actuales en Firestore: ${dbCards.length}\n`);

  // Index DB cards by hanbanId (if already migrated) and by hanzi
  const dbByHanbanId = new Map();
  const dbByHanziList = new Map();

  for (const c of dbCards) {
    if (c.meta?.hanbanId) {
      dbByHanbanId.set(Number(c.meta.hanbanId), c);
    }
    const h = (c.hanzi || '').trim();
    if (!dbByHanziList.has(h)) dbByHanziList.set(h, []);
    dbByHanziList.get(h).push(c);
  }

  const matchedDbIds = new Set();
  const toUpdateOfficial = []; // Case A: Existing cards updated with canonical HSK 1-5 data
  const toCreateOfficial = []; // Case B: New canonical HSK 1-5 cards to create

  for (const cw of canonicalWords) {
    let matchedCard = dbByHanbanId.get(cw.meta.hanbanId);

    if (!matchedCard) {
      const candidates = (dbByHanziList.get(cw.hanzi) || []).filter(c => !matchedDbIds.has(c.id));
      if (candidates.length > 0) {
        // Prefer candidate with matching hskLevel if multiple exist
        matchedCard = candidates.find(c => Number(c.hskLevel) === cw.hskLevel) || candidates[0];
      }
    }

    if (matchedCard && !matchedDbIds.has(matchedCard.id)) {
      matchedDbIds.add(matchedCard.id);
      toUpdateOfficial.push({
        docId: matchedCard.id,
        updates: {
          deckId: cw.deckId,
          hanzi: cw.hanzi,
          definition: cw.definition,
          definitionEn: cw.definitionEn,
          pinyin: cw.pinyin,
          pinyinPlain: cw.pinyinPlain,
          pinyinNum: cw.pinyinNum,
          category: cw.category,
          hskLevel: cw.hskLevel,
          hskOrder: cw.hskOrder,
          type: matchedCard.type || 'word',
          meta: cw.meta
        }
      });
    } else {
      const nowIso = new Date().toISOString();
      toCreateOfficial.push({
        deckId: cw.deckId,
        hanzi: cw.hanzi,
        definition: cw.definition,
        definitionEn: cw.definitionEn,
        pinyin: cw.pinyin,
        pinyinPlain: cw.pinyinPlain,
        pinyinNum: cw.pinyinNum,
        category: cw.category,
        hskLevel: cw.hskLevel,
        hskOrder: cw.hskOrder,
        type: 'word',
        meta: cw.meta,
        correctCount: 0,
        wrongCount: 0,
        srsInterval: 0,
        srsEase: 2.5,
        srsRepetitions: 0,
        srsNextDueDate: nowIso,
        srsLastReviewedDate: null,
        knowledgeStatus: 0
      });
    }
  }

  // Case C: Remaining DB cards (HSK 3.0 extras) -> move to mandarin-general
  const toMoveGeneral = dbCards
    .filter(c => !matchedDbIds.has(c.id))
    .map(c => ({
      docId: c.id,
      hanzi: c.hanzi,
      oldDeckId: c.deckId,
      updates: {
        deckId: 'mandarin-general'
      }
    }));

  console.log('--- RESUMEN DE OPERACIONES ---');
  console.log(`- Caso A (Tarjetas existentes actualizadas a HSK 1–5): ${toUpdateOfficial.length}`);
  console.log(`- Caso B (Tarjetas nuevas a crear en HSK 1–5):         ${toCreateOfficial.length}`);
  console.log(`- Caso C (Tarjetas HSK 3.0 movidas a General):         ${toMoveGeneral.length}`);
  console.log(`- Total oficial en mazos HSK 1–5:                      ${toUpdateOfficial.length + toCreateOfficial.length}`);
  console.log(`- Total general en Firestore tras migración:           ${toUpdateOfficial.length + toCreateOfficial.length + toMoveGeneral.length}\n`);

  // Breakdown by level
  for (const lvl of [1, 2, 3, 4, 5]) {
    const upd = toUpdateOfficial.filter(x => x.updates.hskLevel === lvl).length;
    const crt = toCreateOfficial.filter(x => x.hskLevel === lvl).length;
    console.log(`  HSK ${lvl}: ${upd} actualizadas + ${crt} nuevas = ${upd + crt} total`);
  }

  if (!isApply) {
    console.log('\nℹ️  Simulación completada. Para aplicar ejecuta: node scripts/migrate-hsk-2500.mjs --apply');
    process.exit(0);
  }

  // Execute batch writes in chunks of 400
  const allOps = [
    ...toUpdateOfficial.map(x => ({ kind: 'update', id: x.docId, data: x.updates })),
    ...toMoveGeneral.map(x => ({ kind: 'update', id: x.docId, data: x.updates })),
    ...toCreateOfficial.map(x => ({ kind: 'create', data: x }))
  ];

  console.log(`\nEjecutando ${allOps.length} operaciones en Firestore en lotes de 400...`);
  const CHUNK_SIZE = 400;
  for (let i = 0; i < allOps.length; i += CHUNK_SIZE) {
    const chunk = allOps.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const op of chunk) {
      if (op.kind === 'update') {
        batch.update(doc(db, 'flashcards', op.id), op.data);
      } else {
        const newRef = doc(collection(db, 'flashcards'));
        batch.set(newRef, op.data);
      }
    }
    await batch.commit();
    console.log(`  Lote ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(allOps.length / CHUNK_SIZE)} completado (${chunk.length} operaciones).`);
  }

  console.log('\n✅ ¡Migración a Firestore completada exitosamente!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Error durante la migración:', err);
  process.exit(1);
});
