// state.js
export const state = {
  currentLevel: '',
  currentCategory: '',
  currentSubcategory: '',
  questions: [],
  shuffledQuestions: [],
  currentIndex: 0,
  showingAnswers: false,

  selectedTags: [],

  // DOM elements will be cached on DOMContentLoaded
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
  hideAnswersBtn: null
};

// Exported setter functions
export async function setCategory(category) {
    state.currentCategory = category;
    // Optional: reset subcategory when category changes
    state.currentSubcategory = null;
    // Add any additional logic here if needed
}

export async function setSubcategory(subcategory) {
    state.currentSubcategory = subcategory;
    // Add any additional logic here if needed
}
