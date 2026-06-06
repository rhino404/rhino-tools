import { state } from './state.js';
import { fetchAllQuestions, shuffleArray, showQuestion } from './quizLoader.js';
import { getExamDefinition } from './dataProvider.js';
import { createComplexModal } from '../ui/modal.js';
import { isAnswerCorrect } from '../utils/answerUtils.js';
import { showAnswerFeedback } from '../ui/questions.js';

let isProcessingAnswer = false;
let advanceTimeout = null;

function restorePreExamState() {
    if (!state._preExamState) return;
    Object.assign(state, state._preExamState);
    delete state._preExamState;
}

// --- Progress Bar ---
function showProgressBar() {
    const container = document.getElementById('exam-progress-container');
    if (container) container.style.display = 'block';
    updateProgressBar();
}
function updateProgressBar() {
    if (!state.examMode || !state.exam) return;
    const answered = Object.keys(state.exam.answers).length;
    const total = state.exam.questions.length;
    const pct = total > 0 ? (answered / total) * 100 : 0;
    const bar = document.getElementById('exam-progress-bar');
    const label = document.getElementById('exam-progress-label');
    if (bar) bar.style.width = `${pct}%`;
    if (label) label.textContent = `${answered} / ${total}`;
}

// --- Exam Question Builder ---
function buildExamQuestions(allQuestions, distribution, totalQuestions) {
    let examQuestions = [];
    if (distribution) {
        for (const [topicLabel, count] of Object.entries(distribution)) {
            const pool = shuffleArray(allQuestions.filter(q => q.topic_label === topicLabel));
            examQuestions.push(...pool.slice(0, count));
        }
    } else {
        examQuestions = shuffleArray(allQuestions).slice(0, totalQuestions);
    }
    // Always assign a unique id for this exam session
    return examQuestions.map((q, index) => ({
        ...q,
        id: `exam-q-${index}`,
        examTopicLabel: `exam-${index}`
    }));
}

// --- Exam Start ---
export async function startExam(category, subcategory) {
    // Validate selection
    if (!state.currentCategory || !state.currentSubcategory) {
        alert('Please select a category and subcategory before starting an exam.');
        return;
    }

    // Fetch questions
    let allQuestions;
    try {
        allQuestions = await fetchAllQuestions(state.currentCategory, state.currentSubcategory);
    } catch (err) {
        console.error('[ExamManager] Failed to fetch questions:', err);
        alert('Failed to load questions. Please try again.');
        return;
    }

    // Load exam definition
    const subcategoryDef = await getExamDefinition(state.currentCategory, state.currentSubcategory);
    if (!subcategoryDef) {
        alert('Exam mode is not available for this section.');
        return;
    }

    // Build questions and topic performance
    const { totalQuestions, passingScore, distribution } = subcategoryDef;
    const finalExamQuestions = buildExamQuestions(allQuestions, distribution, totalQuestions);
    const topicPerformance = {};
    finalExamQuestions.forEach(q => {
        const label = q.examTopicLabel;
        if (!topicPerformance[label]) topicPerformance[label] = { correct: 0, wrong: 0 };
    });

    // Save pre-exam state
    state._preExamState = {
        questions: state.questions,
        currentIndex: state.currentIndex,
        showingAnswers: state.showingAnswers,
        hideAnswers: state.hideAnswers,
        currentCategory: state.currentCategory,
        currentSubcategory: state.currentSubcategory,
    };

    // Set up exam state
    state.examMode = true;
    state.exam = {
        questions: finalExamQuestions,
        answers: {},
        topicPerformance,
        passingScore: passingScore || 0,
    };
    state.questions = finalExamQuestions;
    state.currentIndex = 0;
    state.uiElements = {
        questionEl: document.getElementById('question'),
        choicesEl: document.getElementById('choices'),
        explanationEl: document.getElementById('explanation')
    };

    // Render first question
    showQuestion(0, state.questions, state.uiElements, state);
    bindChoiceEvents();
    showProgressBar();
    if (state.syncButtons) state.syncButtons();
    console.log(`[Exam] Started with ${finalExamQuestions.length} questions.`);
}

