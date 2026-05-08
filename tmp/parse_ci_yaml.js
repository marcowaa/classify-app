const fs = require('fs');

const filePath = '.github/workflows/ci.yml';
const txt = fs.readFileSync(filePath, 'utf8');

function tryParse(label, parserFn) {
  try {
    parserFn(txt);
    console.log(`${label}: YAML_OK`);
    return true;
  } catch (e) {
    console.error(`${label}: YAML_PARSE_FAILED`);
    if (e && e.mark) {
      console.error('line:', e.mark.line, 'col:', e.mark.column);
    }
    if (e && e.message) console.error('message:', e.message);
    return false;
  }
}

const yaml1 = tryParse('yaml', (t) => {
  const yaml = require('yaml');
  yaml.parse(t);
});

if (yaml1) process.exit(0);

const yaml2 = tryParse('js-yaml', (t) => {
  const jsYaml = require('js-yaml');
  jsYaml.load(t);
});

if (!yaml2) process.exit(1);
