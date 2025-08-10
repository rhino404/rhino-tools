import { getCategoryIcon } from './quizMeta.js';

const STORAGE_KEY = 'rhinoToolsUserStats';
const TOTALS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

class StatsTracker {
    constructor() {
        this.stats = {
            totalQuestions: 0,
            correctAnswers: 0,
            incorrectAnswers: 0,
            currentStreak: 0,
            bestStreak: 0,
            previousAccuracy: null,
            last7Days: {},
            topics: {},
            category: null,
        };

        // simple in-memory cache: { [category]: { ts: Date.now(), totals: { subcat: count } } }
        this._totalsCache = {};

        this.load();
        this.initCard();
    }

    load() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                this.stats = JSON.parse(saved);
            } catch {
                this.reset();
            }
        }
    }

    save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.stats));
    }

    reset() {
        // preserve the selected category so the UI doesn't demand re-selection after clearing
        const preservedCategory = this.stats && this.stats.category ? this.stats.category : null;

        this.stats = {
            totalQuestions: 0,
            correctAnswers: 0,
            incorrectAnswers: 0,
            currentStreak: 0,
            bestStreak: 0,
            previousAccuracy: null,
            last7Days: {},
            topics: {},
            category: null,
        };

        if (preservedCategory) {
            this.stats.category = preservedCategory;
        }

        this.save();
    }

    /**
     * Store currently-selected quiz category (value, e.g. "ham-radio")
     */
    setCategory(category) {
        this.stats.category = category;
        this.save();
    }

    logAnswer(question, isCorrect) {
        const { stats } = this;

        stats.totalQuestions++;
        if (isCorrect) {
            stats.correctAnswers++;
            stats.currentStreak++;
            stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
        } else {
            stats.incorrectAnswers++;
            stats.currentStreak = 0;
        }

        // Track by topic_id
        const key = question.topic_id || (question.topic_label ? `${question.topic_label}` : 'unknown');
        if (!stats.topics[key]) {
            stats.topics[key] = {
                correct: 0,
                incorrect: 0,
                topic: question.topic || '',
                topic_label: question.topic_label || '',
                topic_id: question.topic_id || key,
                subcategory: question.subcategory || 'Uncategorized',
                category: question.category || this.stats.category || 'unknown',
                total_topic_questions: question.total_topic_questions || 0,
                total_subcategory_questions: question.total_subcategory_questions || 0,
            };
        }
        if (isCorrect) stats.topics[key].correct++;
        else stats.topics[key].incorrect++;

        // Track daily
        const today = new Date().toISOString().split('T')[0];
        if (!stats.last7Days[today]) {
            stats.last7Days[today] = { correct: 0, incorrect: 0 };
        }
        if (isCorrect) stats.last7Days[today].correct++;
        else stats.last7Days[today].incorrect++;

        // Clean up older entries beyond 7 days
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 6);
        for (const date in stats.last7Days) {
            if (new Date(date) < cutoff) delete stats.last7Days[date];
        }

        // maintain topic-level previous accuracy tracking
        if (stats.topics[key].accuracy !== undefined) {
            stats.topics[key].previousAccuracy = stats.topics[key].accuracy;
        }
        const total = stats.topics[key].correct + stats.topics[key].incorrect;
        stats.topics[key].accuracy = total ? stats.topics[key].correct / total : 0;

        this.save();
    }

    async fetchSubcategoryTotals(category) {
        if (!category) return {};

        const cache = this._totalsCache[category];
        const now = Date.now();
        if (cache && (now - cache.ts) < TOTALS_CACHE_TTL) {
            return cache.totals;
        }

        try {
            const mod = await import('./dataSources.js');
            const DATA_SOURCES = mod.DATA_SOURCES;
            const subData = DATA_SOURCES?.[category];
            if (!subData || typeof subData !== 'object') {
                this._totalsCache[category] = { ts: now, totals: {} };
                return {};
            }

            const totals = {};
            const tasks = Object.entries(subData).map(async ([subKey, fileRef]) => {
                let urls = [];
                if (Array.isArray(fileRef)) urls = fileRef;
                else if (typeof fileRef === 'string') urls = [fileRef];
                else urls = [];

                let cnt = 0;
                for (const url of urls) {
                    try {
                        const res = await fetch(url);
                        if (!res.ok) continue;
                        const data = await res.json();
                        if (Array.isArray(data)) cnt += data.length;
                        else if (Array.isArray(data.questions)) cnt += data.questions.length;
                    } catch (err) {
                        console.warn(`[statsTracker] Failed to fetch ${url}:`, err && err.message ? err.message : err);
                    }
                }
                totals[subKey] = cnt;
            });

            await Promise.all(tasks);
            this._totalsCache[category] = { ts: now, totals };
            return totals;
        } catch (err) {
            console.warn('[statsTracker] fetchSubcategoryTotals failed:', err && err.message ? err.message : err);
            this._totalsCache[category] = { ts: now, totals: {} };
            return {};
        }
    }

    getStats() {
        const { totalQuestions, correctAnswers, topics, last7Days, currentStreak, bestStreak } = this.stats;
        const percentCorrect = totalQuestions ? ((correctAnswers / totalQuestions) * 100).toFixed(1) : 0;

        const groupedTopics = {};

        Object.entries(topics || {}).forEach(([key, data]) => {
            if (!data.subcategory || !data.topic) return;

            const total = (data.correct || 0) + (data.incorrect || 0);
            const accuracy = total ? (data.correct / total) : 0;

            if (!groupedTopics[data.subcategory]) groupedTopics[data.subcategory] = [];

            groupedTopics[data.subcategory].push({
                ...data,
                total,
                accuracy,
            });
        });

        Object.values(groupedTopics).forEach(arr => arr.sort((a, b) => b.total - a.total));

        return {
            totalQuestions,
            correctAnswers,
            percentCorrect,
            currentStreak,
            bestStreak,
            last7Days,
            groupedTopics,
        };
    }

    initCard() {
        this.card = document.createElement('div');
        this.card.id = 'score-card';
        this.card.className = 'score-card hidden';
        this.card.innerHTML = `
        <h3 id="score-card-title">Your Stats</h3>
        <div id="score-summary"></div>
        <div id="streak-summary"></div>
        <div class="score-scroll">
        <div id="topic-breakdown"></div>
        <ul id="activity-summary" class="score-list"></ul>
        </div>
        <div class="score-card-buttons">
            <button id="close-score-card" class="score-close">Dismiss</button>
            <button id="clear-score-card" class="score-clear">Clear Stats</button>
        </div>
    `;

        document.body.appendChild(this.card);

        this.card.querySelector('#close-score-card')
            .addEventListener('click', () => this.hideCard());

        // When clearing stats we want the card to disappear completely (not show default state)
        this.card.querySelector('#clear-score-card')
            .addEventListener('click', () => {
                showConfirm('Clear all stats? This cannot be undone.', () => {
                    this.reset();
                    // remove the card from DOM so it does not display a default/empty state
                    this.removeCard();
                });
            });
    }

    // Remove the existing card from the DOM and clear the reference so it can be recreated later
    removeCard() {
        try {
            if (this.card && this.card.parentElement) {
                this.card.parentElement.removeChild(this.card);
            }
        } catch (e) {
            // ignore removal errors
        }
        this.card = null;
    }

    async renderCard() {
        const stats = this.getStats();
        const titleEl = this.card.querySelector('#score-card-title');
        const summaryEl = this.card.querySelector('#score-summary');
        const streakEl = this.card.querySelector('#streak-summary');
        const topicEl = this.card.querySelector('#topic-breakdown');
        const activityEl = this.card.querySelector('#activity-summary');

        const displayCategory = this.stats.category || 'Default';
        const formattedCategory = displayCategory.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const icon = getCategoryIcon[this.stats.category || ''];
        titleEl.textContent = `📊: ${formattedCategory} ${icon}`;

        summaryEl.textContent = `Correct: ${stats.correctAnswers}/${stats.totalQuestions} (${stats.percentCorrect}%)`;
        streakEl.textContent = `Streak: 🔥 ${stats.currentStreak}  | Best: 🏆 ${stats.bestStreak}`;

        const totalsMap = await this.fetchSubcategoryTotals(this.stats.category);

        topicEl.innerHTML = '';

        const grouped = stats.groupedTopics || {};
        for (const [subcategory, topicList] of Object.entries(grouped)) {
            let totalAvailable = 0;
            if (totalsMap && Object.keys(totalsMap).length) {
                const direct = totalsMap[subcategory];
                if (typeof direct === 'number') totalAvailable = direct;
                else {
                    const foundKey = Object.keys(totalsMap).find(k => k.toLowerCase() === subcategory.toLowerCase());
                    if (foundKey) totalAvailable = totalsMap[foundKey];
                }
            }

            if (!totalAvailable) {
                totalAvailable = Math.max(...topicList.map(t => t.total_topic_questions || 0), 0);
            }

            const totalAnswered = topicList.reduce((s, t) => s + (t.total || 0), 0);
            const progressPct = totalAvailable ? Math.round((totalAnswered / totalAvailable) * 100) : 0;

            topicEl.innerHTML += `
        <div class="subcategory-header">
          <strong>${subcategory}</strong>
          <div class="progress-info">Progress: ${totalAnswered} of ${totalAvailable} (${progressPct}%)</div>
          <div class="progress-bar"><div class="progress-fill" style="width:${progressPct}%"></div></div>
        </div>
        <ul class="score-list">
      `;

            const answeredTopics = topicList.filter(t => (t.total || 0) > 0);
            let strongest = null, weakest = null;
            if (answeredTopics.length) {
                strongest = answeredTopics.reduce((a, b) => (a.accuracy > b.accuracy ? a : b));
                weakest = answeredTopics.reduce((a, b) => (a.accuracy < b.accuracy ? a : b));
            }

            for (const t of topicList) {
                let trend = '➖';
                if (typeof t.previousAccuracy === 'number') {
                    if (t.accuracy > t.previousAccuracy) trend = '📈';
                    else if (t.accuracy < t.previousAccuracy) trend = '📉';
                } else {
                    if (strongest && t.topic_id === strongest.topic_id) trend = '📈';
                    else if (weakest && t.topic_id === weakest.topic_id) trend = '📉';
                }

                topicEl.innerHTML += `
          <li class="topic-row">
            <span class="topic-left">${trend} <strong>${t.topic_id}</strong></span>
            <span class="topic-right">${(t.accuracy * 100).toFixed(1)}% (${t.total || 0})</span>
            <div class="topic-desc">${t.topic}</div>
          </li>
        `;
            }

            topicEl.innerHTML += '</ul><div style="height:0.5rem"></div>';
        }

        activityEl.innerHTML = '<li><strong>Last 7 Days</strong></li>';
        Object.entries(stats.last7Days || {}).forEach(([date, counts]) => {
            const total = (counts.correct || 0) + (counts.incorrect || 0);
            const pct = total ? Math.round(((counts.correct || 0) / total) * 100) : 0;
            activityEl.innerHTML += `<li>${date}: ${counts.correct || 0}/${total} correct (${pct}%)</li>`;
        });
    }

    async showCard() {
        if (!this.stats.category) {
            showMessage('Please choose a category first to view your stats.');
            return;
        }
        // if the card was removed by a previous clear action, recreate it
        if (!this.card) {
            this.initCard();
        }
        await this.renderCard();
        this.card.classList.remove('hidden');
    }

    hideCard() {
        this.card.classList.add('hidden');
    }
}

// Shared modal builder
function showModal({ message, confirmText = 'OK', cancelText = null, onConfirm = null }) {
  const modal = document.createElement('div');
  modal.className = 'custom-modal-overlay';

  let buttonsHTML = `<button class="modal-confirm">${confirmText}</button>`;
  if (cancelText) {
    buttonsHTML += `<button class="modal-cancel">${cancelText}</button>`;
  }

  modal.innerHTML = `
    <div class="custom-modal">
      <p>${message}</p>
      <div class="modal-buttons">
        ${buttonsHTML}
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('.modal-confirm').addEventListener('click', () => {
    if (onConfirm) onConfirm();
    modal.remove();
  });

  if (cancelText) {
    modal.querySelector('.modal-cancel').addEventListener('click', () => modal.remove());
  }
}

function showMessage(message) {
  showModal({ message });
}

function showConfirm(message, onConfirm) {
  showModal({ message, confirmText: 'Yes', cancelText: 'Cancel', onConfirm });
}

export const statsTracker = new StatsTracker();
