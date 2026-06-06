#!/usr/bin/env node
/**
 * Orchestrates a full pool import: parse -> normalize -> emit -> validate ->
 * regenerate manifest. This is the one-command path that makes refreshing a
 * pool (e.g. the NCVEC Technician 2026-2030 pool) a repeatable, validated job
 * instead of a manual conversion.
 *
 *   node data-pipeline/import-pool.mjs \
 *     --pool path/to/2026-technician-pool.txt \
 *     --category ham-radio --subcategory technician --label Technician \
 *     --version 2026-2030 --effective 2026-07-01 --expiry 2030-06-30 \
 *     [--carry-from <path>] [--out <path>] [--dry-run]
 *
 * Defaults: --out and --carry-from resolve to the dataset registered for
 * <category>/<subcategory> in src/core/dataSources.js, so explanations/tags
 * carry forward from the existing dataset by default. --dry-run writes to /tmp
 * and touches nothing tracked.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { normalize } from './normalize.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) a[argv[i].slice(2)] = (argv[i + 1] && !argv[i + 1].startsWith('--')) ? argv[++i] : true;
    else a._.push(argv[i]);
  }
  return a;
}

const a = parseArgs(process.argv.slice(2));
if (!a.pool || !a.category || !a.subcategory) {
  console.error('Usage: node import-pool.mjs --pool <txt> --category <c> --subcategory <key> [--label <Display>]');
  console.error('       [--version <v> --effective <YYYY-MM-DD> --expiry <YYYY-MM-DD> --source <s>] [--carry-from <p>] [--out <p>] [--dry-run]');
  process.exit(1);
}

const { DATA_SOURCES } = await import(pathToFileURL(path.join(SRC, 'core', 'dataSources.js')).href);
const ref = DATA_SOURCES?.[a.category]?.[a.subcategory];
if (!ref && !a.out) {
  console.error(`No DATA_SOURCES entry for ${a.category}/${a.subcategory}; pass --out explicitly.`);
  process.exit(1);
}
const datasetPath = path.join(SRC, (ref || '').replace(/^\.\//, ''));
const outPath = a['dry-run'] ? path.join('/tmp', `import-${a.subcategory}.json`) : (a.out ? path.resolve(a.out) : datasetPath);
const carryFrom = a['carry-from'] ? path.resolve(a['carry-from']) : (fs.existsSync(datasetPath) ? datasetPath : null);
const label = a.label || (a.subcategory[0].toUpperCase() + a.subcategory.slice(1));

// 1. Parse (Python step)
console.error(`[1/4] parsing ${a.pool} ...`);
const interRaw = execFileSync('python3', [path.join(__dirname, 'parsers', 'ncvec_pool.py'), path.resolve(a.pool)], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const intermediate = JSON.parse(interRaw);

// 2. Normalize
console.error(`[2/4] normalizing ${intermediate.length} questions (carry-from: ${carryFrom || 'none'}) ...`);
const { questions, report } = normalize(intermediate, { category: a.category, subcategory: label, carryFrom });
if (report.errors.length) {
  console.error(`✗ normalize errors:\n  ${report.errors.join('\n  ')}`);
  process.exit(1);
}

// 3. Emit
fs.writeFileSync(outPath, JSON.stringify(questions, null, 2) + '\n');
console.error(`[3/4] wrote ${questions.length} questions -> ${path.relative(ROOT, outPath)}${a['dry-run'] ? ' (dry-run)' : ''}`);

if (!a['dry-run']) {
  // update pools.json metadata if version info supplied
  if (a.version || a.effective || a.expiry || a.source) {
    const pp = path.join(__dirname, 'pools.json');
    const doc = JSON.parse(fs.readFileSync(pp, 'utf8'));
    doc.pools[`${a.category}/${a.subcategory}`] = {
      version: a.version || null, effectiveDate: a.effective || null, expiryDate: a.expiry || null,
      source: a.source || 'NCVEC', sourceUrl: a.sourceurl || 'https://www.ncvec.org/',
    };
    fs.writeFileSync(pp, JSON.stringify(doc, null, 2) + '\n');
    console.error(`      updated pools.json [${a.category}/${a.subcategory}]`);
  }
  // 4. regenerate manifest + validate
  console.error('[4/4] regenerating manifest + validating ...');
  execFileSync('node', [path.join(__dirname, 'generate-manifest.mjs')], { stdio: 'inherit' });
  execFileSync('node', [path.join(__dirname, 'validate.mjs')], { stdio: 'inherit' });
} else {
  console.error('[4/4] dry-run: skipped manifest/validate (nothing tracked was changed)');
}

// Coverage report
console.error('\n=== coverage report ===');
console.error(`  questions:               ${report.total}`);
console.error(`  subelements:             ${JSON.stringify(report.subelements)}`);
console.error(`  placeholder explanations:${report.placeholderExplanations}  (= correct text; need authoring)`);
console.error(`  untagged:                ${report.untagged}  (curator agent should tag)`);
console.error(`  with images:             ${report.withImages}  (verify image assets exist)`);
console.error(`  carried from:            ${report.carriedFrom || 'none'}`);
