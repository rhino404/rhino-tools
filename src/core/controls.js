import { statsTracker } from '../ui/statsTracker.js';
import { showCorrectEffect, showIncorrectEffect } from '../ui/effects.js';
import { getIcon } from '../utils/utils.js';
import { renderTagFilter } from '../ui/tagFilter.js';
import { applyTagFilter } from '../core/quizLoader.js'; // ✅ for tag filtering

// ===============================
// ======== questions.js =========
// ===============================
const ANSWERED_KEY = 'rynoToolsAnsweredQuestions';
const CURRENT_INDEX_KEY = 'rynoToolsCurrentQuestionIndex';

// ===============================
// ===== LocalStorage Helpers ====
// ===============================
function getAnsweredQuestions() {
  return JSON.parse(localStorage.getItem(ANSWERED_KEY)) || [];
}

export function saveAnsweredQuestion(id) {
  const answered = getAnsweredQuestions();
  if (!answered.includes(id)) {
    answered.push(id);
    localStorage.setItem(ANSWERED_KEY, JSON.stringify(answered));
  }
}

export function saveCurrentIndex(index) {
  localStorage.setItem(CURRENT_INDEX_KEY, String(index));
}

export function getCurrentIndex() {
  return parseInt(localStorage.getItem(CURRENT_INDEX_KEY), 10) || 0;
}

export function clearAnsweredQuestions() {
  localStorage.removeItem(ANSWERED_KEY);
  localStorage.removeItem(CURRENT_INDEX_KEY);
}

// ===============================
// ===== Shared Quiz State =======
// ===============================
export const quizState = {
  currentIndex: 0,
  hideAnswers: false,
  showingAnswers: false,
  questions: [],
  questionEl: null,
  choicesEl: null,
  explanationEl: null,
  hideAnswersBtn: null,
  shuffleBtn: null,
  toggleAnswersBtn: null,
  showStatsBtn: null,
  selectedTags: []
};

