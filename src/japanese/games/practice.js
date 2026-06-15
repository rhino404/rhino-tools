// practice.js — Study and Quiz session drivers with shared format renderers.
// renderStudy: looping, un-scored, format selected by pill (flash|match|type)
// renderQuiz:  finite, scored, all items × both formats (match + type)

import {
  markResult, markSeen, playAudio, kanaSizeClass, vowelColumn,
  STUDY_CONFIG, QUIZ_CONFIG,
} from '../engine.js';
import { defaultShuffle } from './gameSession.js';

const speakerSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;

function updateProgressBar(index, total) {
  const wrap  = document.getElementById('jp-quiz-progress');
  const fill  = document.getElementById('jp-quiz-progress-fill');
  const label = document.getElementById('jp-quiz-progress-label');
  if (!wrap) return;
  if (index == null || total == null || total <= 0) { wrap.hidden = true; return; }
  wrap.hidden = false;
  fill.style.width = `${((index + 1) / total) * 100}%`;
  label.textContent = `${index + 1} / ${total}`;
}

// ── Distractor picker (moved from soundMatch.js) ──────────────────────────────

function pickDistractors(correct, pool, presenter, sim, count) {
  const correctLabel = presenter.matchLabel(correct);
  const others = pool.filter(it => it.id !== correct.id && presenter.matchLabel(it) !== correctLabel);

  let candidates;
  if (sim === 'low') {
    candidates = defaultShuffle(others);
  } else if (sim === 'group') {
    const sameGroup = others.filter(it =>
      (it.group && it.group === correct.group) ||
      (it.lesson && it.lesson === correct.lesson));
    candidates = sameGroup.length >= count ? defaultShuffle(sameGroup) : defaultShuffle(others);
  } else {
    // tight: confusable — kana: same vowel column; vocab/kanji: same lesson
    const correctVowel = correct.romaji ? vowelColumn(correct.romaji) : null;
    const confusable = others.filter(it => {
      if (correctVowel && it.romaji) return vowelColumn(it.romaji) === correctVowel;
      return (it.lesson && it.lesson === correct.lesson);
    });
    const same = others.filter(it =>
      (it.group && it.group === correct.group) ||
      (it.lesson && it.lesson === correct.lesson));
    candidates = [...new Map(
      [...defaultShuffle(confusable), ...defaultShuffle(same), ...defaultShuffle(others)].map(x => [x.id, x])
    ).values()];
  }

  if (candidates.length < count) {
    const ids = new Set(candidates.map(x => x.id));
    const fill = others.filter(x => !ids.has(x.id));
    candidates = [...candidates, ...defaultShuffle(fill)];
  }
  return candidates.slice(0, count);
}

// ── Format renderers ──────────────────────────────────────────────────────────

function renderFlashcard(container, item, presenter, audioAvailable, onDone, onExit) {
  const hasAudio   = audioAvailable && item.audio;
  const answerHtml = presenter.answerHtml
    ? presenter.answerHtml(item)
    : `<div class="jp-romaji-label">${presenter.answer(item)}</div>`;
  const detailHtml = presenter.detail(item).trim();

  container.innerHTML = `
    <div class="jp-learn-card">
      <div class="jp-kana-display jp-kana-anim ${kanaSizeClass(presenter.prompt(item))}"
           aria-label="${presenter.answer(item)}">${presenter.prompt(item)}</div>

      <div class="jp-collapse-block">
        <div class="jp-collapse-body is-open">
          ${answerHtml}
          ${hasAudio ? `<button class="jp-audio-btn" id="jp-audio-btn" aria-label="Play pronunciation">${speakerSvg} Listen</button>` : ''}
        </div>
      </div>

      ${detailHtml ? `
        <div class="jp-collapse-block">
          <div class="jp-collapse-body is-open">${detailHtml}</div>
        </div>
      ` : ''}

      <div class="jp-card-nav">
        <button class="jp-card-nav-btn" id="jp-exit">Exit</button>
        <button class="jp-card-nav-btn jp-card-nav-btn--primary" id="jp-next">Next →</button>
      </div>
    </div>
  `;

  container.querySelector('#jp-audio-btn')?.addEventListener('click', () => playAudio(item));
  container.querySelector('#jp-exit').addEventListener('click', onExit);
  container.querySelector('#jp-next').addEventListener('click', onDone);
}

