// src/handlers/hideAnswers.js
import { showQuestion } from '../core/quizLoader.js';
import { showStatusModal } from '../ui/modal.js';

export async function hideAnswers(state) {
  state.hideAnswers = !state.hideAnswers;

  // Refresh the question view with the correct elements
  showQuestion(
    state.currentIndex,
    state.questions,
    {
      questionEl: state.questionEl,
      choicesEl: state.choicesEl,
      explanationEl: state.explanationEl,
    },
    state
  );

  showStatusModal(`Answers Hidden: ${state.hideAnswers ? 'ON' : 'OFF'}`);
}
