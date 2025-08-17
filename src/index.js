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

  // Restore session category or fallback to null for reset
  state.currentCategory = session.currentCategory ?? null;
  state.currentSubcategory = session.currentSubcategory ?? null;

  state.categoryToggle = categoryToggle;
  state.categoryOptions = categoryOptionsEl;
  state.subcategoryToggle = document.getElementById('subcategory-toggle');
  state.subcategoryOptions = document.getElementById('subcategory-options');

  // Update category toggle display
  if (state.categoryToggle) {
    const label = state.currentCategory
      ? categories.find(c => c.value === state.currentCategory)?.label || 'Select Category'
      : '👉 Select Category ▾';
    const icon = state.currentCategory ? getCategoryIcon[state.currentCategory] || '' : '';
    state.categoryToggle.innerHTML = `${icon} ${label}`;
  }

  // ------------------------
  // Subcategory Dropdown Setup
  // ------------------------
  const subcategories = getSubcategoriesForCategory(state.currentCategory) || [];
  const subcatOptions = [{ label: 'All Subcategories', value: 'all', icon: '🌐' }, ...subcategories];

  if (state.subcategoryToggle) {
    const subLabel = state.currentSubcategory
      ? subcategories.find(s => s.value === state.currentSubcategory)?.label || 'All Subcategories'
      : '🌐 All Subcategories ▾';
    const subIcon = state.currentSubcategory ? '' : '🌐';
    state.subcategoryToggle.innerHTML = `${subIcon} ${subLabel}`;
    state.subcategoryToggle.parentElement.style.display = state.currentCategory ? 'block' : 'none';
  }

  // Setup dropdowns safely
  if (categoryToggle && categoryOptionsEl) {
    setupDropdowns(categoryToggle, categoryOptionsEl, categoryList, 'currentCategory', state);
  }
  if (state.subcategoryToggle && state.subcategoryOptions) {
    setupDropdowns(state.subcategoryToggle, state.subcategoryOptions, subcatOptions, 'currentSubcategory', state);
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
    } else if (state.currentCategory) {
      // Only start quiz if category selected
      statsTracker.setCategory(state.currentCategory);
      questions = await startQuiz(state.currentCategory, state.currentSubcategory, state);
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
  setupButtons(state);

  // ------------------------
  // Logo Reset Click Handler
  // ------------------------
  const logoEl = document.getElementById('logo'); // adjust ID if needed
  if (logoEl) {
    logoEl.addEventListener('click', () => {
      import('./core/quizLoader.js').then(({ resetQuiz }) => resetQuiz());
    });
  }
});
