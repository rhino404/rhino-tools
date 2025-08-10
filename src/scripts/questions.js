// questions.js
import { statsTracker } from './statsTracker.js';
import { showCorrectEffect, showIncorrectEffect } from './effects.js';
import { getIcon } from './utils.js';

const ANSWERED_KEY = 'rhinoToolsAnsweredQuestions'; // unified key name
const CURRENT_INDEX_KEY = 'rhinoToolsCurrentQuestionIndex'; // ✅ new key to persist current index

// ✅ Load answered questions from localStorage
function getAnsweredQuestions() {
  return JSON.parse(localStorage.getItem(ANSWERED_KEY)) || [];
}

// ✅ Save a question ID as answered (persists across sessions)
function saveAnsweredQuestion(id) {
  const answered = getAnsweredQuestions();
  if (!answered.includes(id)) {
    answered.push(id);
    localStorage.setItem(ANSWERED_KEY, JSON.stringify(answered));
  }
}

// ✅ Allow clearing answered questions (e.g., on reset)
export function clearAnsweredQuestions() {
  localStorage.removeItem(ANSWERED_KEY);
  localStorage.removeItem(CURRENT_INDEX_KEY); // ✅ clear current index too
}

// ✅ Filter out answered questions
export function filterUnansweredQuestions(questions) {
  const answered = getAnsweredQuestions();
  const unanswered = questions.filter(q => !answered.includes(q.topic_id));

  // If everything has been answered, return all (reset cycle)
  if (unanswered.length === 0) {
    clearAnsweredQuestions();
    return questions;
  }
  return unanswered;
}

// ✅ Save and load current question index for persistence
function saveCurrentIndex(index) {
  localStorage.setItem(CURRENT_INDEX_KEY, index);
}
function getCurrentIndex() {
  return parseInt(localStorage.getItem(CURRENT_INDEX_KEY), 10) || 0;
}

// ✅ Show a question and render choices
export function showQuestion(current, questions, showingAnswers, { questionEl, choicesEl, explanationEl }) {
  saveCurrentIndex(current); // ✅ persist index whenever question is shown

  if (!questions.length || !questions[current]) {
    questionEl.textContent = "No questions for this filter!";
    choicesEl.innerHTML = '';

    // Remove leftover image if present
    const existingImage = document.getElementById('questionImage');
    if (existingImage) existingImage.remove();
    return;
  }

  const q = questions[current];

  // Render question text
  questionEl.innerHTML = `${getIcon("categories", q.category)} ${q.question}`;
  choicesEl.innerHTML = '';

  // Remove any previous image
  const existingImage = document.getElementById('questionImage');
  if (existingImage) existingImage.remove();

  // Show image if valid
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

  // Render choices
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

// ✅ Check the user's answer
export function checkAnswer(choice, q, currentIndex, questions, showingAnswers, { questionEl, choicesEl, explanationEl }) {
  Array.from(choicesEl.children).forEach(btn => btn.disabled = true);
  let transitionTime = 1000;

  const isCorrect = (choice === q.correct);

  // ✅ Persist answered question across sessions
  saveAnsweredQuestion(q.topic_id);

  // ✅ Log to stats tracker without duplication
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
      explanationEl.textContent = '';
      showQuestion(currentIndex, questions, showingAnswers, { questionEl, choicesEl, explanationEl });
    } else {
      questionEl.textContent = "Quiz Complete!";
      choicesEl.innerHTML = '';
      explanationEl.textContent = '';
      localStorage.removeItem(CURRENT_INDEX_KEY); // ✅ remove index when quiz ends
    }
  }, transitionTime);
}

// ✅ New helper to restore last question after reload
export function getStartingIndex() {
  return getCurrentIndex();
}
