#!/usr/bin/env node
// @ts-check
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
    const args = {};
    for (let index = 0; index < argv.length; index += 1) {
        const current = argv[index];
        const next = argv[index + 1];
        if (current === '--input' && next) {
            args.input = next;
            index += 1;
        } else if (current === '--output' && next) {
            args.output = next;
            index += 1;
        }
    }
    return args;
}

/** @param {string} dir */
function listFiles(dir) {
    /** @type {string[]} */
    const files = [];
    /** @param {string} currentDir */
    const walk = (currentDir) => {
        for (const entry of fs.readdirSync(currentDir)) {
            const full = path.join(currentDir, entry);
            const stat = fs.statSync(full);
            if (stat.isDirectory()) {
                walk(full);
            } else {
                files.push(path.relative(dir, full).replace(/\\/g, '/'));
            }
        }
    };

    if (fs.existsSync(dir)) {
        walk(dir);
    }

    return files;
}

function main() {
    const { input, output } = parseArgs(process.argv.slice(2));
    if (!input) {
        throw new Error('Missing --input <dir>');
    }
    if (!output) {
        throw new Error('Missing --output <file>');
    }

    const manifest = {
        generatedAt: new Date().toISOString(),
        source: input,
        files: listFiles(input),
    };

    fs.writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
    process.stdout.write(`Wrote release manifest to ${output}\n`);
}

main();
