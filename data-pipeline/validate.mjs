#!/usr/bin/env node
/**
 * Schema-driven dataset validator + constraint suite for Ryno Tools.
 *
 * Authoritative validator (the .claude/scripts/* copies are local-only and
 * lenient). Reads the canonical schemas + taxonomy and enforces both the
 * structural contract and the cross-field / cross-file constraints that pure
 * JSON Schema cannot express.
 *
 *   ERRORS (exit 1): schema violations, correct-not-in-choices, duplicate ids,
 *     duplicate question content, exam.json structure + distribution coupling.
 *   WARNINGS (exit 0): tags outside the category taxonomy, questions with no tags.
 *
 * Usage: node data-pipeline/validate.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATASET_DIR = path.join(ROOT, 'src', 'datasets');
const SKIP = new Set(['exam.json', 'index.json']);

const questionSchema = readJson(path.join(__dirname, 'schema', 'question.schema.json'));
const examSchema = readJson(path.join(__dirname, 'schema', 'exam.schema.json'));
const taxonomy = readJson(path.join(__dirname, 'taxonomy.json'));
const { DATA_SOURCES } = await import(pathToFileURL(path.join(ROOT, 'src', 'core', 'dataSources.js')).href);

const SUMMARY = process.argv.includes('--summary');

const errors = [];
const warnings = [];

const LETTER_PREFIX_RE = /^\s*[A-Da-d][.)]\s/;

// ---------------------------------------------------------------------------
// Minimal JSON-Schema-subset validator (covers the keywords our schemas use)
// ---------------------------------------------------------------------------
function validate(value, schema, loc) {
  const t = schema.type;
  const isType = (v, tt) =>
    tt === 'integer' ? Number.isInteger(v)
    : tt === 'array' ? Array.isArray(v)
    : tt === 'object' ? (v !== null && typeof v === 'object' && !Array.isArray(v))
    : typeof v === tt;
  if (t && !isType(value, t)) {
    errors.push(`${loc}: expected ${t}, got ${Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value}`);
    return;
  }
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${loc}: ${JSON.stringify(value)} not in enum ${JSON.stringify(schema.enum)}`);
  if (t === 'string') {
    if (schema.minLength != null && value.length < schema.minLength) errors.push(`${loc}: string shorter than minLength ${schema.minLength}`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push(`${loc}: does not match pattern ${schema.pattern}`);
  }
  if ((t === 'integer' || t === 'number') && schema.minimum != null && value < schema.minimum) errors.push(`${loc}: ${value} < minimum ${schema.minimum}`);
  if (t === 'array') {
    if (schema.minItems != null && value.length < schema.minItems) errors.push(`${loc}: fewer than ${schema.minItems} items`);
    if (schema.maxItems != null && value.length > schema.maxItems) errors.push(`${loc}: more than ${schema.maxItems} items`);
    if (schema.uniqueItems && new Set(value.map((x) => JSON.stringify(x))).size !== value.length) errors.push(`${loc}: items are not unique`);
    if (schema.items) value.forEach((v, i) => validate(v, schema.items, `${loc}[${i}]`));
  }
  if (t === 'object') {
    (schema.required || []).forEach((k) => { if (!(k in value)) errors.push(`${loc}: missing required '${k}'`); });
    if (schema.minProperties != null && Object.keys(value).length < schema.minProperties) errors.push(`${loc}: fewer than ${schema.minProperties} properties`);
    const props = schema.properties || {};
    for (const k of Object.keys(value)) {
      if (k in props) validate(value[k], props[k], `${loc}.${k}`);
      else if (schema.additionalProperties === false) errors.push(`${loc}: unexpected property '${k}'`);
      else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') validate(value[k], schema.additionalProperties, `${loc}.${k}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Question datasets
// ---------------------------------------------------------------------------
const perFile = [];
let total = 0;

for (const file of findJson(DATASET_DIR)) {
  const rel = path.relative(DATASET_DIR, file);
  if (SKIP.has(path.basename(file))) continue;
  let data;
  try { data = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { errors.push(`${rel}: JSON parse error: ${e.message}`); continue; }
  if (!Array.isArray(data)) { errors.push(`${rel}: expected array of questions`); continue; }

  const ids = new Map();
  const contentFp = new Map();
  data.forEach((q, i) => {
    const loc = `${rel}#${i}${q && q.id ? ` (${q.id})` : ''}`;
    validate(q, questionSchema, loc);
    if (Array.isArray(q.choices) && typeof q.correct === 'string' && !q.choices.includes(q.correct))
      errors.push(`${loc}: "correct" not present in choices`);
    if (Array.isArray(q.choices))
      q.choices.forEach((c, ci) => {
        if (LETTER_PREFIX_RE.test(c))
          errors.push(`${loc}: choices[${ci}] has a letter prefix — strip it: ${JSON.stringify(c.slice(0, 30))}`);
      });
    if (q.id != null) {
      if (ids.has(q.id)) errors.push(`${loc}: duplicate id (also #${ids.get(q.id)})`);
      else ids.set(q.id, i);
    }
    const fp = JSON.stringify([q.question, [...(q.choices || [])].sort(), q.correct]);
    if (contentFp.has(fp)) errors.push(`${loc}: duplicate question content (same as #${contentFp.get(fp)})`);
    else contentFp.set(fp, i);

    const vocab = new Set((taxonomy.categories?.[q.category]?.tags) || []);
    const tags = Array.isArray(q.tags) ? q.tags : [];
    if (tags.length === 0) warnings.push(`${loc}: no tags`);
    if (vocab.size) tags.forEach((t) => { if (!vocab.has(t)) warnings.push(`${loc}: tag '${t}' not in '${q.category}' taxonomy`); });
  });

  // Per-file: warn if most explanations are copies of the correct answer (placeholder quality)
  const placeholderCount = data.filter(q =>
    typeof q.explanation === 'string' && typeof q.correct === 'string' &&
    q.explanation.trim() === q.correct.trim()
  ).length;
  if (placeholderCount > 0)
    warnings.push(`${rel}: ${placeholderCount}/${data.length} explanations are copies of the correct answer (placeholder text)`);

  perFile.push({ rel, count: data.length });
  total += data.length;
}

// ---------------------------------------------------------------------------
// exam.json — structure + cross-file distribution coupling
// ---------------------------------------------------------------------------
const examPath = path.join(DATASET_DIR, 'exam.json');
if (fs.existsSync(examPath)) {
  let exam;
  try { exam = JSON.parse(fs.readFileSync(examPath, 'utf8')); }
  catch (e) { errors.push(`exam.json: JSON parse error: ${e.message}`); }
  if (exam) {
    validate(exam, examSchema, 'exam.json');
    for (const entry of exam) {
      const cat = entry.category;
      for (const [sub, def] of Object.entries(entry.subcategory || {})) {
        const where = `exam.json[${cat}/${sub}]`;
        const { totalQuestions: tot, passingScore: pass, distribution: dist } = def;
        if (pass > tot) errors.push(`${where}: passingScore ${pass} > totalQuestions ${tot}`);
        if (dist) {
          const sum = Object.values(dist).reduce((a, b) => a + b, 0);
          if (sum !== tot) errors.push(`${where}: distribution sums to ${sum}, expected ${tot}`);
          const src = DATA_SOURCES?.[cat]?.[sub];
          if (src) {
            const dataset = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', src.replace(/^\.\//, '')), 'utf8'));
            const poolCounts = {};
            for (const q of dataset) poolCounts[q.topic_label] = (poolCounts[q.topic_label] || 0) + 1;
            for (const [key, need] of Object.entries(dist)) {
              if (!(key in poolCounts)) errors.push(`${where}: distribution key '${key}' is not a topic_label in the dataset`);
              else if (poolCounts[key] < need) errors.push(`${where}: topic '${key}' needs ${need} but pool has only ${poolCounts[key]}`);
            }
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Manifest reconciliation (warning only)
// ---------------------------------------------------------------------------
const manifestPath = path.join(DATASET_DIR, 'index.json');
if (fs.existsSync(manifestPath)) {
  try {
    const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (m.totalQuestions !== total) warnings.push(`index.json: totalQuestions ${m.totalQuestions} != actual ${total} (regenerate manifest)`);
  } catch (e) { warnings.push(`index.json: unreadable (${e.message})`); }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
if (SUMMARY) {
  const totals = `${total} Qs / ${perFile.length} datasets`;
  if (errors.length) {
    console.error(`✗ ${errors.length} error(s) — ${totals}`);
    for (const e of errors.slice(0, 5)) console.error(`  ${e}`);
    if (errors.length > 5) console.error(`  ... and ${errors.length - 5} more`);
    process.exit(1);
  }
  if (warnings.length) console.log(`⚠ ${warnings.length} warning(s) — ${totals}`);
  else console.log(`✓ ${totals}`);
} else {
  console.log(`Validating ${perFile.length} dataset(s) against the canonical schema...\n`);
  for (const f of perFile.sort((a, b) => a.rel.localeCompare(b.rel))) {
    const bad = errors.some((e) => e.startsWith(f.rel));
    console.log(`${bad ? '✗' : '✓'} ${f.rel} — ${f.count} questions`);
  }
  console.log(`\nTotal: ${total} questions across ${perFile.length} datasets`);
  if (warnings.length) {
    console.log(`\n⚠ ${warnings.length} warning(s):`);
    for (const w of warnings.slice(0, 50)) console.log(`  - ${w}`);
    if (warnings.length > 50) console.log(`  ... and ${warnings.length - 50} more`);
  }
  if (errors.length) {
    console.error(`\n✗ ${errors.length} error(s):`);
    for (const e of errors.slice(0, 100)) console.error(`  - ${e}`);
    if (errors.length > 100) console.error(`  ... and ${errors.length - 100} more`);
    console.error('\n✗ Validation failed');
    process.exit(1);
  }
  console.log('\n✓ All datasets valid');
}

// ---------------------------------------------------------------------------
function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function findJson(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...findJson(full));
    else if (e.isFile() && e.name.endsWith('.json')) out.push(full);
  }
  return out;
}
