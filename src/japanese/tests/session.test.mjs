// session.test.mjs — unit tests for game session scoring and re-queue logic.
// These tests verify the rules implemented in soundMatch.js and typeRomaji.js
// without touching the DOM. The simulation mirrors the state machine exactly.
// Run: node --test src/japanese/tests/session.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';

// ── Pure session simulation (mirrors soundMatch/typeRomaji state machine) ─────
// This is the extracted logic — any change to the game files should be
// reflected here so the tests stay in sync.

function createSession(items, maxItems = 12) {
  const session    = [...items].slice(0, Math.min(items.length, maxItems));
  const sessionLen = session.length; // denominator for final score (first-try count)
  let idx     = 0;
  let correct = 0;
  const requeued = new Set();

  return {
    get isDone()              { return idx >= session.length; },
    get currentItem()         { return session[idx]; },
    get progressNumerator()   { return idx + 1; },
    get progressDenominator() { return session.length; },  // dynamic — grows on misses
    get score()               { return { correct, total: sessionLen }; },
    get sessionLength()       { return session.length; },

    answer(isCorrect) {
      const item    = session[idx];
      const isRetry = requeued.has(item.id);

      if (isCorrect && !isRetry) correct++;

      if (!isCorrect && !isRetry) {
        requeued.add(item.id);
        const insertAt = Math.min(idx + 3, session.length);
        session.splice(insertAt, 0, item);
      }

      idx++;
    },

    reset(newItems) {
      session.splice(0, session.length, ...[...newItems].slice(0, Math.min(newItems.length, maxItems)));
      idx = 0; correct = 0; requeued.clear();
    },
  };
}

const ITEMS = [
  { id: 'a' }, { id: 'b' }, { id: 'c' },
  { id: 'd' }, { id: 'e' },
];

// ── Correct-answer counting ───────────────────────────────────────────────────

test('score: all correct on first try gives 100%', () => {
  const s = createSession(ITEMS);
  while (!s.isDone) s.answer(true);
  assert.equal(s.score.correct, 5);
  assert.equal(s.score.total, 5);
});

test('score: all wrong on first try (all eventually correct) gives 0%', () => {
  // Use 3 items: with +3 offset, each re-queued item appends past all originals
  // so the "wrong pass" cleanly completes before any retry appears.
  //   [a,b,c] → miss a at idx=0 → insert at min(3,3)=3 → [a,b,c,a]
  //           → miss b at idx=1 → insert at min(4,4)=4 → [a,b,c,a,b]
  //           → miss c at idx=2 → insert at min(5,5)=5 → [a,b,c,a,b,c]
  //   then all retries are correctly answered → correct stays 0
  const threeItems = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const s = createSession(threeItems);
  s.answer(false); // a ✗
  s.answer(false); // b ✗
  s.answer(false); // c ✗
  while (!s.isDone) s.answer(true); // all retries correct → not counted
  assert.equal(s.score.correct, 0);
  assert.equal(s.score.total, 3);
});

test('score: mixed — 3 correct, 2 wrong (wrong later corrected) gives 60%', () => {
  const s = createSession(ITEMS);
  s.answer(true);  // a ✓
  s.answer(true);  // b ✓
  s.answer(false); // c ✗ → re-queued
  s.answer(true);  // d ✓
  s.answer(false); // e ✗ → re-queued
  // Now we're past the original 5; answer re-queued items
  while (!s.isDone) s.answer(true);
  assert.equal(s.score.correct, 3);
  assert.equal(s.score.total, 5);
});

test('score: re-queued item answered wrong again does not re-queue a second time', () => {
  // Use 2 items so re-queued position is deterministic:
  //   [x,y] → miss x at idx=0 → insert at min(3,2)=2 → [x,y,x]
  //         → answer y correctly at idx=1
  //         → idx=2 is x (retry); answer wrong again → must NOT grow session
  const twoItems = [{ id: 'x' }, { id: 'y' }];
  const s = createSession(twoItems);
  s.answer(false); // x ✗ → session: [x, y, x] (len 3)
  s.answer(true);  // y ✓ — idx now at 2 (the x retry)
  const lenBefore = s.sessionLength; // 3
  s.answer(false); // x retry ✗ — must NOT grow session further
  assert.equal(s.sessionLength, lenBefore, 'session must not grow on second miss of same item');
});

// ── Progress bar denominator ──────────────────────────────────────────────────

test('progress: denominator starts at item count', () => {
  const s = createSession(ITEMS);
  assert.equal(s.progressDenominator, 5);
});

test('progress: denominator grows by 1 each time an item is missed', () => {
  const s = createSession(ITEMS);
  assert.equal(s.progressDenominator, 5);
  s.answer(false); // a ✗ → session grows to 6
  assert.equal(s.progressDenominator, 6);
  s.answer(false); // b ✗ → session grows to 7
  assert.equal(s.progressDenominator, 7);
});

test('progress: denominator does not grow when re-queued item is missed again', () => {
  // 2 items: x wrong → [x,y,x]; answer y correctly; at idx=2 is x retry.
  const twoItems = [{ id: 'x' }, { id: 'y' }];
  const s = createSession(twoItems);
  s.answer(false); // x ✗ → len 3
  s.answer(true);  // y ✓
  const lenAtRetry = s.sessionLength; // 3
  s.answer(false); // x retry ✗ — must stay 3
  assert.equal(s.sessionLength, lenAtRetry);
});

test('progress: denominator is used in progress bar display while score total stays original', () => {
  const s = createSession(ITEMS);
  s.answer(false); // a ✗
  // progress bar shows current session length (6), not original (5)
  assert.equal(s.progressDenominator, 6);
  // score denominator stays original
  while (!s.isDone) s.answer(true);
  assert.equal(s.score.total, 5);
});

// ── Session termination ───────────────────────────────────────────────────────

test('session ends after exactly 5 correct answers (no misses)', () => {
  const s = createSession(ITEMS);
  let answered = 0;
  while (!s.isDone) { s.answer(true); answered++; }
  assert.equal(answered, 5);
});

test('session ends only after re-queued items are answered (not at original count)', () => {
  const twoItems = [{ id: 'x' }, { id: 'y' }];
  const s = createSession(twoItems);
  s.answer(false); // x ✗ → re-queued; session now has 3 items
  s.answer(true);  // y ✓
  assert.equal(s.isDone, false, 'game must continue: re-queued x not yet answered');
  s.answer(true);  // x retry ✓
  assert.equal(s.isDone, true);
});

// ── maxItems cap ──────────────────────────────────────────────────────────────

test('session respects maxItems cap', () => {
  const bigItems = Array.from({ length: 20 }, (_, i) => ({ id: `item-${i}` }));
  const s = createSession(bigItems, 10);
  assert.equal(s.score.total, 10);
});

// ── Reset ─────────────────────────────────────────────────────────────────────

test('reset restores session to fresh state', () => {
  const s = createSession(ITEMS);
  s.answer(true);
  s.answer(false);
  s.reset(ITEMS);
  assert.equal(s.score.correct, 0);
  assert.equal(s.score.total, 5);
  assert.equal(s.progressDenominator, 5);
  assert.equal(s.isDone, false);
});
