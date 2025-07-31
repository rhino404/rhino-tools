let deferredPrompt;
let installBtnClickHandlerAdded = false;

function shouldShowInstallPrompt() {
  const dismissedAt = localStorage.getItem('pwaDismissedAt');
  if (!dismissedAt) return true;

  const oneDay = 24 * 60 * 60 * 1000;
  const now = Date.now();
  return now - parseInt(dismissedAt, 10) > oneDay;
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
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
          localStorage.setItem('pwaDismissedAt', Date.now().toString());
          installBtn.style.display = 'none';
        }
        deferredPrompt = null;
      });
    });
    installBtnClickHandlerAdded = true;
  }
});
