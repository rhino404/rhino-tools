// --- Session persistence helpers ---
const SESSION_KEY = 'rynoToolsUserSession';
const SESSION_EXPIRY_HOURS = 12; // expiry window

// these are the per-questions index keys we look for (legacy and current)
const QUESTIONS_INDEX_KEYS = [
  'rhinoToolsCurrentQuestionIndex', // existing key used by questions.js in some versions
  'rynoToolsCurrentQuestionIndex'   // potential future/alternate key
];

export function saveSession(state) {
  if (!state) {
    console.warn('[Session] No state object passed to saveSession.');
    return;
  }
  try {
    const now = Date.now();
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      category: state.currentCategory ?? null,
      subcategory: state.currentSubcategory ?? null,
      currentIndex: state.currentIndex ?? 0,
      showingAnswers: state.showingAnswers ?? false,
      questions: state.questions ?? [],
      timestamp: now
    }));

    for (const key of QUESTIONS_INDEX_KEYS) {
      localStorage.setItem(key, String(state.currentIndex ?? 0));
    }
  } catch (err) {
    console.error('[Session] Failed to save:', err);
  }
}

export function loadSession() {
  try {
    const saved = localStorage.getItem(SESSION_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved);

    if (!parsed.timestamp) return parsed;

    const ageHours = (Date.now() - parsed.timestamp) / (1000 * 60 * 60);
    if (ageHours > SESSION_EXPIRY_HOURS) {
      clearSession();
      return null;
    }

    return parsed;
  } catch (err) {
    console.error('[Session] Failed to load:', err);
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  for (const key of QUESTIONS_INDEX_KEYS) {
    localStorage.removeItem(key);
  }
}

export function getQuestionIndexFromStorage() {
  for (const key of QUESTIONS_INDEX_KEYS) {
    const v = localStorage.getItem(key);
    if (v != null) {
      const n = parseInt(v, 10);
      if (!Number.isNaN(n)) return n;
    }
  }
  return null;
}

// Event listeners for session saving
export function setupSessionEvents(state) {
  if (!state) {
    console.warn('[Session] No state object passed to setupSessionEvents.');
    return;
  }

  document.addEventListener('session:save', (ev) => {
    try {
      const newIndex = ev?.detail?.currentIndex;
      if (typeof newIndex === 'number') state.currentIndex = newIndex;
    } catch {}
    saveSession(state);
  });

  document.addEventListener('question:answered', (ev) => {
    try {
      const newIndex = ev?.detail?.currentIndex;
      if (typeof newIndex === 'number') state.currentIndex = newIndex;
    } catch {}
    saveSession(state);
  });

  document.addEventListener('question:reset', (ev) => {
    try {
      const newIndex = ev?.detail?.currentIndex;
      if (typeof newIndex === 'number') state.currentIndex = newIndex;
    } catch {}
    saveSession(state);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) saveSession(state);
  });
  window.addEventListener('beforeunload', () => saveSession(state));
}
