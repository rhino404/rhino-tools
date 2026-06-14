// japanese.js — school-level curriculum navigation + game host.
// Views: path → level → skill (grid/deck) → session.

import { initializeTheme } from '../ui/theme.js';
import {
  loadManifest, loadTrack, getProgress, getAllProgress,
  getUnlockedStageIds, getItemState, overallStats,
  checkAudioAvailable, vowelColumn, getNextFocus,
  getUnlockedLevelIds, levelStats, MASTERY_THRESHOLD,
  getDifficulty, setDifficulty, DIFFICULTY,
} from './engine.js';
import { renderLearnCard }  from './games/learnCard.js';
import { renderSoundMatch } from './games/soundMatch.js';
import { renderTypeRomaji } from './games/typeRomaji.js';

// ── Grid section definitions ──────────────────────────────────────────────────

const KANA_SECTIONS = [
  {
    id: 'gojuon',
    label: '',
    vowels: ['a', 'i', 'u', 'e', 'o'],
    rows: ['a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma', 'ya', 'ra', 'wa', 'n'],
  },
  {
    id: 'dakuten',
    label: 'Dakuten — voiced',
    vowels: ['a', 'i', 'u', 'e', 'o'],
    rows: ['ga', 'za', 'da', 'ba'],
  },
  {
    id: 'handakuten',
    label: 'Handakuten — p sounds',
    vowels: ['a', 'i', 'u', 'e', 'o'],
    rows: ['pa'],
  },
  {
    id: 'yoon',
    label: 'Yōon — combinations',
    vowels: ['a', 'u', 'o'],
    rows: ['kya', 'sha', 'cha', 'nya', 'hya', 'mya', 'rya', 'gya', 'ja', 'bya', 'pya'],
  },
];

const ROW_LABELS = {
  a: 'vowels', ka: 'k', sa: 's', ta: 't', na: 'n', ha: 'h',
  ma: 'm', ya: 'y', ra: 'r', wa: 'w', n: 'ん',
  ga: 'g', za: 'z', da: 'd', ba: 'b', pa: 'p',
  kya: 'ky', sha: 'sh', cha: 'ch', nya: 'ny', hya: 'hy',
  mya: 'my', rya: 'ry', gya: 'gy', ja: 'j', bya: 'by', pya: 'py',
};

// ── Track presenter configs ───────────────────────────────────────────────────

const PRESENTERS = {
  kana: {
    prompt:     item => item.char,
    answer:     item => item.romaji,
    matchLabel: item => item.romaji,
    accepts:    item => item.accepts,
    // Safe hint: never exposes the accepted answer list
    typeHint:   item => item.mnemonic || `Think of the sound: ${item.romaji}`,
    // answerHtml: core answer (romaji/reading) — shown in the collapsible Answer block
    answerHtml: item => `<div class="jp-romaji-label">${item.romaji}</div>`,
    // detail: extras only (mnemonic, example) — shown in the collapsible Details block
    detail: item => `
      ${item.mnemonic ? `<p class="jp-mnemonic">${item.mnemonic}</p>` : ''}
      ${item.example?.word ? `
        <div class="jp-example">
          <div class="jp-ex-word">${item.example.word}</div>
          <div class="jp-ex-meta">${item.example.romaji} — ${item.example.meaning}</div>
        </div>
      ` : ''}
    `,
  },
  vocab: {
    prompt:     item => item.word,
    answer:     item => item.reading,
    matchLabel: item => item.meaning,
    accepts:    item => item.accepts || [item.reading.toLowerCase()],
    typeHint:   item => item.meaning,
    answerHtml: item => `
      <div class="jp-romaji-label">${item.reading}</div>
      <p class="jp-vocab-meaning">${item.meaning}</p>
    `,
    detail: item => `
      ${item.mnemonic ? `<p class="jp-mnemonic">${item.mnemonic}</p>` : ''}
      ${item.example?.ja ? `
        <div class="jp-example">
          <div class="jp-ex-word">${item.example.ja}</div>
          <div class="jp-ex-meta">${item.example.en}</div>
        </div>
      ` : ''}
    `,
  },
  kanji: {
    prompt:     item => item.word,
    answer:     item => item.reading,
    matchLabel: item => item.meaning,
    accepts:    item => item.accepts || [item.reading],
    typeHint:   item => item.meaning,
    answerHtml: item => `
      <div class="jp-romaji-label">${item.reading}</div>
      <p class="jp-vocab-meaning">${item.meaning}</p>
    `,
    detail: item => `
      ${(item.onyomi?.length || item.kunyomi?.length || item.strokes) ? `
        <div class="jp-kanji-detail">
          ${item.onyomi?.length ? `
            <div class="jp-kanji-row">
              <span class="jp-kanji-row-label">On</span>
              <span class="jp-kanji-row-value">${item.onyomi.join('、')}</span>
            </div>
          ` : ''}
          ${item.kunyomi?.length ? `
            <div class="jp-kanji-row">
              <span class="jp-kanji-row-label">Kun</span>
              <span class="jp-kanji-row-value">${item.kunyomi.join('、')}</span>
            </div>
          ` : ''}
          ${item.strokes ? `
            <div class="jp-kanji-row">
              <span class="jp-kanji-row-label">Strokes</span>
              <span class="jp-kanji-row-value">${item.strokes}</span>
            </div>
          ` : ''}
        </div>
      ` : ''}
      ${item.mnemonic ? `<p class="jp-mnemonic">${item.mnemonic}</p>` : ''}
      ${item.example?.ja ? `
        <div class="jp-example">
          <div class="jp-ex-word">${item.example.ja}${item.example.reading ? ` <span class="jp-ex-reading">${item.example.reading}</span>` : ''}</div>
          <div class="jp-ex-meta">${item.example.en}</div>
        </div>
      ` : ''}
    `,
  },
  grammar: {
    prompt:      item => item.word,
    typePrompt:  item => item.cloze || item.word,
    answer:      item => item.accepts?.[0] || item.reading,
    matchLabel:  item => item.meaning,
    accepts:     item => item.accepts || [item.reading],
    typeHint:    item => `${item.meaning} — fill in the ◯`,
    answerHtml: item => `
      <div class="jp-romaji-label" style="font-size:1rem">${item.reading}</div>
      <p class="jp-vocab-meaning">${item.meaning}</p>
    `,
    detail: item => `
      ${item.grammar ? `<p class="jp-grammar-note">${item.grammar}</p>` : ''}
      ${item.example?.ja ? `
        <div class="jp-example">
          <div class="jp-ex-word">${item.example.ja}</div>
          <div class="jp-ex-meta">${item.example.en}</div>
        </div>
      ` : ''}
    `,
  },
};

