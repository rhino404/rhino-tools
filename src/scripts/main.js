import { DATA_SOURCES } from './dataSources.js';
import { quizMeta, getCategoryIcon } from './quizMeta.js';
import { getSubcategoriesForCategory } from './quizMetaUtils.js';
import { state } from './state.js';
import { showQuestion as originalShowQuestion, filterUnansweredQuestions } from './questions.js';
import { initializeTheme } from './theme.js';
import { loadCryptoPrices } from './crypto.js';
import { initPwaInstaller } from './pwaInstaller.js';

initPwaInstaller();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => {
        console.log('[PWA] Service worker registered:', reg.scope);
      })
      .catch((err) => {
        console.error('[PWA] Service worker registration failed:', err);
      });
  });
}

// --- Session persistence helpers ---
const SESSION_KEY = 'rynoToolsUserSession';
const SESSION_EXPIRY_HOURS = 12; // expiry window

// these are the per-questions index keys we look for (legacy and current)
const QUESTIONS_INDEX_KEYS = [
  'rhinoToolsCurrentQuestionIndex', // existing key used by questions.js in some versions
  'rynoToolsCurrentQuestionIndex'   // potential future/alternate key
];

function saveSession() {
  try {
    const now = Date.now();
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      category: state.currentCategory,
      subcategory: state.currentSubcategory,
      currentIndex: state.currentIndex,
      showingAnswers: state.showingAnswers,
      questions: state.questions,
      timestamp: now
    }));

    // Keep per-questions index in sync as well (write under both index keys).
    // This helps ensure the questions module's authoritative index and main session
    // are consistent across reloads.
    for (const key of QUESTIONS_INDEX_KEYS) {
      localStorage.setItem(key, String(state.currentIndex ?? 0));
    }
  } catch (err) {
    console.error('[Session] Failed to save:', err);
  }
}

