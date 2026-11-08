export interface CharacterTone {
  char: string;
  charIndex: number;
  syllable: string;
  cleanSyllable?: string;
  tone: number;
}

export const TONE_LABELS: Record<number, string> = {
  1: '1° Tono ( ¯ )',
  2: '2° Tono ( ´ )',
  3: '3° Tono ( ˇ )',
  4: '4° Tono ( ˋ )',
  5: 'Neutro ( · )'
};

// Standard Mandarin syllables pool without tone marks for distractors
export const COMMON_PINYIN_SYLLABLES: string[] = [
  'ba', 'pa', 'ma', 'fa', 'da', 'ta', 'na', 'la', 'ga', 'ka', 'ha', 'za', 'ca', 'sa', 'zha', 'cha', 'sha',
  'bo', 'po', 'mo', 'fo', 'de', 'te', 'ne', 'le', 'ge', 'ke', 'he', 'ze', 'ce', 'se', 'zhe', 'che', 'she', 're',
  'me', 'er', 'zi', 'ci', 'si', 'zhi', 'chi', 'shi', 'ri',
  'bi', 'pi', 'mi', 'di', 'ti', 'ni', 'li', 'ji', 'qi', 'xi', 'yi',
  'bu', 'pu', 'mu', 'fu', 'du', 'tu', 'nu', 'lu', 'gu', 'ku', 'hu', 'zu', 'cu', 'su', 'zhu', 'chu', 'shu', 'ru', 'wu',
  'nv', 'lv', 'ju', 'qu', 'xu', 'yu',
  'bai', 'pai', 'mai', 'dai', 'tai', 'nai', 'lai', 'gai', 'kai', 'hai', 'zai', 'cai', 'sai', 'zhai', 'chai', 'shai',
  'bei', 'pei', 'mei', 'fei', 'dei', 'tei', 'nei', 'lei', 'gei', 'kei', 'hei', 'zei', 'sei', 'zhei', 'shei',
  'bao', 'pao', 'mao', 'dao', 'tao', 'nao', 'lao', 'gao', 'kao', 'hao', 'zao', 'cao', 'sao', 'zhao', 'chao', 'shao', 'rao',
  'dou', 'tou', 'nou', 'lou', 'gou', 'kou', 'hou', 'zou', 'cou', 'sou', 'zhou', 'chou', 'shou', 'rou', 'you',
  'ban', 'pan', 'man', 'fan', 'dan', 'tan', 'nan', 'lan', 'gan', 'kan', 'han', 'zan', 'can', 'san', 'zhan', 'chan', 'shan', 'ran',
  'ben', 'pen', 'men', 'fen', 'den', 'nen', 'gen', 'ken', 'hen', 'zen', 'cen', 'sen', 'zhen', 'chen', 'shen', 'ren', 'wen',
  'bang', 'pang', 'mang', 'fang', 'dang', 'tang', 'nang', 'lang', 'gang', 'kang', 'hang', 'zang', 'cang', 'sang', 'zhang', 'chang', 'shang', 'rang',
  'beng', 'peng', 'meng', 'feng', 'deng', 'teng', 'neng', 'leng', 'geng', 'keng', 'heng', 'zeng', 'ceng', 'seng', 'zheng', 'cheng', 'sheng', 'reng',
  'dong', 'tong', 'nong', 'long', 'gong', 'kong', 'hong', 'zong', 'cong', 'song', 'zhong', 'chong', 'rong', 'yong',
  'biao', 'piao', 'miao', 'diao', 'tiao', 'niao', 'liao', 'jiao', 'qiao', 'xiao', 'yao',
  'bie', 'pie', 'mie', 'die', 'tie', 'nie', 'lie', 'jie', 'qie', 'xie', 'ye',
  'bian', 'pian', 'mian', 'dian', 'tian', 'nian', 'lian', 'jian', 'qian', 'xian', 'yan',
  'bin', 'pin', 'min', 'nin', 'lin', 'jin', 'qin', 'xin', 'yin',
  'bing', 'ping', 'ming', 'ding', 'ting', 'ning', 'ling', 'jing', 'qing', 'xing', 'ying',
  'duan', 'tuan', 'nuan', 'luan', 'guan', 'kuan', 'huan', 'zuan', 'cuan', 'suan', 'zhuan', 'chuan', 'shuan', 'ruan', 'wan',
  'dun', 'tun', 'lun', 'gun', 'kun', 'hun', 'zun', 'cun', 'sun', 'zhun', 'chun', 'shun', 'run'
];