// ── App state ─────────────────────────────────────────────────────────────────

let _manifest      = null;
let _audioAvailable = false;
let _activeMode    = 'learn';
let _sessionItems  = null;
let _activeTrack   = null;
let _activeLevel   = null;   // current level object (set when in 'level' or 'skill' view)
let _view          = 'path'; // 'path' | 'level' | 'skill'

// ── Boot ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  initializeTheme();

  const header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll',
      () => header.classList.toggle('scrolled', window.scrollY > 8),
      { passive: true });
  }

  // Home back button (path ← level ← skill)
  document.getElementById('jp-home-back-btn')?.addEventListener('click', () => {
    if (_view === 'skill')  { _view = 'level'; renderHomeContent(); }
    else if (_view === 'level') { _view = 'path'; _activeLevel = null; renderHomeContent(); }
  });

  // Session back button
  document.getElementById('jp-back-btn')?.addEventListener('click', () => {
    showHomeView();
    renderHomeContent();
  });

  // Mode tabs (in session view)
  document.querySelectorAll('.jp-mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      if (!_sessionItems?.length) return;
      _activeMode = tab.dataset.mode;
      document.querySelectorAll('.jp-mode-tab').forEach(t =>
        t.classList.toggle('active', t.dataset.mode === _activeMode));
      runGame();
    });
  });

  // Difficulty control (in session view) — persists and re-runs current game
  document.querySelectorAll('.jp-diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!_sessionItems?.length) return;
      setDifficulty(btn.dataset.diff);
      runGame();
    });
  });

  _manifest = await loadManifest();
  _audioAvailable = await checkAudioAvailable();

  renderHomeContent();
});

// ── Home content dispatch ─────────────────────────────────────────────────────

function renderHomeContent() {
  const homeBackBtn = document.getElementById('jp-home-back-btn');
  const headerEl    = document.getElementById('jp-track-header');
  const contentEl   = document.getElementById('jp-track-content');
  if (!contentEl) return;

  if (homeBackBtn) homeBackBtn.hidden = (_view === 'path');
  if (headerEl)    headerEl.hidden    = (_view !== 'skill');

  if (_view === 'path')  renderPath(contentEl);
  else if (_view === 'level') renderLevelView(_activeLevel, contentEl);
  else if (_view === 'skill') renderSkillHome(_activeTrack, contentEl);
}

// ── Path view ─────────────────────────────────────────────────────────────────

