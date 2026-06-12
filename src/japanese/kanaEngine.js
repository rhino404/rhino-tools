// kanaEngine.js — data loading, progress tracking, unlock logic

const PROGRESS_KEY = 'jp-progress';
const MASTERY_THRESHOLD = 3; // correct answers to mark an item mastered

// Unlock stages: each stage lists the row keys it contains.
// A stage unlocks when the previous stage reaches 80% mastered.
export const STAGES = [
  { id: 's1', label: 'Vowels',       rows: ['a'],                           color: '#4ade80' },
  { id: 's2', label: 'K & S',        rows: ['ka', 'sa'],                    color: '#22d3ee' },
  { id: 's3', label: 'T & N',        rows: ['ta', 'na'],                    color: '#818cf8' },
  { id: 's4', label: 'H & M',        rows: ['ha', 'ma'],                    color: '#fb923c' },
  { id: 's5', label: 'Y, R & W',     rows: ['ya', 'ra', 'wa', 'n'],        color: '#f472b6' },
  { id: 's6', label: 'Voiced',       rows: ['ga', 'za', 'da', 'ba'],       color: '#a78bfa' },
  { id: 's7', label: 'P sounds',     rows: ['pa'],                          color: '#34d399' },
  { id: 's8', label: 'Combos',       rows: ['kya','sha','cha','nya','hya','mya','rya','gya','ja','bya','pya'], color: '#fbbf24' },
];

let _kana = null; // cached kana array

export async function loadKana() {
  if (_kana) return _kana;
  const res = await fetch('/japanese/data/hiragana.json');
  const data = await res.json();
  _kana = data.kana;
  return _kana;
}

// ── Progress ───────────────────────────────────────────────────────────────

function _loadProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; }
  catch { return {}; }
}

function _saveProgress(p) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
}

export function getProgress() { return _loadProgress(); }

export function markSeen(id) {
  const p = _loadProgress();
  if (!p[id]) p[id] = { seen: true, correct: 0 };
  p[id].seen = true;
  _saveProgress(p);
}

export function markResult(id, correct) {
  const p = _loadProgress();
  if (!p[id]) p[id] = { seen: true, correct: 0 };
  p[id].seen = true;
  if (correct) p[id].correct = (p[id].correct || 0) + 1;
  _saveProgress(p);
}

export function isMastered(id, progress) {
  const p = progress || _loadProgress();
  return (p[id]?.correct || 0) >= MASTERY_THRESHOLD;
}

export function getItemState(id, progress) {
  const p = progress || _loadProgress();
  const entry = p[id];
  if (!entry || !entry.seen) return 'unseen';
  if (isMastered(id, p)) return 'mastered';
  return 'seen';
}

// Returns { mastered, total } for a list of ids
export function stageStats(ids, progress) {
  const p = progress || _loadProgress();
  const mastered = ids.filter(id => isMastered(id, p)).length;
  return { mastered, total: ids.length };
}

// ── Unlock logic ───────────────────────────────────────────────────────────

export function getUnlockedStageIds(kana, progress) {
  const p = progress || _loadProgress();
  const unlocked = new Set([STAGES[0].id]);

  for (let i = 1; i < STAGES.length; i++) {
    const prev = STAGES[i - 1];
    const prevIds = kana.filter(k => prev.rows.includes(k.row)).map(k => k.id);
    const { mastered, total } = stageStats(prevIds, p);
    if (total > 0 && mastered / total >= 0.8) {
      unlocked.add(STAGES[i].id);
    } else {
      break; // stages are sequential
    }
  }
  return unlocked;
}

export function isRowUnlocked(row, kana, progress) {
  const unlockedStageIds = getUnlockedStageIds(kana, progress);
  const stage = STAGES.find(s => s.rows.includes(row));
  return stage ? unlockedStageIds.has(stage.id) : false;
}

// ── Item queries ───────────────────────────────────────────────────────────

export function getItemsByRow(row, kana) {
  return kana.filter(k => k.row === row);
}

export function getItemsByStage(stageId, kana) {
  const stage = STAGES.find(s => s.id === stageId);
  if (!stage) return [];
  return kana.filter(k => stage.rows.includes(k.row));
}

// Items that are seen but not yet mastered (weak items for review)
export function getWeakItems(kana, progress) {
  const p = progress || _loadProgress();
  return kana.filter(k => {
    const e = p[k.id];
    return e?.seen && !isMastered(k.id, p);
  });
}

// Items that are unseen in unlocked stages
export function getNewItems(kana, progress) {
  const p = progress || _loadProgress();
  const unlockedIds = getUnlockedStageIds(kana, p);
  return kana.filter(k => {
    const stage = STAGES.find(s => s.rows.includes(k.row));
    return stage && unlockedIds.has(stage.id) && !p[k.id]?.seen;
  });
}

// Overall mastery count across all kana
export function overallStats(kana, progress) {
  const p = progress || _loadProgress();
  const mastered = kana.filter(k => isMastered(k.id, p)).length;
  return { mastered, total: kana.length };
}

// ── Audio ─────────────────────────────────────────────────────────────────

const _audioCache = {};

export function playAudio(item) {
  const audioId = item.audio;
  const path = `/japanese/audio/${audioId}.mp3`;
  if (_audioCache[audioId]) {
    _audioCache[audioId].currentTime = 0;
    _audioCache[audioId].play().catch(() => {});
    return;
  }
  const audio = new Audio(path);
  audio.addEventListener('error', () => {
    // clip not yet generated — silently ignore
  });
  _audioCache[audioId] = audio;
  audio.play().catch(() => {});
}

// Checks if an audio file likely exists by attempting a HEAD request.
// Used at init to decide whether to show audio buttons at all.
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
