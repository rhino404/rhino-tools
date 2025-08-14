import { showQuestion as originalShowQuestion } from '../ui/questions.js';

export function setupButtons(state) {
  // 🛡 Always reset stale state at startup
  state.currentIndex = state.currentIndex || 0;
  state.hideAnswers = state.hideAnswers || false;
  state.showingAnswers = state.showingAnswers || false;

  // Sync hideAnswers button UI
  if (state.hideAnswersBtn) {
    state.hideAnswersBtn.classList.toggle('active', state.hideAnswers);
    state.hideAnswersBtn.title = state.hideAnswers
      ? 'Show explanations when wrong'
      : 'Hide explanations when wrong';
  }

  // Shuffle questions
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
      state
    });
  });

  // Toggle highlight correct answers
  state.toggleAnswersBtn.addEventListener('click', () => {
    state.showingAnswers = !state.showingAnswers;

    // Render at currentIndex without rewind
    originalShowQuestion(state.currentIndex, state.questions, state.showingAnswers, {
      questionEl: state.questionEl,
      choicesEl: state.choicesEl,
      explanationEl: state.explanationEl,
      state
    });
  });

  // ✅ Hide explanations on wrong answers toggle
  state.hideAnswersBtn.addEventListener('click', () => {
    state.hideAnswers = !state.hideAnswers;
    state.hideAnswersBtn.classList.toggle('active', state.hideAnswers);
    state.hideAnswersBtn.title = state.hideAnswers
      ? 'Show explanations when wrong'
      : 'Hide explanations when wrong';
  });

  // Show stats card
  state.showStatsBtn.addEventListener('click', () => {
    import('../ui/statsTracker.js').then(({ statsTracker }) => {
      statsTracker.showCard();
    });
  });
}
