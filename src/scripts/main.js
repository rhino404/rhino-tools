import { loadCryptoPrices } from './crypto.js';
import { showCorrectEffect, showIncorrectEffect } from './effects.js';
import { quizMeta } from './quizMeta.js';
import { statsTracker } from './statsTracker.js';

// Category modules for dynamic question loading
const CATEGORY_MODULES = {
  'ham-radio': {
    loader: () => import('./questions/ham-radio.js'),
    exportName: 'hamRadioQuestions',
  },
  // add other categories similarly
};

// Utility: Get emoji icon for level/category/subcategory
function getIcon(type, value) {
  const item = quizMeta[type]?.find(el => el.value === value);
  if (item?.label) {
    const emojiMatch = item.label.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u);
    return emojiMatch ? emojiMatch[0] : "";
  }
  return "";
}

// Load questions filtered by level, category, and subcategory
async function loadQuestions(level, category, subcategory) {
  let questions = [];

  if (category && CATEGORY_MODULES[category]) {
    const { loader, exportName } = CATEGORY_MODULES[category];
    const mod = await loader();
    questions = mod[exportName] || [];
  } else {
    for (const { loader, exportName } of Object.values(CATEGORY_MODULES)) {
      const mod = await loader();
      questions.push(...(mod[exportName] || []));
    }
  }

  if (level) questions = questions.filter(q => q.level === level);
  if (category) questions = questions.filter(q => q.category === category);
  if (subcategory) questions = questions.filter(q => q.subcategory === subcategory);

  return questions;
}

// App state variables
let currentLevel = "";
let currentCategory = "";
let currentSubcategory = "";
let questions = [];
let shuffledQuestions = [];
let current = 0;
let showingAnswers = false;

// DOM elements
const questionEl = document.getElementById('question');
const choicesEl = document.getElementById('choices');
const explanationEl = document.getElementById('explanation');
const shuffleBtn = document.getElementById('shuffle-btn');

// Display current question and answer choices
function showQuestion() {
  if (!shuffledQuestions.length) {
    questionEl.textContent = "No questions for this filter!";
    choicesEl.innerHTML = '';
    explanationEl.textContent = '';
    return;
  }

  const q = shuffledQuestions[current];
  questionEl.textContent = `${getIcon("levels", q.level)} ${getIcon("categories", q.category)} ${q.question}`;
  choicesEl.innerHTML = '';
  explanationEl.textContent = '';

  q.choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.textContent = choice;
    btn.className = 'choice-btn';
    if (showingAnswers && choice === q.correct) btn.classList.add('highlight');
    btn.onclick = () => checkAnswer(choice, q);
    choicesEl.appendChild(btn);
  });
}

