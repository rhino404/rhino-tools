// src/core/quizLoader.js
import { DATA_SOURCES } from './dataSources.js';
import { quizMeta, getCategoryIcon, categories } from '../data/quizMeta.js';
import { getSubcategoriesForCategory } from '../utils/quizMetaUtils.js';
import { filterUnansweredQuestions, showQuestion as originalShowQuestion } from '../ui/questions.js';
import { saveSession } from './sessionManager.js';
import { state } from './state.js';

// -------------------------
// Shuffle Array Helper
// -------------------------
export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// -------------------------
// Show Question Helper
// -------------------------
export function showQuestion(index, questions, els, stateObj) {
    if (!stateObj) throw new Error('State object is required for showQuestion');
    if (!els || !els.questionEl || !els.choicesEl || !els.explanationEl) {
        console.warn('[showQuestion] Missing elements:', els);
        return;
    }
    originalShowQuestion(index, questions, stateObj.showingAnswers, { ...els, state: stateObj });
    stateObj.currentIndex = index;
    saveSession(stateObj);
}

// -------------------------
// Fetch Questions Helper
// -------------------------
export async function fetchAllQuestions(category, subcategory = null) {
    if (!category) return [];
    const subData = DATA_SOURCES[category] || {};
    let questionFiles = [];

    if (!subcategory || subcategory === 'all') {
        questionFiles = Object.values(subData).flatMap(fileRef => {
            if (Array.isArray(fileRef)) return fileRef;
            if (typeof fileRef === 'string') return [fileRef];
            return [];
        });
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

// -------------------------
// Tag Filter Helper
// -------------------------
function filterByTags(questions, selectedTags) {
    if (!selectedTags || selectedTags.length === 0) return questions;
    return questions.filter(q =>
        Array.isArray(q.tags) && q.tags.some(tag => selectedTags.includes(tag))
    );
}

// =========================
// Session Persistence
// =========================
export function restoreSession(stateObj) {
    try {
        const saved = JSON.parse(sessionStorage.getItem('rynoToolsSession'));
        if (!saved) return false;
        stateObj.currentCategory = saved.currentCategory;
        stateObj.currentSubcategory = saved.currentSubcategory;
        stateObj.currentIndex = saved.currentIndex || 0;
        stateObj.selectedTags = saved.selectedTags || [];
        stateObj.showingAnswers = saved.showingAnswers || false;
        stateObj.hideAnswers = saved.hideAnswers || false;
        return true;
    } catch (e) {
        console.warn('[QuizLoader] Failed to restore session:', e);
        return false;
    }
}

// =========================
// Start Quiz (Study Mode)
// =========================
export async function startQuiz(category, subcategory, stateObj) {
    if (!stateObj) throw new Error('State object is required for startQuiz');

    // Ensure exam mode/state is cleared
    stateObj.examMode = false;
    stateObj.exam = null;

    stateObj.currentCategory = category;
    stateObj.currentSubcategory = subcategory || 'all';
    stateObj.selectedTags = [];

    const tagFilterEl = document.getElementById('tag-filter');
    if (tagFilterEl) tagFilterEl.innerHTML = '';

    stateObj.showingAnswers = false;
    stateObj.hideAnswers = false;

    // Update category UI
    try {
        const icon = getCategoryIcon[category] || '';
        const label = quizMeta.categories.find(o => o.value === category)?.label || 'Select Category';
        if (stateObj.categoryToggle) stateObj.categoryToggle.innerHTML = `${icon} ${label} ▾`;
    } catch {}

    // Update subcategory UI
    try {
        const subcategories = getSubcategoriesForCategory(category) || [];
        const subcatOptions = [{ label: 'All Subcategories', value: 'all', icon: '🌐' }, ...subcategories];
        if (stateObj.subcategoryToggle?.parentElement) stateObj.subcategoryToggle.parentElement.style.display = 'block';
        const subLabel = subcatOptions.find(s => s.value === stateObj.currentSubcategory)?.label || 'Select Subcategory';
        const subIcon = subcatOptions.find(s => s.value === stateObj.currentSubcategory)?.icon || '';
        if (stateObj.subcategoryToggle) stateObj.subcategoryToggle.innerHTML = `${subIcon} ${subLabel} ▾`;
    } catch {}

    // Set statsTracker category (optional, study mode only)
    import('../ui/statsTracker.js').then(({ statsTracker }) => {
        try { statsTracker.setCategory(category); }
        catch (e) { console.warn('[Session] failed to set statsTracker category:', e); }
    });

    // Fetch questions
    let questions = await fetchAllQuestions(category, stateObj.currentSubcategory);
    questions = shuffleArray(questions); // <-- Shuffle questions order
    questions.forEach(q => { if (q.choices && Array.isArray(q.choices)) shuffleArray(q.choices); });

    stateObj.allQuestions = [...questions];

    // Apply filters (tags and unanswered)
    questions = filterByTags(stateObj.allQuestions, stateObj.selectedTags);
    try { questions = filterUnansweredQuestions(questions); } catch (e) { console.warn(e); }

    stateObj.questions = questions || [];
    // If restoring, use saved index; otherwise, start at 0
    if (typeof stateObj.currentIndex !== 'number' || stateObj.currentIndex < 0 || stateObj.currentIndex >= stateObj.questions.length) {
        stateObj.currentIndex = 0;
    }

    // Show quiz container
    const quizContainer = document.getElementById('quiz-container');
    if (quizContainer) quizContainer.style.display = 'block';

    // Display current question (restored or first)
    showQuestion(stateObj.currentIndex, stateObj.questions, {
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

    showQuestion(state.currentIndex, state.questions, {
        questionEl: state.questionEl,
        choicesEl: state.choicesEl,
        explanationEl: state.explanationEl,
    }, state);

    saveSession(state);
}

// =========================
// Load and Show Questions
// =========================
export function loadAndShowQuestions(category, subcategory, startIndex = 0) {
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

    if (state.tagFilterEl) state.tagFilterEl.innerHTML = '';
    state.selectedTags = [];

    // Restore currentIndex if provided, else use 0
    state.currentIndex = typeof startIndex === 'number' ? startIndex : 0;

    return startQuiz(categoryObj.value, chosenSubcategory, state);
}

// =========================
// Reset Quiz
// =========================
export function resetQuiz() {
    state.currentCategory = null;
    state.currentSubcategory = null;
    state.questions = [];
    state.selectedTags = [];
    state.allQuestions = [];
    state.exam = null;
    state.examMode = false;
    state.showingAnswers = false;
    state.hideAnswers = false;

    if (state.categoryToggle) state.categoryToggle.innerHTML = '👉 Select Category ▾';
    if (state.subcategoryToggle) {
        state.subcategoryToggle.innerHTML = '🌐 All Subcategories ▾';
        state.subcategoryToggle.parentElement.style.display = 'none';
    }

    const quizContainer = document.getElementById('quiz-container');
    if (quizContainer) quizContainer.style.display = 'block';

    const tagFilterEl = document.getElementById('tag-filter');
    if (tagFilterEl) tagFilterEl.innerHTML = '';
    if (state.questionEl) state.questionEl.textContent = '';
    if (state.choicesEl) state.choicesEl.innerHTML = '';
    if (state.explanationEl) state.explanationEl.textContent = '';

    sessionStorage.removeItem('rynoToolsAnsweredQuestions');
    sessionStorage.removeItem('rynoToolsCurrentQuestion');

    import('../ui/statsTracker.js').then(({ statsTracker }) => statsTracker.setCategory(null));
}

// =========================
// Toggle buttons helpers
// =========================
export function toggleShowAnswers() { state.showingAnswers = !state.showingAnswers; }
export function toggleHideAnswers() { state.hideAnswers = !state.hideAnswers; }