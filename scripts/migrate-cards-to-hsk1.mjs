import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, writeBatch, getDoc } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

// 1. Cargar variables de entorno desde .env
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] || '';
    val = val.trim().replace(/^['"]|['"]$/g, '');
    envVars[match[1]] = val;
  }
});

const firebaseConfig = {
  apiKey: envVars.VITE_FIREBASE_API_KEY,
  authDomain: envVars.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: envVars.VITE_FIREBASE_PROJECT_ID,
  storageBucket: envVars.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envVars.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: envVars.VITE_FIREBASE_APP_ID,
  measurementId: envVars.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const TARGET_DECK_ID = 'Upx2EcmT3HKvtea7RkDZ'; // Mandarín HSK 1

async function migrate() {
  const isApply = process.argv.includes('--apply');
  console.log('====================================================');
  console.log(' Migración de Tarjetas: Mandarín General -> Mandarín HSK 1');
  console.log(` Modo: ${isApply ? '🚀 APLICANDO CAMBIOS EN FIRESTORE' : '🔍 SIMULACIÓN (DRY-RUN)'}`);
  console.log('====================================================\n');

  // Verificar mazo destino
  const deckDoc = await getDoc(doc(db, 'decks', TARGET_DECK_ID));
  if (!deckDoc.exists()) {
    console.error(`❌ Error: El mazo destino con ID ${TARGET_DECK_ID} no existe.`);
    process.exit(1);
  }
  const deckData = deckDoc.data();
  console.log(`Mazo destino verificado: "${deckData.name}" (ID: ${TARGET_DECK_ID})\n`);

  // Obtener todas las tarjetas
  const snapshot = await getDocs(collection(db, 'flashcards'));
  console.log(`Total de tarjetas en Firestore: ${snapshot.size}`);

  const toMigrate = [];
  let alreadyInTarget = 0;
  let remainingInGeneral = [];

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const currentDeckId = data.deckId;
    const isGeneral = !currentDeckId || currentDeckId === 'mandarin-general';

    if (currentDeckId === TARGET_DECK_ID) {
      alreadyInTarget++;
      return;
    }

    if (isGeneral) {
      if (data.hskLevel === 1) {
        toMigrate.push({
          id: docSnap.id,
          hanzi: data.hanzi,
          definition: data.definition,
          pinyin: data.pinyin,
          hskLevel: data.hskLevel,
          hskOrder: data.hskOrder
        });
      } else {
        remainingInGeneral.push({
          id: docSnap.id,
          hanzi: data.hanzi,
          hskLevel: data.hskLevel
        });
      }
    }
  });

  console.log(`- Tarjetas ya en "${deckData.name}": ${alreadyInTarget}`);
  console.log(`- Tarjetas candidatas a migrar (HSK 1 desde General): ${toMigrate.length}`);
  console.log(`- Tarjetas que permanecerán en General (HSK != 1): ${remainingInGeneral.length}`);
  console.log(`- Total proyectado en "${deckData.name}": ${alreadyInTarget + toMigrate.length}\n`);

  if (toMigrate.length === 0) {
    console.log('✨ No hay tarjetas pendientes de migración. Todo está al día.');
    process.exit(0);
  }

  // Muestra de tarjetas a migrar
  console.log('Muestra de tarjetas que serán transferidas (primeras 10):');
  toMigrate.slice(0, 10).forEach((c, idx) => {
    console.log(`  [${idx + 1}] Hanzi: ${c.hanzi} | Orden HSK: #${c.hskOrder} | Def: ${c.definition}`);
  });

  if (!isApply) {
    console.log('\nℹ️  Para aplicar los cambios a Firestore ejecuta:');
    console.log('    node scripts/migrate-cards-to-hsk1.mjs --apply\n');
    process.exit(0);
  }

  // Modo Apply: Escritura por lotes atómicos (máximo 450 por lote)
  console.log(`\nIniciando actualización por lotes en Firestore para ${toMigrate.length} documentos...`);
  const CHUNK_SIZE = 450;
  let updatedCount = 0;

  for (let i = 0; i < toMigrate.length; i += CHUNK_SIZE) {
    const chunk = toMigrate.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    chunk.forEach(item => {
      const cardRef = doc(db, 'flashcards', item.id);
      batch.update(cardRef, { deckId: TARGET_DECK_ID });
    });

    await batch.commit();
    updatedCount += chunk.length;
    console.log(`  Lote ${Math.floor(i / CHUNK_SIZE) + 1} completado: ${chunk.length} tarjetas actualizadas.`);
  }

  console.log(`\n✅ ¡Migración completada con éxito! Total actualizadas: ${updatedCount}`);
  process.exit(0);
}

migrate().catch(err => {
  console.error('Error durante la migración:', err);
  process.exit(1);
});
