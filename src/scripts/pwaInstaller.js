let initialized = false;
let deferredPrompt = null;

export function initPwaInstaller({
  installBtnId = 'installBtn',
  popupId = 'pwaInstallBanner',
} = {}) {
  if (initialized) return;
  initialized = true;

  const installBtn = document.getElementById(installBtnId);
  const popup = document.getElementById(popupId);

  if (!installBtn || !popup) {
    console.warn('[PWA] Install popup or buttons not found');
    return;
  }

  function showPopup() {
    popup.classList.remove('hidden');
    gtagReport('pwa_install_prompt_shown');
  }

  function gtagReport(eventName) {
    if (typeof gtag === 'function') {
      gtag('event', eventName, {
        event_category: 'PWA',
        event_label: 'Ryno Tools',
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
        popup.classList.add('hidden'); // only hide if installed
      } else {
        gtagReport('pwa_install_dismissed');
        // Banner stays visible
      }
      deferredPrompt = null;
    } catch (err) {
      console.error('[PWA] Install prompt failed:', err);
    }
  });

  // Dismiss button does nothing but maybe track analytics
  dismissBtn.addEventListener('click', () => {
    gtagReport('pwa_install_dismissed');
    // No hide — persistent banner
  });

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showPopup();
  });

  window.addEventListener('appinstalled', () => {
    gtagReport('pwa_installed');
    popup.classList.add('hidden');
  });
}
