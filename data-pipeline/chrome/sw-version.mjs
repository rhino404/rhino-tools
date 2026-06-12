// Extracted from blog-pipeline/build.mjs — used by both build.mjs and sync-chrome.mjs.
// Bumps CACHE_VERSION in src/service-worker.js using YYYYMMDD + letter suffix scheme.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function bumpServiceWorkerVersion(rootDir) {
  const SW_PATH = join(rootDir, 'src', 'service-worker.js');
  const swSource = readFileSync(SW_PATH, 'utf8');
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const existingMatch = swSource.match(/CACHE_VERSION\s*=\s*['"]v(\d{8})([a-z]?)['"]/);
  let newVersion;
  if (!existingMatch) {
    newVersion = `v${today}`;
  } else {
    const [, existingDate, existingSuffix] = existingMatch;
    if (existingDate !== today) {
      newVersion = `v${today}`;
    } else if (!existingSuffix) {
      newVersion = `v${today}b`;
    } else {
      newVersion = `v${today}${String.fromCharCode(existingSuffix.charCodeAt(0) + 1)}`;
    }
  }
  const updatedSw = swSource.replace(
    /CACHE_VERSION\s*=\s*['"]v\d{8}[a-z]?['"]/,
    `CACHE_VERSION = '${newVersion}'`
  );
  if (updatedSw !== swSource) {
    writeFileSync(SW_PATH, updatedSw);
    console.log(`✅ Bumped service-worker.js CACHE_VERSION → ${newVersion}`);
  }
}