// Handle user's answer selection
function checkAnswer(choice, q) {
  Array.from(choicesEl.children).forEach(btn => btn.disabled = true);
  let transitionTime = 1000;

  const isCorrect = (choice === q.correct);
  statsTracker.logAnswer(q, isCorrect);

  if (isCorrect) {
    explanationEl.innerHTML = `<span class='correct'>✅ Correct!</span>`;
    showCorrectEffect(explanationEl);
  } else {
    explanationEl.innerHTML = `<span class='incorrect'>❌:</span> ${q.explanation}`;
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

// Load and shuffle questions, then show the first
async function updateQuestions() {
  questions = await loadQuestions(currentLevel, currentCategory, currentSubcategory);
  shuffledQuestions = [...questions].sort(() => Math.random() - 0.5);
  current = 0;
  showQuestion();
}

// Shuffle button event
if (shuffleBtn) shuffleBtn.onclick = () => updateQuestions();

// Populate dropdown menu items from quizMeta
function populateDropdown(menuId, type) {
  const menu = document.getElementById(menuId);
  if (!menu) return;
  menu.innerHTML = '';
  quizMeta[type].forEach(item => {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.setAttribute('tabindex', '0');
    li.dataset[type.slice(0, -1)] = item.value; // e.g. levels -> level
    li.textContent = item.label;
    menu.appendChild(li);
  });
}

// Setup dropdown open/close, keyboard nav, and item select
function setupDropdown(toggleId, menuId, callback) {
  const toggleBtn = document.getElementById(toggleId);
  const menu = document.getElementById(menuId);
  const wrapper = toggleBtn.closest(".dropdown");

  toggleBtn.setAttribute("aria-expanded", wrapper.classList.contains("show"));

  toggleBtn?.addEventListener("click", () => {
    const isOpen = wrapper.classList.toggle("show");
    toggleBtn.setAttribute("aria-expanded", isOpen);
    if (isOpen) {
      const firstItem = menu.querySelector("li");
      firstItem?.focus();
    }
    // Close other dropdowns
    document.querySelectorAll(".dropdown").forEach(drop => {
      if (drop !== wrapper) {
        drop.classList.remove("show");
        const btn = drop.querySelector(".dropdown-toggle");
        btn?.setAttribute("aria-expanded", false);
      }
    });
  });

  menu?.addEventListener('keydown', e => {
    const items = Array.from(menu.querySelectorAll('li'));
    let index = items.findIndex(item => item === document.activeElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      index = (index + 1) % items.length;
      items[index].focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      index = (index - 1 + items.length) % items.length;
      items[index].focus();
    } else if (e.key === "Escape") {
      wrapper.classList.remove("show");
      toggleBtn.setAttribute("aria-expanded", false);
      toggleBtn.focus();
    }
  });

  menu?.querySelectorAll("li").forEach(item => {
    item.addEventListener("click", () => {
      const value = item.dataset.level || item.dataset.category || item.dataset.subcategory;
      toggleBtn.textContent = item.textContent;
      callback(value);
      wrapper.classList.remove("show");
      toggleBtn.setAttribute("aria-expanded", false);
      toggleBtn.focus();
    });
  });
}

// Close all dropdowns when clicking outside
document.addEventListener("click", (e) => {
  if (!e.target.closest(".dropdown")) {
    document.querySelectorAll(".dropdown").forEach(drop => {
      drop.classList.remove("show");
      const btn = drop.querySelector(".dropdown-toggle");
      btn?.setAttribute("aria-expanded", false);
    });
  }
});

// Dark mode toggle helper functions
function updateDarkModeState() {
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  if (darkModeToggle) {
    darkModeToggle.setAttribute('aria-pressed', isDark.toString());
    darkModeToggle.textContent = isDark ? "🌕" : "🌑";
  }
}

function initializeTheme() {
  const savedTheme = localStorage.getItem('theme');
  document.body.classList.toggle('dark-mode', savedTheme === 'dark');
  updateDarkModeState();
}

// Initialize app after DOM ready
document.addEventListener('DOMContentLoaded', () => {
  populateDropdown("level-options", "levels");
  populateDropdown("category-options", "categories");
  populateDropdown("subcategory-options", "subcategories");

  setupDropdown("level-toggle", "level-options", level => {
    currentLevel = level;
    updateQuestions();
  });
  setupDropdown("category-toggle", "category-options", category => {
    currentCategory = category;
    updateQuestions();
  });
  setupDropdown("subcategory-toggle", "subcategory-options", subcategory => {
    currentSubcategory = subcategory;
    updateQuestions();
  });

  // Dark mode toggle event listener
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  if (darkModeToggle) {
    darkModeToggle.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      updateDarkModeState();
    });
  }

  initializeTheme();
  updateQuestions();
  loadCryptoPrices();
  setInterval(loadCryptoPrices, 120000);
});

// Toggle answers button
const toggleBtn = document.getElementById('toggleAnswers');
if (toggleBtn) {
  toggleBtn.addEventListener('click', () => {
    showingAnswers = !showingAnswers;
    toggleBtn.textContent = showingAnswers ? '🙈' : '🫣';
    Array.from(choicesEl.children).forEach(btn => {
      if (btn.textContent === shuffledQuestions[current]?.correct) {
        btn.classList.toggle('highlight', showingAnswers);
      }
    });
  });
}

// Show stats button (make sure the button exists in your HTML with id="showStatsBtn")
const showStatsBtn = document.getElementById('showStatsBtn');
if (showStatsBtn) {
  showStatsBtn.addEventListener('click', () => {
    statsTracker.showCard();
  });
}
