// statsTracker.js

const STORAGE_KEY = 'rhinoToolsUserStats';

class StatsTracker {
  constructor() {
    this.stats = {
      totalQuestions: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      topics: {}, // e.g. { python: { correct: 0, incorrect: 0 }, ml: {...} }
    };
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
    this.stats = {
      totalQuestions: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      topics: {},
    };
    this.save();
  }

  logAnswer(question, isCorrect) {
    this.stats.totalQuestions++;
    if (isCorrect) this.stats.correctAnswers++;
    else this.stats.incorrectAnswers++;

    const topicKey = question.subcategory || question.category || 'general';
    if (!this.stats.topics[topicKey]) {
      this.stats.topics[topicKey] = { correct: 0, incorrect: 0 };
    }
    if (isCorrect) this.stats.topics[topicKey].correct++;
    else this.stats.topics[topicKey].incorrect++;

    this.save();
  }

  getStats() {
    const { totalQuestions, correctAnswers, topics } = this.stats;
    const percentCorrect = totalQuestions ? ((correctAnswers / totalQuestions) * 100).toFixed(1) : 0;

    // Calculate weakest topics by accuracy ascending
    const topicsArray = Object.entries(topics).map(([topic, counts]) => {
      const total = counts.correct + counts.incorrect;
      const accuracy = total ? counts.correct / total : 0;
      return { topic, accuracy, total, correct: counts.correct, incorrect: counts.incorrect };
    });

    topicsArray.sort((a, b) => a.accuracy - b.accuracy);

    return {
      totalQuestions,
      correctAnswers,
      percentCorrect,
      weakestTopics: topicsArray.slice(0, 5), // top 5 weakest
    };
  }

  initCard() {
    // Create the card container and add it to the DOM, initially hidden
    this.card = document.createElement('div');
    this.card.id = 'score-card';
    this.card.style.cssText = `
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      max-width: 320px;
      padding: 1rem;
      font-family: Arial, sans-serif;
      color: #222;
      z-index: 2000;
      display: none;
      flex-direction: column;
      gap: 0.5rem;
    `;

    this.card.innerHTML = `
      <h3>Your Quiz Stats</h3>
      <div id="score-summary"></div>
      <ul id="weakest-topics" style="list-style:none; padding-left:0; margin:0;"></ul>
      <button id="close-score-card" style="
        background:#1a755e; 
        border:none; 
        color:white; 
        padding:0.5em 1em; 
        border-radius: 5px;
        cursor:pointer;
        font-weight:bold;
        margin-top: 0.5em;
      ">Dismiss</button>
    `;

    document.body.appendChild(this.card);

    this.card.querySelector('#close-score-card').addEventListener('click', () => this.hideCard());
  }

  renderCard() {
    const stats = this.getStats();
    const summaryEl = this.card.querySelector('#score-summary');
    const weakestEl = this.card.querySelector('#weakest-topics');

    summaryEl.textContent = `You answered ${stats.correctAnswers} out of ${stats.totalQuestions} questions correctly (${stats.percentCorrect}%).`;

    weakestEl.innerHTML = '';
    if (stats.weakestTopics.length) {
      stats.weakestTopics.forEach(({ topic, accuracy, total, incorrect }) => {
        const li = document.createElement('li');
        li.textContent = `${topic}: ${(accuracy * 100).toFixed(1)}% accuracy (${incorrect} wrong out of ${total} questions)`;
        weakestEl.appendChild(li);
      });
    } else {
      weakestEl.textContent = 'No topics to display yet.';
    }
  }

  showCard() {
    this.renderCard();
    this.card.style.display = 'flex';
  }

  hideCard() {
    this.card.style.display = 'none';
  }
}

export const statsTracker = new StatsTracker();
