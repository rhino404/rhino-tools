// =========================
// Main Bootstrapper - index.js
// =========================

import { initializeTheme } from './ui/theme.js';
import { initPwaInstaller } from './services/pwaInstaller.js';
import { loadCryptoPrices } from './services/cryptoPrices.js';
import { loadSession, setupSessionEvents } from './core/sessionManager.js';
import { loadAndShowQuestions, startQuiz } from './core/quizLoader.js';
import { setupDropdowns } from './core/dropdowns.js';
import { setupButtons } from './core/controls.js';
import { statsTracker } from './ui/statsTracker.js'; // import the named export
import { categories, getCategoryIcon } from './data/quizMeta.js';
import { state } from './core/state.js';
import { getSubcategoriesForCategory } from './utils/quizMetaUtils.js';

// =========================
// Service Worker Registration
// =========================
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/src/service-worker/service-worker.js', {
    scope: '/src/'
  }).then(reg => {
    console.log('SW registered with scope:', reg.scope);
  }).catch(err => {
    console.error('SW registration failed:', err);
  });
}

// =========================
// Theme & PWA Initialization
// =========================
initializeTheme();
initPwaInstaller();

// =========================
// Crypto Prices
// =========================
loadCryptoPrices();

// =========================
// Session Events
// =========================
setupSessionEvents(state);

// =========================
// DOM Ready Initialization
// =========================
document.addEventListener('DOMContentLoaded', () => {
    const session = loadSession() || {};

    // ==== Setup Category Dropdown ====
    const categoryToggle = document.getElementById('category-toggle');
    const categoryOptionsEl = document.getElementById('category-options');
    const categoryList = categories.map(c => ({
      label: c.label,
      value: c.value,
      icon: getCategoryIcon[c.value] || ''
    }));

    // Ensure state has currentCategory
    if (!session.currentCategory) {
      session.currentCategory = categories[0].value;
    }
    state.currentCategory = session.currentCategory;
    state.categoryToggle = categoryToggle;
    state.categoryOptions = categoryOptionsEl;

    setupDropdowns(categoryToggle, categoryOptionsEl, categoryList, 'currentCategory', state);

    // ==== Setup Subcategory Dropdown ====
    const subcategoryToggle = document.getElementById('subcategory-toggle');
    const subcategoryOptionsEl = document.getElementById('subcategory-options');
    const subcategories = getSubcategoriesForCategory(state.currentCategory);
    const subcatOptions = [
      { label: 'All Subcategories', value: 'all', icon: '🌐' },
      ...subcategories
    ];

    if (!session.currentSubcategory) {
      session.currentSubcategory = 'all';
    }
    state.currentSubcategory = session.currentSubcategory;
    state.subcategoryToggle = subcategoryToggle;
    state.subcategoryOptions = subcategoryOptionsEl;

    setupDropdowns(subcategoryToggle, subcategoryOptionsEl, subcatOptions, 'currentSubcategory', state);

    // ==== Restore or Start Quiz ====
    if (session.category && session.subcategory) {
        statsTracker.setCategory(session.category);
        loadAndShowQuestions(session.category, session.subcategory, session.questionIndex, session.showAnswers);
    } else {
        const defaultCategory = state.currentCategory;
        statsTracker.setCategory(defaultCategory);
        startQuiz(defaultCategory, state.currentSubcategory, state);
    }

    // ==== Other UI ====
    state.shuffleBtn = document.getElementById('shuffle-btn');
    state.toggleAnswersBtn = document.getElementById('toggle-answers-btn');
    const toggleBtn = document.getElementById('toggle-answers-btn');
    toggleBtn.addEventListener('click', () => {
        toggleBtn.classList.toggle('active');
    });

    state.showStatsBtn = document.getElementById('show-stats-btn');

    // Add these three so showQuestion() has real elements
    state.questionEl = document.getElementById('question');
    state.choicesEl = document.getElementById('choices');
    state.explanationEl = document.getElementById('explanation');

    setupButtons(state);
});
