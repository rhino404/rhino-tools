#!/usr/bin/env node
/**
 * generate-japanese-audio.mjs
 *
 * Generates ElevenLabs audio clips for hiragana. Run locally — never commit the key.
 *
 *   # List available Japanese voices and pick one:
 *   ELEVENLABS_API_KEY=sk_... node data-pipeline/generate-japanese-audio.mjs --list-voices
 *
 *   # Generate all clips (skips files that already exist):
 *   ELEVENLABS_API_KEY=sk_... ELEVENLABS_VOICE_ID=<id> node data-pipeline/generate-japanese-audio.mjs
 *
 *   # Regenerate everything from scratch (wipes existing clips first):
 *   ELEVENLABS_API_KEY=sk_... ELEVENLABS_VOICE_ID=<id> node data-pipeline/generate-japanese-audio.mjs --force
 *
 * Reads:   src/japanese/data/hiragana.json
 * Writes:  src/japanese/audio/<id>.mp3
 *
 * Credit-saving rules:
 *   - Idempotent by default: skips files that already exist (use --force to override).
 *   - Deduplication: ぢ shares じ's clip, づ shares ず's (same sounds, one file each).
 *   - Model: eleven_multilingual_v2 — highest-quality multilingual model.
 *   - Output: mp3_44100_128 — 128 kbps, good fidelity for committed static assets.
 *
 * Text strategy for single kana:
 *   Isolated kana can sound clipped. We send  「X」  (Japanese quotation marks)
 *   which prompts the model to voice the character as a clear, deliberate utterance
 *   rather than a throw-away syllable. For yoon combos we include a short example
 *   word in parentheses to help the model produce natural pitch-accent.
 *
 * ⚠️  Commercial-license note:
 *   ryno.tools runs AdSense (monetised). Confirm your ElevenLabs plan permits
 *   redistributing generated speech on a monetised site before running this.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const DATA_FILE = join(ROOT, 'src/japanese/data/hiragana.json');
const AUDIO_DIR = join(ROOT, 'src/japanese/audio');

const API_KEY = process.env.ELEVENLABS_API_KEY;
if (!API_KEY) {
  console.error('ERROR: ELEVENLABS_API_KEY env var is not set.');
  process.exit(1);
}

const FORCE = process.argv.includes('--force');
const LIST_VOICES = process.argv.includes('--list-voices');

// ── ElevenLabs config ────────────────────────────────────────────────────────
//
// VOICE_ID: set via env var after running --list-voices.
// Prefer a native Japanese voice from the Voice Library for best results.
// If unset, the script aborts (unless --list-voices).
//
const VOICE_ID     = process.env.ELEVENLABS_VOICE_ID;
const MODEL_ID     = 'eleven_multilingual_v2';   // highest-quality multilingual model
const OUTPUT_FORMAT = 'mp3_44100_128';            // 128 kbps — good fidelity for static assets

const VOICE_SETTINGS = {
  stability:       0.5,   // lower = more expressive; 0.5 is natural for JP
  similarity_boost: 0.8,  // stay close to the voice character
  style:           0.2,   // slight expressiveness — makes isolated kana sound less robotic
  use_speaker_boost: true,
};

// ── Voice discovery ──────────────────────────────────────────────────────────

async function listJapaneseVoices() {
  console.log('Fetching Japanese voices from ElevenLabs Voice Library…\n');
  const url = 'https://api.elevenlabs.io/v1/shared-voices?language=ja&page_size=100&sort=trending';
  const res = await fetch(url, { headers: { 'xi-api-key': API_KEY } });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const voices = data.voices || [];
  if (!voices.length) { console.log('No Japanese voices found.'); return; }

  console.log(`Found ${voices.length} Japanese voices (sorted by trending):\n`);
  console.log('  VOICE ID                          NAME                           GENDER     ACCENT');
  console.log('  ' + '─'.repeat(86));
  for (const v of voices) {
    const id     = v.voice_id.padEnd(34);
    const name   = (v.name || '').padEnd(30);
    const gender = (v.labels?.gender || '?').padEnd(10);
    const accent = v.labels?.accent || v.accent || '?';
    console.log(`  ${id} ${name} ${gender} ${accent}`);
  }
  console.log(`\nSet the voice you want:\n  ELEVENLABS_VOICE_ID=<voice_id> node data-pipeline/generate-japanese-audio.mjs`);
}

// ── Text preparation ─────────────────────────────────────────────────────────
//
// Spec: native Japanese voice → use original Japanese text, no transliteration.
//
// Bare vowels and ん are tricky: sent alone they get wrong pitch or English
// pronunciation. Each needs a specific pattern discovered by test generation:
//
//   あ → 「あ」。   brackets + period works fine (open vowel, stable)
//   い → いい。     real word "good"; bare い sounds like English "aye"
//   う → うー。     long-vowel marker sustains the compressed "oo"
//   え → えー。     long-vowel marker holds the flat "eh"; bare えー≈"ay"
//   お → おお。     doubled; natural exclamation "oh!"
//   ん → うん。     natural utterance "yeah"; bare ん is just nasal noise
//
// All other kana (consonant+vowel): 「X」。 — the leading consonant anchors
// pronunciation so the model commits to the correct Japanese sound.

const TEXT_OVERRIDES = {
  'hira-i': 'いい。',
  'hira-u': 'うー。',
  'hira-e': 'えー。',
  'hira-o': 'おお。',
  'hira-n': 'うん。',
};

function prepareText(item) {
  if (TEXT_OVERRIDES[item.id]) return TEXT_OVERRIDES[item.id];
  return `「${item.char}」。`;
}

// ── Core generator ───────────────────────────────────────────────────────────

async function generateClip(text, outputPath) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=${OUTPUT_FORMAT}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model_id: MODEL_ID, voice_settings: VOICE_SETTINGS }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  writeFileSync(outputPath, Buffer.from(await res.arrayBuffer()));
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Main ─────────────────────────────────────────────────────────────────────

if (LIST_VOICES) {
  await listJapaneseVoices();
  process.exit(0);
}

if (!VOICE_ID) {
  console.error('ERROR: ELEVENLABS_VOICE_ID is not set.');
  console.error('Run with --list-voices first to find a native Japanese voice, then:\n');
  console.error('  ELEVENLABS_VOICE_ID=<id> node data-pipeline/generate-japanese-audio.mjs');
  process.exit(1);
}

const data = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
const kana = data.kana;

mkdirSync(AUDIO_DIR, { recursive: true });

// Wipe existing clips if --force
if (FORCE) {
  const existing = readdirSync(AUDIO_DIR).filter(f => f.endsWith('.mp3'));
  if (existing.length) {
    console.log(`--force: removing ${existing.length} existing clip(s)…`);
    for (const f of existing) rmSync(join(AUDIO_DIR, f));
  }
}

// Only canonical clips (shared homophone aliases point to another id's file)
const toGenerate = kana.filter(k => k.audio === k.id);

let generated = 0, skipped = 0, errors = 0;

console.log(`Model:  ${MODEL_ID}`);
console.log(`Voice:  ${VOICE_ID}`);
console.log(`Clips:  ${toGenerate.length} unique  (${kana.length - toGenerate.length} shared/deduplicated)\n`);

for (const item of toGenerate) {
  const outPath = join(AUDIO_DIR, `${item.audio}.mp3`);

  if (!FORCE && existsSync(outPath)) {
    console.log(`  skip  ${item.audio}.mp3`);
    skipped++;
    continue;
  }

  const text = prepareText(item);

  try {
    process.stdout.write(`  gen   ${item.audio}.mp3  (${item.char} = ${item.romaji})… `);
    await generateClip(text, outPath);
    console.log('done');
    generated++;
    await sleep(600); // ~1.6 req/s — well within rate limits
  } catch (err) {
    console.log(`ERROR: ${err.message}`);
    errors++;
  }
}

console.log(`\n─────────────────────────────────────────`);
console.log(`Generated: ${generated}  |  Skipped: ${skipped}  |  Errors: ${errors}`);
if (errors) {
  console.log('\nRe-run without --force to retry only the failed clips.');
  process.exit(1);
}
