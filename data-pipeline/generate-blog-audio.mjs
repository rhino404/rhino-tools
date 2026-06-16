#!/usr/bin/env node
/**
 * generate-blog-audio.mjs
 *
 * Generates an ElevenLabs narration MP3 for each Japanese-track blog post so
 * readers can opt into listening instead of reading. Run locally — never commit
 * the API key.
 *
 *   # Generate audio for all ready Japanese posts (skips unchanged ones):
 *   ELEVENLABS_API_KEY=sk_... node data-pipeline/generate-blog-audio.mjs
 *
 *   # Just one post:
 *   ELEVENLABS_API_KEY=sk_... node data-pipeline/generate-blog-audio.mjs --slug how-to-learn-hiragana
 *
 *   # Force regenerate (ignores hash + existing files):
 *   ELEVENLABS_API_KEY=sk_... node data-pipeline/generate-blog-audio.mjs --force
 *
 *   # CI drift gate — no API key needed; fails if committed audio is stale:
 *   node data-pipeline/generate-blog-audio.mjs --check
 *
 * Reads:   blog-pipeline/drafts/*.md   (status: ready, track starting "japanese/")
 * Writes:  src/blog/audio/<slug>.mp3            (deployed — served to readers)
 *          blog-pipeline/audio-manifest.json    (NOT deployed; per-slug content
 *                                                hash for drift detection)
 *
 * Credit-saving rules:
 *   - Idempotent: skips a post when the MP3 exists AND the manifest hash matches
 *     the current source (title + raw markdown body). Use --force to override.
 *   - Model: eleven_multilingual_v2 — handles the Japanese phrases in these posts.
 *   - Output: mp3_44100_64 — 64 kbps; speech-quality, ~half the size of 128 kbps.
 *
 * Drift detection:
 *   The manifest stores sha256(title + "\n" + rawMarkdownBody) per slug. The blog
 *   build (build.mjs) recomputes the same hash and warns if a committed MP3 is
 *   stale. Keep the hash input identical in both files.
 *
 * ⚠️  Commercial-license note:
 *   ryno.tools runs AdSense (monetised). Confirm your ElevenLabs plan permits
 *   redistributing generated speech on a monetised site before running this.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const ROOT       = join(__dirname, '..');
const DRAFTS_DIR = join(ROOT, 'blog-pipeline', 'drafts');
const AUDIO_DIR  = join(ROOT, 'src', 'blog', 'audio');
// Manifest lives OUTSIDE src/ so it is committed (for drift checks) but NOT
// deployed — keeps the voice ID and generation timestamps off the public site.
const MANIFEST   = join(ROOT, 'blog-pipeline', 'audio-manifest.json');

const FORCE = process.argv.includes('--force');
const CHECK = process.argv.includes('--check');
const slugArgIdx = process.argv.indexOf('--slug');
const ONLY_SLUG = slugArgIdx !== -1 ? process.argv[slugArgIdx + 1] : null;

// --check is a read-only CI gate (no generation) and must run without a key.
const API_KEY = process.env.ELEVENLABS_API_KEY;
if (!API_KEY && !CHECK) {
  console.error('ERROR: ELEVENLABS_API_KEY env var is not set.');
  process.exit(1);
}

// ── ElevenLabs config ────────────────────────────────────────────────────────
const VOICE_ID      = 'zvdWGDtPGaEo3nF9amvt';
const MODEL_ID      = 'eleven_multilingual_v2';   // multilingual — voices the JP phrases
const OUTPUT_FORMAT = 'mp3_44100_64';             // 64 kbps — speech quality, compact

const VOICE_SETTINGS = {
  stability:        0.5,
  similarity_boost: 0.8,
  style:            0.0,
  use_speaker_boost: true,
};

// Single-request character ceiling. eleven_multilingual_v2 accepts up to 10k
// chars; we stay under with margin and chunk long posts at paragraph breaks.
const MAX_CHARS_PER_REQUEST = 4900;
const SOFT_TOTAL_LIMIT      = 9500; // above this, take the chunking path

// ── Front-matter parsing (minimal — only what we need) ───────────────────────
function parseFrontMatter(content) {
  const match = content.match(/^---\n([\s\S]+?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error('Missing or malformed front-matter (expected --- delimiters).');
  const yaml = match[1];
  const body = match[2].trim();
  const meta = {};
  for (const line of yaml.split('\n')) {
    const kv = line.match(/^(\w[\w-]*):\s*(.+)/);
    if (!kv) continue;
    meta[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return { meta, body };
}

// ── Markdown → plain narration text ──────────────────────────────────────────
// Mirrors the constrained Markdown subset the blog renderer supports.
function markdownToPlainText(title, md) {
  const lines = md.split('\n');
  const out = [];
  for (let raw of lines) {
    let line = raw;
    if (/^```/.test(line)) continue;            // skip fence markers (renderer rejects them anyway)
    const isHeading = /^#{1,6}\s+/.test(line);
    line = line.replace(/^#{1,6}\s+/, '');       // heading markers
    // Headings have no terminal punctuation → TTS runs them into the next
    // paragraph. Add a period so the voice pauses after the heading.
    if (isHeading && line && !/[.!?。！？]\s*$/.test(line)) line += '.';
    line = line.replace(/^>\s?/, '');            // blockquote prefix
    line = line.replace(/^\s*[-*]\s+/, '');      // unordered list markers
    line = line.replace(/^\s*\d+\.\s+/, '');     // ordered list markers
    line = line.replace(/\*\*(.+?)\*\*/g, '$1'); // bold
    line = line.replace(/\*(.+?)\*/g, '$1');     // italic
    line = line.replace(/`([^`]+)`/g, '$1');     // inline code
    line = line.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // links → text
    out.push(line);
  }
  const body = out.join('\n').replace(/\n{2,}/g, '\n\n').trim();
  return `${title}.\n\n${body}`;
}

function sourceHash(title, rawBody) {
  return 'sha256:' + createHash('sha256').update(`${title}\n${rawBody}`).digest('hex');
}

// ── Text chunking for long posts ─────────────────────────────────────────────
function chunkText(text) {
  if (text.length <= MAX_CHARS_PER_REQUEST) return [text];
  const paragraphs = text.split(/\n\n+/);
  const chunks = [];
  let cur = '';
  for (const p of paragraphs) {
    if ((cur + '\n\n' + p).length > MAX_CHARS_PER_REQUEST && cur) {
      chunks.push(cur);
      cur = p;
    } else {
      cur = cur ? cur + '\n\n' + p : p;
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

// ── ElevenLabs request ───────────────────────────────────────────────────────
async function generateClip(text) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=${OUTPUT_FORMAT}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model_id: MODEL_ID, voice_settings: VOICE_SETTINGS }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── MP3 chunk join ───────────────────────────────────────────────────────────
// ElevenLabs prefixes every clip with an ID3v2 tag. Concatenating raw clips
// leaves those tags mid-stream, which can skew duration/seeking. Strip the
// leading ID3v2 tag from every chunk after the first, then join the frames.
function stripLeadingId3v2(buf) {
  if (buf.length < 10 || buf.toString('latin1', 0, 3) !== 'ID3') return buf;
  // bytes 6–9 are a syncsafe 28-bit size (high bit of each byte is 0)
  const size = (buf[6] << 21) | (buf[7] << 14) | (buf[8] << 7) | buf[9];
  return buf.subarray(10 + size);
}

function joinMp3Chunks(buffers) {
  if (buffers.length === 1) return buffers[0];
  return Buffer.concat(buffers.map((b, i) => (i === 0 ? b : stripLeadingId3v2(b))));
}

// ── Main ─────────────────────────────────────────────────────────────────────
mkdirSync(AUDIO_DIR, { recursive: true });

let manifest = {};
if (existsSync(MANIFEST)) {
  try { manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')); } catch { manifest = {}; }
}

const draftFiles = readdirSync(DRAFTS_DIR).filter(f => f.endsWith('.md'));
const posts = [];
for (const file of draftFiles) {
  const { meta, body } = parseFrontMatter(readFileSync(join(DRAFTS_DIR, file), 'utf8'));
  if (meta.status === 'draft') continue;
  if (!meta.track || !meta.track.startsWith('japanese/')) continue;
  if (!meta.slug) continue;
  if (ONLY_SLUG && meta.slug !== ONLY_SLUG) continue;
  posts.push({ slug: meta.slug, title: meta.title, body });
}

if (posts.length === 0) {
  console.log(ONLY_SLUG
    ? `No ready Japanese post found with slug "${ONLY_SLUG}".`
    : 'No ready Japanese-track posts found.');
  process.exit(0);
}

// ── --check: read-only drift gate (no API calls, runs in CI without a key) ───
// Fails if any committed MP3's source text drifted from the manifest hash, or
// its voice changed. A post with NO committed audio is fine (audio is opt-in).
if (CHECK) {
  let stale = 0;
  for (const { slug, title, body } of posts) {
    if (!existsSync(join(AUDIO_DIR, `${slug}.mp3`))) continue; // no audio → not drift
    const entry = manifest[slug];
    const hash = sourceHash(title, body);
    if (!entry || entry.textHash !== hash || entry.voiceId !== VOICE_ID) {
      console.error(`  ✗ ${slug}.mp3 is stale — re-run: node data-pipeline/generate-blog-audio.mjs --slug ${slug}`);
      stale++;
    } else {
      console.log(`  ✓ ${slug}.mp3`);
    }
  }
  if (stale) {
    console.error(`\n✗ ${stale} blog audio file(s) out of sync with their source.`);
    process.exit(1);
  }
  console.log('\n✓ All committed blog audio is in sync.');
  process.exit(0);
}

console.log(`Voice:  ${VOICE_ID}`);
console.log(`Model:  ${MODEL_ID}`);
console.log(`Posts:  ${posts.length}\n`);

let generated = 0, skipped = 0, errors = 0;

for (const { slug, title, body } of posts) {
  const outPath = join(AUDIO_DIR, `${slug}.mp3`);
  const hash = sourceHash(title, body);
  const entry = manifest[slug];

  const unchanged = !FORCE && existsSync(outPath) &&
    entry && entry.textHash === hash && entry.voiceId === VOICE_ID;
  if (unchanged) {
    console.log(`  skip  ${slug}.mp3  (unchanged)`);
    skipped++;
    continue;
  }

  const text = markdownToPlainText(title, body);
  const chunks = text.length > SOFT_TOTAL_LIMIT ? chunkText(text) : [text];

  try {
    process.stdout.write(`  gen   ${slug}.mp3  (${text.length} chars, ${chunks.length} chunk(s))… `);
    const buffers = [];
    for (let i = 0; i < chunks.length; i++) {
      buffers.push(await generateClip(chunks[i]));
      if (i < chunks.length - 1) await sleep(600);
    }
    writeFileSync(outPath, joinMp3Chunks(buffers)); // strips mid-stream ID3 tags
    manifest[slug] = { voiceId: VOICE_ID, textHash: hash, generatedAt: new Date().toISOString() };
    console.log('done');
    generated++;
    await sleep(600);
  } catch (err) {
    console.log(`ERROR: ${err.message}`);
    errors++;
  }
}

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');

console.log(`\n─────────────────────────────────────────`);
console.log(`Generated: ${generated}  |  Skipped: ${skipped}  |  Errors: ${errors}`);
console.log(`Manifest:  blog-pipeline/audio-manifest.json`);
if (errors) process.exit(1);