function renderMatchQuestion(container, item, pool, presenter, cfg, audioAvailable, onDone, onExit) {
  const choiceCount = Math.min(cfg?.match?.choices ?? 4, pool.length);
  const sim         = cfg?.match?.sim ?? 'group';
  const token       = container._jpToken;

  const distractors = pickDistractors(item, pool, presenter, sim, choiceCount - 1);
  const choices     = defaultShuffle([item, ...distractors]);
  const showAudio   = audioAvailable && item.audio;
  const cols        = choices.length >= 4 ? 2 : 1;

  container.innerHTML = `
    <div class="jp-match-prompt">
      <div class="jp-kana-display jp-kana-anim ${kanaSizeClass(presenter.prompt(item))}"
           aria-label="${presenter.answer(item)}">${presenter.prompt(item)}</div>
      ${showAudio ? `<button class="jp-audio-btn" id="jp-audio-btn" aria-label="Play pronunciation">${speakerSvg} Listen</button>` : ''}
      <div class="jp-match-choices" style="grid-template-columns:repeat(${cols},1fr)">
        ${choices.map(c => `
          <button class="jp-choice-btn" data-id="${c.id}">${presenter.matchLabel(c)}</button>
        `).join('')}
      </div>
      <button class="jp-session-exit" id="jp-exit">Exit</button>
    </div>
  `;

  container.querySelector('#jp-audio-btn')?.addEventListener('click', () => playAudio(item));
  container.querySelector('#jp-exit')?.addEventListener('click', onExit);
  container.querySelectorAll('.jp-choice-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const isCorrect = btn.dataset.id === item.id;

      container.querySelectorAll('.jp-choice-btn').forEach(b => {
        b.disabled = true;
        if (b.dataset.id === item.id) b.classList.add('correct');
      });
      if (!isCorrect) btn.classList.add('incorrect');

      const area = container.closest('.jp-game-area');
      if (area) {
        area.classList.add(isCorrect ? 'correct-effect' : 'incorrect-effect');
        setTimeout(() => area.classList.remove('correct-effect', 'incorrect-effect'), 500);
      }

      setTimeout(() => {
        if (container._jpToken !== token) return;
        onDone({ isCorrect });
      }, isCorrect ? 700 : 1200);
    });
  });
}

function renderTypeQuestion(container, item, presenter, cfg, audioAvailable, onDone, onExit) {
  const hintMode = cfg?.hint ?? 'ontap';
  const token    = container._jpToken;
  let answered   = false;
  let advanceTimer = null;
  let _isCorrect = false;

  const displayText = presenter.typePrompt?.(item) ?? presenter.prompt(item);
  const showAudio   = audioAvailable && item.audio;

  function hintMarkup() {
    const hintText = presenter.typeHint(item);
    if (hintMode === 'none')   return '';
    if (hintMode === 'always') return `<div class="jp-hint">${hintText}</div>`;
    return `
      <div class="jp-hint-wrap">
        <button class="jp-hint-btn" id="jp-hint-btn" type="button">Hint</button>
        <div class="jp-hint jp-hint--hidden" id="jp-hint-text">${hintText}</div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="jp-type-area">
      <div class="jp-kana-display jp-kana-anim ${kanaSizeClass(displayText)}"
           aria-label="${presenter.answer(item)}">${displayText}</div>
      ${showAudio ? `<button class="jp-audio-btn" id="jp-audio-btn" aria-label="Play pronunciation">${speakerSvg} Listen</button>` : ''}
      <div class="jp-type-input-row">
        <input id="jp-type-input" class="jp-type-input" type="text"
          autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false"
          placeholder="type answer…"
          aria-label="Type the answer for ${presenter.prompt(item)}" />
        <button class="jp-type-submit" id="jp-submit">Check</button>
      </div>
      <div class="jp-type-feedback" id="jp-feedback"></div>
      ${hintMarkup()}
      <button class="jp-session-exit" id="jp-exit">Exit</button>
    </div>
  `;

  const input = container.querySelector('#jp-type-input');
  input.focus();

  container.querySelector('#jp-audio-btn')?.addEventListener('click', () => playAudio(item));
  container.querySelector('#jp-exit')?.addEventListener('click', onExit);

  function submit() {
    if (answered) {
      clearTimeout(advanceTimer);
      if (container._jpToken === token) onDone({ isCorrect: _isCorrect });
      return;
    }

    const typed = input.value.trim().toLowerCase();
    if (!typed) return;

    const accepts = presenter.accepts(item);
    _isCorrect    = accepts.some(a => a.toLowerCase() === typed);
    answered      = true;

    input.disabled = true;
    input.classList.add(_isCorrect ? 'correct' : 'incorrect');

    const feedback = container.querySelector('#jp-feedback');
    feedback.className = 'jp-type-feedback ' + (_isCorrect ? 'correct' : 'incorrect');
    feedback.textContent = _isCorrect
      ? 'Correct!'
      : `Not quite — answer: "${presenter.answer(item)}"`;

    const area = container.closest('.jp-game-area');
    if (area) {
      area.classList.add(_isCorrect ? 'correct-effect' : 'incorrect-effect');
      setTimeout(() => area.classList.remove('correct-effect', 'incorrect-effect'), 500);
    }

    container.querySelector('#jp-submit').textContent = 'Next →';
    advanceTimer = setTimeout(() => {
      if (container._jpToken !== token) return;
      onDone({ isCorrect: _isCorrect });
    }, _isCorrect ? 800 : 1500);
  }

  container.querySelector('#jp-submit').addEventListener('click', submit);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });

  container.querySelector('#jp-hint-btn')?.addEventListener('click', () => {
    const hintEl = container.querySelector('#jp-hint-text');
    const btn    = container.querySelector('#jp-hint-btn');
    if (hintEl) hintEl.classList.remove('jp-hint--hidden');
    if (btn) btn.style.display = 'none';
  });
}

