// ===============================
// ======== questions.js =========
// ===============================

import { statsTracker } from './statsTracker.js';
import { showCorrectEffect, showIncorrectEffect } from './effects.js';
import { getIcon } from '../utils/utils.js';
import { updateTagFilter } from '../core/quizLoader.js'; // ✅ For tag filtering

// ------------------------
// LocalStorage Keys
// ------------------------
const ANSWERED_KEY = 'rynoToolsAnsweredQuestions';
const CURRENT_INDEX_KEY = 'rynoToolsCurrentQuestionIndex';

// ------------------------
// LocalStorage Helpers
// ------------------------

// Get answered questions from storage
function getAnsweredQuestions() {
  return JSON.parse(localStorage.getItem(ANSWERED_KEY)) || [];
}

// Save a question as answered
function saveAnsweredQuestion(id) {
  const answered = getAnsweredQuestions();
  if (!answered.includes(id)) {
    answered.push(id);
    localStorage.setItem(ANSWERED_KEY, JSON.stringify(answered));
  }
}

// Save current quiz index to storage
function saveCurrentIndex(index) {
  localStorage.setItem(CURRENT_INDEX_KEY, String(index));
}

// Get last saved quiz index
function getCurrentIndex() {
  return parseInt(localStorage.getItem(CURRENT_INDEX_KEY), 10) || 0;
}

// Clear answered questions and index
export function clearAnsweredQuestions() {
  localStorage.removeItem(ANSWERED_KEY);
  localStorage.removeItem(CURRENT_INDEX_KEY);
}

// Export helpers optionally for other modules
export { saveCurrentIndex, getCurrentIndex };

// ------------------------
// Shared Quiz State
// ------------------------
export const quizState = {
  currentIndex: 0,
  hideAnswers: false // synced with buttons
};

// ===============================
// Question Rendering
// ===============================

/**
 * Renders a question and its choices
 * @param {number} current - current index
 * @param {Array} questions - all questions
 * @param {boolean} showingAnswers - highlight correct answers
 * @param {Object} elements - DOM elements and state
 */
export function showQuestion(current, questions, showingAnswers, { questionEl, choicesEl, explanationEl, state }) {
  // Guard against empty questions
  if (!questions.length || !questions[current]) {
    questionEl.textContent = "No questions for this filter!";
    choicesEl.innerHTML = '';
    const existingImage = document.getElementById('questionImage');
    if (existingImage) existingImage.remove();
    return;
  }

  saveCurrentIndex(current);
  const q = questions[current];
  if (!state) state = {};
  state.currentIndex = current;

  // Render question text with category icon
  questionEl.innerHTML = `${getIcon("categories", q.category)} ${q.question}`;
  choicesEl.innerHTML = '';

  // Sync hideAnswers button dynamically
  if (state.hideAnswersBtn) {
    state.hideAnswersBtn.classList.toggle('active', state.hideAnswers);
    state.hideAnswersBtn.title = state.hideAnswers
      ? 'Show explanations when wrong'
      : 'Hide explanations when wrong';
  }

  // Render question image
  const existingImage = document.getElementById('questionImage');
  if (existingImage) existingImage.remove();
  if (typeof q.image === 'string' && q.image.trim() !== '' && /\.(png|jpe?g|gif|svg)$/i.test(q.image.trim())) {
    const img = document.createElement('img');
    img.id = 'questionImage';
    img.src = q.image.trim();
    img.alt = 'Figure for this question';
    img.classList.add('question-image');
    img.onerror = () => img.remove();
    questionEl.after(img);
  }

  // Render choice buttons
  q.choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.textContent = choice;
    btn.className = 'choice-btn';

    if (showingAnswers && choice === q.correct) btn.classList.add('correct');

    btn.onclick = () =>
      checkAnswer(choice, q, state.currentIndex, questions, showingAnswers, { questionEl, choicesEl, explanationEl, state });

    choicesEl.appendChild(btn);
  });
}

// ===============================
// Answer Handling
// ===============================

