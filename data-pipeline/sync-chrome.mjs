#!/usr/bin/env node
// sync-chrome.mjs — Single-source chrome injector for all src/**/*.html pages.
//
// Modes:
//   (default)        Rewrite chrome marker regions in all pages; bump SW version if changed.
//   --check          Dry-run: exit 1 if any page is stale or missing markers.
//   --report         Compact one-line-per-page status (~25 lines). Token-cheap diagnostic.
//   --diff <page>    Show just that page's chrome regions vs. canonical.
//   --init           One-time migration: wrap existing header/footer in markers.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderChromeAssets, renderHeader, renderFooter, chromeAssetVersions } from './chrome/partials.mjs';
import { bumpServiceWorkerVersion } from './chrome/sw-version.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC  = join(ROOT, 'src');

// ── Helpers ────────────────────────────────────────────────────────────────

function walkHtml(dir, results = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walkHtml(full, results);
    } else if (entry.endsWith('.html')) {
      results.push(full);
    }
  }
  return results;
}

// Extract active="..." param from a start marker comment.
function parseActive(markerLine) {
  const m = markerLine.match(/active="([^"]+)"/);
  return m ? m[1] : null;
}

// Infer active value from file path.
function inferActive(filePath) {
  const rel = relative(SRC, filePath).replace(/\\/g, '/');
  if (rel === 'index.html') return 'practice';
  if (rel.startsWith('ham-radio/'))    return 'ham-radio';
  if (rel.startsWith('falconry/'))     return 'falconry';
  if (rel.startsWith('security-plus/')) return 'cybersecurity'; // category key, not slug
  if (rel.startsWith('devops/'))       return 'devops';
  if (rel.startsWith('japanese/'))     return 'japanese';
  if (rel.startsWith('blog/'))         return 'blog';
  if (rel === 'pages/about.html')      return 'about';
  return null;
}

// Replace the content between <!-- name:start ... --> and <!-- name:end -->.
// Returns null if markers not found. Throws if markers appear more than once.
function replaceRegion(html, markerName, newContent) {
  const startRe = new RegExp(`<!--\\s*${markerName}:start[^>]*-->`, 'g');
  const endTag  = `<!-- ${markerName}:end -->`;
  const starts  = [...html.matchAll(startRe)];
  const ends    = [...html.matchAll(new RegExp(endTag.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'g'))];
  if (starts.length === 0 && ends.length === 0) return null;
  if (starts.length !== 1 || ends.length !== 1) {
    throw new Error(`Expected exactly 1 pair of ${markerName}:start/end markers, found ${starts.length}/${ends.length}`);
  }
  const si = starts[0].index + starts[0][0].length;
  const ei = ends[0].index;
  return html.slice(0, si) + '\n' + newContent + '\n' + html.slice(ei);
}

// Inject all three chrome regions into an HTML string.
// Returns { html, changed } or throws on malformed markers.
export function injectChrome(html, filePath) {
  const active = (() => {
    const m = html.match(/<!--\s*chrome-header:start[^>]*-->/);
    if (m) return parseActive(m[0]);
    return filePath ? inferActive(filePath) : null;
  })();

  let out = html;
  let changed = false;

  const assetsResult = replaceRegion(out, 'chrome-assets', renderChromeAssets());
  if (assetsResult === null) return { html, changed: false, missingMarkers: true };
  if (assetsResult !== out) changed = true;
  out = assetsResult;

  const headerResult = replaceRegion(out, 'chrome-header', renderHeader(active));
  if (headerResult === null) return { html, changed: false, missingMarkers: true };
  if (headerResult !== out) changed = true;
  out = headerResult;

  const footerResult = replaceRegion(out, 'chrome-footer', renderFooter());
  if (footerResult === null) return { html, changed: false, missingMarkers: true };
  if (footerResult !== out) changed = true;
  out = footerResult;

  return { html: out, changed };
}

// ── --init migration ───────────────────────────────────────────────────────