function renderPath(container) {
  const allProgress  = getAllProgress();
  const unlockedIds  = getUnlockedLevelIds(_manifest);

  // Find the first available skill that still has unmastered items for Continue CTA
  let ctaLevel = null, ctaSkill = null;
  outer: for (const level of _manifest.levels) {
    if (!unlockedIds.has(level.id)) continue;
    for (const skill of (level.skills || [])) {
      if (!skill.data || !skill.count) continue;
      const tp = allProgress[skill.id] || {};
      const mastered = Object.values(tp).filter(e => (e.correct || 0) >= MASTERY_THRESHOLD).length;
      if (mastered < skill.count) { ctaLevel = level; ctaSkill = skill; break outer; }
    }
  }

  let html = '';
  if (ctaLevel && ctaSkill) {
    html += `<button class="jp-continue-cta" id="jp-continue-cta"
      data-level="${ctaLevel.id}" data-skill="${ctaSkill.id}">
      Continue: ${ctaLevel.label} — ${ctaSkill.label} →
    </button>`;
  }

  html += '<div class="jp-path">';

  for (const level of _manifest.levels) {
    const isUnlocked = unlockedIds.has(level.id);
    const stats      = levelStats(level, allProgress);
    const pct        = stats.total ? Math.round((stats.mastered / stats.total) * 100) : 0;

    html += `<button
      class="jp-level-node${isUnlocked ? '' : ' jp-level-node--locked'}"
      data-level="${level.id}"
      ${!isUnlocked ? 'disabled' : ''}
      aria-label="${level.label}${!isUnlocked ? ' — locked' : ''}">
      <span class="jp-level-node-icon">${level.icon}</span>
      <div class="jp-level-node-body">
        <div class="jp-level-node-top">
          <span class="jp-level-node-label">${level.label}</span>
          ${level.sublabel ? `<span class="jp-level-node-sublabel">${level.sublabel}</span>` : ''}
        </div>
        ${isUnlocked && stats.total ? `
          <div class="jp-level-node-progress">
            <div class="jp-progress-bar-track">
              <div class="jp-progress-bar-fill" style="width:${pct}%"></div>
            </div>
            <span class="jp-level-node-pct">${pct}%</span>
          </div>
        ` : ''}
        ${level.blurb ? `<span class="jp-level-node-blurb">${level.blurb}</span>` : ''}
        ${!isUnlocked && level.skills?.length ? `
          <span class="jp-level-node-hint">${level.skills.map(s => s.count ? `${s.label} (${s.count.toLocaleString()})` : s.label).join(' · ')}</span>
        ` : ''}
      </div>
      ${isUnlocked ? '<span class="jp-level-node-arrow">›</span>' : '<span class="jp-level-node-lock">🔒</span>'}
    </button>`;
  }

  html += '</div>';
  container.innerHTML = html;

  container.querySelector('#jp-continue-cta')?.addEventListener('click', async () => {
    const btn   = container.querySelector('#jp-continue-cta');
    const level = _manifest.levels.find(l => l.id === btn.dataset.level);
    const skill = level?.skills?.find(s => s.id === btn.dataset.skill);
    if (!level || !skill) return;
    _activeLevel = level;
    _activeTrack = await loadTrack(skill.id);
    _view = 'skill';
    renderHomeContent();
  });

  container.querySelectorAll('.jp-level-node:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      const level = _manifest.levels.find(l => l.id === btn.dataset.level);
      if (level) { _activeLevel = level; _view = 'level'; renderHomeContent(); }
    });
  });
}

// ── Level view ────────────────────────────────────────────────────────────────

