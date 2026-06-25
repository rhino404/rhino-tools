#!/usr/bin/env node
// blog-pipeline/validate.mjs
// Validates all ready/published post drafts against the schema.
// Must be green before build.mjs is run for publication.
// NOTE: This is a heuristic backstop. The real safeguards are:
//   1) Agent's original-writing discipline and cited sources
//   2) Human review before merge to main

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DRAFTS_DIR = join(ROOT, 'blog-pipeline', 'drafts');
const SCHEMA_FILE = join(ROOT, 'blog-pipeline', 'schema', 'post.schema.json');
const POSTS_FILE = join(ROOT, 'blog-pipeline', 'posts.json');

const schema = JSON.parse(readFileSync(SCHEMA_FILE, 'utf8'));
const REQUIRED = schema.required;
const TRACK_ENUM = schema.properties.track.enum;
const STATUS_ENUM = schema.properties.status.enum;

// Published posts manifest — used for cross-post similarity checks.
let publishedPosts = [];
try { publishedPosts = JSON.parse(readFileSync(POSTS_FILE, 'utf8')); } catch { /* first run */ }

let errors = 0;
let warnings = 0;
const seenSlugs = new Set();

// Collect ready/published draft metadata for post-loop similarity analysis.
const readyDrafts = []; // { file, slug, track, tags, title }

function err(file, msg) { console.error(`  ❌ [${file}] ${msg}`); errors++; }
function warn(file, msg) { console.warn(`  ⚠️  [${file}] ${msg}`); warnings++; }

function parseFrontMatter(content, filename) {
  const match = content.match(/^---\n([\s\S]+?)\n---\n([\s\S]*)$/);
  if (!match) { err(filename, 'Missing or malformed front-matter (expected --- delimiters)'); return null; }
  const yaml = match[1];
  const body = match[2].trim();
  const meta = {};
  let inSourcesBlock = false;
  let sourcesLines = [];

  for (const line of yaml.split('\n')) {
    if (line.startsWith('sources_json:')) {
      inSourcesBlock = true;
      const rest = line.slice('sources_json:'.length).trim();
      if (rest) sourcesLines.push(rest);
      continue;
    }
    if (inSourcesBlock) {
      if (/^\w[\w-]*:/.test(line) && !line.startsWith(' ') && !line.startsWith('\t')) {
        inSourcesBlock = false;
        try { meta.sources = JSON.parse(sourcesLines.join(' ')); } catch { meta.sources = []; }
        sourcesLines = [];
      } else {
        sourcesLines.push(line.trim());
        continue;
      }
    }
    const kv = line.match(/^(\w[\w-]*):\s*(.+)/);
    if (!kv) continue;
    const key = kv[1];
    let val = kv[2].trim().replace(/^["']|["']$/g, '');
    if (val.startsWith('[') && val.endsWith(']')) {
      val = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    }
    meta[key] = val;
  }
  if (inSourcesBlock && sourcesLines.length > 0) {
    try { meta.sources = JSON.parse(sourcesLines.join(' ')); } catch { meta.sources = []; }
  }
  return { meta, body };
}

const draftFiles = readdirSync(DRAFTS_DIR).filter(f => f.endsWith('.md'));
if (draftFiles.length === 0) {
  console.log('No drafts found. Nothing to validate.');
  process.exit(0);
}

for (const file of draftFiles) {
  const raw = readFileSync(join(DRAFTS_DIR, file), 'utf8');
  const parsed = parseFrontMatter(raw, file);
  if (!parsed) continue;
  const { meta, body } = parsed;

  console.log(`\nValidating: ${file}`);

  // Skip drafts (only validate ready/published)
  if (meta.status === 'draft') {
    console.log(`  ⏭  Status=draft, skipping full validation.`);
    continue;
  }

  // ── Required fields ────────────────────────────────────────────────────────
  for (const field of REQUIRED) {
    if (field === 'sources') continue; // checked separately
    if (!meta[field]) err(file, `Missing required field: ${field}`);
  }

  // ── Slug format ────────────────────────────────────────────────────────────
  if (meta.slug) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(meta.slug)) {
      err(file, `slug "${meta.slug}" must be lowercase alphanumeric with hyphens only`);
    }
    if (seenSlugs.has(meta.slug)) {
      err(file, `Duplicate slug: "${meta.slug}"`);
    }
    seenSlugs.add(meta.slug);
  }

  // ── Track ──────────────────────────────────────────────────────────────────
  if (meta.track && !TRACK_ENUM.includes(meta.track)) {
    err(file, `Unknown track "${meta.track}". Valid: ${TRACK_ENUM.join(', ')}`);
  }

  // ── Status ─────────────────────────────────────────────────────────────────
  if (meta.status && !STATUS_ENUM.includes(meta.status)) {
    err(file, `Unknown status "${meta.status}". Valid: ${STATUS_ENUM.join(', ')}`);
  }

  // ── Description length ─────────────────────────────────────────────────────
  if (meta.description) {
    if (meta.description.length < 50) warn(file, `description too short (${meta.description.length} chars, min 50)`);
    if (meta.description.length > 160) warn(file, `description too long (${meta.description.length} chars, max 160)`);
  }

  // ── Date format ────────────────────────────────────────────────────────────
  if (meta.datePublished && !/^\d{4}-\d{2}-\d{2}$/.test(meta.datePublished)) {
    err(file, `datePublished must be YYYY-MM-DD, got "${meta.datePublished}"`);
  }

  // ── Tags ───────────────────────────────────────────────────────────────────
  const tags = Array.isArray(meta.tags) ? meta.tags : [];
  if (tags.length === 0) warn(file, 'No tags — add at least one from data-pipeline/taxonomy.json');

  // Collect for cross-post similarity check below.
  if (meta.slug && meta.track && tags.length > 0) {
    readyDrafts.push({ file, slug: meta.slug, track: meta.track, tags, title: meta.title || '' });
  }

  // ── Sources ────────────────────────────────────────────────────────────────
  const sources = Array.isArray(meta.sources) ? meta.sources : [];
  if (sources.length === 0) {
    err(file, 'sources[] must have at least 1 entry — every post must cite verifiable sources');
  } else {
    for (const [i, src] of sources.entries()) {
      if (!src.title) err(file, `sources[${i}]: missing title`);
      if (!src.url) err(file, `sources[${i}]: missing url`);
      else if (!/^https?:\/\//.test(src.url)) err(file, `sources[${i}]: url must start with http(s)://`);
    }
  }

  // ── Body checks ────────────────────────────────────────────────────────────
  if (!body || body.length < 200) {
    err(file, `Body too short (${body.length} chars) — posts should be substantial`);
  }

  // Heading hierarchy: must have exactly one h1 (the post title is the h1 in template,
  // so body should NOT contain h1; body headings should start at h2)
  const h1InBody = (body.match(/^#[^#]/gm) || []).length;
  if (h1InBody > 0) {
    warn(file, `Body contains ${h1InBody} h1 heading(s). The post <h1> is the title in the template — body headings should start at ##`);
  }

  // Fenced code blocks (unsupported by renderer)
  if (/^```/m.test(body)) {
    err(file, 'Body contains fenced code blocks (```) — not supported by the renderer. Use inline `code` or simplify.');
  }

  // Tables
  if (/^\|.+\|/m.test(body)) {
    err(file, 'Body contains a Markdown table — not supported by the renderer. Use a list instead.');
  }

  // Copyright guard: flag very long verbatim spans (>200 chars in quotes)
  const quotedSpans = body.match(/"[^"]{200,}"/g) || [];
  if (quotedSpans.length > 0) {
    warn(file, `${quotedSpans.length} long quoted span(s) detected (>200 chars each). Ensure these are not verbatim copies from copyrighted sources.`);
  }

  // External images guard: no third-party <img> or Markdown images pointing offsite
  // (CSS banners only — zero copyright risk)
  const extImages = body.match(/!\[[^\]]*\]\(https?:\/\/(?!ryno\.tools)[^)]+\)/g) || [];
  if (extImages.length > 0) {
    err(file, `${extImages.length} external image(s) found. Only /images/ assets are allowed (CSS banners for posts). Remove external image URLs.`);
  }

  // Warn if no ## headings (AEO structure)
  if (!body.includes('## ')) {
    warn(file, 'No ## headings found — consider question-form h2 headings for AEO/GEO (e.g. "## What is Ohm\'s Law?")');
  }

  console.log(`  ✅ ${file} — OK`);
}

