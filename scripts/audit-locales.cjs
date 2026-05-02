const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'client', 'src', 'i18n', 'locales');
const localeFiles = ['ar.json', 'en.json', 'pt.json', 'es.json', 'fr.json', 'de.json', 'tr.json', 'ru.json', 'zh.json', 'hi.json'];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function flatten(obj, prefix = '', out = {}) {
  if (obj === null || obj === undefined) return out;
  if (typeof obj !== 'object' || Array.isArray(obj)) {
    out[prefix] = obj;
    return out;
  }

  const keys = Object.keys(obj);
  if (keys.length === 0 && prefix) {
    out[prefix] = obj;
    return out;
  }

  for (const key of keys) {
    const next = prefix ? `${prefix}.${key}` : key;
    flatten(obj[key], next, out);
  }
  return out;
}

function extractPlaceholders(value) {
  if (typeof value !== 'string') return [];
  const matches = value.match(/\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}/g) || [];
  return matches
    .map((m) => m.replace(/\{|\}|\s/g, ''))
    .sort();
}

function sameArray(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function run() {
  const maps = {};
  for (const file of localeFiles) {
    const p = path.join(localesDir, file);
    if (!fs.existsSync(p)) {
      throw new Error(`Missing locale file: ${file}`);
    }
    const json = readJson(p);
    maps[file] = flatten(json);
  }

  const baseFile = 'en.json';
  const base = maps[baseFile];
  const baseKeys = Object.keys(base).sort();

  const report = {
    generatedAt: new Date().toISOString(),
    baseLocale: baseFile,
    locales: {},
    summary: {
      totalBaseKeys: baseKeys.length,
      localesWithMissingKeys: 0,
      localesWithExtraKeys: 0,
      localesWithPlaceholderMismatches: 0,
    },
  };

  for (const file of localeFiles) {
    if (file === baseFile) continue;
    const current = maps[file];
    const currentKeys = Object.keys(current);

    const missing = baseKeys.filter((k) => !(k in current));
    const extra = currentKeys.filter((k) => !(k in base)).sort();

    const placeholderMismatches = [];
    for (const key of baseKeys) {
      if (!(key in current)) continue;
      const pBase = extractPlaceholders(base[key]);
      const pCur = extractPlaceholders(current[key]);
      if (!sameArray(pBase, pCur)) {
        placeholderMismatches.push({ key, base: pBase, locale: pCur });
      }
    }

    report.locales[file] = {
      keyCount: currentKeys.length,
      missingCount: missing.length,
      extraCount: extra.length,
      placeholderMismatchCount: placeholderMismatches.length,
      missing: missing.slice(0, 200),
      extra: extra.slice(0, 200),
      placeholderMismatches: placeholderMismatches.slice(0, 200),
    };

    if (missing.length > 0) report.summary.localesWithMissingKeys += 1;
    if (extra.length > 0) report.summary.localesWithExtraKeys += 1;
    if (placeholderMismatches.length > 0) report.summary.localesWithPlaceholderMismatches += 1;
  }

  const outputPath = path.join(__dirname, '..', 'docs', 'I18N_AUDIT_REPORT.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  console.log(`Locale audit complete. Report: ${outputPath}`);
  console.log(JSON.stringify(report.summary, null, 2));
}

run();
