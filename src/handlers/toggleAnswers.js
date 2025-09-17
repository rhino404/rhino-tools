// src/handlers/toggleAnswers.js
import { showQuestion } from '../core/quizLoader.js';
import { showStatusModal } from '../ui/modal.js';

export async function toggleAnswers(state) {
  state.showingAnswers = !state.showingAnswers;

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

  showStatusModal(`Answer Toggle: ${state.showingAnswers ? 'ON' : 'OFF'}`);
}
