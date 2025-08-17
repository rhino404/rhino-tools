import { DATA_SOURCES } from './dataSources.js';
import { quizMeta, getCategoryIcon, categories } from '../data/quizMeta.js';
import { getSubcategoriesForCategory } from '../utils/quizMetaUtils.js';
import { filterUnansweredQuestions, showQuestion as originalShowQuestion } from '../ui/questions.js';
import { saveSession } from './sessionManager.js';
import { state } from './state.js';

// =========================
// Show question helper
// =========================
function showQuestion(index, questions, showingAnswers, els, stateObj) {
    if (!stateObj) throw new Error('State object is required for showQuestion');
    if (!els || !els.questionEl || !els.choicesEl || !els.explanationEl) {
        console.warn('[showQuestion] Missing elements:', els);
        return;
    }
    originalShowQuestion(index, questions, showingAnswers, { ...els, state: stateObj });
    stateObj.currentIndex = index;
    saveSession(stateObj);
}

// =========================
// Fetch Questions
// =========================
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

// =========================
// Tag filter helper
// =========================
function filterByTags(questions, selectedTags) {
    if (!selectedTags || selectedTags.length === 0) return questions;
    return questions.filter(q =>
        Array.isArray(q.tags) && q.tags.some(tag => selectedTags.includes(tag))
    );
}

// =========================
// Start Quiz
// =========================
export async function startQuiz(category, subcategory, stateObj) {
    if (!stateObj) throw new Error('State object is required for startQuiz');

    stateObj.currentCategory = category;
    stateObj.currentSubcategory = subcategory || 'all';

    // Update category UI
    try {
        const icon = getCategoryIcon[category] || '';
        const label = quizMeta.categories.find(o => o.value === category)?.label || 'Select Category';
        if (stateObj.categoryToggle) stateObj.categoryToggle.innerHTML = `${icon} ${label} ▾`;
    } catch {}

    // Update subcategory UI
    try {
        const subcategories = getSubcategoriesForCategory(category) || [];
        const subcatOptions = [
            { label: 'All Subcategories', value: 'all', icon: '🌐' },
            ...subcategories
        ];
        if (stateObj.subcategoryToggle?.parentElement) stateObj.subcategoryToggle.parentElement.style.display = 'block';
        const subLabel = subcatOptions.find(s => s.value === stateObj.currentSubcategory)?.label || 'Select Subcategory';
        const subIcon = subcatOptions.find(s => s.value === stateObj.currentSubcategory)?.icon || '';
        if (stateObj.subcategoryToggle) stateObj.subcategoryToggle.innerHTML = `${subIcon} ${subLabel} ▾`;
    } catch {}

    import('../ui/statsTracker.js').then(({ statsTracker }) => {
        try { statsTracker.setCategory(category); }
        catch (e) { console.warn('[Session] failed to set statsTracker category:', e); }
    });

    // Fetch and store questions
    let questions = await fetchQuestions(category, stateObj.currentSubcategory);
    stateObj.allQuestions = [...questions]; // store unfiltered list
    questions = filterByTags(stateObj.allQuestions, stateObj.selectedTags);

    try {
        questions = filterUnansweredQuestions(questions);
    } catch (e) {
        console.warn('[startQuiz] filterUnansweredQuestions failed:', e);
    }

    stateObj.questions = questions || [];
    stateObj.currentIndex = 0;

    showQuestion(stateObj.currentIndex, stateObj.questions, stateObj.showingAnswers, {
        questionEl: stateObj.questionEl,
        choicesEl: stateObj.choicesEl,
        explanationEl: stateObj.explanationEl,
    }, stateObj);

    saveSession(stateObj);
    return stateObj.questions;
}

// =========================
// Apply Tag Filter mid-quiz
// =========================
export function applyTagFilter(newTags) {
    state.selectedTags = Array.isArray(newTags) ? newTags : [];

    let filteredQuestions = filterByTags(state.allQuestions || [], state.selectedTags);
    filteredQuestions = filterUnansweredQuestions(filteredQuestions);

    let newIndex = state.currentIndex || 0;
    if (newIndex >= filteredQuestions.length) newIndex = Math.max(filteredQuestions.length - 1, 0);

    state.questions = filteredQuestions;
    state.currentIndex = newIndex;

    showQuestion(
        state.currentIndex,
        state.questions,
        state.showingAnswers,
        {
            questionEl: state.questionEl,
            choicesEl: state.choicesEl,
            explanationEl: state.explanationEl,
        },
        state
    );

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
        return [];
    }

    const validSubcats = getSubcategoriesForCategory(categoryObj.value) || [];
    let chosenSubcategory = subcategory;
    if (typeof chosenSubcategory !== 'string' ||
        (chosenSubcategory !== 'all' && !validSubcats.some(sc => sc.value === chosenSubcategory))) {
        console.warn(`[QuizLoader] Invalid or missing subcategory, defaulting to 'all'`);
        chosenSubcategory = 'all';
    }

    return startQuiz(categoryObj.value, chosenSubcategory, state);
}

export function resetQuiz() {
  state.currentCategory = null;
  state.currentSubcategory = null;
  state.questions = [];
  state.selectedTags = [];

  // Reset UI
  if (state.categoryToggle) state.categoryToggle.innerHTML = '👉 Select Category ▾';
  if (state.subcategoryToggle) {
    state.subcategoryToggle.innerHTML = '🌐 All Subcategories ▾';
    state.subcategoryToggle.parentElement.style.display = 'none';
  }
  const tagFilterEl = document.getElementById('tag-filter');
  if (tagFilterEl) tagFilterEl.innerHTML = '';
  if (state.questionEl) state.questionEl.textContent = '';
  if (state.choicesEl) state.choicesEl.innerHTML = '';
  if (state.explanationEl) state.explanationEl.textContent = '';

  import('../ui/statsTracker.js').then(({ statsTracker }) => statsTracker.setCategory(null));
}
