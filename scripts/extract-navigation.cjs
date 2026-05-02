const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', 'client', 'src');

function walk(dir) {
  const files = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      files.push(...walk(full));
    } else if (/\.(tsx|ts|jsx|js)$/.test(name)) {
      files.push(full);
    }
  }
  return files;
}

const pages = walk(root);

const result = {};

for (const file of pages) {
  const rel = path.relative(root, file);
  const content = fs.readFileSync(file, 'utf8');
  const navMatches = [...content.matchAll(/navigate\(\s*['\"]([^'\"]+)['\"]\s*\)/g)];
  const linkMatches = [...content.matchAll(/<Link\s+[^>]*href=\s*['\"]([^'\"]+)['\"]/g)];
  const hrefMatches = [...content.matchAll(/href=\s*['\"](\/[^'\"]+)['\"]/g)];

  const navs = navMatches.map(m => m[1]);
  const links = linkMatches.map(m => m[1]);
  const hrefs = hrefMatches.map(m => m[1]);

  const items = [...new Set([...navs, ...links, ...hrefs])].filter(x => x.startsWith('/'));
  if (items.length > 0) {
    result[rel] = items;
  }
}

const out = Object.entries(result).map(([file, links]) => ({ file, links }));
fs.writeFileSync(path.resolve(__dirname, '..', 'PAGE_NAVIGATION_LINKS.json'), JSON.stringify(out, null, 2));
console.log('Extracted navigation links for', out.length, 'files');
