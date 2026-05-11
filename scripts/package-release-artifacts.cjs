#!/usr/bin/env node
// @ts-check
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = process.cwd();
const artifactsDir = path.join(root, 'artifacts');
const releaseDir = path.join(root, 'release-bundle');
const manifestPath = path.join(root, 'release-manifest.json');

/** @param {string} dirPath */
function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

/** @param {string} filePath */
function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/** @param {string} filePath */
function sha256(filePath) {
    const hash = crypto.createHash('sha256');
    const buffer = fs.readFileSync(filePath);
    hash.update(buffer);
    return hash.digest('hex');
}

/** @param {string} source @param {string} target */
function copyRecursive(source, target) {
    const stat = fs.statSync(source);
    if (stat.isDirectory()) {
        ensureDir(target);
        for (const entry of fs.readdirSync(source)) {
            copyRecursive(path.join(source, entry), path.join(target, entry));
        }
        return;
    }

    ensureDir(path.dirname(target));
    fs.copyFileSync(source, target);
}

/** @param {string} sourceRoot @param {string} targetRoot */
function flattenArtifacts(sourceRoot, targetRoot) {
    if (!fs.existsSync(sourceRoot)) {
        return;
    }

    for (const entry of fs.readdirSync(sourceRoot)) {
        const sourceEntry = path.join(sourceRoot, entry);
        const stat = fs.statSync(sourceEntry);
        if (stat.isDirectory()) {
            for (const nested of fs.readdirSync(sourceEntry)) {
                copyRecursive(path.join(sourceEntry, nested), path.join(targetRoot, nested));
            }
        } else {
            copyRecursive(sourceEntry, path.join(targetRoot, entry));
        }
    }
}

/** @param {string} targetRoot */
function writeChecksums(targetRoot) {
    /** @type {string[]} */
    const files = [];
    /** @param {string} dir */
    const walk = (dir) => {
        for (const entry of fs.readdirSync(dir)) {
            const full = path.join(dir, entry);
            const stat = fs.statSync(full);
            if (stat.isDirectory()) {
                walk(full);
            } else if (entry !== 'checksums.sha256') {
                files.push(full);
            }
        }
    };

    walk(targetRoot);

    const lines = files
        .map((filePath) => {
            const relative = path.relative(targetRoot, filePath).replace(/\\/g, '/');
            return `${sha256(filePath)}  ${relative}`;
        })
        .join('\n');

    fs.writeFileSync(path.join(targetRoot, 'checksums.sha256'), `${lines}\n`);
}

/** @param {string} targetRoot */
function writeArtifactChecksums(targetRoot) {
    const apkPath = path.join(targetRoot, 'app-release.apk');
    const aabPath = path.join(targetRoot, 'app-release.aab');

    if (!fs.existsSync(apkPath)) throw new Error(`Missing artifact for checksum: ${apkPath}`);
    if (!fs.existsSync(aabPath)) throw new Error(`Missing artifact for checksum: ${aabPath}`);

    // deploy-release.sh expects:
    // - app-release.apk.sha256 content with "sha app-release.apk"
    // - app-release.aab.sha256 content with "sha app-release.aab"
    const apkSha = sha256(apkPath);
    const aabSha = sha256(aabPath);

    fs.writeFileSync(path.join(targetRoot, 'app-release.apk.sha256'), `${apkSha}  app-release.apk\n`);
    fs.writeFileSync(path.join(targetRoot, 'app-release.aab.sha256'), `${aabSha}  app-release.aab\n`);
}

function main() {
    if (!fs.existsSync(manifestPath)) {
        throw new Error(`Missing release manifest: ${manifestPath}`);
    }

    ensureDir(releaseDir);

    const manifest = readJson(manifestPath);
    const meta = {
        version: manifest.version,
        buildNumber: manifest.buildNumber,
        releaseTag: manifest.releaseTag,
        generatedAt: manifest.generatedAt,
    };

    fs.writeFileSync(path.join(releaseDir, 'release-manifest.json'), `${JSON.stringify(meta, null, 2)}\n`);

    flattenArtifacts(artifactsDir, releaseDir);

    const possibleWebDir = path.join(releaseDir, 'flutter-web');
    if (fs.existsSync(possibleWebDir) && fs.statSync(possibleWebDir).isDirectory()) {
        flattenArtifacts(possibleWebDir, releaseDir);
        fs.rmSync(possibleWebDir, { recursive: true, force: true });
    }

    writeChecksums(releaseDir);
    writeArtifactChecksums(releaseDir);
    process.stdout.write(`Packaged release bundle at ${releaseDir}\n`);
}

main();