// --- Choice Event Binding (delegated) ---
export function bindChoiceEvents() {
    if (!state.choicesEl) return;
    state.choicesEl.onclick = (e) => {
        const btn = e.target.closest('button.choice-btn');
        if (!btn || btn.disabled || isProcessingAnswer) return;
        const qid = String(btn.dataset.questionId ?? btn.dataset.questionid ?? '');
        const value = btn.dataset.value;
        if (!qid) {
            console.warn('[Exam] Choice button missing data-question-id');
            return;
        }
        btn.classList.add('selected');
        recordExamAnswer(qid, value);
    };
}

// --- Answer Recording ---
export function recordExamAnswer(questionId, userAnswer) {
    if (isProcessingAnswer || !state.examMode || !state.exam) return;
    const questionIndex = state.exam.questions.findIndex(q => String(q.id) === String(questionId));
    const question = questionIndex >= 0 ? state.exam.questions[questionIndex] : null;
    if (!question) {
        console.warn('[Exam] Question not found for id:', questionId);
        isProcessingAnswer = false;
        return;
    }
    const canonicalId = String(question.id);
    isProcessingAnswer = true;
    if (advanceTimeout) {
        clearTimeout(advanceTimeout);
        advanceTimeout = null;
    }
    // Disable all choice buttons and add selected class
    const buttons = state.choicesEl?.querySelectorAll('button.choice-btn');
    buttons?.forEach(btn => {
        btn.disabled = true;
        btn.classList.add('disabled');
        if (String(btn.dataset.value) === String(userAnswer)) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
        btn.style.pointerEvents = 'none';
    });
    const correctValue = question.correct;
    const isCorrect = isAnswerCorrect(userAnswer, correctValue);
    let transitionTime = 1000;
    if (state.uiElements && state.uiElements.explanationEl) {
        transitionTime = showAnswerFeedback(isCorrect, question, state.uiElements.explanationEl, state);
    }

    // Store answer under canonicalId
    state.exam.answers[canonicalId] = {
        answer: userAnswer,
        isCorrect,
        timestamp: Date.now(),
        topicLabel: question.examTopicLabel || question.topic_label || 'unknown'
    };
    // Update topic performance
    const topicLabel = question.examTopicLabel || question.topic_label || 'unknown';
    if (!state.exam.topicPerformance[topicLabel]) {
        state.exam.topicPerformance[topicLabel] = { correct: 0, wrong: 0, total: 0 };
    }
    state.exam.topicPerformance[topicLabel][isCorrect ? 'correct' : 'wrong']++;
    state.exam.topicPerformance[topicLabel].total = (state.exam.topicPerformance[topicLabel].total || 0) + 1;

    updateProgressBar();
    // Advance to next question or end exam
    advanceTimeout = setTimeout(() => {
        advanceTimeout = null;
        try {
            if (questionIndex >= 0 && questionIndex < state.exam.questions.length - 1) {
                if (state.uiElements && state.uiElements.explanationEl) {
                    state.uiElements.explanationEl.textContent = '';
                }
                showQuestion(questionIndex + 1, state.exam.questions, state.uiElements, state);
                bindChoiceEvents();
            } else {
                const answeredCount = Object.keys(state.exam.answers).length;
                if (answeredCount >= state.exam.questions.length) {
                    endExam();
                }
            }
        } catch (err) {
            console.error('[Exam] Error advancing:', err);
        }
        isProcessingAnswer = false;
    }, transitionTime);
}

