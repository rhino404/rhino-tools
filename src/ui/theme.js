// theme.js
export function updateDarkModeState() {
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  const toggle = document.getElementById('dark-mode-toggle');
  if (toggle) {
    toggle.setAttribute('aria-pressed', isDark.toString());
    toggle.textContent = isDark ? "🌕" : "🌑";
  }
}

export function initializeTheme() {
  const saved = localStorage.getItem('theme');
  const isDark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.body.classList.toggle('dark-mode', isDark);
  updateDarkModeState();

  const toggle = document.getElementById('dark-mode-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      updateDarkModeState();
    });
  }
}
