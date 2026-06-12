// Single source of truth for all shared site chrome (header/nav/footer/chrome assets).
// All 21 pages use marker-delimited regions that sync-chrome.mjs populates from here.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

function sha1(filePath) {
  const content = readFileSync(join(ROOT, filePath));
  return createHash('sha1').update(content).digest('hex').slice(0, 8);
}

// Content-hash versions — auto-computed, idempotent, bump-free.
export function chromeAssetVersions() {
  return {
    theme:  sha1('src/css/theme.css'),
    chrome: sha1('src/css/chrome.css'),
    js:     sha1('src/js/chrome.js'),
  };
}

export function renderChromeAssets() {
  const v = chromeAssetVersions();
  return [
    `  <link rel="stylesheet" href="/css/theme.css?v=${v.theme}" />`,
    `  <link rel="stylesheet" href="/css/chrome.css?v=${v.chrome}" />`,
  ].join('\n');
}

// active: practice | ham-radio | falconry | cybersecurity | devops | japanese | blog | about | null
// Note: Security+ hub uses "cybersecurity" (the category key), not "security-plus" (the slug).
export function renderHeader(active) {
  const v = chromeAssetVersions();
  const cur = (key) => active === key ? ' aria-current="page"' : '';
  const curDrop = (key) => active === key ? ' aria-current="page"' : '';

  return `  <header class="site-header">
    <div class="site-header-inner">
      <a href="/" class="site-brand" aria-label="Ryno Tools Home">
        <img src="/images/logo.webp" alt="Ryno Tools logo" id="logo" width="36" height="36" class="site-brand-logo" />
        <span class="site-brand-name">Ryno Tools</span>
      </a>
      <button class="site-nav-toggle" aria-label="Menu" aria-controls="site-nav" aria-expanded="false">
        <svg class="hamburger-icon hamburger-open" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="3" y1="6"  x2="19" y2="6"/><line x1="3" y1="11" x2="19" y2="11"/><line x1="3" y1="16" x2="19" y2="16"/></svg>
        <svg class="hamburger-icon hamburger-close" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="4" y1="4" x2="18" y2="18"/><line x1="18" y1="4" x2="4" y2="18"/></svg>
      </button>
      <nav id="site-nav" class="site-nav" aria-label="Primary">
        <a href="/"${cur('practice')}>Practice</a>
        <div class="nav-dropdown">
          <button class="nav-dropdown-toggle" aria-haspopup="true" aria-expanded="false">
            Topics
            <svg class="nav-dropdown-caret" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="2,3 5,7 8,3"/></svg>
          </button>
          <div class="nav-dropdown-menu">
            <a href="/ham-radio/"${curDrop('ham-radio')}>Ham Radio</a>
            <a href="/falconry/"${curDrop('falconry')}>Falconry</a>
            <a href="/security-plus/"${curDrop('cybersecurity')}>Security+</a>
            <a href="/devops/"${curDrop('devops')}>DevOps</a>
            <a href="/japanese/"${curDrop('japanese')}>Japanese</a>
          </div>
        </div>
        <a href="/blog/"${cur('blog')}>Blog</a>
        <a href="/pages/about.html"${cur('about')}>About</a>
      </nav>
      <button id="dark-mode-toggle" class="site-theme-toggle icon-btn" aria-label="Toggle dark mode" aria-pressed="false">
        <svg class="theme-icon theme-icon--sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        <svg class="theme-icon theme-icon--moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      </button>
    </div>
  </header>`;
}

export function renderFooter() {
  const v = chromeAssetVersions();
  return `  <footer class="site-footer">
    <p class="site-footer-brand">Ryno Tools — Build Momentum</p>
    <ul class="site-footer-nav">
      <li><a href="/">Practice</a></li>
      <li><a href="/japanese/">Japanese</a></li>
      <li><a href="/blog/">Blog</a></li>
      <li><a href="/pages/about.html">About</a></li>
      <li><a href="/pages/privacy.html">Privacy</a></li>
      <li><a href="/pages/terms.html">Terms</a></li>
    </ul>
    <div class="site-footer-social">
      <a href="https://github.com/rhino404" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M12 .5C5.73.5.5 5.73.5 12.02c0 5.1 3.29 9.43 7.86 10.96.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.54-3.87-1.54-.53-1.35-1.3-1.7-1.3-1.7-1.06-.73.08-.72.08-.72 1.17.08 1.79 1.2 1.79 1.2 1.04 1.77 2.72 1.26 3.38.97.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.3 1.19-3.11-.12-.3-.52-1.52.11-3.17 0 0 .98-.31 3.2 1.18a11.1 11.1 0 0 1 5.83 0c2.22-1.49 3.2-1.18 3.2-1.18.63 1.65.23 2.87.11 3.17.74.81 1.19 1.85 1.19 3.11 0 4.43-2.68 5.4-5.24 5.69.41.35.78 1.04.78 2.1v3.11c0 .31.21.66.8.55A10.53 10.53 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z"/>
        </svg>
      </a>
    </div>
    <p class="site-footer-copy">Copyright &copy; <script>document.write(new Date().getFullYear())</script> Ryno Tools. All rights reserved.</p>
  </footer>
  <script src="/js/chrome.js?v=${v.js}"></script>`;
}