function renderLevelView(level, container) {
  const allProgress = getAllProgress();

  let html = `
    <div class="jp-level-header">
      <div class="jp-level-icon">${level.icon}</div>
      <div>
        <h2 class="jp-level-title">${level.label}</h2>
        ${level.sublabel ? `<span class="jp-level-sublabel">${level.sublabel}</span>` : ''}
      </div>
    </div>
    ${level.blurb ? `<p class="jp-level-blurb">${level.blurb}</p>` : ''}
    <div class="jp-level-skills">
  `;

  for (const skill of (level.skills || [])) {
    const hasData  = !!skill.data;
    const tp       = allProgress[skill.id] || {};
    const nMastered = Object.values(tp).filter(e => (e.correct || 0) >= MASTERY_THRESHOLD).length;
    const pct      = skill.count ? Math.round((nMastered / skill.count) * 100) : 0;

    html += `<button
      class="jp-skill-card${hasData ? '' : ' jp-skill-card--soon'}"
      data-skill="${skill.id}"
      ${!hasData ? 'disabled' : ''}
      aria-label="${skill.label}${!hasData ? ' — coming soon' : ''}">
      <div class="jp-skill-card-top">
        <span class="jp-skill-card-icon">${skill.icon || '📚'}</span>
        <div class="jp-skill-card-meta">
          <span class="jp-skill-card-label">${skill.label}</span>
          ${!hasData ? '<span class="jp-soon-badge">Soon</span>' : ''}
        </div>
      </div>
      ${skill.blurb ? `<p class="jp-skill-card-blurb">${skill.blurb}</p>` : ''}
      ${hasData && skill.count ? `
        <div class="jp-skill-card-progress">
          <div class="jp-progress-bar-track">
            <div class="jp-progress-bar-fill" style="width:${pct}%"></div>
          </div>
          <span class="jp-skill-card-stat">${nMastered} / ${skill.count} mastered</span>
        </div>
      ` : (!hasData && skill.count ? `<span class="jp-skill-card-count">${skill.count.toLocaleString()} items</span>` : '')}
    </button>`;
  }

  html += '</div>';
  container.innerHTML = html;

  container.querySelectorAll('.jp-skill-card:not([disabled])').forEach(btn => {
    btn.addEventListener('click', async () => {
      const skill = level.skills.find(s => s.id === btn.dataset.skill);
      if (!skill) return;
      try {
        _activeTrack = await loadTrack(skill.id);
        _view = 'skill';
        renderHomeContent();
      } catch {
        renderSoonPanel({ label: skill.label }, container);
      }
    });
  });
}

// ── Skill home (grid / deck) ──────────────────────────────────────────────────

function renderSkillHome(track, container) {
  const progress = getProgress(track.id);

  const ctaBtn  = document.getElementById('jp-cta-btn');
  if (ctaBtn) {
    const focus = getNextFocus(track, progress);
    ctaBtn.textContent = focus.label + ' →';
    ctaBtn.onclick = () => startSession(focus);
  }

  if (track.layout === 'gojuon') {
    renderGrid(track, progress, container);
  } else if (track.layout === 'deck') {
    renderDeck(track, progress, container);
  }
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function legendHtml() {
  return `<div class="jp-legend">
    <span class="jp-legend-item"><span class="jp-legend-dot jp-legend-dot--unseen"></span>New</span>
    <span class="jp-legend-item"><span class="jp-legend-dot jp-legend-dot--seen"></span>Seen</span>
    <span class="jp-legend-item"><span class="jp-legend-dot jp-legend-dot--mastered"></span>Mastered</span>
    <span class="jp-legend-item"><span class="jp-legend-dot jp-legend-dot--locked"></span>Locked</span>
  </div>`;
}

// ── Gojūon grid ───────────────────────────────────────────────────────────────

function renderGrid(track, progress, container) {
  const unlocked = getUnlockedStageIds(track, progress);

  let html = legendHtml();

  for (const section of KANA_SECTIONS) {
    const presentRows = section.rows.filter(r => track.items.some(it => it.row === r));
    if (!presentRows.length) continue;

    html += `<div class="jp-grid-section">
      ${section.label ? `<div class="jp-grid-section-header"><h3 class="jp-grid-section-label">${section.label}</h3></div>` : ''}
      <div class="jp-grid-scroll">
        <div class="jp-grid" data-cols="${section.vowels.length}">`;

    for (const rowKey of presentRows) {
      const rowItems   = track.items.filter(it => it.row === rowKey);
      const stage      = track.stages.find(s => s.rows?.includes(rowKey));
      const rowUnlocked = stage ? unlocked.has(stage.id) : true;

      for (let ci = 0; ci < section.vowels.length; ci++) {
        const vowel = section.vowels[ci];
        const item  = rowItems.find(it => {
          if (rowKey === 'n') return ci === 0;
          return vowelColumn(it.romaji) === vowel;
        });

        if (!item) {
          html += `<div class="jp-grid-gap"></div>`;
          continue;
        }

        const state = rowUnlocked ? getItemState(item.id, progress) : 'locked';
        html += `<button
          class="jp-grid-cell jp-grid-cell--${state}"
          data-id="${item.id}"
          data-row="${rowKey}"
          ${!rowUnlocked ? 'disabled' : ''}
          aria-label="${item.char} ${item.romaji}${state === 'locked' ? ' — locked' : ''}">
          <span class="jp-cell-char">${item.char}</span>
          <span class="jp-cell-romaji">${item.romaji}</span>
        </button>`;
      }
    }

    html += `</div></div></div>`;
  }

  container.innerHTML = html;

  container.querySelectorAll('.jp-grid-cell:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      const row   = btn.dataset.row;
      const items = track.items.filter(it => it.row === row);
      const label = `${track.label} — ${ROW_LABELS[row] || row}`;
      startSession({ mode: _activeMode, items, label });
    });
  });
}