// ===============================
// ===== Show a Question =========
// ===============================
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
  if (!state) state = quizState;
  state.currentIndex = current;

  questionEl.innerHTML = `${getIcon("categories", q.category)} ${q.question}`;
  choicesEl.innerHTML = '';

  if (state.hideAnswersBtn) {
    state.hideAnswersBtn.classList.toggle('active', state.hideAnswers);
    state.hideAnswersBtn.title = state.hideAnswers
      ? 'Show explanations when wrong'
      : 'Hide explanations when wrong';
  }

  if (state.toggleAnswersBtn) {
    state.toggleAnswersBtn.classList.toggle('active', state.showingAnswers);
    state.toggleAnswersBtn.title = state.showingAnswers
      ? 'Hide correct answers'
      : 'Show correct answers';
  }

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
// ===== Check Answer ============
// ===============================
export function checkAnswer(choice, q, currentIndex, questions, showingAnswers, { questionEl, choicesEl, explanationEl, state } = {}) {
  if (!state) state = quizState;
  state.hideAnswers = state.hideAnswers || false;

  Array.from(choicesEl.children).forEach(btn => btn.disabled = true);
  let transitionTime = 1000;

  const isCorrect = (choice === q.correct);
  saveAnsweredQuestion(q.topic_id);
  statsTracker.logAnswer({ ...q, category: q.category, subcategory: q.subcategory }, isCorrect);

  // Display feedback
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

  // Move to next question
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
// ===== Filter Unanswered =======
// ===============================
export function filterUnansweredQuestions(questions) {
  const answered = getAnsweredQuestions();
  const unanswered = questions.filter(q => !answered.includes(q.topic_id));

  if (unanswered.length === 0) {
    clearAnsweredQuestions();
    return questions;
  }
  return unanswered;
}

// ===============================
// ===== Restore last index ======
// ===============================
export function getStartingIndex() {
  return getCurrentIndex();
}

// ===============================
// ===== Render Quiz Tag Filter ====
// ===============================
export function renderQuizTagFilter(containerEl, availableTags, state) {
  if (!containerEl || !state) return;
  console.log(containerEl)
  console.log(availableTags)
  console.log(state)

  const selectedTags = state.selectedTags || [];

  renderTagFilter(containerEl, availableTags, selectedTags, {
    multiSelect: true,
    onChange: (newSelected) => {
      state.selectedTags = Array.isArray(newSelected) ? newSelected : [];
      applyTagFilter(state.selectedTags);

      // Sync tag button UI
      Array.from(containerEl.querySelectorAll('.tag-filter-btn')).forEach(btn => {
        btn.classList.toggle('active', state.selectedTags.includes(btn.dataset.value));
      });
    }
  });
}

// ===============================
// ===== Tag Filter Scroll =======
// ===============================
document.addEventListener('DOMContentLoaded', () => {
  const tagList = document.querySelector('.tag-filter-list');
  if (!tagList) return;

  function handleWheel(e) {
    if (window.innerWidth >= 768) return; // Desktop no scroll mapping
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

// ===============================
// ===== Setup Quiz Buttons =======
// ===============================
export function setupButtons(state) {
  state.currentIndex = state.currentIndex || 0;
  state.hideAnswers = state.hideAnswers || false;
  state.showingAnswers = state.showingAnswers || false;

  function safeClick(btn, handler) {
    if (btn && !btn.dataset.listenerAttached) {
      btn.addEventListener('click', handler);
      btn.dataset.listenerAttached = 'true';
    }
  }

  function cacheElement(key, selector) {
    if (!state[key]) state[key] = document.querySelector(selector);
    return state[key];
  }

  cacheElement('hideAnswersBtn', '#hideAnswersBtn');
  cacheElement('shuffleBtn', '#shuffleBtn');
  cacheElement('toggleAnswersBtn', '#toggle-answers-btn');
  cacheElement('showStatsBtn', '#show-stats-btn');

  function updateHideAnswersBtnUI() {
    if (!state.hideAnswersBtn) return;
    state.hideAnswersBtn.classList.toggle('active', state.hideAnswers);
    state.hideAnswersBtn.title = state.hideAnswers
      ? 'Show explanations when wrong'
      : 'Hide explanations when wrong';
  }

  function updateToggleAnswersBtnUI() {
    if (!state.toggleAnswersBtn) return;
    state.toggleAnswersBtn.classList.toggle('active', state.showingAnswers);
    state.toggleAnswersBtn.title = state.showingAnswers
      ? 'Hide correct answers'
      : 'Show correct answers';
  }

  function syncAllButtonsUI() {
    updateHideAnswersBtnUI();
    updateToggleAnswersBtnUI();
  }

  syncAllButtonsUI();

  safeClick(state.hideAnswersBtn, () => {
    state.hideAnswers = !state.hideAnswers;
    syncAllButtonsUI();

    showQuestion(state.currentIndex, state.questions, state.showingAnswers, {
      questionEl: state.questionEl,
      choicesEl: state.choicesEl,
      explanationEl: state.explanationEl,
      state
    });
  });

  safeClick(state.shuffleBtn, () => {
    if (!state.questions?.length) return;
    const start = state.currentIndex;
    const remaining = state.questions.slice(start);

    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }

    state.questions = [...state.questions.slice(0, start), ...remaining];

    showQuestion(state.currentIndex, state.questions, state.showingAnswers, {
      questionEl: state.questionEl,
      choicesEl: state.choicesEl,
      explanationEl: state.explanationEl,
      state
    });

    syncAllButtonsUI();
  });

  safeClick(state.toggleAnswersBtn, () => {
    state.showingAnswers = !state.showingAnswers;
    syncAllButtonsUI();

    showQuestion(state.currentIndex, state.questions, state.showingAnswers, {
      questionEl: state.questionEl,
      choicesEl: state.choicesEl,
      explanationEl: state.explanationEl,
      state
    });
  });

  safeClick(state.showStatsBtn, () => {
    import('../ui/statsTracker.js').then(({ statsTracker }) => statsTracker.showCard());
  });
}