// ── Cross-post similarity check ────────────────────────────────────────────
// Compares each ready draft against: (a) other ready drafts, (b) published posts.
// Uses Jaccard tag similarity on the same track. >50% overlap = warn.
// This is a heuristic backstop — human review is still required before merge.
function jaccard(setA, setB) {
  const a = new Set(setA.map(t => t.toLowerCase()));
  const b = new Set(setB.map(t => t.toLowerCase()));
  const intersection = [...a].filter(t => b.has(t)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

// Build a lookup of published posts by slug (exclude posts that are also in
// readyDrafts — they've already been rebuilt and would self-match).
const readySlugs = new Set(readyDrafts.map(d => d.slug));
const published = publishedPosts
  .filter(p => !readySlugs.has(p.slug))
  .map(p => ({ slug: p.slug, track: p.track, tags: p.tags || [], title: p.title || '' }));

for (const draft of readyDrafts) {
  // Compare against all other ready drafts (avoid double-reporting: only check i < j).
  for (const other of readyDrafts) {
    if (other.slug >= draft.slug) continue; // only check each pair once
    if (other.track !== draft.track) continue;
    const sim = jaccard(draft.tags, other.tags);
    if (sim > 0.6) {
      warn(draft.file,
        `High tag similarity (${Math.round(sim * 100)}%) with another new draft "${other.slug}" on the same track. ` +
        `Ensure these posts cover distinct angles. Shared tags: ${draft.tags.filter(t => other.tags.map(x => x.toLowerCase()).includes(t.toLowerCase())).join(', ')}`);
    }
  }
  // Compare against published posts on the same track.
  for (const pub of published) {
    if (pub.track !== draft.track) continue;
    const sim = jaccard(draft.tags, pub.tags);
    if (sim > 0.6) {
      warn(draft.file,
        `High tag similarity (${Math.round(sim * 100)}%) with published post "${pub.slug}" on the same track. ` +
        `Verify this draft covers a distinct angle. Shared tags: ${draft.tags.filter(t => pub.tags.map(x => x.toLowerCase()).includes(t.toLowerCase())).join(', ')}`);
    }
  }
}

console.log(`\n${'─'.repeat(50)}`);
if (errors > 0) {
  console.error(`\n❌ Validation failed: ${errors} error(s), ${warnings} warning(s). Fix errors before building.\n`);
  process.exit(1);
} else if (warnings > 0) {
  console.warn(`\n⚠️  Validation passed with ${warnings} warning(s). Review warnings before publishing.\n`);
} else {
  console.log(`\n✅ All drafts valid. Run: node blog-pipeline/build.mjs\n`);
}
