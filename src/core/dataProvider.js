// src/core/dataProvider.js
//
// Single seam between the app and "where data comes from".
// Current implementation: static JSON + generated manifest (datasets/index.json).
// Future: swap fetch internals for an API call without touching any caller.
//
// Boot strategy: populate _catalog from the hardcoded fallback immediately
// (zero async delay, no first-paint cost), then upgrade from the manifest in
// the background. Callers that need the manifest-resolved catalog use
// getCatalog(); callers that fire synchronously at DOMContentLoaded use
// getCatalogSync().

import { categories as FALLBACK_CATS, subcategories as FALLBACK_SUBS, getCategoryIcon } from '../data/quizMeta.js';
import { DATA_SOURCES } from './dataSources.js';

export { getCategoryIcon };

const MANIFEST_PATH = '/datasets/index.json';

let _catalog  = null;   // { categories, subcategories }
let _paths    = null;   // { [category]: { [subcategory]: url } } — null → use DATA_SOURCES
let _examDefs = null;   // { [category]: { [subcategory]: examDef } } — null → fetch exam.json
let _initPromise = null;

function _buildFromManifest(manifest) {
  const catSeen    = new Set();
  const categories = [];
  const subcats    = [];
  const paths      = {};
  const examDefs   = {};

  for (const ds of manifest.datasets) {
    if (!catSeen.has(ds.category)) {
      catSeen.add(ds.category);
      const fb = FALLBACK_CATS.find(c => c.value === ds.category);
      categories.push({ value: ds.category, label: fb?.label || ds.category });
    }
    subcats.push({ label: ds.label, value: ds.subcategory, category: ds.category, featured: ds.pool?.featured || null });
    if (!paths[ds.category]) paths[ds.category] = {};
    paths[ds.category][ds.subcategory] = `./${ds.path}`;
    if (ds.exam) {
      if (!examDefs[ds.category]) examDefs[ds.category] = {};
      examDefs[ds.category][ds.subcategory] = ds.exam;
    }
  }

  return { categories, subcats, paths, examDefs };
}

function _init() {
  _catalog = { categories: FALLBACK_CATS, subcategories: FALLBACK_SUBS };

  _initPromise = fetch(MANIFEST_PATH)
    .then(r => r.ok ? r.json() : null)
    .then(manifest => {
      if (!manifest) return;
      const b = _buildFromManifest(manifest);
      _catalog  = { categories: b.categories, subcategories: b.subcats };
      _paths    = b.paths;
      _examDefs = b.examDefs;
    })
    .catch(() => {});  // fallback catalog stays active on any failure

  return _initPromise;
}

function _ensureInit() {
  if (!_initPromise) _init();
  return _initPromise;
}

// ────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────

/**
 * Synchronous catalog snapshot — uses fallback on first call, manifest-upgraded
 * on subsequent calls after the manifest has resolved. Safe to call at
 * DOMContentLoaded where await is not possible.
 */
export function getCatalogSync() {
  _ensureInit();
  return { categories: _catalog.categories, subcategories: _catalog.subcategories };
}

/**
 * Async catalog — resolves only after the manifest fetch completes (or fails).
 * Use wherever the caller can await.
 */
export async function getCatalog() {
  await _ensureInit();
  return { categories: _catalog.categories, subcategories: _catalog.subcategories };
}

/**
 * Fetch all questions for a category + subcategory.
 * Returns Question[]. Parallel fetch; a failed file yields [].
 */
export async function getQuestions(category, subcategory = null) {
  if (!category) return [];
  await _ensureInit();

  const subData = (_paths || DATA_SOURCES)[category] || {};
  const urls = (!subcategory || subcategory === 'all')
    ? Object.values(subData).flatMap(r =>
        Array.isArray(r) ? r : (typeof r === 'string' ? [r] : []))
    : (subData[subcategory] ? [subData[subcategory]] : []);

  const perFile = await Promise.all(urls.map(async url => {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`Dataset fetch failed: ${url}`);
      const d = await r.json();
      return d.questions || d;
    } catch (err) {
      console.error('[dataProvider]', err);
      return [];
    }
  }));

  return perFile.flat();
}

/**
 * Returns the exam definition for a category/subcategory, or null.
 * Prefers manifest-embedded exam data; falls back to fetching exam.json.
 */
export async function getExamDefinition(category, subcategory) {
  await _ensureInit();

  if (_examDefs) return _examDefs[category]?.[subcategory] || null;

  try {
    const r = await fetch('/datasets/exam.json');
    if (!r.ok) return null;
    const defs = await r.json();
    const catDef = defs.find(c => c.category === category);
    return catDef?.subcategory?.[subcategory] || null;
  } catch {
    return null;
  }
}

/**
 * Prefetch all dataset files for a category at low priority.
 * Warms the SW/browser cache before the user hits "Start".
 * Phase D hook — call from the category dropdown on-select handler.
 */
export function prefetchCategory(category) {
  _ensureInit().then(() => {
    const subData = (_paths || DATA_SOURCES)[category] || {};
    for (const url of Object.values(subData)) {
      if (typeof url === 'string') fetch(url, { priority: 'low' }).catch(() => {});
    }
  });
}

// Kick off the manifest fetch immediately on module load
_init();