// Base vowels including tone-marked vowels in NFC
const VOWEL_CHARS = 'aeiouüvāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜAEIOUÜVĀÁǍÀĒÉĚÈĪÍǏÌŌÓǑÒŪÚǓÙǕǗǙǛ';

// Regex that matches a single Mandarin pinyin syllable
const PINYIN_SYLLABLE_REGEX = new RegExp(
  '(?:zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?' +
  '(?:' +
    // Finals ending in ng (only if not followed by a vowel)
    '(?:[iuüv]?[aāáǎà][n][g]|[iīíǐìuūúǔù]?[eēéěè][n][g]|[iīíǐì][n][g]|[i]?[oōóǒò][n][g])(?![\\u0300-\\u036f]*[' + VOWEL_CHARS + '])|' +
    // Finals ending in n (only if not followed by a vowel)
    '(?:[iuüv]?[aāáǎà][n]|[uūúǔù]?[eēéěè][n]|[iīíǐìuūúǔùüǖǘǚǜv][n])(?![\\u0300-\\u036f]*[' + VOWEL_CHARS + '])|' +
    // Special 'er' final (only if r is not followed by a vowel)
    '[eēéěè][r](?![\\u0300-\\u036f]*[' + VOWEL_CHARS + '])|' +
    // Multi-vowel finals (diphthongs/triphthongs)
    '[i][aāáǎà][oōóǒò]|[u][aāáǎà][iīíǐì]|' +
    '[aāáǎà][iīíǐì]|[eēéěè][iīíǐì]|[aāáǎà][oōóǒò]|[oōóǒò][uūúǔù]|' +
    '[i][aāáǎà]|[i][eēéěè]|[u][aāáǎà]|[u][oōóǒò]|[uüv][eēéěè]|' +
    '[i][uūúǔù]|[u][iīíǐì]|' +
    // Single-vowel finals
    '[' + VOWEL_CHARS + ']' +
  ')[1-5]?',
  'gi'
);

