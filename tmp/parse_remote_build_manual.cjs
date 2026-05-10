const { execSync } = require('child_process');
const yaml = require('js-yaml');

const content = execSync(
    "git show origin/main:.github/workflows/build-manual.yml",
    { encoding: 'utf8' }
);

try {
    const doc = yaml.load(content);
    if (!doc || typeof doc !== 'object') throw new Error('doc-invalid');
    console.log('parse-ok');
    console.log('on-keys', Object.keys(doc.on || {}));
    console.log('jobs', Object.keys(doc.jobs || {}));
} catch (e) {
    console.error('parse-fail');
    console.error(e && e.message ? e.message : String(e));
    process.exit(1);
}
