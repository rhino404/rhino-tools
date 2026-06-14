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

import { categories as FALLBACK_CATS, subcategories as FALLBACK_SUBS, getCategoryIcon as _staticIcons } from '../data/quizMeta.js';
import { DATA_SOURCES } from './dataSources.js';

// Live icon map — starts with the static fallback, upgraded from manifest on load.
// Exported as a plain object so importers always read the current (post-manifest) value.
const _iconMap = { ..._staticIcons };
export const getCategoryIcon = _iconMap;

const MANIFEST_PATH = '/datasets/index.json';

let _catalog   = null;   // { categories, subcategories }
let _paths     = null;   // { [category]: { [subcategory]: url } } — null → use DATA_SOURCES
let _examDefs  = null;   // { [category]: { [subcategory]: examDef } } — null → fetch exam.json
let _sha256Map = null;   // { [url]: sha256 } — built from manifest; used as IDB cache keys
let _initPromise = null;

// ─── IndexedDB cache ──────────────────────────────────────────────────────────
// Parsed question arrays are cached by dataset sha256 so repeat visits skip
// the network entirely. Cache is invalidated automatically when a pool update
// changes the sha256 in the manifest.

const IDB_NAME    = 'rynoTools';
const IDB_STORE   = 'datasets';
const IDB_VERSION = 1;
let   _db         = null;

function _openIDB() {
  if (_db) return Promise.resolve(_db);
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE);
    req.onsuccess       = e => { _db = e.target.result; resolve(_db); };
    req.onerror         = e => reject(e.target.error);
  });
}

async function _idbGet(key) {
  try {
    const db = await _openIDB();
    if (!db) return null;
    return new Promise((resolve, reject) => {
      const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror   = e => reject(e.target.error);
    });
  } catch { return null; }
}

async function _idbSet(key, value) {
  try {
    const db = await _openIDB();
    if (!db) return;
    return new Promise((resolve, reject) => {
      const req = db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).put(value, key);
      req.onsuccess = () => resolve();
      req.onerror   = e => reject(e.target.error);
    });
  } catch {}
}

// Remove IDB entries whose sha256 is no longer in the current manifest.
// Runs in the background after manifest loads; prevents unbounded cache growth.
function _pruneIDBCache(currentSha256s) {
  _openIDB().then(db => {
    if (!db) return;
    const tx  = db.transaction(IDB_STORE, 'readwrite');
    const req = tx.objectStore(IDB_STORE).getAllKeys();
    req.onsuccess = () => {
      for (const key of req.result) {
        if (!currentSha256s.has(key)) tx.objectStore(IDB_STORE).delete(key);
      }
    };
  }).catch(() => {});
}

// ─── Manifest ─────────────────────────────────────────────────────────────────

function _buildFromManifest(manifest) {
  const catSeen    = new Set();
  const categories = [];
  const subcats    = [];
  const paths      = {};
  const examDefs   = {};
  const sha256Map  = {};
  const sha256Set  = new Set();

  // Prefer top-level categories array (present in manifests generated post-Wave 3).
  // Fall back to building from dataset entries + FALLBACK_CATS labels.
  if (Array.isArray(manifest.categories)) {
    for (const c of manifest.categories) {
      categories.push({ value: c.value, label: c.label });
      if (c.icon) _iconMap[c.value] = c.icon;
      catSeen.add(c.value);
    }
  }

  for (const ds of manifest.datasets) {
    if (!catSeen.has(ds.category)) {
      catSeen.add(ds.category);
      const fb = FALLBACK_CATS.find(c => c.value === ds.category);
      categories.push({ value: ds.category, label: fb?.label || ds.category });
    }
    subcats.push({ label: ds.label, value: ds.subcategory, category: ds.category, featured: ds.pool?.featured || null });

    const url = `./${ds.path}`;
    if (!paths[ds.category]) paths[ds.category] = {};
    paths[ds.category][ds.subcategory] = url;

    if (ds.sha256) {
      sha256Map[url] = ds.sha256;
      sha256Set.add(ds.sha256);
    }

    if (ds.exam) {
      if (!examDefs[ds.category]) examDefs[ds.category] = {};
      examDefs[ds.category][ds.subcategory] = ds.exam;
    }
  }

  return { categories, subcats, paths, examDefs, sha256Map, sha256Set };
}

function _init() {
  _catalog = { categories: FALLBACK_CATS, subcategories: FALLBACK_SUBS };

  _initPromise = fetch(MANIFEST_PATH)
    .then(r => r.ok ? r.json() : null)
    .then(manifest => {
      if (!manifest) return;
      const b   = _buildFromManifest(manifest);
      _catalog   = { categories: b.categories, subcategories: b.subcats };
      _paths     = b.paths;
      _examDefs  = b.examDefs;
      _sha256Map = b.sha256Map;
      _pruneIDBCache(b.sha256Set);
    })
    .catch(() => {});  // fallback catalog stays active on any failure

  return _initPromise;
}

function _ensureInit() {
  if (!_initPromise) _init();
  return _initPromise;
}

// ─── Public API ───────────────────────────────────────────────────────────────

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
 * Returns Question[]. Checks IDB cache first (keyed by sha256); falls back to
 * network fetch. A failed file yields [].
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
      const sha = _sha256Map?.[url];
      if (sha) {
        const cached = await _idbGet(sha);
        if (cached) return cached;
      }

      const r = await fetch(url);
      if (!r.ok) throw new Error(`Dataset fetch failed: ${url}`);
      const d = await r.json();
      const questions = d.questions || d;

      if (sha) _idbSet(sha, questions).catch(() => {});  // fire-and-forget

      return questions;
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
