// ===============================
// ===== Button UI Updates =======
// ===============================
// src/ui/updateButton.js

function updateToggleButtonUI(button, isActive, activeTitle, inactiveTitle) {
  if (!button) return;
  button.classList.toggle('active', isActive);
  button.title = isActive ? activeTitle : inactiveTitle;
}

function updateExamBtnUI(state) {
  const btn = state.examBtn;
  if (!btn) return;

  // 1. Determine visibility based on the selected subcategory
  const isVisible = state.currentSubcategory && state.currentSubcategory !== 'all';
  btn.classList.toggle('hidden', !isVisible); // Use class instead of inline style

  // 2. Update text, title, and active state based on examMode
  if (state.examMode) {
    btn.title = 'Cancel the current exam session';
    btn.classList.add('active');
  } else {
    btn.title = 'Start a new exam for this subcategory';
    btn.classList.remove('active');
  }
}

/**
 * Updates the entire suite of control buttons based on the current state.
 * @param {object} state - The global quiz state object.
 */
export function syncAllButtonsUI(state) {
  updateToggleButtonUI(
    state.hideAnswersBtn,
    !!state.hideAnswers,
    'Showing explanations when wrong',
    'Hiding explanations when wrong'
  );
  
  updateToggleButtonUI(
    state.toggleAnswersBtn,
    !!state.showingAnswers,
    'Showing correct answers',
    'Hiding correct answers'
  );

  updateExamBtnUI(state);
}
