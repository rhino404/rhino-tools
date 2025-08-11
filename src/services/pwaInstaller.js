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

  // Ensure we never break execution if elements aren't present
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
    } else {
      console.debug(`[PWA] gtag not defined, skipping event: ${eventName}`);
    }
  };

  const showPopup = () => {
    if (!popup) return;
    popup.classList.remove('hidden');
    gtagReport('pwa_install_prompt_shown');
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
        if (popup) popup.classList.add('hidden'); // only hide if installed
      } else {
        gtagReport('pwa_install_dismissed');
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

  // Handle successful installation
  window.addEventListener('appinstalled', () => {
    gtagReport('pwa_installed');
    if (popup) popup.classList.add('hidden');
    console.info('[PWA] App successfully installed.');
  });
}
