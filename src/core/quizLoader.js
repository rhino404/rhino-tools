//quizLoader.js

import { DATA_SOURCES } from './dataSources.js';
import { quizMeta, getCategoryIcon, categories } from '../data/quizMeta.js';
import { getSubcategoriesForCategory } from '../utils/quizMetaUtils.js';
import { filterUnansweredQuestions, showQuestion as originalShowQuestion } from '../ui/questions.js';
import { saveSession } from './sessionManager.js';
import { state } from './state.js';


function showQuestion(index, questions, showingAnswers, els, state) {
  originalShowQuestion(index, questions, showingAnswers, els);
  state.currentIndex = index;
  saveSession(state);
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

export async function startQuiz(category, subcategory, state) {
  state.currentCategory = category;
  state.currentSubcategory = subcategory || 'all';

  try {
    const icon = getCategoryIcon[category] || '';
    const label = quizMeta.categories.find(o => o.value === category)?.label || 'Select Category';
    if (state.categoryToggle) state.categoryToggle.innerHTML = `${icon} ${label} ▾`;
  } catch {}

  try {
    const subcategories = getSubcategoriesForCategory(category) || [];
    const subcatOptions = [
      { label: 'All Subcategories', value: 'all', icon: '🌐' },
      ...subcategories
    ];
    state.subcategoryToggle.parentElement.style.display = 'block';
    const subLabel = subcatOptions.find(s => s.value === state.currentSubcategory)?.label || 'Select Subcategory';
    const subIcon = subcatOptions.find(s => s.value === state.currentSubcategory)?.icon || '';
    state.subcategoryToggle.innerHTML = `${subIcon} ${subLabel} ▾`;
  } catch {}

  import('../ui/statsTracker.js').then(({ statsTracker }) => {
    try {
      statsTracker.setCategory(category);
    } catch (e) {
      console.warn('[Session] failed to set statsTracker category:', e);
    }
  });

  let questions = await fetchQuestions(category, state.currentSubcategory);
  try {
    questions = filterUnansweredQuestions(questions);
  } catch (e) {
    console.warn('[startQuiz] filterUnansweredQuestions failed:', e);
  }

  state.questions = questions || [];
  state.currentIndex = 0;

  showQuestion(state.currentIndex, state.questions, state.showingAnswers, {
    questionEl: state.questionEl,
    choicesEl: state.choicesEl,
    explanationEl: state.explanationEl,
  }, state);

  saveSession(state);
}

// =========================
// Load and Show Questions
// =========================
export function loadAndShowQuestions(category, subcategory, startIndex = 0, showAnswers = false) {
    const categoryObj = (typeof category === 'string')
        ? categories.find(c => c.value === category || c.id === category)
        : category;

    if (!categoryObj) {
        console.error(`[QuizLoader] Invalid category:`, category);
        return;
    }

    const validSubcats = getSubcategoriesForCategory(categoryObj.value);
    let chosenSubcategory = subcategory;
    if (typeof chosenSubcategory !== 'string' || 
        (chosenSubcategory !== 'all' && !validSubcats.some(sc => sc.value === chosenSubcategory))) {
        console.warn(`[QuizLoader] Invalid or missing subcategory, defaulting to 'all'`);
        chosenSubcategory = 'all';
    }

    // ✅ Just use the modern loader
    startQuiz(categoryObj.value, chosenSubcategory, state);
}
