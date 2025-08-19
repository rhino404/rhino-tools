// =========================
// Modal Utility - modal.js
// =========================

/**
 * Remove any existing modal and backdrop
 */
function removeExistingModal() {
  const existing = document.querySelector('.custom-modal-overlay');
  if (existing) existing.remove();
}

/**
 * Show a temporary status modal
 * @param {string} message - Text to display
 * @param {number} duration - Auto-close after ms (default 2000)
 */
export function showStatusModal(message, duration = 1350) {
  removeExistingModal();

  const overlay = document.createElement('div');
  overlay.className = 'custom-modal-overlay';
  document.body.appendChild(overlay);

  const modal = document.createElement('div');
  modal.className = 'custom-modal show';

  const content = document.createElement('div');
  content.className = 'modal-content';
  content.textContent = message;

  modal.appendChild(content);
  overlay.appendChild(modal);

  // Auto close
  setTimeout(() => {
    modal.classList.remove('show');
    overlay.remove();
  }, duration);
}

/**
 * Generic modal builder (message or confirm)
 * @param {object} options
 * @param {string} options.message
 * @param {string} options.confirmText
 * @param {string|null} options.cancelText
 * @param {function|null} options.onConfirm
 */
export function showModal({ message, confirmText = 'OK', cancelText = null, onConfirm = null }) {
  removeExistingModal();

  const overlay = document.createElement('div');
  overlay.className = 'custom-modal-overlay';

  let buttonsHTML = `<button class="modal-confirm">${confirmText}</button>`;
  if (cancelText) buttonsHTML += `<button class="modal-cancel">${cancelText}</button>`;

  overlay.innerHTML = `
    <div class="custom-modal show">
      <p>${message}</p>
      <div class="modal-buttons">${buttonsHTML}</div>
    </div>
  `;

  document.body.appendChild(overlay);

  const confirmBtn = overlay.querySelector('.modal-confirm');
  const cancelBtn = overlay.querySelector('.modal-cancel');

  confirmBtn.addEventListener('click', () => {
    if (onConfirm) onConfirm();
    overlay.remove();
  });

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => overlay.remove());
  }
}

/**
 * Simple alert-style modal
 * @param {string} message
 */
export function showMessage(message) {
  showModal({ message });
}

/**
 * Confirm modal with Yes/Cancel buttons
 * @param {string} message
 * @param {function} onConfirm
 */
export function showConfirm(message, onConfirm) {
  showModal({ message, confirmText: 'Yes', cancelText: 'Cancel', onConfirm });
}
