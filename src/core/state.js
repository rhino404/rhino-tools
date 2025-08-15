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
