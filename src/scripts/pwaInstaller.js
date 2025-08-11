let initialized = false;
let deferredPrompt = null;

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
    console.warn('[PWA] Install popup or button not found');
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

  const showPopup = () => {
    popup.classList.remove('hidden');
    gtagReport('pwa_install_prompt_shown');
  };

  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        gtagReport('pwa_install_accepted');
        popup.classList.add('hidden'); // only hide if installed
      }
      deferredPrompt = null;
    } catch (err) {
      console.error('[PWA] Install prompt failed:', err);
    }
  });

  // If beforeinstallprompt has already fired, show the popup immediately
  if (deferredPrompt) {
    showPopup();
  }

  // Listen for future beforeinstallprompt events
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
