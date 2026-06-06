#!/usr/bin/env node
/**
 * Adds the stable content-fingerprint `id` to every question in a dataset that
 * lacks one — for manually authored datasets (the import pipeline already emits
 * ids). Inserts `id` as the first key via line surgery, preserving the file's
 * existing formatting (no full re-serialization).
 *
 *   node data-pipeline/add-ids.mjs <dataset.json>          # add missing ids
 *   node data-pipeline/add-ids.mjs <dataset.json> --check  # verify only (exit 1 if wrong/missing)
 *
 * id = "<subcategory-slug>-<sha1(question + sorted choices + correct)[:10]>"
 * (identical to normalize.mjs and the Phase 1 backfill).
 */
import fs from 'node:fs';
import { questionId } from './normalize.mjs';

const file = process.argv[2];
const check = process.argv.includes('--check');
if (!file) { console.error('Usage: node add-ids.mjs <dataset.json> [--check]'); process.exit(1); }

const data = JSON.parse(fs.readFileSync(file, 'utf8'));
if (!Array.isArray(data)) { console.error(`${file}: not an array of questions`); process.exit(1); }

const expected = data.map((q) => questionId(q.subcategory || '', q.question || '', q.choices || [], q.correct || ''));
const missing = data.filter((q) => q.id == null).length;
const wrong = data.filter((q, i) => q.id != null && q.id !== expected[i]).map((q, i) => i);

if (check) {
  if (missing === 0 && wrong.length === 0) { console.log(`✓ ${file}: all ${data.length} ids present and correct`); process.exit(0); }
  if (missing) console.error(`✗ ${file}: ${missing} question(s) missing id (run without --check to add)`);
  if (wrong.length) console.error(`✗ ${file}: ${wrong.length} id(s) do not match content: #${wrong.slice(0, 10).join(', #')}`);
  process.exit(1);
}

if (wrong.length) {
  console.error(`✗ ${file}: ${wrong.length} existing id(s) mismatch content (#${wrong.slice(0, 10).join(', #')}). Fix or remove them and re-run; refusing to rewrite mismatched ids automatically.`);
  process.exit(1);
}
if (missing === 0) { console.log(`✓ ${file}: all ${data.length} ids already present`); process.exit(0); }
if (missing !== data.length) {
  console.error(`✗ ${file}: ${missing}/${data.length} missing ids (partial). Add ids to all-or-none; refusing partial line surgery.`);
  process.exit(1);
}

// None present -> insert via line surgery (preserves formatting)
const lines = fs.readFileSync(file, 'utf8').split('\n');
const starts = lines.map((l, i) => (l.trim() === '{' ? i : -1)).filter((i) => i >= 0);
if (starts.length !== data.length) { console.error(`✗ ${file}: ${starts.length} object-starts != ${data.length} questions; aborting`); process.exit(1); }
for (let k = starts.length - 1; k >= 0; k--) {
  const indent = lines[starts[k]].match(/^\s*/)[0] + '  ';
  lines.splice(starts[k] + 1, 0, `${indent}"id": "${expected[k]}",`);
}
fs.writeFileSync(file, lines.join('\n'));
JSON.parse(fs.readFileSync(file, 'utf8')); // sanity: still valid JSON
console.log(`✓ ${file}: added ${data.length} ids`);