function initPage(filePath) {
  let html = readFileSync(filePath, 'utf8');
  const rel = relative(SRC, filePath);

  // Skip if already migrated.
  if (html.includes('<!-- chrome-header:start')) {
    console.log(`  skip (already migrated): ${rel}`);
    return false;
  }

  // Assert exactly one header and one footer.
  const headerMatches = [...html.matchAll(/<header\s+class="site-header">/g)];
  const footerMatches = [...html.matchAll(/<footer\s+class="site-footer">/g)];
  if (headerMatches.length !== 1 || footerMatches.length !== 1) {
    console.warn(`  ⚠️  SKIPPED (${headerMatches.length} headers, ${footerMatches.length} footers — migrate by hand): ${rel}`);
    return false;
  }

  const active = inferActive(filePath);

  // Replace theme.css + chrome.css link pair with chrome-assets marker.
  // Match the two consecutive link lines (allow any order / whitespace).
  html = html.replace(
    /[ \t]*<link[^>]+\/css\/theme\.css[^>]*>\n[ \t]*<link[^>]+\/css\/chrome\.css[^>]*>/,
    `<!-- chrome-assets:start -->\n${renderChromeAssets()}\n<!-- chrome-assets:end -->`
  );
  // Also handle chrome before theme order (some pages may vary).
  html = html.replace(
    /[ \t]*<link[^>]+\/css\/chrome\.css[^>]*>\n[ \t]*<link[^>]+\/css\/theme\.css[^>]*>/,
    `<!-- chrome-assets:start -->\n${renderChromeAssets()}\n<!-- chrome-assets:end -->`
  );

  // Replace <header class="site-header">...</header> with marker-wrapped canonical.
  html = html.replace(
    /<header class="site-header">[\s\S]*?<\/header>/,
    `<!-- chrome-header:start active="${active}" -->\n${renderHeader(active)}\n<!-- chrome-header:end -->`
  );

  // Replace <footer class="site-footer">...</footer> with marker-wrapped canonical.
  // Also absorb the freestanding chrome.js script tag if it immediately follows.
  html = html.replace(
    /<footer class="site-footer">[\s\S]*?<\/footer>\n?([ \t]*<script[^>]*\/js\/chrome\.js[^>]*><\/script>\n?)?/,
    `<!-- chrome-footer:start -->\n${renderFooter()}\n<!-- chrome-footer:end -->\n`
  );

  // Remove any orphaned standalone chrome.js script tags after the footer region.
  const footerEnd = html.indexOf('<!-- chrome-footer:end -->');
  if (footerEnd !== -1) {
    const afterFooter = html.slice(footerEnd);
    const cleaned = afterFooter.replace(/\n?[ \t]*<script[^>]*\/js\/chrome\.js[^>]*><\/script>/g, '');
    if (cleaned !== afterFooter) {
      html = html.slice(0, footerEnd) + cleaned;
    }
  }

  writeFileSync(filePath, html);
  console.log(`  ✅ migrated: ${rel} (active="${active}")`);
  return true;
}

// ── --diff mode ────────────────────────────────────────────────────────────

function diffPage(filePath) {
  const html   = readFileSync(filePath, 'utf8');
  const rel    = relative(SRC, filePath);
  const active = (() => {
    const m = html.match(/<!--\s*chrome-header:start[^>]*-->/);
    return m ? parseActive(m[0]) : inferActive(filePath);
  })();

  console.log(`\n=== ${rel} (active="${active}") ===\n`);

  for (const [name, canonical] of [
    ['chrome-assets', renderChromeAssets()],
    ['chrome-header', renderHeader(active)],
    ['chrome-footer', renderFooter()],
  ]) {
    const startRe = new RegExp(`<!--\\s*${name}:start[^>]*-->`);
    const endTag  = `<!-- ${name}:end -->`;
    const si = html.search(startRe);
    const ei = html.indexOf(endTag);
    if (si === -1 || ei === -1) {
      console.log(`[${name}] ❌ markers missing`);
      continue;
    }
    const startMatch = html.match(startRe);
    const current = html.slice(si + startMatch[0].length, ei).trim();
    if (current === canonical.trim()) {
      console.log(`[${name}] ✅ ok`);
    } else {
      console.log(`[${name}] ⚠️  stale`);
      console.log('  CURRENT:'); current.split('\n').forEach(l => console.log('  - ' + l));
      console.log('  CANONICAL:'); canonical.split('\n').forEach(l => console.log('  + ' + l));
    }
  }
}

// ── --report mode ──────────────────────────────────────────────────────────