// ── Deck layout (vocab / kanji) ───────────────────────────────────────────────

function renderDeck(track, progress, container) {
  const unlocked = getUnlockedStageIds(track, progress);
  const lessons  = [...new Set(track.items.map(it => it.lesson))];
  let html = legendHtml();

  for (const lesson of lessons) {
    const stage          = track.stages.find(s => s.lessons?.includes(lesson));
    const lessonUnlocked = stage ? unlocked.has(stage.id) : true;
    const items          = track.items.filter(it => it.lesson === lesson);

    html += `<div class="jp-deck-section">
      <h3 class="jp-deck-section-label">${stage?.label || lesson}</h3>
      <div class="jp-deck-grid">`;

    for (const item of items) {
      const state = lessonUnlocked ? getItemState(item.id, progress) : 'locked';
      html += `<button
        class="jp-deck-item jp-deck-item--${state}"
        data-id="${item.id}"
        data-lesson="${lesson}"
        ${!lessonUnlocked ? 'disabled' : ''}
        aria-label="${item.word}${!lessonUnlocked ? ' — locked' : ''}">
        <span class="jp-deck-word">${item.word}</span>
        <span class="jp-deck-reading">${item.reading}</span>
        <span class="jp-deck-meaning">${item.meaning}</span>
        ${state !== 'locked' ? `<span class="jp-deck-state-dot jp-deck-state-dot--${state}"></span>` : ''}
      </button>`;
    }

    html += `</div></div>`;
  }

  container.innerHTML = html;

  container.querySelectorAll('.jp-deck-item:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      const lesson = btn.dataset.lesson;
      const items  = track.items.filter(it => it.lesson === lesson);
      const stage  = track.stages.find(s => s.lessons?.includes(lesson));
      startSession({ mode: _activeMode, items, label: `${track.label} — ${stage?.label || lesson}` });
    });
  });
}

// ── Soon panel ────────────────────────────────────────────────────────────────

function renderSoonPanel(meta, container) {
  container.innerHTML = `
    <div class="jp-soon-panel">
      <span class="jp-soon-icon">${meta?.icon || '🔒'}</span>
      <h3>${meta?.label || 'Track'} — Coming Soon</h3>
      <p>${meta?.blurb || 'This track is on the roadmap. Check back soon!'}</p>
    </div>
  `;
}

// ── View swap ─────────────────────────────────────────────────────────────────

function showHomeView() {
  document.getElementById('jp-home-view').hidden   = false;
  document.getElementById('jp-session-view').hidden = true;
  _sessionItems = null;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showSessionView() {
  document.getElementById('jp-home-view').hidden   = true;
  document.getElementById('jp-session-view').hidden = false;
}

// ── Session control ───────────────────────────────────────────────────────────

function startSession({ mode, items, label }) {
  if (!items?.length) return;
  _activeMode   = mode || 'learn';
  _sessionItems = items;

  const titleEl = document.getElementById('jp-session-title');
  if (titleEl) titleEl.textContent = label || '';

  showSessionView();
  runGame();

  document.getElementById('jp-session-view')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function runGame() {
  const track     = _activeTrack;
  const presenter = PRESENTERS[track.type] || PRESENTERS.kana;
  const area      = document.getElementById('jp-session-game');
  if (!area) return;
  area.innerHTML = '';

  document.querySelectorAll('.jp-mode-tab').forEach(t => {
    const on = t.dataset.mode === _activeMode;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', on);
  });

  const level = getDifficulty();
  const cfg   = DIFFICULTY[level] || DIFFICULTY.standard;

  // Sync difficulty control UI
  document.querySelectorAll('.jp-diff-btn').forEach(b => {
    const on = b.dataset.diff === level;
    b.classList.toggle('active', on);
    b.setAttribute('aria-checked', on);
  });

  const onComplete = () => {
    showHomeView();
    renderHomeContent();
  };

  if (_activeMode === 'learn') {
    renderLearnCard(area, _sessionItems, track.id, presenter, _audioAvailable, cfg, onComplete);
  } else if (_activeMode === 'match') {
    renderSoundMatch(area, _sessionItems, track.items, track.id, presenter, _audioAvailable, cfg, onComplete);
  } else if (_activeMode === 'type') {
    renderTypeRomaji(area, _sessionItems, track.id, presenter, _audioAvailable, cfg, onComplete);
  }
}
