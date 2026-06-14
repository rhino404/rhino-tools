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

/* ── Consent banner ────────────────────────────────────────────────
   Stores choice in localStorage under 'ryno_consent_v1'.
   On accept: updates GA4 Consent Mode v2 (analytics + ads granted).
   On decline: fires update with denied storage — GA4 still loads but
   collects no cookies or ad data (Consent Mode v2 modelled pings only).
   ------------------------------------------------------------------ */
(function () {
  const KEY = 'ryno_consent_v1';
  const stored = localStorage.getItem(KEY);

  function applyConsent(choice) {
    if (typeof gtag === 'function') {
      const v = choice === 'granted' ? 'granted' : 'denied';
      gtag('consent', 'update', { analytics_storage: v, ad_storage: v });
    }
  }

  if (stored) {
    applyConsent(stored);
    return;
  }

  function showBanner() {
    const el = document.createElement('div');
    el.className = 'consent-banner';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Cookie consent');
    el.innerHTML =
      '<p class="consent-text">We use analytics to improve your study experience. ' +
      '<a href="/pages/privacy.html">Privacy policy</a>.</p>' +
      '<div class="consent-actions">' +
      '<button class="consent-btn consent-btn--accept" id="consent-accept">Accept</button>' +
      '<button class="consent-btn consent-btn--reject" id="consent-reject">Decline</button>' +
      '</div>';
    document.body.appendChild(el);

    function handle(choice) {
      localStorage.setItem(KEY, choice);
      el.remove();
      applyConsent(choice);
    }
    el.querySelector('#consent-accept').addEventListener('click', function () { handle('granted'); });
    el.querySelector('#consent-reject').addEventListener('click', function () { handle('denied'); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showBanner);
  } else {
    showBanner();
  }
})();

/* ── Newsletter form ────────────────────────────────────────────────
   Set NEWSLETTER_URL to your provider's endpoint to activate the form.
   MailerLite: grab the form action URL from Dashboard → Embedded Forms.
   Buttondown: https://buttondown.email/api/emails/embed-subscribe/<username>
   Leave empty to show the form in "coming soon" mode (no submission).
   ------------------------------------------------------------------ */
(function () {
  const NEWSLETTER_URL = ''; // TODO: set after creating email provider account

  const form   = document.getElementById('newsletter-form');
  const status = document.getElementById('newsletter-status');
  if (!form) return;

  if (!NEWSLETTER_URL) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (status) {
        status.textContent = 'Coming soon — check back shortly!';
        status.className = 'newsletter-status';
      }
    });
    return;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const emailInput = form.querySelector('input[name="email"]');
    const email = emailInput && emailInput.value.trim();
    if (!email) return;

    if (status) {
      status.textContent = 'Subscribing…';
      status.className = 'newsletter-status';
    }

    fetch(NEWSLETTER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: email }),
    })
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        if (status) {
          status.textContent = '✓ Check your inbox to confirm.';
          status.className = 'newsletter-status newsletter-status--success';
        }
        form.reset();
      })
      .catch(function () {
        if (status) {
          status.textContent = 'Something went wrong — try again later.';
          status.className = 'newsletter-status newsletter-status--error';
        }
      });
  });
})();
