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

const HSK2_DECK_ID = 'p9HtNHiupdILOPdnqkaF'; // Mandarín HSK 2
const HSK3_DECK_ID = 'v7oTRGG3hSnBeKCwEwEB'; // Mandarín HSK 3

async function migrate() {
  const isApply = process.argv.includes('--apply');
  console.log('===========================================================');
  console.log(' Migración de Tarjetas: Mandarín General -> Mandarín HSK 2 & 3');
  console.log(` Modo: ${isApply ? '🚀 APLICANDO CAMBIOS EN FIRESTORE' : '🔍 SIMULACIÓN (DRY-RUN)'}`);
  console.log('===========================================================\n');

  // 1. Verificar existencia de ambos mazos destino
  const deck2Doc = await getDoc(doc(db, 'decks', HSK2_DECK_ID));
  const deck3Doc = await getDoc(doc(db, 'decks', HSK3_DECK_ID));

  if (!deck2Doc.exists()) {
    console.error(`❌ Error: El mazo HSK 2 con ID ${HSK2_DECK_ID} no existe.`);
    process.exit(1);
  }
  if (!deck3Doc.exists()) {
    console.error(`❌ Error: El mazo HSK 3 con ID ${HSK3_DECK_ID} no existe.`);
    process.exit(1);
  }

  const deck2Name = deck2Doc.data().name;
  const deck3Name = deck3Doc.data().name;
  console.log(`Mazo destino HSK 2: "${deck2Name}" (ID: ${HSK2_DECK_ID})`);
  console.log(`Mazo destino HSK 3: "${deck3Name}" (ID: ${HSK3_DECK_ID})\n`);

  // 2. Obtener todas las tarjetas
  const snapshot = await getDocs(collection(db, 'flashcards'));
  console.log(`Total de tarjetas en Firestore: ${snapshot.size}`);

  const toMigrateHsk2 = [];
  const toMigrateHsk3 = [];
  let alreadyInHsk2 = 0;
  let alreadyInHsk3 = 0;
  let remainingInGeneral = [];

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const currentDeckId = data.deckId;
    const isGeneral = !currentDeckId || currentDeckId === 'mandarin-general';

    if (currentDeckId === HSK2_DECK_ID) {
      alreadyInHsk2++;
      return;
    }
    if (currentDeckId === HSK3_DECK_ID) {
      alreadyInHsk3++;
      return;
    }

    if (isGeneral) {
      if (data.hskLevel === 2) {
        toMigrateHsk2.push({
          id: docSnap.id,
          hanzi: data.hanzi,
          definition: data.definition,
          hskOrder: data.hskOrder
        });
      } else if (data.hskLevel === 3) {
        toMigrateHsk3.push({
          id: docSnap.id,
          hanzi: data.hanzi,
          definition: data.definition,
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

  console.log(`\n--- BALANCE DE HSK 2 ---`);
  console.log(`- Tarjetas ya en "${deck2Name}": ${alreadyInHsk2}`);
  console.log(`- Tarjetas a migrar a "${deck2Name}": ${toMigrateHsk2.length}`);
  console.log(`- Total final proyectado en "${deck2Name}": ${alreadyInHsk2 + toMigrateHsk2.length}`);

  console.log(`\n--- BALANCE DE HSK 3 ---`);
  console.log(`- Tarjetas ya en "${deck3Name}": ${alreadyInHsk3}`);
  console.log(`- Tarjetas a migrar a "${deck3Name}": ${toMigrateHsk3.length}`);
  console.log(`- Total final proyectado en "${deck3Name}": ${alreadyInHsk3 + toMigrateHsk3.length}`);

  console.log(`\n--- BALANCE DE GENERAL ---`);
  console.log(`- Tarjetas que permanecerán en Mandarín General: ${remainingInGeneral.length}`);
  remainingInGeneral.forEach(r => console.log(`   * ${r.hanzi} (HSK ${r.hskLevel})`));

  const totalToMigrate = toMigrateHsk2.length + toMigrateHsk3.length;
  console.log(`\nTotal general de tarjetas a transferir: ${totalToMigrate}`);

  if (totalToMigrate === 0) {
    console.log('✨ No hay tarjetas pendientes de migración.');
    process.exit(0);
  }

  if (!isApply) {
    console.log('\nℹ️  Para aplicar los cambios a Firestore ejecuta:');
    console.log('    node scripts/migrate-cards-to-hsk2-hsk3.mjs --apply\n');
    process.exit(0);
  }

  // 3. Ejecución por lotes en Firestore
  console.log(`\nIniciando actualización por lotes en Firestore para ${totalToMigrate} documentos...`);
  const batch = writeBatch(db);

  toMigrateHsk2.forEach(item => {
    const cardRef = doc(db, 'flashcards', item.id);
    batch.update(cardRef, { deckId: HSK2_DECK_ID });
  });

  toMigrateHsk3.forEach(item => {
    const cardRef = doc(db, 'flashcards', item.id);
    batch.update(cardRef, { deckId: HSK3_DECK_ID });
  });

  await batch.commit();
  console.log(`\n✅ ¡Migración completada con éxito!`);
  console.log(`  - ${toMigrateHsk2.length} tarjetas migradas a "${deck2Name}"`);
  console.log(`  - ${toMigrateHsk3.length} tarjetas migradas a "${deck3Name}"`);
  process.exit(0);
}

migrate().catch(err => {
  console.error('Error durante la migración:', err);
  process.exit(1);
});