function loadSession() {
  try {
    const saved = localStorage.getItem(SESSION_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved);

    if (!parsed.timestamp) return parsed;

    const ageHours = (Date.now() - parsed.timestamp) / (1000 * 60 * 60);
    if (ageHours > SESSION_EXPIRY_HOURS) {
      console.log('[Session] Expired session cleared.');
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
  // remove question index keys too (both variants)
  for (const key of QUESTIONS_INDEX_KEYS) {
    localStorage.removeItem(key);
  }
}

// Read per-questions index from localStorage (prefer stable per-questions key)
function getQuestionIndexFromStorage() {
  for (const key of QUESTIONS_INDEX_KEYS) {
    const v = localStorage.getItem(key);
    if (v != null) {
      const n = parseInt(v, 10);
      if (!Number.isNaN(n)) return n;
    }
  }
  return null;
}

// allow other modules to trigger a save without importing main (avoids circular imports)
document.addEventListener('session:save', (ev) => {
  // optional detail.currentIndex can be used to update state before saving
  try {
    const newIndex = ev?.detail?.currentIndex;
    if (typeof newIndex === 'number') state.currentIndex = newIndex;
  } catch (e) {
    // ignore
  }
  saveSession();
});

// Save when a question is answered (other modules can dispatch this)
document.addEventListener('question:answered', (ev) => {
  try {
    const newIndex = ev?.detail?.currentIndex;
    if (typeof newIndex === 'number') state.currentIndex = newIndex;
  } catch (e) {
    // ignore
  }
  saveSession();
});

// Save when a question is reset (hard reset) — keeps the same question present after refresh
document.addEventListener('question:reset', (ev) => {
  try {
    const newIndex = ev?.detail?.currentIndex;
    if (typeof newIndex === 'number') state.currentIndex = newIndex;
  } catch (e) {
    // ignore
  }
  saveSession();
});

// save on visibility change / unload to persist latest state (fixes hard-refresh race)
document.addEventListener('visibilitychange', () => {
  try {
    if (document.hidden) saveSession();
  } catch (e) {
    // ignore
  }
});
window.addEventListener('beforeunload', () => {
  try {
    saveSession();
  } catch (e) {
    // ignore
  }
});

// --- Wrap showQuestion so it auto-saves (main wrapper uses originalShowQuestion imported from questions.js) ---
function showQuestion(index, questions, showingAnswers, els) {
  originalShowQuestion(index, questions, showingAnswers, els);
  // keep state.currentIndex in sync and persist session
  try {
    state.currentIndex = index;
  } catch (e) {
    // ignore
  }
  saveSession();
}

// small helper to close dropdowns
function closeDropdown(toggleBtn, optionsEl) {
  try {
    toggleBtn.setAttribute('aria-expanded', 'false');
    optionsEl.parentElement.classList.remove('show');
  } catch (e) {
    // ignore if elements missing
  }
}

// --- Fetch and load ---
async function fetchQuestions(category, subcategory) {
  if (!category) return [];

  const subData = DATA_SOURCES[category];
  if (!subData) return [];

  let questionFiles = [];

  if (!subcategory || subcategory === 'all') {
    questionFiles = Object.values(subData);
  } else {
    const file = subData[subcategory];
    if (file) questionFiles = [file];
  }

  const questions = [];
  for (const url of questionFiles) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch ${url}`);
      const data = await res.json();
      questions.push(...(data.questions || data));
    } catch (err) {
      console.error(err);
    }
  }
  return questions;
}

/**
 * Start quiz helper — fetches questions, filters unanswered, updates UI and state.
 * Keep this separate from loadAndShowQuestions so category/subcategory clicks always use filtering.
 */
async function startQuiz(category, subcategory) {
  // set state filters immediately so UI updates reflect selection
  state.currentCategory = category;
  state.currentSubcategory = subcategory || 'all';

  // update visible toggles (if present)
  try {
    const icon = getCategoryIcon[category] || '';
    const label = quizMeta.categories.find(o => o.value === category)?.label || 'Select Category';
    if (state.categoryToggle) state.categoryToggle.innerHTML = `${icon} ${label} ▾`;
  } catch (e) {
    // ignore UI update failures
  }

  // populate subcategory toggle for the selected category
  try {
    const subcategories = getSubcategoriesForCategory(category) || [];
    const subcatOptions = [
      { label: 'All Subcategories', value: 'all', icon: '🌐' },
      ...subcategories
    ];
    populateDropdown(state.subcategoryOptions, subcatOptions, state.currentSubcategory);
    state.subcategoryToggle.parentElement.style.display = 'block';

    const subLabel = subcatOptions.find(s => s.value === state.currentSubcategory)?.label || 'Select Subcategory';
    const subIcon = subcatOptions.find(s => s.value === state.currentSubcategory)?.icon || '';
    state.subcategoryToggle.innerHTML = `${subIcon} ${subLabel} ▾`;
  } catch (e) {
    // ignore
  }

  // notify statsTracker of selection
  import('./statsTracker.js').then(({ statsTracker }) => {
    try {
      statsTracker.setCategory(category);
    } catch (e) {
      console.warn('[Session] failed to set statsTracker category:', e);
    }
  });

  // fetch, then filter unanswered questions
  let questions = await fetchQuestions(category, state.currentSubcategory);
  try {
    questions = filterUnansweredQuestions(questions);
  } catch (e) {
    console.warn('[startQuiz] filterUnansweredQuestions failed:', e);
  }

  state.questions = questions || [];
  state.currentIndex = 0;

  // show first question (wrapped showQuestion saves session)
  showQuestion(state.currentIndex, state.questions, state.showingAnswers, {
    questionEl: state.questionEl,
    choicesEl: state.choicesEl,
    explanationEl: state.explanationEl,
  });

  // ensure session saved
  saveSession();
}

async function loadAndShowQuestions(restoringSession = false) {
  const { currentCategory, currentSubcategory } = state;

  if (!currentCategory || currentSubcategory === '') {
    state.questions = [];
    state.questionEl.textContent = 'Please select a category and subcategory to start.';
    state.choicesEl.innerHTML = '';
    state.explanationEl.textContent = '';
    return;
  }

  try {
    const loadedQuestions = await fetchQuestions(currentCategory, currentSubcategory);
    // when restoring session we should avoid re-showing already-answered items;
    // apply unanswered filter during restore to prevent duplicate stats counting.
    if (restoringSession) {
      try {
        state.questions = filterUnansweredQuestions(loadedQuestions);
      } catch (e) {
        console.warn('[loadAndShowQuestions] filterUnansweredQuestions failed:', e);
        state.questions = loadedQuestions;
      }
    } else {
      state.questions = loadedQuestions;
    }
  } catch (err) {
    console.error('Failed to load questions:', err);
    state.questions = [];
  }

  if (!restoringSession) {
    state.currentIndex = 0;
  }

  if (state.questions.length === 0) {
    state.questionEl.textContent = 'No questions found for the selected filters.';
    state.choicesEl.innerHTML = '';
    state.explanationEl.textContent = '';
    return;
  }

  // Clamp index into bounds (defensive)
  if (state.currentIndex >= state.questions.length || state.currentIndex < 0) {
    state.currentIndex = 0;
  }

  showQuestion(state.currentIndex, state.questions, state.showingAnswers, {
    questionEl: state.questionEl,
    choicesEl: state.choicesEl,
    explanationEl: state.explanationEl,
  });
}

function populateDropdown(listEl, options, selectedVal) {
  listEl.innerHTML = '';

  options.forEach(opt => {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.dataset.value = opt.value;
    li.innerHTML = `${opt.icon ? `${opt.icon} ` : ''}${opt.label}`;
    if (opt.value === selectedVal) {
      li.classList.add('selected');
    }
    listEl.appendChild(li);
  });
}

function setupDropdown(toggleBtn, optionsEl, optionsArray, filterKey) {
  populateDropdown(optionsEl, optionsArray, state[filterKey]);

  // toggle click should not let the outside-click handler close it immediately
  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
    toggleBtn.setAttribute('aria-expanded', String(!expanded));
    toggleBtn.parentElement.classList.toggle('show', !expanded);
  });

  optionsEl.addEventListener('click', (e) => {
    e.stopPropagation();
    if (e.target.tagName !== 'LI') {
      // click inside options but not an LI - ignore
      return;
    }
    const val = e.target.dataset.value;

    // Always close dropdown immediately for snappy UX
    closeDropdown(toggleBtn, optionsEl);

    // If they clicked the same value, just close and exit (no reload)
    if (val === state[filterKey]) return;

    state[filterKey] = val;

    if (filterKey === 'currentCategory') {
      const icon = getCategoryIcon[val] || '';
      const label = quizMeta.categories.find(o => o.value === val)?.label || '';
      toggleBtn.innerHTML = `${icon} ${label} ▾`;

      const subcategories = getSubcategoriesForCategory(val);
      const subcatOptions = [
        { label: 'All Subcategories', value: 'all', icon: '🌐' },
        ...subcategories
      ];
      state.currentSubcategory = 'all';
      state.subcategoryToggle.parentElement.style.display = 'block';
      populateDropdown(state.subcategoryOptions, subcatOptions, state.currentSubcategory);

      state.subcategoryToggle.innerHTML = `🌐 All Subcategories ▾`;

      import('./statsTracker.js').then(({ statsTracker }) => {
        statsTracker.setCategory(val);
      });

      // startQuiz will fetch and filter unanswered questions for the chosen category
      startQuiz(val, 'all');
    } else if (filterKey === 'currentSubcategory') {
      const label = optionsEl.querySelector(`li[data-value="${val}"]`)?.textContent || 'Select';
      toggleBtn.textContent = `${label} ▾`;

      // startQuiz will fetch and filter unanswered for current category + selected subcategory
      startQuiz(state.currentCategory, val);

      // Auto-close the subcategory dropdown after selection to improve UX.
      // (closeDropdown already ran at the top of this handler but call again defensively
      // to ensure the UI is collapsed across DOM variants.)
      try {
        closeDropdown(toggleBtn, optionsEl);
      } catch (e) {
        // ignore
      }
    }

    saveSession();
  });

  // Close on outside click (add handler once per toggleBtn)
  if (!toggleBtn._outsideHandlerAdded) {
    document.addEventListener('click', (e) => {
      if (!toggleBtn.parentElement.contains(e.target)) {
        closeDropdown(toggleBtn, optionsEl);
      }
    });
    toggleBtn._outsideHandlerAdded = true;
  }
}

function setupButtons() {
  state.shuffleBtn.addEventListener('click', () => {
    if (!state.questions.length) return;

    const start = state.currentIndex;
    const remaining = state.questions.slice(start);

    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }

    state.questions = [
      ...state.questions.slice(0, start),
      ...remaining
    ];

    showQuestion(state.currentIndex, state.questions, state.showingAnswers, {
      questionEl: state.questionEl,
      choicesEl: state.choicesEl,
      explanationEl: state.explanationEl,
    });
  });

  state.toggleAnswersBtn.addEventListener('click', () => {
    state.showingAnswers = !state.showingAnswers;
    showQuestion(state.currentIndex, state.questions, state.showingAnswers, {
      questionEl: state.questionEl,
      choicesEl: state.choicesEl,
      explanationEl: state.explanationEl,
    });
  });

  state.showStatsBtn.addEventListener('click', () => {
    import('./statsTracker.js').then(({ statsTracker }) => {
      statsTracker.showCard();
    });
  });
}

// --- Startup ---
document.addEventListener('DOMContentLoaded', () => {
  initializeTheme();

  state.questionEl = document.getElementById('question');
  state.choicesEl = document.getElementById('choices');
  state.explanationEl = document.getElementById('explanation');

  state.categoryToggle = document.getElementById('category-toggle');
  state.categoryOptions = document.getElementById('category-options');
  state.subcategoryToggle = document.getElementById('subcategory-toggle');
  state.subcategoryOptions = document.getElementById('subcategory-options');

  state.shuffleBtn = document.getElementById('shuffle-btn');
  state.toggleAnswersBtn = document.getElementById('toggleAnswers');
  state.showStatsBtn = document.getElementById('showStatsBtn');

  setupButtons();
  loadCryptoPrices();

  // Load session and validate restored filters
  let saved = loadSession();
  if (saved && saved.category) {
    // validate category exists in current quizMeta
    const catExists = quizMeta.categories && quizMeta.categories.find(c => c.value === saved.category);
    if (!catExists) {
      console.warn('[Session] saved category not present anymore, clearing saved session.');
      clearSession();
      saved = null;
    }
  }

  if (saved && saved.category) {
    console.log('[Session] Restoring previous session...');
    state.currentCategory = saved.category;
    // validate subcategory for that category; fallback to 'all' if invalid
    const availableSubcats = getSubcategoriesForCategory(state.currentCategory) || [];
    const subValues = availableSubcats.map(s => s.value);
    state.currentSubcategory = subValues.includes(saved.subcategory) ? saved.subcategory : 'all';

    // Prefer the per-questions saved index (if present) — this avoids the "auto-advance then save" race.
    const storedQIndex = getQuestionIndexFromStorage();
    if (typeof storedQIndex === 'number' && !Number.isNaN(storedQIndex)) {
      state.currentIndex = storedQIndex;
    } else {
      state.currentIndex = saved.currentIndex || 0;
    }

    state.showingAnswers = !!saved.showingAnswers;

    // don't blindly trust saved.questions (they may include already-answered items);
    // fetch fresh and filter unanswered during restore to avoid double-counting stats.
    state.questions = [];

    const categoryOptionsWithIcons = quizMeta.categories.map(cat => ({
      ...cat,
      icon: getCategoryIcon[cat.value] || ''
    }));
    setupDropdown(state.categoryToggle, state.categoryOptions, categoryOptionsWithIcons, 'currentCategory');

    // set visible toggle text to restored cat
    const catLabel = quizMeta.categories.find(c => c.value === state.currentCategory)?.label || 'Select Category';
    const catIcon = getCategoryIcon[state.currentCategory] || '';
    state.categoryToggle.innerHTML = `${catIcon} ${catLabel} ▾`;

    const subcategories = getSubcategoriesForCategory(state.currentCategory);
    const subcatOptions = [
      { label: 'All Subcategories', value: 'all', icon: '🌐' },
      ...subcategories
    ];
    setupDropdown(state.subcategoryToggle, state.subcategoryOptions, subcatOptions, 'currentSubcategory');
    state.subcategoryToggle.parentElement.style.display = 'block';

    // set visible toggle text to restored subcat
    const subLabel = subcatOptions.find(s => s.value === state.currentSubcategory)?.label || 'Select Subcategory';
    const subIcon = subcatOptions.find(s => s.value === state.currentSubcategory)?.icon || '';
    state.subcategoryToggle.innerHTML = `${subIcon} ${subLabel} ▾`;

    // --- NEW: ensure statsTracker knows the restored category immediately ---
    import('./statsTracker.js').then(({ statsTracker }) => {
      try {
        statsTracker.setCategory(state.currentCategory);
      } catch (e) {
        console.warn('[Session] failed to set statsTracker category:', e);
      }
    });

    // fetch and filter unanswered while restoring to avoid showing already-answered questions
    loadAndShowQuestions(true);

  } else {
    state.subcategoryToggle.parentElement.style.display = 'none';
    state.currentCategory = '';
    state.currentSubcategory = '';
    state.showingAnswers = false;
    state.currentIndex = 0;

    const categoryOptionsWithIcons = quizMeta.categories.map(cat => ({
      ...cat,
      icon: getCategoryIcon[cat.value] || ''
    }));
    setupDropdown(state.categoryToggle, state.categoryOptions, categoryOptionsWithIcons, 'currentCategory');
    setupDropdown(state.subcategoryToggle, state.subcategoryOptions, [], 'currentSubcategory');

    state.categoryToggle.textContent = 'Select Category ▾';
    state.subcategoryToggle.textContent = 'Select Subcategory ▾';

    state.questionEl.textContent = 'Please select a category to start.';
    state.choicesEl.innerHTML = '';
    state.explanationEl.textContent = '';

    // persist initial empty session
    saveSession();
  }
});
