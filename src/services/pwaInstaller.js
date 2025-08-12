let initialized = false;
let deferredPrompt = null;

const PWA_DISMISS_KEY = 'pwa_install_dismissed_at'; // for hourly reappearance
const PWA_SESSION_KEY = 'pwa_install_dismissed_session'; // for per-session reappearance
const REAPPEAR_DELAY = 60 * 60 * 1000; // 1 hour in ms

// Capture any early beforeinstallprompt events
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

export function initPwaInstaller({
  installBtnId = 'installBtn',
  popupId = 'pwaInstallBanner',
} = {}) {
  if (initialized) return;
  initialized = true;

  const installBtn = document.getElementById(installBtnId);
  const popup = document.getElementById(popupId);

  if (!installBtn || !popup) {
    console.warn(`[PWA] Install popup (${popupId}) or button (${installBtnId}) not found. Skipping PWA installer initialization.`);
    return;
  }

  const gtagReport = (eventName) => {
    if (typeof gtag === 'function') {
      gtag('event', eventName, {
        event_category: 'PWA',
        event_label: 'Ryno Tools',
        non_interaction: true,
      });
    }
  };

  const canShowPopup = () => {
    // Don't show again if dismissed this session
    if (sessionStorage.getItem(PWA_SESSION_KEY)) return false;

    // Don't show if dismissed within last hour
    const lastDismiss = localStorage.getItem(PWA_DISMISS_KEY);
    if (!lastDismiss) return true;
    return (Date.now() - parseInt(lastDismiss, 10)) >= REAPPEAR_DELAY;
  };

  const showPopup = () => {
    if (!popup) return;
    if (!canShowPopup()) return;
    popup.classList.remove('hidden');
    gtagReport('pwa_install_prompt_shown');
  };

  const dismissPopup = () => {
    popup.classList.add('hidden');
    localStorage.setItem(PWA_DISMISS_KEY, Date.now().toString());
    sessionStorage.setItem(PWA_SESSION_KEY, '1'); // mark dismissed this session
  };

  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) {
      console.debug('[PWA] No deferredPrompt available — cannot trigger install prompt.');
      return;
    }
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        gtagReport('pwa_install_accepted');
        popup.classList.add('hidden');
      } else {
        gtagReport('pwa_install_dismissed');
        dismissPopup();
      }
      deferredPrompt = null;
    } catch (err) {
      console.error('[PWA] Install prompt failed:', err);
    }
  });

  if (deferredPrompt) {
    showPopup();
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showPopup();
  });

  window.addEventListener('appinstalled', () => {
    gtagReport('pwa_installed');
    popup.classList.add('hidden');
  });

  // OPTIONAL: add a close/dismiss button in your popup markup
  const closeBtn = popup.querySelector('#pwa-dismiss-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      gtagReport('pwa_install_dismissed_manual');
      dismissPopup();
    });
  }
}
