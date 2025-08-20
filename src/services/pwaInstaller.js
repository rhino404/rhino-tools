let initialized = false;
let deferredPrompt = null;

const PWA_DISMISS_KEY = 'pwa_install_dismissed_at';
const PWA_SESSION_KEY = 'pwa_install_dismissed_session';
const REAPPEAR_DELAY = 60 * 60 * 1000; // 1 hour

export function initPwaInstaller({
  popupId = 'pwaInstallBanner',
  installBtnId = 'installBtn',
  dismissBtnId = 'pwa-dismiss-btn',
} = {}) {
  if (initialized) return;
  initialized = true;

  const popup = document.getElementById(popupId);
  const installBtn = document.getElementById(installBtnId);
  const dismissBtn = document.getElementById(dismissBtnId);

  if (!popup || !installBtn) {
    console.warn('[PWA] Popup or install button not found, skipping initialization.');
    return;
  }

  const gtagReport = (eventName) => {
    if (typeof gtag === 'function') {
      gtag('event', eventName, { event_category: 'PWA', event_label: 'Ryno Tools', non_interaction: true });
    }
  };

  const canShowPopup = () => {
    if (sessionStorage.getItem(PWA_SESSION_KEY)) return false;
    const lastDismiss = localStorage.getItem(PWA_DISMISS_KEY);
    return !lastDismiss || (Date.now() - parseInt(lastDismiss, 10)) >= REAPPEAR_DELAY;
  };

  const showPopup = (mode = 'install') => {
    if (!canShowPopup()) return;
    popup.classList.remove('hidden');
    popup.dataset.mode = mode; // save current mode
    installBtn.textContent = mode === 'install' ? 'Install App' : 'Update Available';
    gtagReport(mode === 'install' ? 'pwa_install_prompt_shown' : 'pwa_update_available');
  };

  const dismissPopup = () => {
    popup.classList.add('hidden');
    localStorage.setItem(PWA_DISMISS_KEY, Date.now().toString());
    sessionStorage.setItem(PWA_SESSION_KEY, '1');
  };

  // --- Update click logic ---
  installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
      // Standard install flow
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
    } else if (popup.dataset.mode === 'update') {
      // Update flow: reload only after user clicks
      popup.classList.add('hidden');
      window.location.reload(); // refresh to get latest SW
    }
  });


  // --- Manual dismiss ---
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      gtagReport('pwa_install_dismissed_manual');
      dismissPopup();
    });
  }

  // --- Before install prompt ---
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showPopup('install');
  });

  // --- App installed ---
  window.addEventListener('appinstalled', () => {
    gtagReport('pwa_installed');
    popup.classList.add('hidden');
  });

  // --- SW message listener for updates ---
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'NEW_VERSION_AVAILABLE') {
        console.log('[PWA] New version available.');
        showPopup('update');
      }
    });
  }
}
