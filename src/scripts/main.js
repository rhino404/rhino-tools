import { DATA_SOURCES } from './dataSources.js';
import { quizMeta, getCategoryIcon } from './quizMeta.js';
import { getSubcategoriesForCategory } from './quizMetaUtils.js';
import { state } from './state.js';
import { showQuestion } from './questions.js';
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

function normalize(str = '') {
  return str.toLowerCase().replace(/\s+/g, '-');
}

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

async function loadAndShowQuestions() {
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
    state.questions = loadedQuestions;
  } catch (err) {
    console.error('Failed to load questions:', err);
    state.questions = [];
  }

  state.currentIndex = 0;

  if (state.questions.length === 0) {
    state.questionEl.textContent = 'No questions found for the selected filters.';
    state.choicesEl.innerHTML = '';
    state.explanationEl.textContent = '';
    return;
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

  toggleBtn.addEventListener('click', () => {
    const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
    toggleBtn.setAttribute('aria-expanded', String(!expanded));
    toggleBtn.parentElement.classList.toggle('show', !expanded);
  });

  optionsEl.addEventListener('click', e => {
    if (e.target.tagName !== 'LI') return;
    const val = e.target.dataset.value;
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

      // ✅ Notify statsTracker of selected category
      import('./statsTracker.js').then(({ statsTracker }) => {
        statsTracker.setCategory(val);
      });

      loadAndShowQuestions();
    } else if (filterKey === 'currentSubcategory') {
      const label = optionsEl.querySelector(`li[data-value="${val}"]`)?.textContent || 'Select';
      toggleBtn.textContent = `${label} ▾`;
      loadAndShowQuestions();
    }

    toggleBtn.setAttribute('aria-expanded', 'false');
    optionsEl.parentElement.classList.remove('show');
  });
}

function setupButtons() {
  state.shuffleBtn.addEventListener('click', () => {
    if (!state.questions.length) return;

    for (let i = state.questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [state.questions[i], state.questions[j]] = [state.questions[j], state.questions[i]];
    }

    state.currentIndex = 0;
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

  state.subcategoryToggle.parentElement.style.display = 'none';
  state.currentCategory = '';
  state.currentSubcategory = '';
  state.showingAnswers = false;

  const categoryOptionsWithIcons = quizMeta.categories.map(cat => ({
    ...cat,
    icon: getCategoryIcon[cat.value] || ''
  }));

  setupDropdown(state.categoryToggle, state.categoryOptions, categoryOptionsWithIcons, 'currentCategory');
  setupDropdown(state.subcategoryToggle, state.subcategoryOptions, [], 'currentSubcategory');

  state.categoryToggle.textContent = 'Select Category ▾';
  state.subcategoryToggle.textContent = 'Select Subcategory ▾';

  setupButtons();
  loadCryptoPrices();

  state.questionEl.textContent = 'Please select a category to start.';
  state.choicesEl.innerHTML = '';
  state.explanationEl.textContent = '';
});