function report(pages) {
  const v = chromeAssetVersions();
  const header = `PATH                                              active         assets  header  footer  lint`;
  console.log(header);
  console.log('─'.repeat(header.length));

  for (const filePath of pages) {
    const rel  = relative(SRC, filePath).replace(/\\/g, '/');
    const html = readFileSync(filePath, 'utf8');
    const active = (() => {
      const m = html.match(/<!--\s*chrome-header:start[^>]*-->/);
      return m ? (parseActive(m[0]) ?? 'null') : '(unmgd)';
    })();

    const hasAssets = html.includes('<!-- chrome-assets:start -->');
    const hasHeader = html.includes('<!-- chrome-header:start');
    const hasFooter = html.includes('<!-- chrome-footer:start -->');

    const checkRegion = (name, canonical) => {
      const startRe = new RegExp(`<!--\\s*${name}:start[^>]*-->`);
      const endTag  = `<!-- ${name}:end -->`;
      const si = html.search(startRe);
      const ei = html.indexOf(endTag);
      if (si === -1 || ei === -1) return '❌miss';
      const startMatch = html.match(startRe);
      const current = html.slice(si + startMatch[0].length, ei).trim();
      return current === canonical.trim() ? '✅ok' : '⚠️ stale';
    };

    const inferredActive = active === '(unmgd)' ? inferActive(filePath) : active;
    const assetsStatus = hasAssets ? checkRegion('chrome-assets', renderChromeAssets()) : '❌miss';
    const headerStatus = hasHeader ? checkRegion('chrome-header', renderHeader(inferredActive)) : '❌miss';
    const footerStatus = hasFooter ? checkRegion('chrome-footer', renderFooter()) : '❌miss';

    // Lint checks.
    const lintIssues = [];
    const extraHeaders = (html.match(/<header\s+class="site-header">/g) || []).length;
    if (extraHeaders > 1) lintIssues.push('dup-header');
    if (html.match(/onclick="[^"]*toggle[^"]*dark/)) lintIssues.push('inline-onclick');
    const chromeScripts = (html.match(/\/js\/chrome\.js/g) || []).length;
    if (chromeScripts > 1) lintIssues.push('dup-chrome.js');
    if (!hasFooter && chromeScripts === 0) lintIssues.push('no-chrome.js');

    const lint = lintIssues.length ? lintIssues.join(',') : '✅';
    const label = rel.padEnd(50).slice(0, 50);
    const act   = active.padEnd(14).slice(0, 14);
    console.log(`${label} ${act} ${assetsStatus.padEnd(7)} ${headerStatus.padEnd(7)} ${footerStatus.padEnd(7)} ${lint}`);
  }
  console.log(`\nChrome file hashes: theme=${v.theme}  chrome=${v.chrome}  js=${v.js}`);
}

// ── --check + default modes ────────────────────────────────────────────────

function checkOrSync(pages, dryRun) {
  let drifted = 0;
  let written = 0;
  const issues = [];

  for (const filePath of pages) {
    const rel  = relative(SRC, filePath);
    const html = readFileSync(filePath, 'utf8');

    if (!html.includes('<!-- chrome-assets:start -->') ||
        !html.includes('<!-- chrome-header:start')      ||
        !html.includes('<!-- chrome-footer:start -->')) {
      issues.push(`${rel}: missing chrome markers (run --init first)`);
      drifted++;
      continue;
    }

    let result;
    try {
      result = injectChrome(html, filePath);
    } catch (err) {
      issues.push(`${rel}: ${err.message}`);
      drifted++;
      continue;
    }

    if (result.missingMarkers) {
      issues.push(`${rel}: missing chrome markers (run --init first)`);
      drifted++;
    } else if (result.changed) {
      drifted++;
      if (!dryRun) {
        writeFileSync(filePath, result.html);
        console.log(`  updated: ${rel}`);
        written++;
      } else {
        issues.push(`${rel}: chrome regions stale`);
      }
    }
  }

  if (!dryRun && written > 0) {
    bumpServiceWorkerVersion(ROOT);
  }

  return { drifted, written, issues };
}

// ── CLI entry point (only runs when invoked directly, not when imported) ───

const isMain = process.argv[1] &&
  fileURLToPath(import.meta.url) === (process.argv[1].startsWith('/') ? process.argv[1] : new URL(process.argv[1], 'file://').pathname);

if (isMain) {

const args = process.argv.slice(2);
const mode = args[0];

const pages = walkHtml(SRC);

if (mode === '--init') {
  console.log(`[sync-chrome] --init: migrating ${pages.length} pages to marker system...\n`);
  let migrated = 0;
  for (const p of pages) {
    if (initPage(p)) migrated++;
  }
  console.log(`\n✅ init complete — ${migrated} page(s) migrated.`);
  console.log('Run `node data-pipeline/sync-chrome.mjs` to verify and bump SW version.');

} else if (mode === '--report') {
  report(pages);

} else if (mode === '--diff') {
  const target = args[1];
  if (!target) { console.error('Usage: --diff <relative-path-from-src/>'); process.exit(1); }
  const full = join(SRC, target);
  diffPage(full);

} else if (mode === '--check') {
  console.log(`[sync-chrome] --check: verifying ${pages.length} pages...\n`);
  const { drifted, issues } = checkOrSync(pages, true);
  if (issues.length) {
    console.error('\n❌ Chrome drift detected:');
    issues.forEach(i => console.error('  ' + i));
    console.error('\nFix: edit data-pipeline/chrome/partials.mjs (or chrome.css/js), then run:\n  node data-pipeline/sync-chrome.mjs\n');
    process.exit(1);
  }
  console.log(`✅ All ${pages.length} pages in sync.`);

} else {
  // Default: sync all pages.
  console.log(`[sync-chrome] syncing ${pages.length} pages...\n`);
  const { written, drifted, issues } = checkOrSync(pages, false);
  if (issues.length) {
    console.warn('\n⚠️  Issues (fix manually):');
    issues.forEach(i => console.warn('  ' + i));
  }
  if (written === 0 && drifted === 0) {
    console.log('✅ All pages already in sync. No changes.');
  } else {
    console.log(`\n✅ Done. ${written} page(s) updated${drifted > written ? `, ${drifted - written} issue(s)` : ''}.`);
  }
}

} // end isMain
