import { syncAllButtonsUI } from '../ui/updateButton.js';
import { showStatusModal } from '../ui/modal.js';
import { hideAnswers } from '../handlers/hideAnswers.js';
import { toggleAnswers } from '../handlers/toggleAnswers.js';
import { startExam } from '../handlers/startExam.js';

// Centralized handler definitions
const handlers = [
  { key: 'hideAnswersBtn', selector: '#hide-answers-btn', handler: hideAnswers },
  { key: 'toggleAnswersBtn', selector: '#toggle-answers-btn', handler: toggleAnswers },
  { key: 'examBtn', selector: '#exam-btn', handler: startExam }
];

// ✅ Store listener references for easy removal and to prevent duplicates
const listenerStore = new Map();

/**
 * Sets up all quiz control buttons.
 * @param {object} state - The global quiz state object
 */
export function setupButtons(state) {
  // Initialize defaults
  state.currentIndex = state.currentIndex || 0;
  state.hideAnswers = state.hideAnswers || false;
  state.showingAnswers = state.showingAnswers || false;
  state.examMode = state.examMode || false;

  handlers.forEach(({ key, selector, handler }) => {
    const btn = document.querySelector(selector);
    if (!btn) {
      console.warn(`[Controls] Button not found: ${selector}`);
      return;
    }

    // ✅ Prevents adding the same listener multiple times
    if (listenerStore.has(btn)) {
        return;
    }
    
    if (typeof handler !== 'function') {
      console.error(`[Controls] Handler is not a function for selector: ${selector}`, handler);
      return;
    }

    // Define the actual event handler function
    const eventHandler = async (e) => {
      e.stopPropagation();
      try {
        await handler(state);
        if (state.syncButtons) state.syncButtons();
      } catch (err) {
        console.error('[Button Handler Error]', err);
        showStatusModal(err.message || 'An error occurred.');
      }
    };
    
    btn.addEventListener('click', eventHandler);
    listenerStore.set(btn, eventHandler); // Store reference for cleanup

    state[key] = btn;
  });

  // Expose button sync method
  state.syncButtons = () => syncAllButtonsUI(state);

  // Initial sync
  state.syncButtons();
}

/**
 * Removes all event listeners set up by setupButtons to prevent memory leaks.
 */
export function cleanupButtons() {
    listenerStore.forEach((handler, btn) => {
        btn.removeEventListener('click', handler);
    });
    listenerStore.clear();
    console.log('[Controls] All button listeners cleaned up.');
}
