// src/ui/questions.js
import { showCorrectEffect, showIncorrectEffect } from './effects.js';
import { getIcon } from '../utils/utils.js';
import { recordExamAnswer, endExam } from '../core/examManager.js';
import { applyTagFilter } from '../core/quizLoader.js';
import { isAnswerCorrect } from '../utils/answerUtils.js';

const ANSWERED_KEY = 'rynoToolsAnsweredQuestions';
const CURRENT_INDEX_KEY = 'rynoToolsCurrentQuestionIndex';

function getAnsweredQuestions() {
  return JSON.parse(localStorage.getItem(ANSWERED_KEY)) || [];
}

function saveAnsweredQuestion(id) {
  const answered = getAnsweredQuestions();
  if (!answered.includes(id)) {
    answered.push(id);
    localStorage.setItem(ANSWERED_KEY, JSON.stringify(answered));
  }
}

export function clearAnsweredQuestions() {
  localStorage.removeItem(ANSWERED_KEY);
  localStorage.removeItem(CURRENT_INDEX_KEY);
}

export function filterUnansweredQuestions(questions) {
  const answered = getAnsweredQuestions();
  const unanswered = questions.filter(q => !answered.includes(q.topic_id));
  if (unanswered.length === 0) {
    clearAnsweredQuestions();
    return questions;
  }
  return unanswered;
}

function saveCurrentIndex(index) {
  localStorage.setItem(CURRENT_INDEX_KEY, String(index));
}

function getCurrentIndex() {
  return parseInt(localStorage.getItem(CURRENT_INDEX_KEY), 10) || 0;
}

export function showQuestion(current, questions, showingAnswers, { questionEl, choicesEl, explanationEl, state }) {
  if (!state) throw new Error('State object is required for showQuestion');
  if (!questions.length || !questions[current]) {
    questionEl.textContent = "No questions for this filter!";
    choicesEl.innerHTML = '';
    const existingImage = document.getElementById('questionImage');
    if (existingImage) existingImage.remove();
    return;
  }

  saveCurrentIndex(current);
  const q = questions[current];
  state.currentIndex = current;

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
    img.onerror = () => img.remove();
    questionEl.after(img);
  }

  q.choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.textContent = choice;
    btn.className = 'choice-btn';

    if (showingAnswers && choice === q.correct) {
      btn.classList.add('correct');
    }

    btn.setAttribute('data-question-id', q.id);
    btn.setAttribute('data-value', choice); // <-- ADD THIS LINE

    btn.onclick = () => {
      const value = btn.getAttribute('data-value'); // <-- USE THIS VALUE
      if (state.examMode) {
        // Only record and advance via examManager in exam mode
        recordExamAnswer(q.id, value);
      } else {
        // Only handle check/advance in study mode
        checkAnswer(
          value,
          q,
          state.currentIndex,
          questions,
          showingAnswers,
          { questionEl, choicesEl, explanationEl, state }
        );
      }
    };

    choicesEl.appendChild(btn);
  });
}


export function showAnswerFeedback(isCorrect, q, explanationEl, state = {}) {
  let transitionTime = 1000;
  if (isCorrect) {
    explanationEl.innerHTML = `<span class='correct'>✅ Correct!</span>`;
    if (typeof showCorrectEffect === 'function') showCorrectEffect(explanationEl);
  } else {
    if (!state.hideAnswers) {
      explanationEl.innerHTML = `<span class='incorrect'>❌: ${q.explanation}</span>`;
      transitionTime = 8000;
    } else {
      explanationEl.innerHTML = `<span class='incorrect'>❌ Incorrect!</span>`;
    }
    if (typeof showIncorrectEffect === 'function') showIncorrectEffect(explanationEl);
    explanationEl.classList.add('shake');
    setTimeout(() => explanationEl.classList.remove('shake'), 400);
  }
  return transitionTime;
}

export function checkAnswer(
  choice,
  q,
  currentIndex,
  questions,
  showingAnswers,
  { questionEl, choicesEl, explanationEl, state } = {}
) {
  if (!state) state = {};
  if (typeof state.hideAnswers === 'undefined') state.hideAnswers = false;

  Array.from(choicesEl.children).forEach(btn => (btn.disabled = true));
  const isCorrect = isAnswerCorrect(choice, q.correct); // <-- Move this line up
  let transitionTime = showAnswerFeedback(isCorrect, q, explanationEl, state); // <-- Then use it here

  // Advance or end exam
  setTimeout(() => {
    state.currentIndex = currentIndex + 1;

    if (state.currentIndex < questions.length) {
      saveCurrentIndex(state.currentIndex);
      explanationEl.textContent = '';
      showQuestion(state.currentIndex, questions, showingAnswers, {
        questionEl,
        choicesEl,
        explanationEl,
        state,
      });
    } else {
      if (state.examMode) {
        endExam();
      } else {
        questionEl.textContent = 'Quiz Complete!';
        choicesEl.innerHTML = '';
        explanationEl.textContent = '';
        clearAnsweredQuestions();
      }
    }
  }, transitionTime);
}

export function getStartingIndex() {
  return getCurrentIndex();
}

// ===============================
// Tag Filter
// ===============================
export function renderTagFilter(containerEl, availableTags, state) {
  if (!containerEl || !state) return;
  containerEl.innerHTML = '';

  const title = document.createElement('div');
  title.className = 'tag-filter-title'; 
  containerEl.appendChild(title);

  const tagList = document.createElement('div');
  tagList.className = 'tag-filter-list';

  const selectedTags = new Set(state.selectedTags || []);

  availableTags.forEach(tag => {
    const btn = document.createElement('button');
    btn.textContent = tag;
    btn.className = 'tag-filter-btn';
    if (selectedTags.has(tag)) btn.classList.add('active');

    btn.onclick = () => {
      if (selectedTags.has(tag)) selectedTags.clear();
      else {
        selectedTags.clear();
        selectedTags.add(tag);
      }

      Array.from(tagList.children).forEach(b => b.classList.remove('active'));
      if (selectedTags.has(tag)) btn.classList.add('active');

      state.selectedTags = [...selectedTags];
      applyTagFilter(state.selectedTags);
    };
    tagList.appendChild(btn);
  });

  containerEl.appendChild(tagList);
}
