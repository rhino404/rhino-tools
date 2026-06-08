/* chrome.js — shared header behaviour for every page
   Owns: theme toggle click, scroll-aware header, hamburger, topics dropdown.
   Icon state is pure CSS (body.dark-mode/.light-mode) — this module never writes innerHTML. */

(function () {
  /* ── Theme toggle ──────────────────────────────────────────────── */
  const toggle = document.querySelector('.site-theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      document.body.classList.add('theme-transition');
      const isDark = document.body.classList.contains('dark-mode');
      document.body.classList.toggle('dark-mode', !isDark);
      document.body.classList.toggle('light-mode', isDark);
      localStorage.setItem('theme', isDark ? 'light' : 'dark');
      toggle.setAttribute('aria-pressed', String(!isDark));
      setTimeout(() => document.body.classList.remove('theme-transition'), 400);
    });
    // Sync aria-pressed to current theme on load
    const syncAriaPressed = () => {
      toggle.setAttribute('aria-pressed', String(document.body.classList.contains('dark-mode')));
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', syncAriaPressed);
    } else {
      syncAriaPressed();
    }
  }

  /* ── Scroll-aware header ───────────────────────────────────────── */
  const header = document.querySelector('.site-header');
  if (header) {
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // run once on load
  }

  /* ── Topics dropdown ───────────────────────────────────────────── */
  const dropdownWrap = document.querySelector('.nav-dropdown');
  const dropdownBtn  = document.querySelector('.nav-dropdown-toggle');
  const dropdownMenu = document.querySelector('.nav-dropdown-menu');

  function closeDropdown() {
    if (!dropdownWrap) return;
    dropdownWrap.classList.remove('open');
    if (dropdownBtn) dropdownBtn.setAttribute('aria-expanded', 'false');
  }

  if (dropdownBtn && dropdownMenu) {
    dropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropdownWrap.classList.toggle('open');
      dropdownBtn.setAttribute('aria-expanded', String(isOpen));
    });

    dropdownMenu.addEventListener('click', () => closeDropdown());

    document.addEventListener('click', (e) => {
      if (dropdownWrap && !dropdownWrap.contains(e.target)) closeDropdown();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dropdownWrap && dropdownWrap.classList.contains('open')) {
        closeDropdown();
        dropdownBtn.focus();
      }
    });
  }

  /* ── Hamburger ─────────────────────────────────────────────────── */
  const hamburger = document.querySelector('.site-nav-toggle');
  const siteNav   = document.getElementById('site-nav');

  function closeHamburger() {
    if (!header) return;
    header.classList.remove('nav-open');
    if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('nav-open-body');
  }

  if (hamburger && siteNav) {
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = header.classList.toggle('nav-open');
      hamburger.setAttribute('aria-expanded', String(isOpen));
      document.body.classList.toggle('nav-open-body', isOpen);
    });

    // Close on any nav link click
    siteNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => closeHamburger());
    });

    document.addEventListener('click', (e) => {
      if (header && header.classList.contains('nav-open') && !header.contains(e.target)) {
        closeHamburger();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && header && header.classList.contains('nav-open')) {
        closeHamburger();
        hamburger.focus();
      }
    });
  }
})();