// --- Exam Results ---
function processResults(examData, passingScore) {
    const totalQuestions = examData.length;
    const correctAnswers = examData.filter(r => r.isCorrect).length;
    const incorrectAnswers = totalQuestions - correctAnswers;
    const scorePercentage = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
    const passed = correctAnswers >= (passingScore || 0);
    const topicStats = {};
    examData.forEach(result => {
        const label = result.question.topic_label || result.question.examTopicLabel;
        if (!topicStats[label]) topicStats[label] = { correct: 0, total: 0 };
        topicStats[label].total++;
        if (result.isCorrect) topicStats[label].correct++;
    });
    return { totalQuestions, correctAnswers, incorrectAnswers, scorePercentage, passed, topicStats };
}
function renderTopicBreakdown(topicStats) {
    return Object.entries(topicStats)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([topic, data]) => {
            const percentage = (data.correct / data.total * 100).toFixed(0);
            let barClass = 'progress-bar-';
            if (percentage >= 80) barClass += 'high';
            else if (percentage >= 50) barClass += 'medium';
            else barClass += 'low';
            return `
                <div class="topic-progress">
                    <div class="topic-label">
                        <span>${topic}</span>
                        <span>${data.correct}/${data.total}</span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fg ${barClass}" 
                             style="width: ${percentage}%;">
                        </div>
                    </div>
                </div>
            `;
        }).join('');
}
function show(examData, passingScore) {
    const stats = processResults(examData, passingScore);
    const subcategoryName = examData[0]?.question.subcategory || '';
    const modal = createComplexModal({
        title: `Exam Results: ${subcategoryName}`,
        contentHTML: `
            <div class="result-overview ${stats.passed ? 'pass' : 'fail'}">
                <div class="result-status">${stats.passed ? 'PASS' : 'FAIL'}</div>
                <div class="result-score">${(stats.scorePercentage * 100).toFixed(0)}%</div>
            </div>
            <div class="result-counts">
                <span>Correct: <strong>${stats.correctAnswers}</strong></span>
                <span>Incorrect: <strong>${stats.incorrectAnswers}</strong></span>
            </div>
            <div id="exam-topic-breakdown">
                ${renderTopicBreakdown(stats.topicStats)}
            </div>
        `
    });
    modal.show();
}
export const examResults = { show };


// --- Cancel Exam ---
export function cancelExam() {
    if (!state.examMode) return;
    state.examMode = false;
    state.exam = null;
    if (state.choicesEl) state.choicesEl.onclick = null;
    if (state._preExamState) restorePreExamState();
    const container = document.getElementById('exam-progress-container');
    if (container) container.style.display = 'none';
    if (state.syncButtons) state.syncButtons();
}

// --- Exam End ---
export function endExam() {
    if (!state.examMode || !state.exam) return;
    const { questions } = state.exam;
    const answers = state.exam.answers || {};
    // Build resultsData using canonical question.id keys
    const resultsData = questions.map(q => {
        const key = String(q.id);
        const stored = answers[key];
        return {
            question: q,
            userAnswer: stored ? stored.answer : undefined,
            isCorrect: stored ? stored.isCorrect : false
        };
    });
    examResults.show(resultsData, state.exam.passingScore);
    state.examMode = false;
    state.exam = null;
    if (state.choicesEl) state.choicesEl.onclick = null;
    if (state._preExamState) restorePreExamState();
    const container = document.getElementById('exam-progress-container');
    if (container) container.style.display = 'none';
    if (state.syncButtons) state.syncButtons();

    // Move to next question in study mode if possible ---
    if (state.questions?.length && typeof state.currentIndex === 'number') {
        // If we were on the last question, move to the next (wrap if needed)
        let nextIndex = state.currentIndex + 1;
        if (nextIndex >= state.questions.length) nextIndex = 0;
        state.currentIndex = nextIndex;
        const { questionEl, choicesEl, explanationEl } = state.uiElements || {};
        if (questionEl && choicesEl && explanationEl) {
            import('./quizLoader.js').then(({ showQuestion }) => {
                showQuestion(state.currentIndex, state.questions, {
                    questionEl,
                    choicesEl,
                    explanationEl,
                    showingAnswers: state.showingAnswers,
                    hideAnswers: state.hideAnswers
                }, state);
                state.uiElements.explanationEl.textContent = ''; // <-- Cleared before advancing
            });
        }
    }
}
