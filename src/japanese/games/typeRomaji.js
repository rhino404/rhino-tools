// typeRomaji.js — Show prompt, type the accepted answer.
// cfg.hint → 'always' (hint visible) | 'ontap' (Hint button reveals) | 'none' (no hint)

import { markResult, playAudio, kanaSizeClass } from '../engine.js';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function renderTypeRomaji(container, items, trackId, presenter, audioAvailable, cfg, onComplete) {
  const hintMode  = cfg?.hint ?? 'ontap';
  const session   = shuffle(items).slice(0, Math.min(items.length, 15));
  const sessionLen = session.length;
  let idx = 0;
  let correct = 0;
  let answered = false;
  let advanceTimer = null;
  const requeued = new Set();
  // Mode/difficulty switches re-render into this same container; a pending
  // advance timer from this instance must not fire into the new game's DOM.
  const token = container._jpToken = {};

  const speakerSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;

  function next() {
    if (idx >= session.length) { showScore(); return; }
    showQuestion();
  }

  function hintHtml(item) {
    const hintText = presenter.typeHint(item);
    if (hintMode === 'none')   return '';
    if (hintMode === 'always') return `<div class="jp-hint">${hintText}</div>`;
    // ontap
    return `
      <div class="jp-hint-wrap">
        <button class="jp-hint-btn" id="jp-hint-btn" type="button">Hint</button>
        <div class="jp-hint jp-hint--hidden" id="jp-hint-text">${hintText}</div>
      </div>
    `;
  }

  function showQuestion() {
    answered = false;
    const item = session[idx];
    const displayText = presenter.typePrompt?.(item) ?? presenter.prompt(item);
    const showAudio = audioAvailable && item.audio;

    container.innerHTML = `
      <div class="jp-session-bar">
        <div class="jp-session-label">
          <span>Type</span>
          <span>${idx + 1} / ${session.length}</span>
        </div>
        <div class="jp-session-bar-track">
          <div class="jp-session-bar-fill" style="width:${(idx / session.length) * 100}%"></div>
        </div>
      </div>

      <div class="jp-type-area">
        <div class="jp-kana-display jp-kana-anim ${kanaSizeClass(displayText)}"
             aria-label="${presenter.answer(item)}">${displayText}</div>

        ${showAudio ? `<button class="jp-audio-btn" id="jp-audio-btn" aria-label="Play pronunciation">${speakerSvg} Listen</button>` : ''}

        <div class="jp-type-input-row">
          <input
            id="jp-type-input"
            class="jp-type-input"
            type="text"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="none"
            spellcheck="false"
            placeholder="type answer…"
            aria-label="Type the answer for ${presenter.prompt(item)}"
          />
          <button class="jp-type-submit" id="jp-submit">Check</button>
        </div>

        <div class="jp-type-feedback" id="jp-feedback"></div>
        ${hintHtml(item)}
      </div>
    `;

    const input = container.querySelector('#jp-type-input');
    input.focus();

    container.querySelector('#jp-audio-btn')?.addEventListener('click', () => playAudio(item));
    container.querySelector('#jp-submit').addEventListener('click', () => submit(item, input));
    input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(item, input); });

    // Hint reveal (ontap mode)
    container.querySelector('#jp-hint-btn')?.addEventListener('click', () => {
      const hintEl = container.querySelector('#jp-hint-text');
      const btn    = container.querySelector('#jp-hint-btn');
      if (hintEl) hintEl.classList.remove('jp-hint--hidden');
      if (btn) btn.style.display = 'none';
    });
  }

  function submit(item, input) {
    // Manual "Next →": cancel the pending auto-advance or both paths fire
    if (answered) { clearTimeout(advanceTimer); idx++; next(); return; }

    const typed = input.value.trim().toLowerCase();
    if (!typed) return;

    const accepts   = presenter.accepts(item);
    const isCorrect = accepts.some(a => a.toLowerCase() === typed);
    const isRetry   = requeued.has(item.id);
    answered = true;
    markResult(trackId, item.id, isCorrect);
    if (isCorrect && !isRetry) correct++;

    input.disabled = true;
    input.classList.add(isCorrect ? 'correct' : 'incorrect');

    const feedback = container.querySelector('#jp-feedback');
    feedback.className = 'jp-type-feedback ' + (isCorrect ? 'correct' : 'incorrect');
    feedback.textContent = isCorrect
      ? 'Correct!'
      : `Not quite — answer: "${presenter.answer(item)}"`;

    // Re-queue missed item once
    if (!isCorrect && !isRetry) {
      requeued.add(item.id);
      const insertAt = Math.min(idx + 3, session.length);
      session.splice(insertAt, 0, item);
    }

    const area = container.closest('.jp-game-area');
    if (area) {
      area.classList.add(isCorrect ? 'correct-effect' : 'incorrect-effect');
      setTimeout(() => area.classList.remove('correct-effect', 'incorrect-effect'), 500);
    }

    container.querySelector('#jp-submit').textContent = 'Next →';
    advanceTimer = setTimeout(() => {
      if (container._jpToken !== token) return;
      idx++; next();
    }, isCorrect ? 800 : 1500);
  }

  function showScore() {
    const pct = Math.round((correct / sessionLen) * 100);
    container.innerHTML = `
      <div class="jp-score-screen">
        <div class="jp-score-big">${pct}%</div>
        <div class="jp-score-label">${correct} / ${sessionLen} correct</div>
        <p style="color:var(--color-text-secondary);font-size:0.95rem;margin:0">
          ${pct >= 90 ? 'Excellent work!' : pct >= 70 ? 'Good — keep it up!' : 'Keep practising — it gets easier!'}
        </p>
        <div class="jp-score-actions">
          <button class="jp-score-btn" id="jp-retry">Play again</button>
          <button class="jp-score-btn jp-score-btn--primary" id="jp-finish">Back</button>
        </div>
      </div>
    `;
    container.querySelector('#jp-retry').addEventListener('click', () => {
      idx = 0; correct = 0; requeued.clear();
      session.splice(0, session.length, ...shuffle(items).slice(0, Math.min(items.length, 15)));
      next();
    });
    container.querySelector('#jp-finish').addEventListener('click', onComplete);
  }

  next();
}
