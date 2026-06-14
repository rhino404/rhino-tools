#!/usr/bin/env node
/**
 * Asserts every CSS file <link>'d in src/**\/\*.html is listed in
 * src/service-worker.js CORE_ASSETS. Exits 1 if anything is missing.
 *
 * Run: node data-pipeline/check-sw-precache.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, '..');
const SRC   = join(ROOT, 'src');

function findHtml(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory() && !e.name.startsWith('.')) out.push(...findHtml(full));
    else if (e.isFile() && e.name.endsWith('.html')) out.push(full);
  }
  return out;
}

// Match stylesheet links regardless of attribute order:
// lookahead confirms rel=stylesheet is present anywhere in the tag, then grabs href.
// Captures the local path only (skips external http/https URLs).
const CSS_LINK_RE = /<link(?=[^>]*rel=["']stylesheet["'])[^>]*\shref=["']([^"'?#]+\.css)/g;

const cssInHtml = new Set();
for (const f of findHtml(SRC)) {
  const text = readFileSync(f, 'utf8');
  let m;
  while ((m = CSS_LINK_RE.exec(text)) !== null) {
    const href = m[1];
    if (href.startsWith('http://') || href.startsWith('https://')) continue; // skip external
    let normalized;
    if (href.startsWith('/')) {
      normalized = href.slice(1); // absolute site-root path → relative to SRC
    } else {
      normalized = relative(SRC, resolve(dirname(f), href));
    }
    cssInHtml.add(normalized);
  }
}

// Collect CSS paths declared in CORE_ASSETS: `${BASE_PATH}/css/foo.css`
const sw = readFileSync(join(SRC, 'service-worker.js'), 'utf8');
const SW_ASSET_RE = /\$\{BASE_PATH\}\/([^\s`'"]+)/g;
const cssInSw = new Set();
let m2;
while ((m2 = SW_ASSET_RE.exec(sw)) !== null) {
  if (m2[1].endsWith('.css')) cssInSw.add(m2[1]);
}

const missing = [...cssInHtml].filter(p => !cssInSw.has(p)).sort();
if (missing.length) {
  console.error('✗ SW precache gap — CSS linked in HTML but missing from CORE_ASSETS:');
  for (const p of missing) console.error(`  - ${p}`);
  console.error('\nAdd the missing path(s) to CORE_ASSETS in src/service-worker.js and bump CACHE_VERSION.');
  process.exit(1);
}
console.log(`✓ All ${cssInHtml.size} CSS file(s) referenced in HTML are in SW CORE_ASSETS`);