export const usePinyin = () => {
  /**
   * Normalizes a pinyin input (string or string array) into a clean string array.
   */
  const normalizePinyinArray = (pinyin?: string | string[], hanzi?: string): string[] => {
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
  };

  /**
   * Formats pinyin for UI display as a space-separated readable string.
   */
  const formatPinyinDisplay = (pinyin?: string | string[]): string => {
    if (!pinyin) return '';
    if (Array.isArray(pinyin)) {
      return pinyin.filter(Boolean).join(' ');
    }
    return String(pinyin).trim();
  };

  /**
   * Removes tone marks from a pinyin string while keeping base characters (including ü).
   */
  const stripToneMarks = (pinyin?: string | string[]): string => {
    if (!pinyin) return '';
    const raw = Array.isArray(pinyin) ? pinyin.join(' ') : String(pinyin);
    return raw
      .normalize('NFD')
      .replace(/[\u0304\u0301\u030C\u0300]/g, '')
      .normalize('NFC')
      .replace(/([a-zA-ZüÜ]+)[1-5]/g, '$1');
  };

  /**
   * Detects the Mandarin tone (1-5) of a single pinyin syllable.
   */
  const getSyllableTone = (syllable: string): number => {
    if (!syllable) return 5;
    const nfd = syllable.normalize('NFD');
    if (nfd.includes('\u0304')) return 1; // Macron (¯)
    if (nfd.includes('\u0301')) return 2; // Acute (´)
    if (nfd.includes('\u030C')) return 3; // Caron (ˇ)
    if (nfd.includes('\u0300')) return 4; // Grave (`)

    const numMatch = syllable.match(/([1-5])$/);
    if (numMatch) return Number(numMatch[1]);

    return 5; // Neutral tone
  };

  /**
   * Splits a pinyin string (space-separated or concatenated) into individual syllables.
   */
  const splitPinyinSyllables = (pinyin?: string | string[]): string[] => {
    if (!pinyin) return [];
    if (Array.isArray(pinyin)) {
      return pinyin.flatMap(p => splitPinyinSyllables(p));
    }
    const normalized = pinyin.trim().normalize('NFC');
    if (!normalized) return [];

    // First split by spaces, apostrophes, or hyphens
    const roughTokens = normalized.split(/[\s'’\-]+/).filter(Boolean);
    const syllables: string[] = [];

    for (const token of roughTokens) {
      const matches = token.match(PINYIN_SYLLABLE_REGEX);
      if (matches && matches.length > 0) {
        syllables.push(...matches);
      } else {
        syllables.push(token);
      }
    }

    return syllables;
  };

  /**
   * Extracts each Chinese character from `hanzi` and pairs it with its corresponding tone (1-5).
   */
  const extractCardTones = (hanzi?: string, pinyin?: string | string[]): CharacterTone[] => {
    if (!hanzi || !pinyin) return [];

    const chars = Array.from(hanzi);
    const cjkIndices = chars.reduce<number[]>((acc, char, idx) => {
      if (/[\u4e00-\u9fff]/.test(char)) acc.push(idx);
      return acc;
    }, []);

    if (cjkIndices.length === 0) return [];

    const syllables = normalizePinyinArray(pinyin, hanzi);

    const result: CharacterTone[] = [];
    cjkIndices.forEach((charIdx, i) => {
      const char = chars[charIdx];
      const syllable = syllables[i] || '';
      const tone = getSyllableTone(syllable);
      const cleanSyllable = stripToneMarks(syllable).toLowerCase();
      result.push({
        char,
        charIndex: charIdx,
        syllable,
        cleanSyllable,
        tone
      });
    });

    return result;
  };

  /**
   * Extracts all unique clean syllables present across a list of flashcards.
   */
  const extractDeckSyllables = (cards: any[] = []): string[] => {
    const syllables = new Set<string>();
    for (const c of cards) {
      if (c?.pinyin) {
        const syls = splitPinyinSyllables(c.pinyin);
        for (const s of syls) {
          const clean = stripToneMarks(s).toLowerCase().trim();
          if (clean) syllables.add(clean);
        }
      }
    }
    return Array.from(syllables);
  };

  /**
   * Generates unique distractor syllables that are strictly different from targetSyllable.
   */
  const getSyllableDistractors = (
    targetSyllable: string,
    availableCards: any[] = [],
    count = 3
  ): string[] => {
    const normalizedTarget = (targetSyllable || '').trim().toLowerCase();
    const deckSyllables = extractDeckSyllables(availableCards);

    // Combine syllables found in the deck with common mandarin syllables
    const combinedPool = Array.from(new Set([...deckSyllables, ...COMMON_PINYIN_SYLLABLES]))
      .filter(s => s && s.toLowerCase() !== normalizedTarget);

    // Fisher-Yates shuffle
    const shuffled = [...combinedPool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, count);
  };

  /**
   * Converts a pinyin string or array with tone marks to plain syllables without tone marks.
   */
  const convertPinyinToPlain = (pinyin?: string | string[], hanzi?: string): string[] => {
    const syllables = normalizePinyinArray(pinyin, hanzi);
    return syllables.map(s => stripToneMarks(s).toLowerCase().trim()).filter(Boolean);
  };

  /**
   * Converts a pinyin string or array with tone marks to numeric syllables (e.g. xiao3 peng2 you5).
   */
  const convertPinyinToNum = (pinyin?: string | string[], hanzi?: string): string[] => {
    const syllables = normalizePinyinArray(pinyin, hanzi);
    return syllables.map(s => {
      const plain = stripToneMarks(s).toLowerCase().trim();
      const tone = getSyllableTone(s);
      return plain ? `${plain}${tone}` : '';
    }).filter(Boolean);
  };

  return {
    TONE_LABELS,
    COMMON_PINYIN_SYLLABLES,
    normalizePinyinArray,
    formatPinyinDisplay,
    stripToneMarks,
    getSyllableTone,
    splitPinyinSyllables,
    extractCardTones,
    extractDeckSyllables,
    getSyllableDistractors,
    convertPinyinToPlain,
    convertPinyinToNum
  };
};
