import { startExam as beginExamLogic, cancelExam as coreCancelExam } from '../core/examManager.js';
import { getExamDefinition } from '../core/dataProvider.js';
import { showStatusModal } from '../ui/modal.js';

/**
 * Start the exam (or cancel if already active)
 */
export async function startExam(state) {
  // --- Show modal if category/subcategory not selected ---
  if (!state.currentCategory || !state.currentSubcategory) {
    showStatusModal('Please select a category and subcategory before starting an exam.');
    return;
  }

  // --- Check if exam definition exists for this section ---
  const subcategoryDef = await getExamDefinition(state.currentCategory, state.currentSubcategory);
  if (!subcategoryDef) {
    showStatusModal('Exam mode is not available for this section.');
    return;
  }

  // --- Toggle: If already in exam mode, cancel it and restore previous state ---
  if (state.examMode) {
    coreCancelExam();
    showStatusModal('Exam Canceled');
    // Restore previous state if it exists
    if (state._preExamState) {
      const pre = state._preExamState;
      state.questions = pre.questions;
      state.currentIndex = pre.currentIndex;
      state.showingAnswers = pre.showingAnswers;
      state.hideAnswers = pre.hideAnswers;
      state.currentCategory = pre.currentCategory;
      state.currentSubcategory = pre.currentSubcategory;
      delete state._preExamState;

      // Refresh UI
      if (state.questions?.length) {
        const { questionEl, choicesEl, explanationEl } = state;
        import('../core/quizLoader.js').then(({ showQuestion }) => {
          showQuestion(state.currentIndex, state.questions, {
            questionEl,
            choicesEl,
            explanationEl,
            showingAnswers: state.showingAnswers,
            hideAnswers: state.hideAnswers
          }, state);

          if (state.syncButtons) state.syncButtons();
        });
      }
    }
    return;
  }

  // --- Save current state before starting exam if not already saved ---
  if (!state._preExamState) {
    state._preExamState = {
      questions: state.questions,
      currentIndex: state.currentIndex,
      showingAnswers: state.showingAnswers,
      hideAnswers: state.hideAnswers,
      currentCategory: state.currentCategory,
      currentSubcategory: state.currentSubcategory
    };
  }

  // --- Start the exam ---
  await beginExamLogic();

  // --- Provide user feedback ---
  if (state.examMode) {
    showStatusModal('Exam Started');
  }
}

/**
 * Cancel the exam (can be called directly if needed)
 */
export function cancelExam(state) {
  coreCancelExam();
  showStatusModal('Exam Canceled');
  // Restore previous state if it exists
  if (state._preExamState) {
    const pre = state._preExamState;
    state.questions = pre.questions;
    state.currentIndex = pre.currentIndex;
    state.showingAnswers = pre.showingAnswers;
    state.hideAnswers = pre.hideAnswers;
    state.currentCategory = pre.currentCategory;
    state.currentSubcategory = pre.currentSubcategory;
    delete state._preExamState;

    // Refresh UI
    if (state.questions?.length) {
      const { questionEl, choicesEl, explanationEl } = state;
      import('../core/quizLoader.js').then(({ showQuestion }) => {
        showQuestion(state.currentIndex, state.questions, {
          questionEl,
          choicesEl,
          explanationEl,
          showingAnswers: state.showingAnswers,
          hideAnswers: state.hideAnswers
        }, state);

        if (state.syncButtons) state.syncButtons();
      });
    }
  }
}