// ── Score screen ──────────────────────────────────────────────────────────────

function showScoreScreen(container, score, journey, onRetry, onComplete) {
  const { correct, total, pct } = score;
  const step = journey?.next?.();

  container.innerHTML = `
    <div class="jp-score-screen">
      <div class="jp-score-big">${pct}%</div>
      <div class="jp-score-label">${correct} / ${total} correct</div>
      ${step === null
        ? `<p class="jp-score-celebrate">🎉 You've mastered this skill!</p>`
        : `<p style="color:var(--color-text-secondary);font-size:0.95rem;margin:0">
            ${pct >= 90 ? 'Excellent work!' : pct >= 70 ? 'Good — keep it up!' : 'Keep practising — it gets easier!'}
           </p>`
      }
      <div class="jp-score-actions">
        ${step === null
          ? `<button class="jp-score-btn" id="jp-retry">Play again</button>
             <button class="jp-score-btn jp-score-btn--primary" id="jp-finish">Done</button>`
          : `<button class="jp-score-btn jp-score-btn--primary" id="jp-launch">${step.label}</button>
             <button class="jp-score-btn" id="jp-finish">Exit</button>`
        }
      </div>
    </div>
  `;

  container.querySelector('#jp-retry')?.addEventListener('click', onRetry);
  container.querySelector('#jp-finish').addEventListener('click', onComplete);
  const launchBtn = container.querySelector('#jp-launch');
  if (launchBtn) {
    launchBtn.addEventListener('click', () => step.run());
    launchBtn.focus();
  }
}

// ── Study driver (looping, un-scored) ────────────────────────────────────────

// fmt: 'flash' | 'match' | 'type' — selected by the study format pills
export function renderStudy(container, items, pool, trackId, presenter, audioAvailable, fmt, onComplete, journey) {
  const token = container._jpToken = {};
  const seen  = new Set();
  let deck    = defaultShuffle(items.slice());
  let idx     = 0;

  function next() {
    if (idx >= deck.length) {
      deck = defaultShuffle(items.slice());
      idx  = 0;
    }
    const item = deck[idx];

    function onDone() {
      if (!seen.has(item.id)) { seen.add(item.id); markSeen(trackId, item.id); }
      idx++;
      next();
    }

    updateProgressBar(null, null);
    if (fmt === 'flash') {
      renderFlashcard(container, item, presenter, audioAvailable, onDone, onComplete);
    } else if (fmt === 'match') {
      renderMatchQuestion(container, item, pool, presenter, STUDY_CONFIG, audioAvailable, onDone, onComplete);
    } else {
      renderTypeQuestion(container, item, presenter, STUDY_CONFIG, audioAvailable, onDone, onComplete);
    }
  }

  next();
}

// ── Quiz driver (finite, scored — all items × both formats) ──────────────────
// 5 selected items → 5 Match + 5 Type = 10 questions total.

function makeQuizSession(items) {
  return defaultShuffle([
    ...items.map(item => ({ item, fmt: 'match' })),
    ...items.map(item => ({ item, fmt: 'type'  })),
  ]);
}

export function renderQuiz(container, items, pool, trackId, presenter, audioAvailable, onComplete, journey) {
  const token    = container._jpToken = {};
  const credited = new Set(); // once-per-visit mastery guard (survives restart)
  let session    = makeQuizSession(items);
  const sessionLen = session.length; // fixed score denominator
  const requeued = new Set();        // guards re-queue: each item:fmt at most once
  let idx     = 0;
  let correct = 0;

  function next() {
    if (idx >= session.length) { showScore(); return; }
    const { item, fmt } = session[idx];

    function onDone({ isCorrect }) {
      const reqKey   = `${item.id}:${fmt}`;
      const firstTry = !requeued.has(reqKey);

      if (isCorrect && firstTry) correct++;

      let creditMastery = false;
      if (isCorrect && firstTry && !credited.has(item.id)) {
        credited.add(item.id);
        creditMastery = true;
      }

      if (!isCorrect && firstTry) {
        requeued.add(reqKey);
        session.splice(Math.min(idx + 3, session.length), 0, { item, fmt });
      }

      if (creditMastery)               markResult(trackId, item.id, true);
      else if (firstTry && !isCorrect) markResult(trackId, item.id, false);
      else                             markSeen(trackId, item.id);

      idx++;
      next();
    }

    updateProgressBar(idx, session.length);
    if (fmt === 'match') {
      renderMatchQuestion(container, item, pool, presenter, QUIZ_CONFIG, audioAvailable, onDone, onComplete);
    } else {
      renderTypeQuestion(container, item, presenter, QUIZ_CONFIG, audioAvailable, onDone, onComplete);
    }
  }

  function showScore() {
    updateProgressBar(null, null);
    const score = {
      correct,
      total: sessionLen,
      pct: sessionLen ? Math.round((correct / sessionLen) * 100) : 0,
    };
    showScoreScreen(container, score, journey,
      () => {
        session = makeQuizSession(items);
        idx = 0; correct = 0;
        requeued.clear();
        // credited NOT cleared — once-per-visit mastery guard survives replays
        next();
      },
      onComplete);
  }

  next();
}
