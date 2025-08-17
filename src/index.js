// =========================
// Main Bootstrapper - index.js
// =========================

// ----- Core & UI Imports -----
import { initializeTheme } from './ui/theme.js';
import { initPwaInstaller } from './services/pwaInstaller.js';
import { loadCryptoPrices } from './services/cryptoPrices.js';
import { loadSession, setupSessionEvents } from './core/sessionManager.js';
import { startQuiz } from './core/quizLoader.js';
import { setupDropdowns } from './core/dropdowns.js';
import { setupButtons } from './core/controls.js'; // ✅ Handles quiz buttons centrally
import { statsTracker } from './ui/statsTracker.js';
import { categories, getCategoryIcon } from './data/quizMeta.js';
import { state } from './core/state.js';
import { getSubcategoriesForCategory } from './utils/quizMetaUtils.js';
import { renderTagFilter } from './ui/tagFilter.js'; // ✅ Correct import

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
  // Category & Subcategory Elements
  // ------------------------
  const categoryToggle = document.getElementById('category-toggle');
  const categoryOptionsEl = document.getElementById('category-options');
  const subcategoryToggle = document.getElementById('subcategory-toggle');
  const subcategoryOptionsEl = document.getElementById('subcategory-options');
  const tagFilterEl = document.getElementById('tag-filter');

  state.categoryToggle = categoryToggle;
  state.categoryOptions = categoryOptionsEl;
  state.subcategoryToggle = subcategoryToggle;
  state.subcategoryOptions = subcategoryOptionsEl;

  // ------------------------
  // Category Dropdown Setup
  // ------------------------
  const categoryList = categories.map(c => ({
    label: c.label,
    value: c.value,
    icon: getCategoryIcon[c.value] || ''
  }));

  // Restore session category or start fresh
  state.currentCategory = session.currentCategory ?? null;
  state.currentSubcategory = session.currentSubcategory ?? null;

  // Update category toggle display
  if (categoryToggle) {
    const catLabel = state.currentCategory
      ? categories.find(c => c.value === state.currentCategory)?.label || 'Select Category'
      : '👉 Select Category ▾';
    const catIcon = state.currentCategory ? getCategoryIcon[state.currentCategory] || '' : '';
    categoryToggle.innerHTML = `${catIcon} ${catLabel}`;
  }

  // ------------------------
  // Subcategory Dropdown Setup
  // ------------------------
  const currentSubcategories = state.currentCategory
    ? getSubcategoriesForCategory(state.currentCategory)
    : [];
  const subcatOptions = [{ label: 'All Subcategories', value: 'all', icon: '🌐' }, ...currentSubcategories];

  if (subcategoryToggle) {
    // Ensure currentSubcategory is valid
    const validSubcat = currentSubcategories.find(s => s.value === state.currentSubcategory);
    state.currentSubcategory = validSubcat ? state.currentSubcategory : 'all';
    const subLabel = validSubcat ? validSubcat.label : 'All Subcategories';
    const subIcon = validSubcat ? '' : '🌐';
    subcategoryToggle.innerHTML = `${subIcon} ${subLabel}`;
    subcategoryToggle.parentElement.style.display = state.currentCategory ? 'block' : 'none';
  }

  // Setup dropdowns
  if (categoryToggle && categoryOptionsEl) {
    setupDropdowns(categoryToggle, categoryOptionsEl, categoryList, 'currentCategory', state);
  }
  if (subcategoryToggle && subcategoryOptionsEl) {
    setupDropdowns(subcategoryToggle, subcategoryOptionsEl, subcatOptions, 'currentSubcategory', state);
  }

  // ------------------------
  // Quiz Question Elements
  // ------------------------
  state.questionEl = document.getElementById('question') || null;
  state.choicesEl = document.getElementById('choices') || null;
  state.explanationEl = document.getElementById('explanation') || null;

  // ------------------------
  // Load Questions & Render Tags
  // ------------------------
  let questions = [];
  try {
    if (state.currentCategory) {
      // Use saved category/subcategory or defaults
      const subcat = state.currentSubcategory || 'all';
      statsTracker.setCategory(state.currentCategory);
      questions = await startQuiz(state.currentCategory, subcat, state);

      // Render tag filter
      if (tagFilterEl && questions.length) {
        const availableTags = [...new Set(questions.flatMap(q => q.tags || []))].sort();
        state.selectedTags = state.selectedTags || [];
        renderTagFilter(tagFilterEl, availableTags, state.selectedTags);
      }
    }
  } catch (err) {
    console.error('[index] Failed to load questions:', err);
    questions = [];
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
