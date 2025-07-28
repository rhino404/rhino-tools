import { loadCryptoPrices } from './crypto.js';
import { showCorrectEffect, showIncorrectEffect } from './effects.js';

// Load questions based on level and category
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
  } else if (category === "ham-radio") {
    const mod = await import('./questions/ham-radio.js');
    questions = mod.hamRadioQuestions;
  } else {
    const py = await import('./questions/python.js');
    const ml = await import('./questions/ml.js');
    const nlp = await import('./questions/nlp.js');
    const mcp = await import('./questions/mcp.js');
    const hamRadio = await import('./questions/ham-radio.js');
    questions = [
      ...py.pythonQuestions,
      ...ml.mlQuestions,
      ...nlp.nlpQuestions,
      ...mcp.mcpQuestions,
      ...hamRadio.hamRadioQuestions
    ];
  }

  if (level) {
    questions = questions.filter(q => q.level === level);
  }

  return questions;
}

// Globals
let currentLevel = "";
let currentCategory = "";
let questions = [];
let shuffledQuestions = [];
let current = 0;

// DOM Elements
const questionEl = document.getElementById('question');
const choicesEl = document.getElementById('choices');
const explanationEl = document.getElementById('explanation');
const shuffleBtn = document.getElementById('shuffle-btn');
const levelFilters = document.getElementById('level-filters');
const categoryFilters = document.getElementById('category-filters');
const darkModeToggle = document.getElementById('dark-mode-toggle');

// Dark Mode Handler
function updateDarkModeState() {
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  if (darkModeToggle) {
    darkModeToggle.setAttribute('aria-pressed', isDark.toString());
    darkModeToggle.innerHTML = isDark ? "☀️" : "🌙";
  }
}

// Load preferred theme on page load
function initializeTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
  updateDarkModeState();
}

if (darkModeToggle) {
  darkModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    updateDarkModeState();
  });
}

// Icon helpers
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
  if (category === "ham-radio") return "📡";
  return "";
}

// Display a question
function showQuestion() {
  if (shuffledQuestions.length === 0) {
    questionEl.textContent = "No questions for this filter!";
    choicesEl.innerHTML = '';
    explanationEl.textContent = '';
    return;
  }

  const q = shuffledQuestions[current];
  questionEl.innerHTML = `<span>${getLevelIcon(q.level)} ${getCategoryIcon(q.category)}</span> ${q.question}`;
  choicesEl.innerHTML = '';
  explanationEl.textContent = '';

  q.choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.textContent = choice;
    btn.className = 'choice-btn';
    btn.onclick = () => checkAnswer(choice, q);
    choicesEl.appendChild(btn);
  });
}

// Check the selected answer
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

// Refresh question set
async function updateQuestions() {
  questions = await loadQuestions(currentLevel, currentCategory);
  shuffledQuestions = questions.sort(() => Math.random() - 0.5);
  current = 0;
  showQuestion();
}

// Setup filter buttons
if (levelFilters) {
  Array.from(levelFilters.getElementsByClassName('level-btn')).forEach(btn => {
    btn.onclick = () => {
      currentLevel = btn.getAttribute('data-level');

      Array.from(levelFilters.getElementsByClassName('level-btn')).forEach(b => {
        const selected = b === btn;
        b.setAttribute('aria-pressed', selected.toString());
        b.classList.toggle('dimmed', !selected && currentLevel !== "");
      });

      updateQuestions();
    };
  });
}

if (categoryFilters) {
  Array.from(categoryFilters.getElementsByClassName('category-btn')).forEach(btn => {
    btn.onclick = () => {
      currentCategory = btn.getAttribute('data-category');

      Array.from(categoryFilters.getElementsByClassName('category-btn')).forEach(b => {
        const selected = b === btn;
        b.setAttribute('aria-pressed', selected.toString());
        b.classList.toggle('dimmed', !selected && currentCategory !== "");
      });

      updateQuestions();
    };
  });
}

if (shuffleBtn) {
  shuffleBtn.onclick = () => updateQuestions();
}

// Dropdown Menu Logic
function setupDropdown(toggleId, menuId, callback) {
  const toggleBtn = document.getElementById(toggleId);
  const menu = document.getElementById(menuId);
  const wrapper = toggleBtn.closest(".dropdown");

  toggleBtn?.addEventListener("click", () => {
    document.querySelectorAll(".dropdown").forEach(drop => {
      if (drop !== wrapper) drop.classList.remove("show");
    });
    wrapper.classList.toggle("show");
  });

  menu?.querySelectorAll("li").forEach(item => {
    item.addEventListener("click", () => {
      const value = item.dataset.level || item.dataset.category;
      toggleBtn.textContent = item.textContent;
      callback(value);
      wrapper.classList.remove("show");
    });
  });
}

document.addEventListener("click", (e) => {
  if (!e.target.closest(".dropdown")) {
    document.querySelectorAll(".dropdown").forEach(drop => drop.classList.remove("show"));
  }
});

setupDropdown("level-toggle", "level-options", (level) => {
  currentLevel = level;
  updateQuestions();
});

setupDropdown("category-toggle", "category-options", (category) => {
  currentCategory = category;
  updateQuestions();
});

// Initial load
document.addEventListener('DOMContentLoaded', () => {
  initializeTheme();
  updateQuestions();
  loadCryptoPrices();
  setInterval(loadCryptoPrices, 120000);
});