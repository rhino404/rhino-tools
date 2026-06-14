// learnCard.js — Learn mode: step through items with progressive disclosure.
// cfg.learn.answer  → whether the Answer block starts open (romaji/reading + meaning + Listen)
// cfg.learn.details → whether the Details block starts open (mnemonic, example, kanji detail)

import { markSeen, playAudio, kanaSizeClass } from '../engine.js';

const speakerSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;

export function renderLearnCard(container, items, trackId, presenter, audioAvailable, cfg, onComplete, journey) {
  let idx = 0;
  const answerOpen  = cfg?.learn?.answer  ?? true;
  const detailsOpen = cfg?.learn?.details ?? false;
  // No timers here, but rendering must invalidate any pending Match/Type
  // advance timer that would otherwise fire into this card's DOM.
  container._jpToken = {};

  function show() {
    const item = items[idx];
    const isLast = idx === items.length - 1;
    const step = isLast ? journey?.next?.() : null;
    markSeen(trackId, item.id);

    const hasAudio  = audioAvailable && item.audio;
    const answerHtml = presenter.answerHtml ? presenter.answerHtml(item) : `<div class="jp-romaji-label">${presenter.answer(item)}</div>`;
    const detailHtml = presenter.detail(item).trim();

    container.innerHTML = `
      <div class="jp-session-bar">
        <div class="jp-session-label">
          <span>Learn</span>
          <span>${idx + 1} / ${items.length}</span>
        </div>
        <div class="jp-session-bar-track">
          <div class="jp-session-bar-fill" style="width:${(idx / items.length) * 100}%"></div>
        </div>
      </div>

      <div class="jp-learn-card">
        <div class="jp-kana-display jp-kana-anim ${kanaSizeClass(presenter.prompt(item))}"
             aria-label="${presenter.answer(item)}">${presenter.prompt(item)}</div>

        <!-- Answer block (romaji/reading + meaning + Listen) -->
        <div class="jp-collapse-block">
          <button class="jp-reveal-btn" id="jp-reveal-answer"
                  aria-expanded="${answerOpen}"
                  aria-controls="jp-answer-body">
            ${answerOpen ? 'Hide answer' : 'Reveal answer'}
          </button>
          <div class="jp-collapse-body ${answerOpen ? 'is-open' : ''}" id="jp-answer-body">
            ${answerHtml}
            ${hasAudio ? `<button class="jp-audio-btn" id="jp-audio-btn" aria-label="Play pronunciation">${speakerSvg} Listen</button>` : ''}
          </div>
        </div>

        <!-- Details block (mnemonic, example, kanji on/kun, grammar note) -->
        ${detailHtml ? `
        <div class="jp-collapse-block">
          <button class="jp-reveal-btn jp-reveal-btn--secondary" id="jp-reveal-details"
                  aria-expanded="${detailsOpen}"
                  aria-controls="jp-details-body">
            ${detailsOpen ? 'Hide details' : 'Show mnemonic & example'}
          </button>
          <div class="jp-collapse-body ${detailsOpen ? 'is-open' : ''}" id="jp-details-body">
            ${detailHtml}
          </div>
        </div>
        ` : ''}

        <div class="jp-card-nav">
          ${idx > 0
            ? `<button class="jp-card-nav-btn" id="jp-prev">← Prev</button>`
            : `<span></span>`}
          <span class="jp-card-counter">${idx + 1} of ${items.length}</span>
          ${!isLast
            ? `<button class="jp-card-nav-btn jp-card-nav-btn--primary" id="jp-next">Next →</button>`
            : `<button class="jp-card-nav-btn${step ? '' : ' jp-card-nav-btn--primary'}" id="jp-done">Done ✓</button>`}
        </div>
        ${step ? `
          <div class="jp-score-actions" style="margin-top:0.75rem">
            <button class="jp-score-btn jp-score-btn--primary" id="jp-launch">${step.label}</button>
          </div>
        ` : ''}
      </div>
    `;

    // Answer toggle
    const answerBtn  = container.querySelector('#jp-reveal-answer');
    const answerBody = container.querySelector('#jp-answer-body');
    answerBtn?.addEventListener('click', () => {
      const open = answerBody.classList.toggle('is-open');
      answerBtn.setAttribute('aria-expanded', open);
      answerBtn.textContent = open ? 'Hide answer' : 'Reveal answer';
    });

    // Details toggle
    const detailsBtn  = container.querySelector('#jp-reveal-details');
    const detailsBody = container.querySelector('#jp-details-body');
    detailsBtn?.addEventListener('click', () => {
      const open = detailsBody.classList.toggle('is-open');
      detailsBtn.setAttribute('aria-expanded', open);
      detailsBtn.textContent = open ? 'Hide details' : 'Show mnemonic & example';
    });

    container.querySelector('#jp-audio-btn')?.addEventListener('click', () => playAudio(item));
    container.querySelector('#jp-prev')?.addEventListener('click', () => { idx--; show(); });
    container.querySelector('#jp-next')?.addEventListener('click', () => { idx++; show(); });
    container.querySelector('#jp-done')?.addEventListener('click', onComplete);
    const launchBtn = container.querySelector('#jp-launch');
    if (launchBtn) {
      launchBtn.addEventListener('click', () => step.run());
      launchBtn.focus();
    }
  }

  show();
}
