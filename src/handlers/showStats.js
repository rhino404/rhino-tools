// showStats.js
import { statsTracker } from '../ui/statsTracker.js';

/**
 * Show the stats panel
 * @param {object} state
 */
export async function showStats(state) {
    try {
        // Always set the category from state (optional)
        statsTracker.setCategory(state?.currentCategory || statsTracker.stats.category);

        // Show the card
        await statsTracker.showCard();
    } catch (err) {
        console.error('[showStats] Error showing stats card:', err);
    }
}
