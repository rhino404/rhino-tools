#!/usr/bin/env node
/**
 * flip-coming-soon.mjs
 *
 * Removes `comingSoon: true` from any pool's featured block, then regenerates
 * the manifest + pages. Called by the scheduled GitHub Action on July 1 so the
 * "Coming Soon" section becomes a "What's New" entry automatically.
 *
 *   node data-pipeline/flip-coming-soon.mjs          # flip + regenerate
 *   node data-pipeline/flip-coming-soon.mjs --check  # report only, no writes
 *
 * Exit code 0 = flipped (or would flip); 1 = nothing to flip.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const checkOnly = process.argv.includes('--check');

const pp = path.join(__dirname, 'pools.json');
const doc = JSON.parse(fs.readFileSync(pp, 'utf8'));

const toFlip = Object.entries(doc.pools)
  .filter(([, p]) => p.featured?.comingSoon === true)
  .map(([key]) => key);

if (!toFlip.length) {
  console.log('[flip-coming-soon] nothing to flip — no pools have comingSoon: true.');
  process.exit(1);
}

console.log(`[flip-coming-soon] flipping ${toFlip.length} pool(s): ${toFlip.join(', ')}`);

if (checkOnly) {
  console.log('[flip-coming-soon] --check: no changes written.');
  process.exit(0);
}

for (const key of toFlip) delete doc.pools[key].featured.comingSoon;
fs.writeFileSync(pp, JSON.stringify(doc, null, 2) + '\n');

execFileSync('node', [path.join(__dirname, 'generate-manifest.mjs')], { stdio: 'inherit' });
execFileSync('node', [path.join(__dirname, 'generate-pages.mjs')], { stdio: 'inherit' });
console.log('[flip-coming-soon] done. Commit the diff to deploy.');
