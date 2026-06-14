// engine.test.mjs — unit tests for engine.js progress tracking functions.
// Run: node --test src/japanese/tests/engine.test.mjs

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Minimal localStorage mock (must be set before engine.js is imported)
const store = {};
global.localStorage = {
  getItem:    k    => store[k] ?? null,
  setItem:    (k, v) => { store[k] = String(v); },
  removeItem: k    => { delete store[k]; },
  clear:      ()   => { Object.keys(store).forEach(k => delete store[k]); },
};
// engine.js also uses fetch (for loadTrack/loadManifest) — not needed for progress tests.
global.fetch = () => Promise.reject(new Error('fetch not mocked'));

const {
  isMastered,
  getItemState,
  markResult,
  markSeen,
  getProgress,
  overallStats,
  isSkillMastered,
  MASTERY_THRESHOLD,
} = await import('../engine.js');

// ── Helpers ───────────────────────────────────────────────────────────────────

function clearProgress() {
  global.localStorage.clear();
}

// ── isMastered ────────────────────────────────────────────────────────────────

test('isMastered: returns false for item with no progress', () => {
  assert.equal(isMastered('x', {}), false);
});

test('isMastered: returns false below MASTERY_THRESHOLD', () => {
  const progress = { 'item-1': { seen: true, correct: MASTERY_THRESHOLD - 1 } };
  assert.equal(isMastered('item-1', progress), false);
});

test('isMastered: returns true at exactly MASTERY_THRESHOLD', () => {
  const progress = { 'item-1': { seen: true, correct: MASTERY_THRESHOLD } };
  assert.equal(isMastered('item-1', progress), true);
});

test('isMastered: returns true above MASTERY_THRESHOLD', () => {
  const progress = { 'item-1': { seen: true, correct: MASTERY_THRESHOLD + 5 } };
  assert.equal(isMastered('item-1', progress), true);
});

// ── getItemState ──────────────────────────────────────────────────────────────

test('getItemState: unseen item returns "unseen"', () => {
  assert.equal(getItemState('x', {}), 'unseen');
});

test('getItemState: seen but not mastered returns "seen"', () => {
  const progress = { 'a': { seen: true, correct: 0 } };
  assert.equal(getItemState('a', progress), 'seen');
});

test('getItemState: mastered item returns "mastered"', () => {
  const progress = { 'a': { seen: true, correct: MASTERY_THRESHOLD } };
  assert.equal(getItemState('a', progress), 'mastered');
});

// ── markSeen / markResult ─────────────────────────────────────────────────────

test('markSeen: item becomes seen, correct stays 0', () => {
  clearProgress();
  markSeen('hiragana', 'hira-a');
  const p = getProgress('hiragana');
  assert.equal(p['hira-a']?.seen, true);
  assert.equal(p['hira-a']?.correct, 0);
});

test('markResult: correct answer increments correct count', () => {
  clearProgress();
  markResult('hiragana', 'hira-a', true);
  const p = getProgress('hiragana');
  assert.equal(p['hira-a'].correct, 1);
});

test('markResult: wrong answer does not increment correct count', () => {
  clearProgress();
  markResult('hiragana', 'hira-a', false);
  const p = getProgress('hiragana');
  assert.equal(p['hira-a'].correct, 0);
});

test('markResult: accumulates correct counts across calls', () => {
  clearProgress();
  markResult('hiragana', 'hira-a', true);
  markResult('hiragana', 'hira-a', true);
  markResult('hiragana', 'hira-a', false);
  markResult('hiragana', 'hira-a', true);
  const p = getProgress('hiragana');
  assert.equal(p['hira-a'].correct, 3);
});

test('markResult: progress is namespaced by trackId', () => {
  clearProgress();
  markResult('hiragana', 'id-1', true);
  markResult('katakana', 'id-1', false);
  assert.equal(getProgress('hiragana')['id-1'].correct, 1);
  assert.equal(getProgress('katakana')['id-1'].correct, 0);
});

// ── markSeen on already-correct item ─────────────────────────────────────────
// Guards the retry path: game calls markSeen() for retries; must never inflate mastery.

test('markSeen: calling on item with existing correct count leaves correct unchanged', () => {
  clearProgress();
  markResult('hiragana', 'hira-a', true);   // correct = 1
  markResult('hiragana', 'hira-a', true);   // correct = 2
  markSeen('hiragana', 'hira-a');           // retry path — must stay 2
  assert.equal(getProgress('hiragana')['hira-a'].correct, 2);
});

// ── overallStats ──────────────────────────────────────────────────────────────

test('overallStats: all unseen returns 0 mastered', () => {
  const track = { items: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] };
  const stats = overallStats(track, {});
  assert.equal(stats.mastered, 0);
  assert.equal(stats.total, 3);
});

test('overallStats: counts only items at mastery threshold', () => {
  const track = { items: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] };
  const progress = {
    a: { seen: true, correct: MASTERY_THRESHOLD },
    b: { seen: true, correct: MASTERY_THRESHOLD - 1 },
    c: { seen: true, correct: MASTERY_THRESHOLD + 2 },
  };
  const stats = overallStats(track, progress);
  assert.equal(stats.mastered, 2); // a and c
  assert.equal(stats.total, 3);
});

// ── isSkillMastered ───────────────────────────────────────────────────────────

test('isSkillMastered: empty track returns false (no false-positive)', () => {
  assert.equal(isSkillMastered({ items: [] }, {}), false);
});

test('isSkillMastered: some-but-not-all mastered returns false', () => {
  const track = { items: [{ id: 'a' }, { id: 'b' }] };
  const progress = { a: { seen: true, correct: MASTERY_THRESHOLD } };
  assert.equal(isSkillMastered(track, progress), false);
});

test('isSkillMastered: all items at threshold returns true', () => {
  const track = { items: [{ id: 'a' }, { id: 'b' }] };
  const progress = {
    a: { seen: true, correct: MASTERY_THRESHOLD },
    b: { seen: true, correct: MASTERY_THRESHOLD + 1 },
  };
  assert.equal(isSkillMastered(track, progress), true);
});
