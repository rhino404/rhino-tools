// soundMatch.js — Show prompt, pick the matching label from choices.
// cfg.match.choices → 4 (Relaxed/Standard) or 6 (Strict)
// cfg.match.sim     → 'low' (random) | 'group' (same lesson/group) | 'tight' (confusable + more)

import { markResult, markSeen, playAudio, kanaSizeClass, vowelColumn } from '../engine.js';
import { createGameSession, defaultShuffle as shuffle } from './gameSession.js';

function pickDistractors(correct, pool, presenter, sim, count) {
  const correctLabel = presenter.matchLabel(correct);
  const others = pool.filter(it => it.id !== correct.id && presenter.matchLabel(it) !== correctLabel);

  let candidates;
  if (sim === 'low') {
    // Random from the full pool
    candidates = shuffle(others);
  } else if (sim === 'group') {
    // Prefer same group/lesson (current behavior)
    const sameGroup = others.filter(it =>
      (it.group && it.group === correct.group) ||
      (it.lesson && it.lesson === correct.lesson));
    candidates = sameGroup.length >= count ? shuffle(sameGroup) : shuffle(others);
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
    // Confusable first, then same-group, then random fill — shuffled within
    // each tier so repeat plays don't get an identical distractor set.
    candidates = [...new Map(
      [...shuffle(confusable), ...shuffle(same), ...shuffle(others)].map(x => [x.id, x])
    ).values()];
  }

  // Top up from full pool if short; cap at count
  if (candidates.length < count) {
    const ids = new Set(candidates.map(x => x.id));
    const fill = others.filter(x => !ids.has(x.id));
    candidates = [...candidates, ...shuffle(fill)];
  }
  return candidates.slice(0, count);
}

export function renderSoundMatch(container, items, pool, trackId, presenter, audioAvailable, cfg, onComplete, journey) {
  const choiceCount = Math.min(cfg?.match?.choices ?? 4, pool.length);
  const sim         = cfg?.match?.sim ?? 'group';
  const game        = createGameSession(items, { maxItems: 12 });
  // Mode/difficulty switches re-render into this same container; a pending
  // advance timer from this instance must not fire into the new game's DOM.
  const token = container._jpToken = {};

  const speakerSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;

  function next() {
    if (game.isDone) { showScore(); return; }
    showQuestion();
  }

  function showQuestion() {
    const item = game.current;
    const distractors = pickDistractors(item, pool, presenter, sim, choiceCount - 1);
    const choices = shuffle([item, ...distractors]);
    const showAudio = audioAvailable && item.audio;

    // Clamp grid to actual choice count in case pool was small
    const cols = choices.length >= 4 ? 2 : 1;

    container.innerHTML = `
      <div class="jp-session-bar">
        <div class="jp-session-label">
          <span>Match</span>
          <span>${game.index + 1} / ${game.total}</span>
        </div>
        <div class="jp-session-bar-track">
          <div class="jp-session-bar-fill" style="width:${(game.index / game.total) * 100}%"></div>
        </div>
      </div>

      <div class="jp-match-prompt">
        <div class="jp-kana-display jp-kana-anim ${kanaSizeClass(presenter.prompt(item))}"
             aria-label="${presenter.answer(item)}">${presenter.prompt(item)}</div>
        ${showAudio ? `<button class="jp-audio-btn" id="jp-audio-btn" aria-label="Play pronunciation">${speakerSvg} Listen</button>` : ''}
        <div class="jp-match-choices" style="grid-template-columns:repeat(${cols},1fr)">
          ${choices.map(c => `
            <button class="jp-choice-btn" data-id="${c.id}">
              ${presenter.matchLabel(c)}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    container.querySelector('#jp-audio-btn')?.addEventListener('click', () => playAudio(item));
    container.querySelectorAll('.jp-choice-btn').forEach(btn => {
      btn.addEventListener('click', () => handleChoice(btn, item));
    });
  }

  function handleChoice(btn, item) {
    const isCorrect = btn.dataset.id === item.id;
    const { creditMastery, firstTry } = game.answer(isCorrect);

    if (creditMastery)               markResult(trackId, item.id, true);
    else if (firstTry && !isCorrect) markResult(trackId, item.id, false);
    else                             markSeen(trackId, item.id);

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
      next();
    }, isCorrect ? 700 : 1200);
  }

  function showScore() {
    const { correct, total, pct } = game.score;
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
               <button class="jp-score-btn" id="jp-finish">Back</button>`
          }
        </div>
      </div>
    `;
    container.querySelector('#jp-retry')?.addEventListener('click', () => {
      game.restart();
      next();
    });
    container.querySelector('#jp-finish').addEventListener('click', onComplete);
    const launchBtn = container.querySelector('#jp-launch');
    if (launchBtn) {
      launchBtn.addEventListener('click', () => step.run());
      launchBtn.focus();
    }
  }

  next();
}
