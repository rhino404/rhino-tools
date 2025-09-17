/**
 * Modal System
 * Handles all modal dialogs in the application
 */

const ANIMATION_DURATION = 300; // ms
let activeModal = null;

function lockScroll() {
    // Calculate scrollbar width to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
    document.body.classList.add('modal-open');
}

function unlockScroll() {
    document.body.classList.remove('modal-open');
    document.documentElement.style.removeProperty('--scrollbar-width');
}

function removeExistingModal(type = 'all') {
    // type can be 'all', 'overlay', or 'status'
    let selector;
    if (type === 'overlay') selector = '.modal-overlay';
    else if (type === 'status') selector = '.status-modal';
    else selector = '.modal-overlay, .status-modal';

    const existing = document.querySelector(selector);
    if (existing) {
        existing.classList.remove('show');
        const removeFn = () => existing.remove();
        existing.addEventListener('transitionend', removeFn, { once: true });
        setTimeout(removeFn, ANIMATION_DURATION); // fallback
    }
}

function createComplexModal({ 
    title, 
    contentHTML, 
    onClose = null,
    closeOnEscape = true,
    closeOnOverlay = true 
}) {
    removeExistingModal('overlay');
    lockScroll();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    overlay.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-body">
            <div class="modal-header">
                <h2 id="modal-title">${title}</h2>
                <button class="modal-close" aria-label="Close">&times;</button>
            </div>
            <div class="modal-body" id="modal-body">
                ${contentHTML}
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    
    // Use a small timeout to prevent the same click from closing the modal
    setTimeout(() => {
        overlay.classList.add('show');
    }, 10); // A tiny delay is enough

    const modal = overlay.querySelector('.modal');
    const closeBtn = overlay.querySelector('.modal-close');
    
    let escHandler;
    const closeModal = () => {
        overlay.classList.remove('show');
        unlockScroll();
        if (escHandler) {
            document.removeEventListener('keydown', escHandler);
            escHandler = null;
        }
        const removeFn = () => {
            overlay.remove();
            if (onClose) onClose();
            activeModal = null;
        };
        overlay.addEventListener('transitionend', removeFn, { once: true });
        setTimeout(removeFn, ANIMATION_DURATION); // fallback
    };

    closeBtn.onclick = closeModal;

    if (closeOnOverlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal();
            }
        });
    }

    modal.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    if (closeOnEscape) {
        escHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    // focus trap logic
    function applyFocusTrap() {
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableElements.length) return;

        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        requestAnimationFrame(() => firstFocusable.focus());

        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey && document.activeElement === firstFocusable) {
                    e.preventDefault();
                    lastFocusable.focus();
                } else if (!e.shiftKey && document.activeElement === lastFocusable) {
                    e.preventDefault();
                    firstFocusable.focus();
                }
            }
        });
    }
    applyFocusTrap();

    activeModal = {
        show() {
            overlay.classList.add('show');
        },
        close: closeModal,
        updateContent(newHTML) {
            const body = modal.querySelector('.modal-body');
            if (body) {
                body.innerHTML = newHTML;
                applyFocusTrap(); // reapply trap for new content
            }
        },
        updateTitle(newTitle) {
            const titleEl = modal.querySelector('#modal-title');
            if (titleEl) titleEl.textContent = newTitle;
        }
    };

    return activeModal;
}

// ... showStatusModal and showConfirmModal remain the same ...
function showStatusModal(message, duration = 1700) {
    removeExistingModal();
    lockScroll();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'status-modal';
    modal.setAttribute('role', 'alert');
    modal.textContent = message;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => overlay.classList.add('show'));

    setTimeout(() => {
        modal.classList.add('fade-out');
        setTimeout(() => {
            overlay.remove();
            unlockScroll();
        }, ANIMATION_DURATION);
    }, duration);
}

function showConfirmModal(message, options = {}) {
    return new Promise((resolve) => {
        const modal = createComplexModal({
            title: options.title || 'Confirm',
            contentHTML: `
                <div class="confirm-modal">
                    <p>${message}</p>
                    <div class="modal-actions">
                        <button class="btn confirm-yes">${options.yesText || 'Yes'}</button>
                        <button class="btn confirm-no">${options.noText || 'No'}</button>
                    </div>
                </div>
            `,
            closeOnEscape: false,
            closeOnOverlay: false,
            onClose: () => resolve(false)
        });

        const confirmYes = modal
            ? modal.updateContent && document.querySelector('.confirm-yes')
            : null;
        const confirmNo = modal
            ? modal.updateContent && document.querySelector('.confirm-no')
            : null;

        // safer scoping inside the modal
        const container = document.querySelector('.confirm-modal');
        if (container) {
            const yesBtn = container.querySelector('.confirm-yes');
            const noBtn = container.querySelector('.confirm-no');

            yesBtn.onclick = () => {
                modal.close();
                resolve(true);
            };

            noBtn.onclick = () => {
                modal.close();
                resolve(false);
            };
        }
    });
}


export const Modal = {
    create: createComplexModal,
    status: showStatusModal,
    confirm: showConfirmModal,
    removeActive: removeExistingModal
};

export {
    createComplexModal,
    showStatusModal,
    showConfirmModal
};
