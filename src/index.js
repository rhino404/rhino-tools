// =========================
// Main Bootstrapper - index.js
// =========================

// ----- Core & UI Imports -----
import { initializeTheme } from './ui/theme.js';
import { initPwaInstaller } from './services/pwaInstaller.js';
import { loadSession, setupSessionEvents } from './core/sessionManager.js';
import { startQuiz, restoreSession, loadAndShowQuestions } from './core/quizLoader.js';
import { setupDropdowns } from './core/dropdowns.js';
import { setupButtons } from './core/controls.js';
import { getCatalogSync, getCategoryIcon } from './core/dataProvider.js';
import { state } from './core/state.js';
import { getSubcategoriesForCategory } from './utils/quizMetaUtils.js';
import { renderTagFilter } from './ui/tagFilter.js';

// =========================
// Service Worker Registration
// =========================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then(reg => console.log('[SW] Registered with scope:', reg.scope))
      .catch(err => console.error('[SW] Registration failed:', err));
  });
}

// =========================
// DOM Ready Initialization
// =========================
document.addEventListener('DOMContentLoaded', async () => {
  initializeTheme();
  initPwaInstaller();
  setupSessionEvents(state);
  const session = loadSession() || {};

  // ------------------------
  // Quiz Question Elements
  // ------------------------
  state.questionEl = document.getElementById('question');
  state.choicesEl = document.getElementById('choices');
  state.explanationEl = document.getElementById('explanation');

  // ------------------------
  // Button Elements
  // ------------------------
  state.toggleAnswersBtn = document.getElementById('toggle-answers-btn');
  state.hideAnswersBtn = document.getElementById('hide-answers-btn');
  state.startExamBtn = document.getElementById('exam-btn');

  // ------------------------
  // Setup Buttons (centralized)
  // ------------------------
  await setupButtons(state);

  // ------------------------
  // Category & Subcategory Elements
  // ------------------------
  state.categoryToggle = document.getElementById('category-toggle');
  state.categoryOptions = document.getElementById('category-options');
  state.subcategoryToggle = document.getElementById('subcategory-toggle');
  state.subcategoryOptions = document.getElementById('subcategory-options');
  state.tagFilterEl = document.getElementById('tag-filter');

  // ------------------------
  // Landing / Quiz view toggle
  // ------------------------
  const landingEl = document.getElementById('landing');
  const quizAppEl = document.getElementById('quiz-app');

  function showQuiz() {
    landingEl?.classList.add('is-hidden');
    quizAppEl?.classList.remove('is-hidden');
  }
  function showLanding() {
    quizAppEl?.classList.add('is-hidden');
    landingEl?.classList.remove('is-hidden');
  }

  // ------------------------
  // Restore session if available
  // ------------------------
  let restored = false;
  if (restoreSession(state)) {
    // If session restored, load and show questions at saved position
    await loadAndShowQuestions(state.currentCategory, state.currentSubcategory, state.currentIndex);
    restored = true;
    showQuiz();
  } else {
    // If not restored, use session manager fallback
    state.currentCategory = session.currentCategory ?? null;
    state.currentSubcategory = session.currentSubcategory ?? null;
  }

  // ------------------------
  // Category Dropdown Setup
  // ------------------------
  const categoryList = getCatalogSync().categories.map(c => ({
    label: c.label,
    value: c.value,
    icon: getCategoryIcon[c.value] || ''
  }));
  if (state.categoryToggle && state.categoryOptions) {
    setupDropdowns(state.categoryToggle, state.categoryOptions, categoryList, 'currentCategory', state);
  }

  // ------------------------
  // Subcategory Dropdown Setup
  // ------------------------
  const currentSubcategories = state.currentCategory
    ? getSubcategoriesForCategory(state.currentCategory)
    : [];
  const subcatOptions = [{ label: 'All Subcategories', value: 'all', icon: '🌐' }, ...currentSubcategories];

  if (state.subcategoryToggle && state.subcategoryOptions) {
    const validSubcat = currentSubcategories.find(s => s.value === state.currentSubcategory);
    state.currentSubcategory = validSubcat ? state.currentSubcategory : 'all';
    const subLabel = validSubcat ? validSubcat.label : 'All Subcategories';
    const subIcon = validSubcat ? '' : '🌐';
    state.subcategoryToggle.innerHTML = `${subIcon} ${subLabel}`;
    state.subcategoryToggle.parentElement.style.display = state.currentCategory ? 'block' : 'none';
    setupDropdowns(state.subcategoryToggle, state.subcategoryOptions, subcatOptions, 'currentSubcategory', state);
  }

  // ------------------------
  // Load Questions & Render Tags (if not restored)
  // ------------------------
  let questions = [];
  try {
    if (!restored && state.currentCategory) {
      const subcat = state.currentSubcategory || 'all';
      questions = await startQuiz(state.currentCategory, subcat, state);

      if (state.tagFilterEl && questions.length) {
        const availableTags = [...new Set(questions.flatMap(q => q.tags || []))].sort();
        state.selectedTags = state.selectedTags || [];
        renderTagFilter(state.tagFilterEl, availableTags, state.selectedTags);
      }
    }
  } catch (err) {
    console.error('[index] Failed to load questions:', err);
    questions = [];
  }

  // ------------------------
  // Landing CTA card handlers
  // ------------------------
  document.querySelectorAll('.landing-card').forEach(card => {
    card.addEventListener('click', () => {
      showQuiz();
      const li = state.categoryOptions?.querySelector(`li[data-value="${card.dataset.category}"]`);
      if (li) li.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  });

  // ------------------------
  // Logo Reset Click Handler
  // ------------------------
  const logoEl = document.getElementById('logo');
  if (logoEl) {
    logoEl.addEventListener('click', () => {
      import('./core/quizLoader.js').then(({ resetQuiz }) => resetQuiz());
      showLanding();
    });
  }
});
