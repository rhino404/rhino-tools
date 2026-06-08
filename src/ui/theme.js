// =========================
// theme.js
// Unified Light/Dark Mode Toggle with Smooth Transition
// =========================

export function updateDarkModeState() {
  const isDark = document.body.classList.contains('dark-mode');

  localStorage.setItem('theme', isDark ? 'dark' : 'light');

  const toggle = document.getElementById('dark-mode-toggle');
  if (toggle) {
    toggle.setAttribute('aria-pressed', isDark.toString());
  }
}

export function initializeTheme() {
  // Load saved preference or fallback to system setting
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = saved === 'dark' || (!saved && prefersDark);

  // Remove both classes first to ensure a clean state
  document.body.classList.remove('light-mode', 'dark-mode');

  // Apply correct class
  document.body.classList.add(isDark ? 'dark-mode' : 'light-mode');

  // Sync UI
  updateDarkModeState();

  // Click handling is owned by chrome.js to avoid double-binding
}
