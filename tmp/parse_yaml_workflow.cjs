const fs = require('fs');
const yaml = require('js-yaml');

const filePath = '.github/workflows/build-manual.yml';

try {
    const doc = yaml.load(fs.readFileSync(filePath, 'utf8'));
    if (!doc || typeof doc !== 'object') {
        console.error('yaml-parse-fail: empty/invalid doc');
        process.exit(1);
    }
    const jobs = doc.jobs ? Object.keys(doc.jobs) : [];
    const on = doc.on ? Object.keys(doc.on) : [];
    console.log('yaml-parse-ok');
    console.log('on', on.join(','));
    console.log('jobs', jobs.join(','));
} catch (e) {
    console.error('yaml-parse-fail');
    console.error(e && e.message ? e.message : String(e));
    process.exit(1);
}
