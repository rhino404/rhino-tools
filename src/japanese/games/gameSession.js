// gameSession.js — pure state machine for scored game sessions (Match and Type modes).
// No DOM, no localStorage — fully unit-testable and the single source of truth for the
// re-queue/scoring rules that previously lived in duplicate inside soundMatch and typeRomaji.
//
// Mastery signal rules (returned by answer()):
//   creditMastery: true  → markResult(true)          — first-try correct, once per visit
//   firstTry && !correct → markResult(false)          — first-try wrong (seen, no increment)
//   else                 → markSeen()                 — retry or replay re-hit (never inflates)

export function defaultShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createGameSession(items, { maxItems = 12, shuffle = defaultShuffle } = {}) {
  let session    = shuffle(items).slice(0, Math.min(items.length, maxItems));
  let sessionLen = session.length;   // fixed score denominator (never changes within a play)
  let idx = 0, correct = 0;
  const requeued = new Set();        // guards re-queue: each item at most once per play
  const credited = new Set();        // guards mastery: each item at most once per VISIT (survives restart)

  return {
    get current()    { return session[idx]; },
    get isDone()     { return idx >= session.length; },
    get index()      { return idx; },
    get total()      { return session.length; },     // dynamic → progress bar denominator
    get sessionLen() { return sessionLen; },          // original → score denominator
    get correct()    { return correct; },
    get score() {
      return {
        correct,
        total: sessionLen,
        pct: sessionLen ? Math.round((correct / sessionLen) * 100) : 0,
      };
    },

    // Records the answer for the current item and advances the cursor.
    // Returns { item, firstTry, isCorrect, creditMastery } so the caller decides
    // which engine call to make (markResult vs markSeen).
    answer(isCorrect) {
      const item     = session[idx];
      const firstTry = !requeued.has(item.id);

      if (isCorrect && firstTry) correct++;   // session score counts first-try only

      let creditMastery = false;
      if (isCorrect && firstTry && !credited.has(item.id)) {
        credited.add(item.id);
        creditMastery = true;                 // mastery counted at most once per visit
      }

      if (!isCorrect && firstTry) {
        requeued.add(item.id);
        const insertAt = Math.min(idx + 3, session.length);
        session.splice(insertAt, 0, item);
      }

      idx++;
      return { item, firstTry, isCorrect, creditMastery };
    },

    // "Play again" — resets per-play state, keeps `credited` so mastery isn't inflated.
    restart(newItems = items) {
      session    = shuffle(newItems).slice(0, Math.min(newItems.length, maxItems));
      sessionLen = session.length;
      idx = 0; correct = 0;
      requeued.clear();
      // credited intentionally NOT cleared — once-per-visit protection survives replays
    },
  };
}
