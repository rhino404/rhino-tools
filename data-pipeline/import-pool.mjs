#!/usr/bin/env node
/**
 * Orchestrates a full pool import: parse -> normalize -> emit -> validate ->
 * regenerate manifest. This is the one-command path that makes refreshing a
 * pool (e.g. the NCVEC Technician 2026-2030 pool) a repeatable, validated job
 * instead of a manual conversion.
 *
 *   node data-pipeline/import-pool.mjs \
 *     --pool path/to/2026-technician-pool.docx \
 *     --category ham-radio --subcategory technician --label Technician \
 *     --version 2026-2030 --effective 2026-07-01 --expiry 2030-06-30 \
 *     --images path/to/figures/ \
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
  console.error('Usage: node import-pool.mjs --pool <txt|docx> --category <c> --subcategory <key> [--label <Display>]');
  console.error('       [--version <v> --effective <YYYY-MM-DD> --expiry <YYYY-MM-DD> --source <s>]');
  console.error('       [--images <dir>] [--carry-from <p>] [--out <p>] [--dry-run]');
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

// Figure alignment: every question that references a figure must have a
// matching image file, and vice-versa. The dataset references bare labels
// (T1.jpg); the downloaded files may carry descriptive names
// ("Technician Diagram T1.jpg"), so map each by the figure token it contains.
const referenced = new Set(
  questions.map((q) => q.image).filter(Boolean).map((p) => path.basename(p)),
); // e.g. { 'T1.jpg', 'T2.jpg', 'T3.jpg' }

function canonicalFigureName(fname) {
  const ext = path.extname(fname).toLowerCase().replace('.jpeg', '.jpg');
  const tokens = path.basename(fname, path.extname(fname)).match(/[A-Z]\d+[A-Z]?/g);
  return tokens ? tokens[tokens.length - 1] + ext : null; // last token wins ("...T1" -> T1.jpg)
}

if (a.images) {
  const imagesDir = path.resolve(a.images);
  const destDir = path.join(SRC, 'images', a.category);
  const provided = new Map(); // canonical name -> source path
  for (const fname of fs.readdirSync(imagesDir)) {
    if (!/\.(jpg|jpeg|png|gif|svg)$/i.test(fname)) continue;
    const canonical = canonicalFigureName(fname);
    if (canonical) provided.set(canonical, path.join(imagesDir, fname));
  }
  const missing = [...referenced].filter((r) => !provided.has(r));
  const unreferenced = [...provided.keys()].filter((p) => !referenced.has(p));

  if (!a['dry-run']) {
    fs.mkdirSync(destDir, { recursive: true });
    const copied = [];
    for (const r of referenced) {
      if (provided.has(r)) { fs.copyFileSync(provided.get(r), path.join(destDir, r)); copied.push(r); }
    }
    if (copied.length) console.error(`      copied figures -> src/images/${a.category}/: ${copied.join(', ')}`);
  } else {
    console.error(`      [dry-run] would copy ${referenced.size - missing.length}/${referenced.size} referenced figure(s) -> src/images/${a.category}/`);
  }
  if (missing.length) console.error(`      ⚠ referenced figures with NO image supplied: ${missing.join(', ')}`);
  if (unreferenced.length) console.error(`      ⚠ images supplied but not referenced by any question: ${unreferenced.join(', ')}`);
} else if (referenced.size) {
  // No --images given but questions reference figures — verify they already exist on disk.
  const destDir = path.join(SRC, 'images', a.category);
  const missing = [...referenced].filter((r) => !fs.existsSync(path.join(destDir, r)));
  if (missing.length) console.error(`      ⚠ ${referenced.size} figure(s) referenced; missing on disk (pass --images <dir>): ${missing.join(', ')}`);
  else console.error(`      figures: all ${referenced.size} referenced image(s) already present in src/images/${a.category}/`);
}

// --featured "<headline>": mark this refresh as new content. The block lives
// inside the pool entry, so it rides into src/datasets/index.json via the
// manifest and is read by every "new content" surface (badge, homepage, blog).
// --featured-days N sets the window length (default 90); --featured-from YYYY-MM-DD
// overrides the start (defaults to effectiveDate, else today).
function buildFeatured() {
  if (!a.featured) return undefined;
  const from = a['featured-from'] || a.effective || new Date().toISOString().slice(0, 10);
  const days = Number(a['featured-days']) || 90;
  const until = new Date(new Date(from).getTime() + days * 86400000).toISOString().slice(0, 10);
  const headline = a.featured === true ? `${label} pool refreshed${a.version ? ` (${a.version})` : ''}` : String(a.featured);
  // Short pill text for badges; the cycle version reads best (e.g. "2026–2030").
  const badge = a.version ? a.version.replace('-', '–') : 'New';
  return { headline, badge, from, until, blogSlug: null };
}

if (!a['dry-run']) {
  // update pools.json metadata if version info supplied
  if (a.version || a.effective || a.expiry || a.source || a.featured) {
    const pp = path.join(__dirname, 'pools.json');
    const doc = JSON.parse(fs.readFileSync(pp, 'utf8'));
    const key = `${a.category}/${a.subcategory}`;
    const featured = buildFeatured();
    doc.pools[key] = {
      version: a.version || null, effectiveDate: a.effective || null, expiryDate: a.expiry || null,
      source: a.source || 'NCVEC', sourceUrl: a.sourceurl || 'https://www.ncvec.org/',
      ...(featured ? { featured } : {}),
    };
    fs.writeFileSync(pp, JSON.stringify(doc, null, 2) + '\n');
    console.error(`      updated pools.json [${key}]${featured ? ` (featured until ${featured.until})` : ''}`);

    // Seed a blog draft so the refresh becomes announced content, deduped by trackKey+kind.
    if (featured) {
      const qp = path.join(ROOT, 'blog-pipeline', 'queue.json');
      if (fs.existsSync(qp)) {
        const queue = JSON.parse(fs.readFileSync(qp, 'utf8'));
        const icon = { 'ham-radio': '📻', cybersecurity: '🔐', falconry: '🦅', devops: '⚙️' }[a.category] || '📘';
        const seed = {
          trackKey: key, trackLabel: `${a.category} — ${label}`, trackIcon: icon,
          kind: 'pool-refresh', topic: featured.headline, tags: ['Whats New'],
          questionCount: questions.length, noveltyScore: 1000, // float to top of the queue
          suggestedTitle: `What's New in the ${a.version || label} Question Pool`,
          notes: `${label} refreshed to ${a.version || 'a new pool'} (effective ${a.effective || 'TBD'}). ${questions.length} questions. Announce what changed and link to the quiz.`,
        };
        if (!queue.some((q) => q.trackKey === key && q.kind === 'pool-refresh')) {
          queue.unshift(seed);
          fs.writeFileSync(qp, JSON.stringify(queue, null, 2) + '\n');
          console.error(`      seeded blog draft -> blog-pipeline/queue.json ("${seed.suggestedTitle}")`);
        }
      }
    }
  }
  // 4. regenerate manifest + validate
  console.error('[4/4] regenerating manifest + validating ...');
  execFileSync('node', [path.join(__dirname, 'generate-manifest.mjs')], { stdio: 'inherit' });
  execFileSync('node', [path.join(__dirname, 'validate.mjs')], { stdio: 'inherit' });
} else {
  const featured = buildFeatured();
  if (featured) console.error(`      [dry-run] would mark featured: "${featured.headline}" (${featured.from} → ${featured.until}) + seed blog draft`);
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
