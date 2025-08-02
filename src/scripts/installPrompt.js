let deferredPrompt;
let installBtnClickHandlerAdded = false;

function shouldShowInstallPrompt() {
  const dismissedAt = localStorage.getItem('pwaDismissedAt');
  if (!dismissedAt) return true;

  const oneDay = 24 * 60 * 60 * 1000;
  return Date.now() - parseInt(dismissedAt, 10) > oneDay;
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  if (!shouldShowInstallPrompt()) return;

  const installBtn = document.getElementById('installBtn');
  if (!installBtn) return;

  installBtn.style.display = 'inline-block';

  if (!installBtnClickHandlerAdded) {
    installBtn.addEventListener('click', () => {
      if (!deferredPrompt) return;

      deferredPrompt.prompt();

      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('[PWA] Install accepted');
        } else {
          console.log('[PWA] Install dismissed');
          localStorage.setItem('pwaDismissedAt', Date.now().toString());
          installBtn.style.display = 'none';
        }
        deferredPrompt = null;
      });
    });
    installBtnClickHandlerAdded = true;
  }
});

// Optional: Listen for appinstalled event
window.addEventListener('appinstalled', () => {
  console.log('[PWA] Installed successfully');
  localStorage.removeItem('pwaDismissedAt'); // Reset for future flexibility
});

// Optional: SW auto-reload handler for updates
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/scripts/sw.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      newWorker.addEventListener('statechange', () => {
        if (
          newWorker.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          console.log('[SW] New version found, reloading');
          window.location.reload();
        }
      });
    });
  });
}