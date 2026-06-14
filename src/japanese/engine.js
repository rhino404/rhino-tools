// engine.js — track-generic data loading, progress, unlock logic, audio.
// Replaces the hiragana-only kanaEngine.js. Works for any track defined in
// data/manifest.json (kana grids and vocab/sentence decks alike).

const PROGRESS_KEY = 'jp-progress';
export const MASTERY_THRESHOLD = 3;   // correct answers to mark an item mastered
const UNLOCK_RATIO = 0.8;      // fraction of a stage mastered to unlock the next
const KNOWN_TRACK_IDS = ['hiragana', 'katakana', 'vocab', 'sentences-1', 'numbers', 'kanji-g1'];

// ── Manifest & track loading (lazy — only fetch a track's data when opened) ──

let _manifest = null;
const _trackCache = {};

export async function loadManifest() {
  if (_manifest) return _manifest;
  const res = await fetch('/japanese/data/manifest.json');
  _manifest = await res.json();
  return _manifest;
}

export async function loadTrack(trackId) {
  if (_trackCache[trackId]) return _trackCache[trackId];
  const manifest = await loadManifest();

  // v2: search levels[].skills[]; v1 fallback: tracks[]
  let meta = null;
  if (manifest.levels) {
    for (const level of manifest.levels) {
      meta = (level.skills || []).find(s => s.id === trackId);
      if (meta) break;
    }
  } else {
    meta = (manifest.tracks || []).find(t => t.id === trackId);
  }
  if (!meta) throw new Error(`Unknown track: ${trackId}`);
  const res = await fetch(`/japanese/data/${meta.data}`);
  const data = await res.json();
  const track = {
    ...meta,
    stages: data.stages || [],
    items: data.items || data.kana || [],
  };
  _trackCache[trackId] = track;
  return track;
}

// ── Progress (namespaced by track) ───────────────────────────────────────────

function _loadAll() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; }
  catch { return {}; }
}
function _saveAll(p) { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); }

// One-time migration: old flat shape { 'hira-a': {seen,correct} } →
// namespaced { hiragana: { 'hira-a': {...} } }. Detected by a top-level key that
// isn't a track id but holds a {seen|correct} entry.
function _migrate(all) {
  const keys = Object.keys(all);
  if (!keys.length) return all;
  const looksFlat = keys.some(k =>
    !KNOWN_TRACK_IDS.includes(k) &&
    all[k] && typeof all[k] === 'object' &&
    ('seen' in all[k] || 'correct' in all[k]));
  if (!looksFlat) return all;
  const migrated = { hiragana: {} };
  for (const k of keys) migrated.hiragana[k] = all[k];
  _saveAll(migrated);
  return migrated;
}

function _trackProgress(trackId) {
  const all = _migrate(_loadAll());
  return all[trackId] || {};
}
function _saveTrackProgress(trackId, tp) {
  const all = _migrate(_loadAll());
  all[trackId] = tp;
  _saveAll(all);
}

export function getProgress(trackId) { return _trackProgress(trackId); }
export function getAllProgress() { return _migrate(_loadAll()); }

// ── Level helpers (v2 manifest) ──────────────────────────────────────────────

// Returns a Set of level ids that are currently available (status:"available").
// Future: add mastery-based unlock when grades 2+ ship content.
export function getUnlockedLevelIds(manifest) {
  const unlocked = new Set();
  for (const level of (manifest.levels || [])) {
    if (level.status === 'available') unlocked.add(level.id);
  }
  return unlocked;
}

// Aggregate mastered/total counts for a level using manifest count declarations.
export function levelStats(level, allProgress) {
  let mastered = 0, total = 0;
  for (const skill of (level.skills || [])) {
    if (!skill.count) continue;
    total += skill.count;
    const tp = allProgress[skill.id] || {};
    mastered += Object.values(tp).filter(e => (e.correct || 0) >= MASTERY_THRESHOLD).length;
  }
  return { mastered, total };
}

export function markSeen(trackId, id) {
  const tp = _trackProgress(trackId);
  if (!tp[id]) tp[id] = { seen: true, correct: 0 };
  tp[id].seen = true;
  _saveTrackProgress(trackId, tp);
}

export function markResult(trackId, id, correct) {
  const tp = _trackProgress(trackId);
  if (!tp[id]) tp[id] = { seen: true, correct: 0 };
  tp[id].seen = true;
  if (correct) tp[id].correct = (tp[id].correct || 0) + 1;
  _saveTrackProgress(trackId, tp);
}

export function isMastered(id, progress) {
  return (progress?.[id]?.correct || 0) >= MASTERY_THRESHOLD;
}

export function getItemState(id, progress) {
  const e = progress?.[id];
  if (!e || !e.seen) return 'unseen';
  if (isMastered(id, progress)) return 'mastered';
  return 'seen';
}

// ── Stages & unlock logic ────────────────────────────────────────────────────

// A stage groups items by `rows` (kana) or `lessons` (vocab).
function itemsInStage(track, stage) {
  if (stage.rows)    return track.items.filter(it => stage.rows.includes(it.row));
  if (stage.lessons) return track.items.filter(it => stage.lessons.includes(it.lesson));
  return [];
}

function stageForItem(track, item) {
  return track.stages.find(s =>
    (s.rows && s.rows.includes(item.row)) ||
    (s.lessons && s.lessons.includes(item.lesson)));
}

