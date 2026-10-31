#!/usr/bin/env node
// Replaces pasted hex colors in Tailwind classes with the named PhineWash tokens.
//   bg-[#0F1E2B]  ->  bg-pw-ink        text-[#F7F1E8]/70  ->  text-pw-cream/70
// Run from the project root:
//   node scripts/tokenize-colors.mjs --dry     (only report, change nothing)
//   node scripts/tokenize-colors.mjs           (rewrite the files)
//   node scripts/tokenize-colors.mjs --contrast   (ALSO lift too-faint dark text on cream: ink/50, /60, /65 -> /70,
//                                                  which measures 5.96:1 instead of 3.2 to 4.3:1. Run it after the first pass.)
// Safe to run twice (a second run finds nothing). Needs resources/css/polish.css to be imported first.
// Near-duplicate colors are merged on purpose (the two greens and the two reds), so there is one color per job.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const MAP = {
    '0F1E2B': 'pw-ink',
    'F7F1E8': 'pw-cream',
    'F0A98B': 'pw-peach',
    'A9D3E6': 'pw-sky',
    '0B1F26': 'pw-navy',
    'A5532F': 'pw-rust',
    '8A3F1F': 'pw-rust-deep',
    'C96F48': 'pw-clay',
    '5C8CA8': 'pw-steel',
    '1F4A63': 'pw-deep',
    'EFE7D8': 'pw-linen',
    '2F7D52': 'pw-ok',
    '2F7D5B': 'pw-ok', // merged
    '1F5A40': 'pw-ok-deep',
    'C9822A': 'pw-warn',
    'B33A1A': 'pw-danger',
    'C4441F': 'pw-danger', // merged
};

const dry = process.argv.includes('--dry');
const contrast = process.argv.includes('--contrast');
let lifted = 0;
const roots = ['resources/js', 'resources/views'];
const exts = new Set(['.tsx', '.ts', '.jsx', '.php']);
const skip = new Set(['node_modules', 'wayfinder', 'actions', 'routes']); // generated folders
const re = /-\[#([0-9a-fA-F]{6})\]/g;

let files = 0;
let changed = 0;
let swaps = 0;
const left = new Map();

function walk(dir) {
    for (const name of readdirSync(dir)) {
        if (skip.has(name)) continue;
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (exts.has(extname(name))) handle(full);
    }
}

function handle(file) {
    files++;
    const before = readFileSync(file, 'utf8');
    let n = 0;
    let touched = false;

    // Step 1: pasted hex colors -> named tokens.
    let after = before.replace(re, (whole, hex) => {
        const token = MAP[hex.toUpperCase()];
        if (!token) {
            left.set(hex.toUpperCase(), (left.get(hex.toUpperCase()) ?? 0) + 1);
            return whole;
        }
        n++;
        return `-${token}`;
    });

    // Step 2 (only with --contrast): dark text on cream below 70% opacity is under the 4.5:1 minimum for small text.
    if (contrast) {
        after = after.replace(/text-pw-ink\/(50|60|65)\b/g, () => {
            lifted++;
            touched = true;
            return 'text-pw-ink/70';
        });
    }

    if (n > 0 || touched) {
        changed++;
        swaps += n;
        if (!dry) writeFileSync(file, after);
    }
}

for (const r of roots) {
    try {
        walk(r);
    } catch {
        /* folder missing: ignore */
    }
}

console.log(`${dry ? '[dry run] ' : ''}${swaps} colors swapped in ${changed} of ${files} files.`);
if (contrast) console.log(`${lifted} faint text colors lifted to 70%.`);
if (left.size) {
    console.log('Hex colors with no token yet (left as they are):');
    for (const [hex, c] of [...left].sort((a, b) => b[1] - a[1])) console.log(`  #${hex}  x${c}`);
}
