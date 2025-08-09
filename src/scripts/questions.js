// questions.js
import { statsTracker } from './statsTracker.js';
import { showCorrectEffect, showIncorrectEffect } from './effects.js';
import { getIcon } from './utils.js';

export function showQuestion(current, questions, showingAnswers, { questionEl, choicesEl, explanationEl }) {
  if (!questions.length || !questions[current]) {
    questionEl.textContent = "No questions for this filter!";
    choicesEl.innerHTML = '';
    
    // ✅ Also remove leftover image if present
    const existingImage = document.getElementById('questionImage');
    if (existingImage) existingImage.remove();

    return;
  }

  const q = questions[current];

  // Update the question text (category icon + question text)
  questionEl.innerHTML = `${getIcon("categories", q.category)} ${q.question}`;
  choicesEl.innerHTML = '';

  // ✅ Remove any previous image
  const existingImage = document.getElementById('questionImage');
  if (existingImage) existingImage.remove();

  // ✅ Safely check and show image if valid
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
      img.remove(); // completely remove the broken image
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


export function checkAnswer(choice, q, currentIndex, questions, showingAnswers, { questionEl, choicesEl, explanationEl }) {
  Array.from(choicesEl.children).forEach(btn => btn.disabled = true);
  let transitionTime = 1000;

  const isCorrect = (choice === q.correct);
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
    }
  }, transitionTime);
}