export function getUnlockedStageIds(track, progress) {
  const stages = track.stages;
  if (!stages.length) return new Set();
  const unlocked = new Set([stages[0].id]);
  for (let i = 1; i < stages.length; i++) {
    const prevIds = itemsInStage(track, stages[i - 1]).map(it => it.id);
    const mastered = prevIds.filter(id => isMastered(id, progress)).length;
    if (prevIds.length && mastered / prevIds.length >= UNLOCK_RATIO) {
      unlocked.add(stages[i].id);
    } else {
      break; // stages are sequential
    }
  }
  return unlocked;
}

export function isItemUnlocked(track, item, progress) {
  if (!track.stages.length) return true;          // deck with no gating
  const stage = stageForItem(track, item);
  if (!stage) return true;
  return getUnlockedStageIds(track, progress).has(stage.id);
}

// ── Item queries ─────────────────────────────────────────────────────────────

export function getItemsByRow(track, row) {
  return track.items.filter(it => it.row === row);
}

export function getItemsByLesson(track, lesson) {
  return track.items.filter(it => it.lesson === lesson);
}

export function getWeakItems(track, progress) {
  return track.items.filter(it =>
    progress[it.id]?.seen &&
    !isMastered(it.id, progress) &&
    isItemUnlocked(track, it, progress));
}

export function overallStats(track, progress) {
  const mastered = track.items.filter(it => isMastered(it.id, progress)).length;
  return { mastered, total: track.items.length };
}

export function isSkillMastered(track, progress) {
  const { mastered, total } = overallStats(track, progress);
  return total > 0 && mastered >= total;
}

export function stageStats(track, stage, progress) {
  const ids = itemsInStage(track, stage).map(it => it.id);
  const mastered = ids.filter(id => isMastered(id, progress)).length;
  return { mastered, total: ids.length };
}

// What to surface on the primary CTA: next thing to learn, else review, else done.
export function getNextFocus(track, progress) {
  const unlocked = getUnlockedStageIds(track, progress);
  for (const stage of track.stages) {
    if (!unlocked.has(stage.id)) continue;
    const items = itemsInStage(track, stage);
    if (items.some(it => !progress[it.id]?.seen)) {
      return { mode: 'learn', stage, items, label: `Start: ${stage.label}` };
    }
  }
  const weak = getWeakItems(track, progress);
  if (weak.length) {
    return { mode: 'match', items: weak, label: `Review ${weak.length} weak` };
  }
  const unlockedItems = track.items.filter(it => isItemUnlocked(track, it, progress));
  return { mode: 'match', items: unlockedItems, label: 'Review all', allMastered: true };
}

// Derive a kana's vowel column (a/i/u/e/o) from its romaji. Returns null for ん.
export function vowelColumn(romaji) {
  for (let i = romaji.length - 1; i >= 0; i--) {
    if ('aiueo'.includes(romaji[i])) return romaji[i];
  }
  return null;
}

// Returns a CSS tier class for .jp-kana-display based on glyph count.
// Kana are 1 glyph → default huge size. Longer vocab words get smaller tiers.
export function kanaSizeClass(text) {
  const len = [...text].length;
  if (len <= 2) return '';
  if (len <= 5) return 'jp-kana-display--md';
  if (len <= 10) return 'jp-kana-display--sm';
  return 'jp-kana-display--xs';
}

// ── Difficulty settings ───────────────────────────────────────────────────────

const DIFFICULTY_KEY = 'jp-difficulty';
const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'];

export const DIFFICULTY = {
  easy:   { learn: { answer: true,  details: true  }, match: { choices: 4, sim: 'low'   }, hint: 'always' },
  medium: { learn: { answer: true,  details: false }, match: { choices: 4, sim: 'group' }, hint: 'ontap'  },
  hard:   { learn: { answer: false, details: false }, match: { choices: 6, sim: 'tight' }, hint: 'none'   },
};

export function getDifficulty() {
  try {
    const d = localStorage.getItem(DIFFICULTY_KEY);
    return DIFFICULTY_LEVELS.includes(d) ? d : 'medium';
  } catch { return 'medium'; }
}

export function setDifficulty(level) {
  if (!DIFFICULTY_LEVELS.includes(level)) return;
  try { localStorage.setItem(DIFFICULTY_KEY, level); } catch {}
}

// ── Audio (clips deferred — UI auto-hides buttons until they exist) ───────────

const _audioCache = {};

export function playAudio(item) {
  const audioId = item.audio;
  if (!audioId) return;
  if (_audioCache[audioId]) {
    _audioCache[audioId].currentTime = 0;
    _audioCache[audioId].play().catch(() => {});
    return;
  }
  const audio = new Audio(`/japanese/audio/${audioId}.mp3`);
  audio.addEventListener('error', () => {});
  _audioCache[audioId] = audio;
  audio.play().catch(() => {});
}

let _audioAvailable = null;
export async function checkAudioAvailable() {
  if (_audioAvailable !== null) return _audioAvailable;
  try {
    const r = await fetch('/japanese/audio/hira-a.mp3', { method: 'HEAD' });
    _audioAvailable = r.ok;
  } catch {
    _audioAvailable = false;
  }
  return _audioAvailable;
}
