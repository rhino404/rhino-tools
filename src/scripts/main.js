import { loadCryptoPrices } from './crypto.js';
import { showCorrectEffect, showIncorrectEffect } from './effects.js';


async function loadQuestions(level, category) {
  let questions = [];

  if (category === "python") {
    const mod = await import('./questions/python.js');
    questions = mod.pythonQuestions;
  } else if (category === "ml") {
    const mod = await import('./questions/ml.js');
    questions = mod.mlQuestions;
  } else if (category === "nlp") {
    const mod = await import('./questions/nlp.js');
    questions = mod.nlpQuestions;
  } else if (category === "mcp") {
    const mod = await import('./questions/mcp.js');
    questions = mod.mcpQuestions;
  } else {
    const py = await import('./questions/python.js');
    const ml = await import('./questions/ml.js');
    const nlp = await import('./questions/nlp.js');
    const mcp = await import('./questions/mcp.js');
    questions = [
      ...py.pythonQuestions,
      ...ml.mlQuestions,
      ...nlp.nlpQuestions,
      ...mcp.mcpQuestions
    ];
  }

  if (level) {
    questions = questions.filter(q => q.level === level);
  }

  return questions;
}

let currentLevel = "";
let currentCategory = "";
let questions = [];
let shuffledQuestions = [];
let current = 0;

const questionEl = document.getElementById('question');
const choicesEl = document.getElementById('choices');
const explanationEl = document.getElementById('explanation');
const shuffleBtn = document.getElementById('shuffle-btn');
const levelFilters = document.getElementById('level-filters');
const categoryFilters = document.getElementById('category-filters');
const darkModeToggle = document.getElementById('dark-mode-toggle');

function getLevelIcon(level) {
  if (level === "beginner") return "🟢";
  if (level === "intermediate") return "🟡";
  if (level === "advanced") return "🔴";
  return "";
}

function getCategoryIcon(category) {
  if (category === "python") return "🐍";
  if (category === "ml") return "🤖";
  if (category === "nlp") return "💬";
  if (category === "mcp") return "🔧";
  return "";
}

async function updateQuestions() {
  questions = await loadQuestions(currentLevel, currentCategory);
  shuffledQuestions = questions.sort(() => Math.random() - 0.5);
  current = 0;
  showQuestion();
}

if (levelFilters) {
  Array.from(levelFilters.getElementsByClassName('level-btn')).forEach(btn => {
    btn.onclick = () => {
      currentLevel = btn.getAttribute('data-level');

      if (currentLevel === "") {
        Array.from(levelFilters.getElementsByClassName('level-btn')).forEach(b => {
          b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
          b.classList.remove('dimmed');
        });
      } else {
        Array.from(levelFilters.getElementsByClassName('level-btn')).forEach(b => {
          b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
          b.classList.toggle('dimmed', b !== btn);
        });
      }

      updateQuestions();
    };
  });
}

if (categoryFilters) {
  Array.from(categoryFilters.getElementsByClassName('category-btn')).forEach(btn => {
    btn.onclick = () => {
      currentCategory = btn.getAttribute('data-category');

      if (currentCategory === "") {
        Array.from(categoryFilters.getElementsByClassName('category-btn')).forEach(b => {
          b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
          b.classList.remove('dimmed');
        });
      } else {
        Array.from(categoryFilters.getElementsByClassName('category-btn')).forEach(b => {
          b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
          b.classList.toggle('dimmed', b !== btn);
        });
      }

      updateQuestions();
    };
  });
}

shuffleBtn.onclick = () => {
  updateQuestions();
};

function showQuestion() {
  if (shuffledQuestions.length === 0) {
    questionEl.textContent = "No questions for this filter!";
    choicesEl.innerHTML = '';
    explanationEl.textContent = '';
    return;
  }

  const q = shuffledQuestions[current];
  questionEl.innerHTML = `<span style="font-size:0.7em;vertical-align:middle;">${getLevelIcon(q.level)} ${getCategoryIcon(q.category)}</span> ${q.question}`;
  choicesEl.innerHTML = '';
  explanationEl.textContent = '';

  q.choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.textContent = choice;
    btn.onclick = () => checkAnswer(choice, q);
    choicesEl.appendChild(btn);
  });
}

function checkAnswer(choice, q) {
  Array.from(choicesEl.children).forEach(btn => btn.disabled = true);
  let transitionTime = 1000;

  if (choice === q.correct) {
    explanationEl.innerHTML = `<span class='correct'>✅ Correct!</span>`;
    showCorrectEffect(explanationEl);
    setTimeout(() => explanationEl.classList.remove('shake'), 400);
  } else {
    explanationEl.innerHTML = `<span class='incorrect'>❌ Wrong:</span> ${q.explanation}`;
    showIncorrectEffect(explanationEl);
    explanationEl.classList.add('shake');
    setTimeout(() => explanationEl.classList.remove('shake'), 400);
    transitionTime = 8000;
  }

  setTimeout(() => {
    current++;
    if (current < shuffledQuestions.length) {
      showQuestion();
    } else {
      questionEl.textContent = "Quiz Complete!";
      choicesEl.innerHTML = '';
      explanationEl.textContent = '';
    }
  }, transitionTime);
}

function updateDarkModeIcon() {
  darkModeToggle.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
}

darkModeToggle.onclick = () => {
  document.body.classList.toggle('dark-mode');
  updateDarkModeIcon();
};

updateQuestions();
updateDarkModeIcon();
loadCryptoPrices();
setInterval(loadCryptoPrices, 120000);
document.addEventListener('DOMContentLoaded', () => {
  updateQuestions();
  updateDarkModeIcon();
});