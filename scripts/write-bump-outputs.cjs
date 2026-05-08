const fs = require("fs");

const inputPath = process.argv[2];
if (!inputPath) {
    throw new Error("Usage: node write-bump-outputs.cjs <bump.json>");
}

const raw = fs.readFileSync(inputPath, "utf8");
const m = JSON.parse(raw);

const appVersion = m.app_version ?? m.appVersion;
const buildNumber = m.build_number ?? m.buildNumber;
const releaseTag = m.release_tag ?? m.releaseTag;

if (!appVersion || !buildNumber || !releaseTag) {
    throw new Error(
        `Missing fields in ${inputPath}. Got keys: ${Object.keys(m).join(", ")}`
    );
}

process.stdout.write(`app_version=${appVersion}\n`);
process.stdout.write(`build_number=${buildNumber}\n`);
process.stdout.write(`release_tag=${releaseTag}\n`);
