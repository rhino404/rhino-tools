// gameSession.test.mjs — unit tests for the shared game session state machine.
// Imports the REAL gameSession.js so bugs in the source are caught here.
// Run: node --test src/japanese/tests/gameSession.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';

// Inject identity shuffle so test scenarios are deterministic.
const identity = a => a;
const { createGameSession } = await import('../games/gameSession.js');
const make = (items, maxItems = 12) => createGameSession(items, { maxItems, shuffle: identity });

const ITEMS = [
  { id: 'a' }, { id: 'b' }, { id: 'c' },
  { id: 'd' }, { id: 'e' },
];

// ── Score counting ────────────────────────────────────────────────────────────

test('score: all correct on first try → 100%', () => {
  const g = make(ITEMS);
  while (!g.isDone) g.answer(true);
  assert.equal(g.score.correct, 5);
  assert.equal(g.score.total, 5);
  assert.equal(g.score.pct, 100);
});

test('score: all wrong first then all retries correct → 0%', () => {
  // 3 items: with +3 offset each re-queued item appends past all originals
  //   [a,b,c] → miss a → insert at min(3,3)=3 → [a,b,c,a]
  //           → miss b → insert at min(4,4)=4 → [a,b,c,a,b]
  //           → miss c → insert at min(5,5)=5 → [a,b,c,a,b,c]
  //   retries answered correctly → score stays 0
  const g = make([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
  g.answer(false); // a ✗
  g.answer(false); // b ✗
  g.answer(false); // c ✗
  while (!g.isDone) g.answer(true); // retries — not counted
  assert.equal(g.score.correct, 0);
  assert.equal(g.score.total, 3);
  assert.equal(g.score.pct, 0);
});

test('score: mixed — 3 correct, 2 wrong (later corrected) → 60%', () => {
  const g = make(ITEMS);
  g.answer(true);  // a ✓
  g.answer(true);  // b ✓
  g.answer(false); // c ✗ → re-queued
  g.answer(true);  // d ✓
  g.answer(false); // e ✗ → re-queued
  while (!g.isDone) g.answer(true); // retries — not counted
  assert.equal(g.score.correct, 3);
  assert.equal(g.score.total, 5);
  assert.equal(g.score.pct, 60);
});

test('score: empty item list → isDone immediately, pct 0 (no NaN)', () => {
  const g = make([]);
  assert.equal(g.isDone, true);
  assert.equal(g.score.pct, 0);
});

// ── Mastery signal ────────────────────────────────────────────────────────────

test('mastery: first-try correct returns creditMastery: true', () => {
  const g = make([{ id: 'x' }]);
  const res = g.answer(true);
  assert.equal(res.creditMastery, true);
  assert.equal(res.firstTry, true);
  assert.equal(res.isCorrect, true);
});

test('mastery: first-try wrong returns creditMastery: false, firstTry: true', () => {
  const g = make([{ id: 'x' }, { id: 'y' }]);
  const res = g.answer(false);
  assert.equal(res.creditMastery, false);
  assert.equal(res.firstTry, true);
  assert.equal(res.isCorrect, false);
});

test('mastery: retry-correct returns creditMastery: false (firstTry: false)', () => {
  // [x, y] → miss x → [x, y, x]; answer y; then x retry
  const g = make([{ id: 'x' }, { id: 'y' }]);
  g.answer(false); // x ✗ → re-queued
  g.answer(true);  // y ✓
  const res = g.answer(true); // x retry ✓
  assert.equal(res.creditMastery, false);
  assert.equal(res.firstTry, false);
});

// ── Once-per-visit mastery guard (the core fix) ───────────────────────────────

test('mastery: after restart(), same item first-try-correct → creditMastery: false', () => {
  const g = make([{ id: 'x' }]);
  const first = g.answer(true); // visit 1: credited
  assert.equal(first.creditMastery, true);

  g.restart();
  const second = g.answer(true); // replay: same visit → NOT credited
  assert.equal(second.creditMastery, false);
  // But session score still increments (honest per-play score)
  assert.equal(g.score.correct, 1);
});

test('mastery: two restarts, same item, creditMastery always false after first credit', () => {
  const g = make([{ id: 'x' }]);
  assert.equal(g.answer(true).creditMastery, true);  // visit 1: credited
  g.restart();
  assert.equal(g.answer(true).creditMastery, false); // replay 1
  g.restart();
  assert.equal(g.answer(true).creditMastery, false); // replay 2
});

// ── Re-queue guard ────────────────────────────────────────────────────────────

test('re-queue: miss grows total by 1', () => {
  const g = make(ITEMS);
  assert.equal(g.total, 5);
  g.answer(false); // a ✗
  assert.equal(g.total, 6);
});

test('re-queue: second miss of same item does not grow total', () => {
  // [x, y] → miss x → [x, y, x]; answer y correctly; x retry miss → must stay 3
  const g = make([{ id: 'x' }, { id: 'y' }]);
  g.answer(false); // x ✗ → total 3
  g.answer(true);  // y ✓
  const before = g.total; // 3
  g.answer(false); // x retry ✗ → must NOT grow
  assert.equal(g.total, before);
});

// ── Progress bar denominator ──────────────────────────────────────────────────

test('progress: total grows on miss, sessionLen stays original', () => {
  const g = make(ITEMS);
  g.answer(false); // a ✗
  assert.equal(g.total, 6);      // dynamic — for progress bar
  while (!g.isDone) g.answer(true);
  assert.equal(g.score.total, 5); // original — for score display
});

// ── Session termination ───────────────────────────────────────────────────────

test('session ends after all items answered (no misses)', () => {
  const g = make(ITEMS);
  let n = 0;
  while (!g.isDone) { g.answer(true); n++; }
  assert.equal(n, 5);
});

test('session ends only after re-queued items are answered', () => {
  const g = make([{ id: 'x' }, { id: 'y' }]);
  g.answer(false); // x ✗ → re-queued
  g.answer(true);  // y ✓
  assert.equal(g.isDone, false); // x retry still pending
  g.answer(true);  // x retry ✓
  assert.equal(g.isDone, true);
});

// ── maxItems cap ──────────────────────────────────────────────────────────────

test('maxItems cap applied at session start', () => {
  const big = Array.from({ length: 20 }, (_, i) => ({ id: `item-${i}` }));
  const g = make(big, 10);
  assert.equal(g.score.total, 10);
});

// ── restart() ────────────────────────────────────────────────────────────────

test('restart resets per-play state: idx, correct, session length', () => {
  const g = make(ITEMS);
  g.answer(true);  // a ✓
  g.answer(false); // b ✗ → total 6
  g.restart();
  assert.equal(g.score.correct, 0);
  assert.equal(g.score.total, 5);
  assert.equal(g.total, 5);
  assert.equal(g.isDone, false);
  assert.equal(g.index, 0);
});
