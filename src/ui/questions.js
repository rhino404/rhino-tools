import { statsTracker } from './statsTracker.js';
import { showCorrectEffect, showIncorrectEffect } from './effects.js';
import { getIcon } from '../utils/utils.js';
import { updateTagFilter } from '../core/quizLoader.js'; // ✅ added for tag filter

const ANSWERED_KEY = 'rynoToolsAnsweredQuestions';
const CURRENT_INDEX_KEY = 'rynoToolsCurrentQuestionIndex';

// ✅ Load answered questions from localStorage
function getAnsweredQuestions() {
  return JSON.parse(localStorage.getItem(ANSWERED_KEY)) || [];
}

// ✅ Save a question ID as answered
function saveAnsweredQuestion(id) {
  const answered = getAnsweredQuestions();
  if (!answered.includes(id)) {
    answered.push(id);
    localStorage.setItem(ANSWERED_KEY, JSON.stringify(answered));
  }
}

// ✅ Allow clearing answered questions and session data
export function clearAnsweredQuestions() {
  localStorage.removeItem(ANSWERED_KEY);
  localStorage.removeItem(CURRENT_INDEX_KEY);
}

// ✅ Filter out answered questions
export function filterUnansweredQuestions(questions) {
  const answered = getAnsweredQuestions();
  const unanswered = questions.filter(q => !answered.includes(q.topic_id));

  if (unanswered.length === 0) {
    clearAnsweredQuestions();
    return questions;
  }
  return unanswered;
}

// ✅ Save and load current question index
function saveCurrentIndex(index) {
  localStorage.setItem(CURRENT_INDEX_KEY, String(index));
}
function getCurrentIndex() {
  return parseInt(localStorage.getItem(CURRENT_INDEX_KEY), 10) || 0;
}

// ✅ Render a question
export function showQuestion(current, questions, showingAnswers, { questionEl, choicesEl, explanationEl, state }) {
  if (!questions.length || !questions[current]) {
    questionEl.textContent = "No questions for this filter!";
    choicesEl.innerHTML = '';
    const existingImage = document.getElementById('questionImage');
    if (existingImage) existingImage.remove();
    return;
  }

  saveCurrentIndex(current);

  const q = questions[current];

  // 🛡 Ensure state always exists
  if (!state) state = {};
  state.currentIndex = current; // ✅ sync state

  questionEl.innerHTML = `${getIcon("categories", q.category)} ${q.question}`;
  choicesEl.innerHTML = '';

  const existingImage = document.getElementById('questionImage');
  if (existingImage) existingImage.remove();

  if (typeof q.image === 'string' && q.image.trim() !== '' && /\.(png|jpe?g|gif|svg)$/i.test(q.image.trim())) {
    const img = document.createElement('img');
    img.id = 'questionImage';
    img.src = q.image.trim();
    img.alt = 'Figure for this question';
    img.classList.add('question-image');

    img.onerror = () => {
      console.warn(`Image failed to load: ${img.src}`);
      img.remove();
    };
    questionEl.after(img);
  }

  q.choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.textContent = choice;
    btn.className = 'choice-btn';
    if (showingAnswers && choice === q.correct) {
      btn.classList.add('correct');
    }
    btn.onclick = () =>
      checkAnswer(choice, q, state.currentIndex, questions, showingAnswers, {
        questionEl,
        choicesEl,
        explanationEl,
        state
      });
    choicesEl.appendChild(btn);
  });
}

// ✅ Handle answer checking
export function checkAnswer(choice, q, currentIndex, questions, showingAnswers, { questionEl, choicesEl, explanationEl, state } = {}) {
  if (!state) state = {};
  if (typeof state.hideAnswers === 'undefined') state.hideAnswers = false;

  Array.from(choicesEl.children).forEach(btn => btn.disabled = true);
  let transitionTime = 1000;

  const isCorrect = (choice === q.correct);

  saveAnsweredQuestion(q.topic_id);

  statsTracker.logAnswer({ ...q, category: q.category, subcategory: q.subcategory }, isCorrect);

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
    explanationEl.classList.add('shake');
    setTimeout(() => explanationEl.classList.remove('shake'), 400);
  }

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

// ✅ Restore last position after reload
export function getStartingIndex() {
  return getCurrentIndex();
}


// ===============================
// ✅ Render Tag Filter UI
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
    if (selectedTags.includes(tag)) {
      btn.classList.add('active');
    }

    btn.onclick = () => {
      // ------------------------------
      // NEW: Single-select toggle mode
      // ------------------------------
      if (selectedTags.includes(tag)) {
        // Clicking the same active tag → clear all
        selectedTags = [];
        Array.from(tagList.children).forEach(b => b.classList.remove('active'));
      } else {
        // Clicking a different tag → activate only that one
        selectedTags = [tag];
        Array.from(tagList.children).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }

      // ✅ Call quizLoader to update filtering
      updateTagFilter(selectedTags);

      /* 
      -----------------------------------------
      PREVIOUS MULTI-SELECT LOGIC (for reference)
      Uncomment if to get multi-select back.
      -----------------------------------------
      if (selectedTags.includes(tag)) {
        selectedTags = selectedTags.filter(t => t !== tag);
        btn.classList.remove('active');
      } else {
        selectedTags.push(tag);
        btn.classList.add('active');
      }
      updateTagFilter(selectedTags);
      */
    };

    tagList.appendChild(btn);
  });

  containerEl.appendChild(tagList);
}


// ===============================
// ✅ Tag Filter Scroll (Mobile-first)
// ===============================
// - Mobile (<768px): horizontal touch scrolling via native CSS
// - Desktop (≥768px): tags wrap to multiple rows, no scroll logic needed
// ===============================

document.addEventListener('DOMContentLoaded', () => {
  const tagList = document.querySelector('.tag-filter-list');
  if (!tagList) return;

  // Only enable wheel-to-horizontal mapping on mobile viewports
  function handleWheel(e) {
    // Prevent this logic from running on desktop
    if (window.innerWidth >= 768) return;

    if (e.deltaY !== 0) {
      e.preventDefault(); // stop page from scrolling vertically
      tagList.scrollLeft += e.deltaY; // scroll sideways instead
    }
  }

  tagList.addEventListener('wheel', handleWheel, { passive: false });

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) {
      tagList.scrollLeft = 0;
    }
  });
});
