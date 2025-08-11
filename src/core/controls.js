//controls.js

import { showQuestion as originalShowQuestion } from '../ui/questions.js';

export function setupButtons(state) {
  state.shuffleBtn.addEventListener('click', () => {
    if (!state.questions.length) return;

    const start = state.currentIndex;
    const remaining = state.questions.slice(start);

    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }

    state.questions = [
      ...state.questions.slice(0, start),
      ...remaining
    ];

    originalShowQuestion(state.currentIndex, state.questions, state.showingAnswers, {
      questionEl: state.questionEl,
      choicesEl: state.choicesEl,
      explanationEl: state.explanationEl,
    });
  });

  state.toggleAnswersBtn.addEventListener('click', () => {
    state.showingAnswers = !state.showingAnswers;
    originalShowQuestion(state.currentIndex, state.questions, state.showingAnswers, {
      questionEl: state.questionEl,
      choicesEl: state.choicesEl,
      explanationEl: state.explanationEl,
    });
  });

  state.showStatsBtn.addEventListener('click', () => {
    import('../ui/statsTracker.js').then(({ statsTracker }) => {
      statsTracker.showCard();
    });
  });
}
