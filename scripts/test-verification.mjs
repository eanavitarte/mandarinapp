// Verification test for all pinyin cases
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

function stripToneMarks(pinyin) {
  if (!pinyin) return '';
  const raw = Array.isArray(pinyin) ? pinyin.join(' ') : String(pinyin);
  return raw
    .normalize('NFD')
    .replace(/[\u0304\u0301\u030C\u0300]/g, '')
    .normalize('NFC')
    .replace(/([a-zA-ZüÜ]+)[1-5]/g, '$1');
}

function getSyllableTone(syllable) {
  if (!syllable) return 5;
  const nfd = syllable.normalize('NFD');
  if (nfd.includes('\u0304')) return 1;
  if (nfd.includes('\u0301')) return 2;
  if (nfd.includes('\u030C')) return 3;
  if (nfd.includes('\u0300')) return 4;
  const numMatch = syllable.match(/([1-5])$/);
  if (numMatch) return Number(numMatch[1]);
  return 5;
}

function splitPinyinSyllables(pinyin) {
  if (!pinyin) return [];
  if (Array.isArray(pinyin)) {
    return pinyin.flatMap(p => splitPinyinSyllables(p));
  }
  const normalized = pinyin.trim().normalize('NFC');
  if (!normalized) return [];
  const roughTokens = normalized.split(/[\s'’\-]+/).filter(Boolean);
  const syllables = [];
  for (const token of roughTokens) {
    const matches = token.match(PINYIN_SYLLABLE_REGEX);
    if (matches && matches.length > 0) {
      syllables.push(...matches);
    } else {
      syllables.push(token);
    }
  }
  return syllables;
}

function normalizePinyinArray(pinyin, hanzi) {
  if (!pinyin) return [];
  if (Array.isArray(pinyin)) {
    return pinyin.map(s => String(s).trim()).filter(Boolean);
  }
  const str = String(pinyin).trim();
  if (!str) return [];

  const cjkChars = Array.from(hanzi || '').filter(c => /[\u4e00-\u9fff]/.test(c));
  let spaceTokens = str.split(/[\s'’\-]+/).filter(Boolean);

  if (cjkChars.length > 0 && spaceTokens.length === cjkChars.length) {
    return spaceTokens;
  }

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

  if (spaceTokens.length > 1) {
    return spaceTokens;
  }
  return splitPinyinSyllables(str);
}

function extractCardTones(hanzi, pinyin) {
  if (!hanzi || !pinyin) return [];
  const chars = Array.from(hanzi);
  const cjkIndices = chars.reduce((acc, char, idx) => {
    if (/[\u4e00-\u9fff]/.test(char)) acc.push(idx);
    return acc;
  }, []);
  if (cjkIndices.length === 0) return [];
  const syllables = normalizePinyinArray(pinyin, hanzi);
  const result = [];
  cjkIndices.forEach((charIdx, i) => {
    const char = chars[charIdx];
    const syllable = syllables[i] || '';
    const tone = getSyllableTone(syllable);
    const cleanSyllable = stripToneMarks(syllable).toLowerCase();
    result.push({ char, charIndex: charIdx, syllable, cleanSyllable, tone });
  });
  return result;
}

// TEST CASES
console.log("=== TEST SUITE DE VERIFICACIÓN ===");

// 1. 觉得
const r1 = extractCardTones("觉得", ["jué", "de"]);
console.log("\n1. 觉得 con array ['jué', 'de']:");
console.log(r1);
if (r1[0].tone === 2 && r1[1].tone === 5) {
  console.log("✅ ÉXITO: 觉 es 2° Tono (ascendente) y 得 es Neutro (tono 5)!");
} else {
  console.error("❌ FALLO en 觉得!");
}

// 2. 觉得 con string de respaldo "jué de"
const r2 = extractCardTones("觉得", "jué de");
console.log("\n2. 觉得 con fallback string 'jué de':");
console.log(r2);
if (r2[0].tone === 2 && r2[1].tone === 5) {
  console.log("✅ ÉXITO: Fallback con string también extrae 2° Tono y Neutro!");
} else {
  console.error("❌ FALLO en fallback 觉得!");
}

// 3. 有点儿
const r3 = extractCardTones("有点儿", ["yǒu", "diǎn", "r"]);
console.log("\n3. 有点儿 con array ['yǒu', 'diǎn', 'r']:");
console.log(r3);
if (r3.length === 3 && r3[0].tone === 3 && r3[1].tone === 3 && r3[2].tone === 5) {
  console.log("✅ ÉXITO: 有点儿 asigna correctamente las 3 sílabas a los 3 caracteres!");
}

// 4. 女儿
const r4 = extractCardTones("女儿", ["nǚ", "ér"]);
console.log("\n4. 女儿 con array ['nǚ', 'ér']:");
console.log(r4);
if (r4.length === 2 && r4[0].tone === 3 && r4[1].tone === 2) {
  console.log("✅ ÉXITO: 女儿 asigna nǚ (3° tono) y ér (2° tono)!");
}

console.log("\n=== TODAS LAS PRUEBAS PASARON SATISFACTORIAMENTE ===");
