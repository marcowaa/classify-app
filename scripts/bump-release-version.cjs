#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const packageJsonPath = path.join(root, 'package.json');
const pubspecPath = path.join(root, 'appsflutter', 'pubspec.yaml');
const releaseManifestPath = path.join(root, 'release-manifest.json');
const changelogPath = path.join(root, 'CHANGELOG.md');

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
    fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function readText(filePath) {
    return fs.readFileSync(filePath, 'utf8');
}

function writeText(filePath, value) {
    fs.writeFileSync(filePath, value);
}

function parseSemver(version) {
    const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
    if (!match) {
        throw new Error(`Invalid semantic version: ${version}`);
    }

    return {
        major: Number(match[1]),
        minor: Number(match[2]),
        patch: Number(match[3]),
    };
}

function formatSemver(version) {
    return `${version.major}.${version.minor}.${version.patch}`;
}

function bumpPatch(version) {
    return {
        major: version.major,
        minor: version.minor,
        patch: version.patch + 1,
    };
}

function bumpBuildNumber(version) {
    const current = Number(version);
    if (Number.isNaN(current)) {
        return 1;
    }
    return current + 1;
}

function updatePubspecVersion(content, nextVersion, buildNumber) {
    return content.replace(/^version:\s*.+$/m, `version: ${nextVersion}+${buildNumber}`);
}

function ensureChangelogEntry(nextVersion) {
    const stamp = new Date().toISOString();
    const entry = `\n## ${nextVersion}\n- Automated release generated at ${stamp}\n`;
    if (!fs.existsSync(changelogPath)) {
        writeText(changelogPath, `# Changelog${entry}\n`);
        return;
    }

    const existing = readText(changelogPath);
    if (existing.includes(`## ${nextVersion}`)) {
        return;
    }

    writeText(changelogPath, `${existing.trimEnd()}${entry}\n`);
}

function main() {
    const args = new Set(process.argv.slice(2));
    const shouldWrite = args.has('--write');
    const shouldPrintJson = args.has('--json');

    const packageJson = readJson(packageJsonPath);
    const currentVersion = parseSemver(packageJson.version);
    const nextVersion = bumpPatch(currentVersion);
    const nextVersionString = formatSemver(nextVersion);

    const pubspecContent = readText(pubspecPath);
    const pubspecVersionMatch = /^version:\s*(.+)$/m.exec(pubspecContent);
    const currentBuildNumber = pubspecVersionMatch ? pubspecVersionMatch[1].split('+')[1] || '1' : '1';
    const nextBuildNumber = bumpBuildNumber(currentBuildNumber);

    const releaseManifest = {
        version: nextVersionString,
        buildNumber: String(nextBuildNumber),
        releaseTag: `v${nextVersionString}`,
        generatedAt: new Date().toISOString(),
    };

    if (shouldWrite) {
        packageJson.version = nextVersionString;
        writeJson(packageJsonPath, packageJson);
        writeText(pubspecPath, updatePubspecVersion(pubspecContent, nextVersionString, nextBuildNumber));
        writeJson(releaseManifestPath, releaseManifest);
        ensureChangelogEntry(nextVersionString);
    }

    if (shouldPrintJson) {
        process.stdout.write(`${JSON.stringify({
            changed: shouldWrite,
            app_version: nextVersionString,
            build_number: String(nextBuildNumber),
            release_tag: `v${nextVersionString}`,
        })}\n`);
    } else {
        process.stdout.write(`${nextVersionString}+${nextBuildNumber}\n`);
    }
}

main();
