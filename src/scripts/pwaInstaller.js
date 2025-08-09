let initialized = false;
let deferredPrompt = null;

export function initPwaInstaller({
  installBtnId = 'installBtn',
  dismissBtnId = 'dismissInstallBtn',
  popupId = 'pwaInstallBanner',
  cooldownMs = 24 * 60 * 60 * 1000, // 1 day
} = {}) {
  if (initialized) return;
  initialized = true;

  const installBtn = document.getElementById(installBtnId);
  const dismissBtn = document.getElementById(dismissBtnId);
  const popup = document.getElementById(popupId);

  if (!installBtn || !dismissBtn || !popup) {
    console.warn('[PWA] Install popup or buttons not found');
    return;
  }

  function shouldShowPrompt() {
    const dismissedAt = localStorage.getItem('pwaDismissedAt');
    return !dismissedAt || Date.now() - parseInt(dismissedAt, 10) > cooldownMs;
  }

  function hidePopup() {
    popup.classList.add('hidden');
  }

  function showPopup() {
    popup.classList.remove('hidden');
    gtagReport('pwa_install_prompt_shown');

    // Auto-dismiss after 15s
    const timeout = setTimeout(() => {
      if (!popup.classList.contains('hidden')) {
        popup.classList.add('hidden');
        localStorage.setItem('pwaDismissedAt', Date.now().toString());
        gtagReport('pwa_install_auto_dismissed');
      }
    }, 15000);

    // Cancel auto-dismiss if user interacts
    installBtn.addEventListener('click', () => clearTimeout(timeout), { once: true });
    dismissBtn.addEventListener('click', () => clearTimeout(timeout), { once: true });
  }

  function gtagReport(eventName) {
    if (typeof gtag === 'function') {
      gtag('event', eventName, {
        event_category: 'PWA',
        event_label: 'Rhino Tools',
        non_interaction: true,
      });
    }
  }

  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        gtagReport('pwa_install_accepted');
      } else {
        localStorage.setItem('pwaDismissedAt', Date.now().toString());
        gtagReport('pwa_install_dismissed');
      }
      hidePopup();
      deferredPrompt = null;
    } catch (err) {
      console.error('[PWA] Install prompt failed:', err);
    }
  });

  dismissBtn.addEventListener('click', () => {
    localStorage.setItem('pwaDismissedAt', Date.now().toString());
    gtagReport('pwa_install_dismissed');
    hidePopup();
  });

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    if (!shouldShowPrompt()) return;
    showPopup();
  });

  window.addEventListener('appinstalled', () => {
    localStorage.removeItem('pwaDismissedAt');
    gtagReport('pwa_installed');
  });
}
