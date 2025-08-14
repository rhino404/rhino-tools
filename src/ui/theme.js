// =========================
// theme.js
// Unified Light/Dark Mode Toggle with Smooth Transition
// =========================

export function updateDarkModeState() {
  const isDark = document.body.classList.contains('dark-mode');
  
  // Save preference
  localStorage.setItem('theme', isDark ? 'dark' : 'light');

  // Update toggle button UI
  const toggle = document.getElementById('dark-mode-toggle');
  if (toggle) {
    toggle.setAttribute('aria-pressed', isDark.toString());
    toggle.textContent = isDark ? "🌕" : "🌑"; // Sun for dark, moon for light
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

  // Add toggle click handler
  const toggle = document.getElementById('dark-mode-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      // Add transition class for smooth change
      document.body.classList.add('theme-transition');

      // Swap classes
      const currentlyDark = document.body.classList.contains('dark-mode');
      document.body.classList.remove('light-mode', 'dark-mode');
      document.body.classList.add(currentlyDark ? 'light-mode' : 'dark-mode');
      
      updateDarkModeState();

      // Remove transition class after animation
      setTimeout(() => {
        document.body.classList.remove('theme-transition');
      }, 400); // match CSS transition duration
    });
  }
}
