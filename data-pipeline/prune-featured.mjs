#!/usr/bin/env node
/**
 * prune-featured.mjs
 *
 * Removes expired `featured` blocks from pools.json so the homepage badge /
 * What's New entry stop showing. generate-pages.mjs is deterministic (no
 * wall-clock), so featuring is presence-based — this script is the wall-clock
 * half: run it on a schedule (or with --check in pool-watch) and it drops any
 * pool whose featured.until is in the past, then regenerates the manifest +
 * pages so the diff is ready to commit.
 *
 *   node data-pipeline/prune-featured.mjs          # prune + regenerate
 *   node data-pipeline/prune-featured.mjs --check   # report only, no writes
 *
 * Exit code 0 = nothing expired (or pruned cleanly); with --check, exits 0
 * always and just prints what WOULD be pruned.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const checkOnly = process.argv.includes('--check');
const today = new Date().toISOString().slice(0, 10);

const pp = path.join(__dirname, 'pools.json');
const doc = JSON.parse(fs.readFileSync(pp, 'utf8'));

const expired = [];
for (const [key, pool] of Object.entries(doc.pools)) {
  const f = pool.featured;
  if (f && f.until && f.until < today) expired.push({ key, until: f.until, badge: f.badge });
}

if (!expired.length) {
  console.log(`[prune-featured] nothing expired as of ${today}.`);
  process.exit(0);
}

console.log(`[prune-featured] ${expired.length} expired featured block(s) as of ${today}:`);
for (const e of expired) console.log(`  - ${e.key} (badge "${e.badge}", until ${e.until})`);

if (checkOnly) {
  console.log('[prune-featured] --check: no changes written. Run without --check to prune + regenerate.');
  process.exit(0);
}

for (const e of expired) delete doc.pools[e.key].featured;
fs.writeFileSync(pp, JSON.stringify(doc, null, 2) + '\n');
console.log('[prune-featured] removed expired blocks; regenerating manifest + pages...');
execFileSync('node', [path.join(__dirname, 'generate-manifest.mjs')], { stdio: 'inherit' });
execFileSync('node', [path.join(__dirname, 'generate-pages.mjs')], { stdio: 'inherit' });
console.log('[prune-featured] done. Review the diff and commit.');
