#!/usr/bin/env node
// blog-pipeline/backlog.mjs
// Editorial backlog manager + drift gate for the Ryno Tools blog.
//
// backlog.json is the persistent, curated source of truth for the editorial
// calendar (planned + published posts with status/priority/refresh dates).
// posts.json is the generated manifest of what actually shipped (by build.mjs).
// This script keeps the two consistent and tells you what to write next.
//
// Commands (deterministic, zero model tokens):
//   --status   (default) counts by status + track, and any stale posts
//   --next     planned posts to write next, ranked by priority then targetMonth
//   --stale    published posts past their refreshBy date
//   --sync     fold published posts.json entries into backlog.json (writes file)
//   --check    validate schema + cross-check published rows vs posts.json/disk;
//              exits 1 on any error (use as a CI gate)

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BACKLOG_FILE = join(ROOT, 'blog-pipeline', 'backlog.json');
const POSTS_FILE = join(ROOT, 'blog-pipeline', 'posts.json');
const SCHEMA_FILE = join(ROOT, 'blog-pipeline', 'schema', 'post.schema.json');
const SRC_BLOG_DIR = join(ROOT, 'src', 'blog');

const TODAY = new Date().toISOString().slice(0, 10);
// 'refresh-due' is intentionally absent: staleness is computed dynamically from
// the refreshBy date by --stale, so a status flag for it would be redundant and
// would cause --check to warn whenever CI runs after a post ages past refreshBy.
const STATUS_ENUM = ['idea', 'queued', 'drafting', 'review', 'published'];
const PRIORITY_ENUM = ['high', 'medium', 'low'];
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

function loadJson(path, fallback) {
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch { return fallback; }
}

const backlog = loadJson(BACKLOG_FILE, null);
if (!Array.isArray(backlog)) {
  console.error(`❌ Could not read backlog.json as an array at ${BACKLOG_FILE}`);
  process.exit(1);
}
const posts = loadJson(POSTS_FILE, []);
const postsBySlug = new Map(posts.map(p => [p.slug, p]));
const schema = loadJson(SCHEMA_FILE, {});
const TRACK_ENUM = schema?.properties?.track?.enum || [];

const cmd = process.argv[2] || '--status';

// ── --check ────────────────────────────────────────────────────────────────
function check() {
  let errors = 0, warnings = 0;
  const err = (m) => { console.error(`  ❌ ${m}`); errors++; };
  const warn = (m) => { console.warn(`  ⚠️  ${m}`); warnings++; };
  const seen = new Set();

  for (const row of backlog) {
    const id = row.slug || '(no slug)';
    for (const f of ['slug', 'title', 'track', 'status']) {
      if (!row[f]) err(`[${id}] missing required field: ${f}`);
    }
    if (row.slug) {
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(row.slug)) err(`[${id}] slug must be kebab-case`);
      if (seen.has(row.slug)) err(`[${id}] duplicate slug`);
      seen.add(row.slug);
    }
    if (row.track && TRACK_ENUM.length && !TRACK_ENUM.includes(row.track)) {
      err(`[${id}] unknown track "${row.track}"`);
    }
    if (row.status && !STATUS_ENUM.includes(row.status)) {
      err(`[${id}] unknown status "${row.status}" (valid: ${STATUS_ENUM.join(', ')})`);
    }
    if (row.priority && !PRIORITY_ENUM.includes(row.priority)) {
      err(`[${id}] priority must be one of ${PRIORITY_ENUM.join(', ')}`);
    }
    for (const [f, re] of [['publishedDate', /^\d{4}-\d{2}-\d{2}$/], ['refreshBy', /^\d{4}-\d{2}-\d{2}$/], ['targetMonth', /^\d{4}-\d{2}$/]]) {
      if (row[f] && !re.test(row[f])) err(`[${id}] ${f} bad format: "${row[f]}"`);
    }
    // Published rows must correspond to a real shipped post.
    if (row.status === 'published') {
      if (!postsBySlug.has(row.slug)) err(`[${id}] status=published but not in posts.json`);
      if (!existsSync(join(SRC_BLOG_DIR, row.slug, 'index.html'))) {
        err(`[${id}] status=published but src/blog/${row.slug}/index.html is missing`);
      }
    }
  }

  // Reverse drift: anything shipped that the backlog forgot about.
  const bySlug = new Map(backlog.map(r => [r.slug, r]));
  for (const p of posts) {
    if (!bySlug.has(p.slug)) {
      err(`posts.json has "${p.slug}" but backlog.json has no row for it — run: node blog-pipeline/backlog.mjs --sync`);
    } else {
      const row = bySlug.get(p.slug);
      if (row.status !== 'published') {
        warn(`"${p.slug}" is shipped (in posts.json) but backlog status is "${row.status}" — run --sync`);
      }
    }
  }

  console.log('─'.repeat(50));
  if (errors > 0) {
    console.error(`❌ backlog check failed: ${errors} error(s), ${warnings} warning(s).`);
    process.exit(1);
  }
  console.log(`✅ backlog OK (${backlog.length} rows, ${warnings} warning(s)).`);
}

