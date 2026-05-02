/**
 * Build All Locales — Generates locale files for: es, fr, de, tr, ru, zh, hi
 * Reads en.json as source and applies multi-language translation dictionary.
 * Usage: node scripts/build-all-locales.js
 */
const fs = require('fs');
const path = require('path');

const LANGS = ['es', 'fr', 'de', 'tr', 'ru', 'zh', 'hi'];
const LANG_NAMES = ['Spanish', 'French', 'German', 'Turkish', 'Russian', 'Chinese', 'Hindi'];

// Load translation dictionary
const dataPath = path.join(__dirname, 'translations-all.json');
if (!fs.existsSync(dataPath)) {
  console.error('❌ Translation data not found:', dataPath);
  process.exit(1);
}

const D = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
console.log(`📚 Loaded ${Object.keys(D).length} translation entries`);

// Read source English locale
const enPath = path.join(__dirname, '..', 'client', 'src', 'i18n', 'locales', 'en.json');
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const outDir = path.dirname(enPath);

/**
 * Recursively translate all string values in an object tree.
 */
function translateObj(obj, langIdx) {
  if (typeof obj === 'string') {
    if (D[obj] && D[obj][langIdx]) return D[obj][langIdx];
    // Try stripping leading emoji
    const m = obj.match(/^([\p{Emoji_Presentation}\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]+\s?)/u);
    if (m) {
      const clean = obj.slice(m[0].length);
      if (D[clean] && D[clean][langIdx]) return m[0] + D[clean][langIdx];
    }
    return obj;
  }
  if (Array.isArray(obj)) return obj.map(v => translateObj(v, langIdx));
  if (typeof obj === 'object' && obj !== null) {
    const result = {};
    for (const [k, v] of Object.entries(obj)) result[k] = translateObj(v, langIdx);
    return result;
  }
  return obj;
}

function countLeafs(o) {
  let c = 0;
  for (const k in o) {
    if (typeof o[k] === 'object' && o[k] !== null && !Array.isArray(o[k])) c += countLeafs(o[k]);
    else if (typeof o[k] === 'string') c++;
  }
  return c;
}

function countDiff(a, b) {
  let c = 0;
  for (const k in a) {
    if (typeof a[k] === 'object' && a[k] !== null && !Array.isArray(a[k])) {
      c += countDiff(a[k], b[k] || {});
    } else if (typeof a[k] === 'string' && b && b[k] !== a[k]) {
      c++;
    }
  }
  return c;
}

const total = countLeafs(en);
console.log(`\n🌐 Generating ${LANGS.length} locale files from ${total} source strings...\n`);

for (let i = 0; i < LANGS.length; i++) {
  const translated = translateObj(en, i);
  const outPath = path.join(outDir, `${LANGS[i]}.json`);
  fs.writeFileSync(outPath, JSON.stringify(translated, null, 2) + '\n');
  const done = countDiff(en, translated);
  const pct = ((done / total) * 100).toFixed(1);
  console.log(`  ✅ ${LANGS[i]} (${LANG_NAMES[i]}) — ${done}/${total} (${pct}%)`);
}

console.log('\n✅ All locale files generated successfully!');
