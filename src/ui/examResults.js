import { createComplexModal } from './modal.js';

function processResults(examData) {
    if (!examData?.questions || !examData?.answers) {
        console.error('[Results] Invalid exam data:', examData);
        return null;
    }

    const results = {
        totalQuestions: examData.questions.length,
        correctAnswers: 0,
        incorrectAnswers: 0,
        scorePercentage: 0,
        topicStats: {}
    };

    // Process each question and its answer
    examData.questions.forEach(question => {
        const answer = examData.answers[question.id];
        if (!answer) return;

        const topicLabel = question.examTopicLabel || question.topic_label;
        
        if (!results.topicStats[topicLabel]) {
            results.topicStats[topicLabel] = {
                correct: 0,
                total: 0
            };
        }

        results.topicStats[topicLabel].total++;
        
        if (answer.isCorrect) {
            results.correctAnswers++;
            results.topicStats[topicLabel].correct++;
        } else {
            results.incorrectAnswers++;
        }
    });

    results.scorePercentage = (results.correctAnswers / results.totalQuestions) * 100;
    results.passed = results.correctAnswers >= (examData.passingScore || 0);

    return results;
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

/**
 * Public method to show the results modal.
 * @param {Array} examData The raw data from the completed exam.
 * @param {number} passingScore The number of correct answers needed to pass.
 */
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

export const examResults = {
    show
};