/**
 * Handles user answer selection
 */
export function checkAnswer(choice, q, currentIndex, questions, showingAnswers, { questionEl, choicesEl, explanationEl, state } = {}) {
  if (!state) state = {};
  state.hideAnswers = state.hideAnswers || false;

  // Disable all choice buttons
  Array.from(choicesEl.children).forEach(btn => btn.disabled = true);

  let transitionTime = 1000;
  const isCorrect = choice === q.correct;

  // Save question as answered
  saveAnsweredQuestion(q.topic_id);

  // Log answer in stats
  statsTracker.logAnswer({ ...q, category: q.category, subcategory: q.subcategory }, isCorrect);

  // Feedback UI
  if (isCorrect) {
    explanationEl.innerHTML = `<span class='correct'>✅ Correct!</span>`;
    showCorrectEffect(explanationEl);
  } else {
    if (!state.hideAnswers) {
      explanationEl.innerHTML = `<span class='incorrect'>❌: ${q.explanation}</span>`;
      transitionTime = 8000;
    } else {
      explanationEl.innerHTML = `<span class='incorrect'>❌ Incorrect!</span>`;
      transitionTime = 1000;
    }
    showIncorrectEffect(explanationEl);

    // Small shake animation
    explanationEl.classList.add('shake');
    setTimeout(() => explanationEl.classList.remove('shake'), 400);
  }

  // Move to next question after delay
  setTimeout(() => {
    state.currentIndex = currentIndex + 1;
    if (state.currentIndex < questions.length) {
      saveCurrentIndex(state.currentIndex);
      explanationEl.textContent = '';
      showQuestion(state.currentIndex, questions, showingAnswers, { questionEl, choicesEl, explanationEl, state });
    } else {
      questionEl.textContent = "Quiz Complete!";
      choicesEl.innerHTML = '';
      explanationEl.textContent = '';
      clearAnsweredQuestions();
    }
  }, transitionTime);
}

// ===============================
// Question Filtering
// ===============================

// Filter out answered questions, reset if all answered
export function filterUnansweredQuestions(questions) {
  const answered = getAnsweredQuestions();
  const unanswered = questions.filter(q => !answered.includes(q.topic_id));

  if (unanswered.length === 0) {
    clearAnsweredQuestions();
    return questions;
  }
  return unanswered;
}

// Restore last position
export function getStartingIndex() {
  return getCurrentIndex();
}

// ===============================
// Tag Filter UI
// ===============================
export function renderTagFilter(containerEl, availableTags, selectedTags = []) {
  if (!containerEl) return;

  containerEl.innerHTML = '';

  const title = document.createElement('div');
  title.className = 'tag-filter-title';
  containerEl.appendChild(title);

  const tagList = document.createElement('div');
  tagList.className = 'tag-filter-list';

  availableTags.forEach(tag => {
    const btn = document.createElement('button');
    btn.textContent = tag;
    btn.className = 'tag-filter-btn';
    if (selectedTags.includes(tag)) btn.classList.add('active');

    btn.onclick = () => {
      // Single-select toggle mode
      if (selectedTags.includes(tag)) {
        selectedTags = [];
        Array.from(tagList.children).forEach(b => b.classList.remove('active'));
      } else {
        selectedTags = [tag];
        Array.from(tagList.children).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }

      updateTagFilter(selectedTags);
    };

    tagList.appendChild(btn);
  });

  containerEl.appendChild(tagList);
}

// ===============================
// Tag Filter Scroll (Mobile-first)
// ===============================
document.addEventListener('DOMContentLoaded', () => {
  const tagList = document.querySelector('.tag-filter-list');
  if (!tagList) return;

  function handleWheel(e) {
    if (window.innerWidth >= 768) return; // Desktop does not scroll horizontally
    if (e.deltaY !== 0) {
      e.preventDefault();
      tagList.scrollLeft += e.deltaY;
    }
  }

  tagList.addEventListener('wheel', handleWheel, { passive: false });

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) tagList.scrollLeft = 0;
  });
});
