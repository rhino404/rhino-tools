// =========================
// Main Bootstrapper - index.js
// =========================

// ----- Core & UI Imports -----
import { initializeTheme } from './ui/theme.js';
import { initPwaInstaller } from './services/pwaInstaller.js';
import { loadCryptoPrices } from './services/cryptoPrices.js';
import { loadSession, setupSessionEvents } from './core/sessionManager.js';
import { loadAndShowQuestions, startQuiz } from './core/quizLoader.js';
import { setupDropdowns } from './core/dropdowns.js';
import { setupButtons } from './core/controls.js'; // ✅ Handles quiz buttons centrally
import { statsTracker } from './ui/statsTracker.js';
import { categories, getCategoryIcon } from './data/quizMeta.js';
import { state } from './core/state.js';
import { getSubcategoriesForCategory } from './utils/quizMetaUtils.js';
import { renderTagFilter } from './ui/questions.js';

// =========================
// Service Worker Registration
// =========================
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/src/service-worker/service-worker.js', { scope: '/src/' })
    .then(reg => console.log('SW registered with scope:', reg.scope))
    .catch(err => console.error('SW registration failed:', err));
}

// =========================
// Theme & PWA Initialization
// =========================
initializeTheme();
initPwaInstaller();

// =========================
// Load Crypto Prices
// =========================
loadCryptoPrices();

// =========================
// Session Event Setup
// =========================
setupSessionEvents(state);

// =========================
// DOM Ready Initialization
// =========================
document.addEventListener('DOMContentLoaded', async () => {
  const session = loadSession() || {};

  // ------------------------
  // Category Dropdown Setup
  // ------------------------
  const categoryToggle = document.getElementById('category-toggle');
  const categoryOptionsEl = document.getElementById('category-options');
  const categoryList = categories.map(c => ({
    label: c.label,
    value: c.value,
    icon: getCategoryIcon[c.value] || ''
  }));

  // Restore session category or fallback to first
  state.currentCategory = session.currentCategory || categories[0].value;
  session.currentCategory = state.currentCategory; // keep session in sync
  state.categoryToggle = categoryToggle;
  state.categoryOptions = categoryOptionsEl;

  // Safe setup for dropdown
  if (categoryToggle && categoryOptionsEl) {
    setupDropdowns(categoryToggle, categoryOptionsEl, categoryList, 'currentCategory', state);
  } else {
    console.warn('[index] Category dropdown elements missing.');
  }

  // ------------------------
  // Subcategory Dropdown Setup
  // ------------------------
  const subcategoryToggle = document.getElementById('subcategory-toggle');
  const subcategoryOptionsEl = document.getElementById('subcategory-options');
  const subcategories = getSubcategoriesForCategory(state.currentCategory);
  const subcatOptions = [{ label: 'All Subcategories', value: 'all', icon: '🌐' }, ...subcategories];

  state.currentSubcategory = session.currentSubcategory || 'all';
  session.currentSubcategory = state.currentSubcategory; // keep session in sync
  state.subcategoryToggle = subcategoryToggle;
  state.subcategoryOptions = subcategoryOptionsEl;

  if (subcategoryToggle && subcategoryOptionsEl) {
    setupDropdowns(subcategoryToggle, subcategoryOptionsEl, subcatOptions, 'currentSubcategory', state);
  } else {
    console.warn('[index] Subcategory dropdown elements missing.');
  }

  // ------------------------
  // Quiz Question Elements
  // ------------------------
  state.questionEl = document.getElementById('question') || null;
  state.choicesEl = document.getElementById('choices') || null;
  state.explanationEl = document.getElementById('explanation') || null;

  // ------------------------
  // Restore or Start Quiz
  // ------------------------
  let questions = [];
  try {
    if (session.category && session.subcategory) {
      statsTracker.setCategory(session.category);
      questions = await loadAndShowQuestions(
        session.category,
        session.subcategory,
        session.questionIndex,
        session.showAnswers
      );
    } else {
      const defaultCategory = state.currentCategory;
      statsTracker.setCategory(defaultCategory);
      questions = await startQuiz(defaultCategory, state.currentSubcategory, state);
    }
  } catch (err) {
    console.error('[index] Failed to load questions:', err);
    questions = []; // fallback to empty array
  }

  // ------------------------
  // Render Tag Filter
  // ------------------------
  const tagFilterEl = document.getElementById('tag-filter');
  if (tagFilterEl && questions.length) {
    const availableTags = [...new Set(questions.flatMap(q => q.tags || []))].sort();
    state.selectedTags = state.selectedTags || [];
    renderTagFilter(tagFilterEl, availableTags, state.selectedTags);
  }

  // ------------------------
  // Assign Button Elements
  // ------------------------
  state.shuffleBtn = document.getElementById('shuffle-btn') || null;
  state.toggleAnswersBtn = document.getElementById('toggle-answers-btn') || null;
  state.hideAnswersBtn = document.getElementById('hide-answers-btn') || null;
  state.showStatsBtn = document.getElementById('show-stats-btn') || null;

  // ------------------------
  // Setup Buttons (centralized)
  // ------------------------
  // Handles hide/show answers, shuffle, toggle answers, and stats card
  setupButtons(state);
});
