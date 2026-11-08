import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Read .env file manually
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

const VOWEL_CHARS = 'aeiouüvāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜAEIOUÜVĀÁǍÀĒÉĚÈĪÍǏÌŌÓǑÒŪÚǓÙǕǗǙǛ';
const PINYIN_SYLLABLE_REGEX = new RegExp(
  '(?:zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?' +
  '(?:' +
    '(?:[iuüv]?[aāáǎà][n][g]|[iīíǐìuūúǔù]?[eēéěè][n][g]|[iīíǐì][n][g]|[i]?[oōóǒò][n][g])(?![\\u0300-\\u036f]*[' + VOWEL_CHARS + '])|' +
    '(?:[iuüv]?[aāáǎà][n]|[uūúǔù]?[eēéěè][n]|[iīíǐìuūúǔùüǖǘǚǜv][n])(?![\\u0300-\\u036f]*[' + VOWEL_CHARS + '])|' +
    '[eēéěè][r](?![\\u0300-\\u036f]*[' + VOWEL_CHARS + '])|' +
    '[i][aāáǎà][oōóǒò]|[u][aāáǎà][iīíǐì]|' +
    '[aāáǎà][iīíǐì]|[eēéěè][iīíǐì]|[aāáǎà][oōóǒò]|[oōóǒò][uūúǔù]|' +
    '[i][aāáǎà]|[i][eēéěè]|[u][aāáǎà]|[u][oōóǒò]|[uüv][eēéěè]|' +
    '[i][uūúǔù]|[u][iīíǐì]|' +
    '[' + VOWEL_CHARS + ']' +
  ')[1-5]?',
  'gi'
);

function chunkPinyin(hanzi, pinyin) {
  if (!pinyin) return [];
  if (Array.isArray(pinyin)) return pinyin;

  let str = String(pinyin).trim();
  if (!str) return [];

  const cjkChars = Array.from(hanzi || '').filter(c => /[\u4e00-\u9fff]/.test(c));
  let spaceTokens = str.split(/[\s'’\-]+/).filter(Boolean);

  // If already matches CJK count, return immediately
  if (cjkChars.length > 0 && spaceTokens.length === cjkChars.length) {
    return spaceTokens;
  }

  // Handle Erhua suffix only when tokens are fewer than CJK characters
  if (hanzi && hanzi.endsWith('儿') && spaceTokens.length < cjkChars.length) {
    const lastToken = spaceTokens[spaceTokens.length - 1];
    if (lastToken && lastToken.endsWith('r') && lastToken.length > 1) {
      spaceTokens[spaceTokens.length - 1] = lastToken.slice(0, -1);
      spaceTokens.push('r');
    }
  }

  if (cjkChars.length > 0 && spaceTokens.length === cjkChars.length) {
    return spaceTokens;
  }

  // Otherwise, use regex splitting
  const tokens = [];
  for (const token of spaceTokens) {
    const matches = token.match(PINYIN_SYLLABLE_REGEX);
    if (matches && matches.length > 0) {
      tokens.push(...matches);
    } else {
      tokens.push(token);
    }
  }

  return tokens.length > 0 ? tokens : spaceTokens;
}

async function run() {
  const isApply = process.argv.includes('--apply');
  console.log(`\n========================================`);
  console.log(` Modulo de Migración de Pinyin (Chunkeo) `);
  console.log(` Modo: ${isApply ? '🚀 APLICAR CAMBIOS EN FIRESTORE' : '🔍 SIMULACIÓN (DRY-RUN)'}`);
  console.log(`========================================\n`);

  const snapshot = await getDocs(collection(db, 'flashcards'));
  console.log(`Total de tarjetas en Firestore: ${snapshot.size}`);

  let toMigrate = [];
  let alreadyArray = 0;
  let noPinyin = 0;

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    if (!data.pinyin) {
      noPinyin++;
      return;
    }
    if (Array.isArray(data.pinyin)) {
      alreadyArray++;
      return;
    }

    const chunks = chunkPinyin(data.hanzi, data.pinyin);
    toMigrate.push({
      id: docSnap.id,
      hanzi: data.hanzi,
      definition: data.definition,
      oldPinyin: data.pinyin,
      newPinyin: chunks
    });
  });

  console.log(`- Tarjetas que ya eran array: ${alreadyArray}`);
  console.log(`- Tarjetas sin pinyin: ${noPinyin}`);
  console.log(`- Tarjetas a migrar: ${toMigrate.length}\n`);

  if (toMigrate.length === 0) {
    console.log("No hay tarjetas pendientes de migración. Todo está actualizado.");
    process.exit(0);
  }

  console.log("Ejemplos de conversión:");
  toMigrate.slice(0, 15).forEach((item, idx) => {
    console.log(` [${idx + 1}] ${item.hanzi} (${item.definition})`);
    console.log(`     Antes:   "${item.oldPinyin}"`);
    console.log(`     Después: [${item.newPinyin.map(s => `"${s}"`).join(', ')}]`);
  });

  const jueDe = toMigrate.find(m => m.hanzi === '觉得');
  if (jueDe) {
    console.log(`\n🎯 Tarjeta clave detectada: 觉得`);
    console.log(`     Antes:   "${jueDe.oldPinyin}"`);
    console.log(`     Después: [${jueDe.newPinyin.map(s => `"${s}"`).join(', ')}]`);
  }

  // Check discrepancies
  const mismatches = toMigrate.filter(item => {
    const cjkCount = Array.from(item.hanzi || '').filter(c => /[\u4e00-\u9fff]/.test(c)).length;
    return cjkCount > 0 && item.newPinyin.length !== cjkCount;
  });

  if (mismatches.length > 0) {
    console.log(`\n⚠️  Atención: Hay ${mismatches.length} tarjetas donde la cantidad de sílabas no coincide exactamente con los caracteres CJK (p.ej. oraciones o palabras compuestas):`);
    mismatches.forEach(m => {
      console.log(`   * ${m.hanzi} ("${m.oldPinyin}") -> [${m.newPinyin.join(', ')}]`);
    });
  } else {
    console.log(`\n✨ ¡El 100% de las tarjetas coinciden exactamente carácter por carácter!`);
  }

  if (!isApply) {
    console.log(`\nℹ️  Para aplicar los cambios a Firestore ejecuta:`);
    console.log(`    node scripts/migrate-pinyin-chunks.mjs --apply\n`);
    process.exit(0);
  }

  console.log(`\nAplicando cambios a ${toMigrate.length} tarjetas en Firestore...`);
  const CHUNK_SIZE = 450;
  for (let i = 0; i < toMigrate.length; i += CHUNK_SIZE) {
    const batchList = toMigrate.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    batchList.forEach(item => {
      const docRef = doc(db, 'flashcards', item.id);
      batch.update(docRef, { pinyin: item.newPinyin });
    });
    await batch.commit();
    console.log(`  Lote ${Math.floor(i / CHUNK_SIZE) + 1} guardado (${batchList.length} tarjetas)`);
  }

  console.log("\n✅ ¡Migración completada con éxito en Firestore!");
  process.exit(0);
}

run().catch(err => {
  console.error("Error durante la migración:", err);
  process.exit(1);
});