// ── --sync ─────────────────────────────────────────────────────────────────
function sync() {
  let changed = 0;
  const bySlug = new Map(backlog.map(r => [r.slug, r]));
  for (const p of posts) {
    const row = bySlug.get(p.slug);
    if (!row) {
      backlog.push({
        slug: p.slug, title: p.title, track: p.track,
        intentKeyword: '', status: 'published', priority: 'medium',
        publishedDate: p.datePublished,
      });
      changed++;
      console.log(`  + added published row: ${p.slug}`);
    } else if (row.status !== 'published') {
      row.status = 'published';
      if (!row.publishedDate) row.publishedDate = p.datePublished;
      changed++;
      console.log(`  ↑ ${p.slug}: ${'->'} published`);
    }
  }
  if (changed) {
    writeFileSync(BACKLOG_FILE, JSON.stringify(backlog, null, 2) + '\n');
    console.log(`✅ Synced ${changed} row(s) into backlog.json.`);
  } else {
    console.log('✅ backlog already in sync with posts.json.');
  }
}

// ── --next ─────────────────────────────────────────────────────────────────
function next() {
  const planned = backlog
    .filter(r => r.status !== 'published')
    .sort((a, b) =>
      (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9) ||
      (a.targetMonth || '9999').localeCompare(b.targetMonth || '9999') ||
      a.slug.localeCompare(b.slug));
  if (!planned.length) { console.log('No planned posts — backlog is empty. Run ideate.mjs to refill ideas.'); return; }
  console.log(`📝 Next up (${planned.length} planned):\n`);
  for (const r of planned.slice(0, 12)) {
    const when = r.targetMonth ? ` · ${r.targetMonth}` : '';
    console.log(`  [${(r.priority || '?').padEnd(6)}] ${r.status.padEnd(8)} ${r.track}${when}`);
    console.log(`           ${r.title}`);
    if (r.intentKeyword) console.log(`           ↳ kw: "${r.intentKeyword}"`);
  }
}

// ── --stale ────────────────────────────────────────────────────────────────
function stale() {
  const due = backlog
    .filter(r => r.status === 'published' && r.refreshBy && r.refreshBy <= TODAY)
    .sort((a, b) => a.refreshBy.localeCompare(b.refreshBy));
  if (!due.length) { console.log(`✅ No published posts past refreshBy (as of ${TODAY}).`); return; }
  console.log(`🔄 ${due.length} post(s) due for refresh (as of ${TODAY}):\n`);
  for (const r of due) {
    console.log(`  ${r.refreshBy}  ${r.slug}`);
    if (r.notes) console.log(`             ${r.notes}`);
  }
}

// ── --status (default) ───────────────────────────────────────────────────────
function status() {
  const byStatus = {}, byTrack = {};
  for (const r of backlog) {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    byTrack[r.track] = (byTrack[r.track] || 0) + 1;
  }
  console.log(`📊 Backlog: ${backlog.length} rows\n`);
  console.log('  By status:');
  for (const s of STATUS_ENUM) if (byStatus[s]) console.log(`    ${s.padEnd(12)} ${byStatus[s]}`);
  console.log('\n  By track:');
  for (const t of Object.keys(byTrack).sort()) console.log(`    ${t.padEnd(24)} ${byTrack[t]}`);
  const dueCount = backlog.filter(r => r.status === 'published' && r.refreshBy && r.refreshBy <= TODAY).length;
  if (dueCount) console.log(`\n  ⚠️  ${dueCount} post(s) past refreshBy — run --stale`);
}

const COMMANDS = ['--check', '--sync', '--next', '--stale', '--status'];
if (cmd && !COMMANDS.includes(cmd)) {
  console.error(`❌ Unknown command: ${cmd}\nUsage: node blog-pipeline/backlog.mjs [${COMMANDS.join('|')}]`);
  process.exit(1);
}

switch (cmd) {
  case '--check':  check(); break;
  case '--sync':   sync(); break;
  case '--next':   next(); break;
  case '--stale':  stale(); break;
  case '--status': default: status(); break;
}
