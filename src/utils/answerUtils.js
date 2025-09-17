export function isAnswerCorrect(userAnswer, correctAnswer) {
    // Handle null/undefined
    if (userAnswer == null || correctAnswer == null) return false;

    // Handle arrays (multi-select)
    if (Array.isArray(userAnswer) && Array.isArray(correctAnswer)) {
        if (userAnswer.length !== correctAnswer.length) return false;
        const normUser = userAnswer.map(a => String(a).trim().toLowerCase()).sort();
        const normCorrect = correctAnswer.map(a => String(a).trim().toLowerCase()).sort();
        return normUser.every((val, idx) => val === normCorrect[idx]);
    }

    // Handle numbers
    if (!isNaN(userAnswer) && !isNaN(correctAnswer)) {
        return Number(userAnswer) === Number(correctAnswer);
    }

    // Default: string comparison, case-insensitive, trimmed
    return String(userAnswer).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase();
}