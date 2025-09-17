// src/core/state.js
import { syncAllButtonsUI } from '../ui/updateButton.js';

// Underlying state object
const stateData = {
  currentLevel: '',
  currentCategory: '',
  currentSubcategory: '',
  questions: [],
  shuffledQuestions: [],
  currentIndex: 0,
  showingAnswers: false,

  selectedTags: [],

  // DOM elements cached on DOMContentLoaded
  questionEl: null,
  choicesEl: null,
  explanationEl: null,

  levelToggle: null,
  levelOptions: null,
  categoryToggle: null,
  categoryOptions: null,
  subcategoryToggle: null,
  subcategoryOptions: null,

  shuffleBtn: null,
  toggleAnswersBtn: null,
  showStatsBtn: null,
  hideAnswersBtn: null,
  examBtn: null, // add exam button reference

  // === Exam-specific state ===
  examMode: false,
  examQuestions: [],
  examTotalQuestions: 0,
  examQuestionsAnswered: 0,
  correctCount: 0,
  incorrectCount: 0,
  topicStats: {},
};

// Proxy handler for reactive state
const stateHandler = {
  set(target, property, value) {
    const oldValue = target[property];

    // Apply the change
    target[property] = value;

    // If a reactive property changes, trigger UI sync
    if (
      oldValue !== value &&
      ['currentCategory', 'currentSubcategory', 'examMode'].includes(property)
    ) {
      queueMicrotask(() => {
        if (typeof target.syncButtons === 'function') {
          target.syncButtons();
        }
      });
    }

    return true;
  },
};

// Create the reactive state
export const state = new Proxy(stateData, stateHandler);

// Attach syncButtons so Proxy can auto-update UI
state.syncButtons = () => syncAllButtonsUI(state);

// ------------------------
// Exported setters
// ------------------------

export async function setCategory(category) {
  state.currentCategory = category;
  // Optional: reset subcategory when category changes
  state.currentSubcategory = null;
  // Additional logic can be added here
}

export async function setSubcategory(subcategory) {
  state.currentSubcategory = subcategory;
  // Additional logic can be added here
}
