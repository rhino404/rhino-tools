// questions.js
import { statsTracker } from './statsTracker.js';
import { showCorrectEffect, showIncorrectEffect } from './effects.js';
import { getIcon } from './utils.js';

const ANSWERED_KEY = 'rhinoToolsAnsweredQuestions';
const CURRENT_INDEX_KEY = 'rhinoToolsCurrentQuestionIndex';
const JUST_ANSWERED_KEY = 'rhinoToolsJustAnsweredFlag';

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
  localStorage.removeItem(JUST_ANSWERED_KEY);
}

// ✅ Filter out answered questions
export function filterUnansweredQuestions(questions) {
  const answered = getAnsweredQuestions();
  const unanswered = questions.filter(q => !answered.includes(q.topic_id));

  // Reset cycle if all answered
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
export function showQuestion(current, questions, showingAnswers, { questionEl, choicesEl, explanationEl }) {
  if (!questions.length || !questions[current]) {
    questionEl.textContent = "No questions for this filter!";
    choicesEl.innerHTML = '';
    const existingImage = document.getElementById('questionImage');
    if (existingImage) existingImage.remove();
    return;
  }

  const justAnswered = localStorage.getItem(JUST_ANSWERED_KEY) === 'true';
  if (!justAnswered) {
    saveCurrentIndex(current);
  }

  const q = questions[current];

  questionEl.innerHTML = `${getIcon("categories", q.category)} ${q.question}`;
  choicesEl.innerHTML = '';

  const existingImage = document.getElementById('questionImage');
  if (existingImage) existingImage.remove();

  if (
    typeof q.image === 'string' &&
    q.image.trim() !== '' &&
    /\.(png|jpe?g|gif|svg)$/i.test(q.image.trim())
  ) {
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
      btn.classList.add('highlight');
    }
    btn.onclick = () =>
      checkAnswer(choice, q, current, questions, showingAnswers, {
        questionEl,
        choicesEl,
        explanationEl
      });
    choicesEl.appendChild(btn);
  });
}

// ✅ Handle answer checking
export function checkAnswer(choice, q, currentIndex, questions, showingAnswers, { questionEl, choicesEl, explanationEl }) {
  Array.from(choicesEl.children).forEach(btn => btn.disabled = true);
  let transitionTime = 1000;

  const isCorrect = (choice === q.correct);

  saveAnsweredQuestion(q.topic_id);

  statsTracker.logAnswer({
    ...q,
    category: q.category,
    subcategory: q.subcategory
  }, isCorrect);

  if (isCorrect) {
    explanationEl.innerHTML = `<span class='correct'>✅ Correct!</span>`;
    showCorrectEffect(explanationEl);
  } else {
    explanationEl.innerHTML = `<span class='incorrect'>❌: ${q.explanation}</span>`;
    showIncorrectEffect(explanationEl);
    explanationEl.classList.add('shake');
    setTimeout(() => explanationEl.classList.remove('shake'), 400);
    transitionTime = 8000;
  }

  setTimeout(() => {
    currentIndex++;
    if (currentIndex < questions.length) {
      localStorage.setItem(JUST_ANSWERED_KEY, 'true');
      saveCurrentIndex(currentIndex);

      explanationEl.textContent = '';
      showQuestion(currentIndex, questions, showingAnswers, { questionEl, choicesEl, explanationEl });

      setTimeout(() => {
        localStorage.removeItem(JUST_ANSWERED_KEY);
      }, 100);
    } else {
      questionEl.textContent = "Quiz Complete!";
      choicesEl.innerHTML = '';
      explanationEl.textContent = '';
      clearAnsweredQuestions(); // ✅ Clean end-of-session reset
    }
  }, transitionTime);
}

// ✅ Restore last position after reload
export function getStartingIndex() {
  return getCurrentIndex();
}
