import { DATA_SOURCES } from './dataSources.js';

export async function loadQuestions({ level, category, subcategory }) {
  let questions = [];

  // Helper to load one subcategory from a category
  const loadSubcategory = async (sources, key) => {
    if (typeof sources[key] === 'function') {
      const module = await sources[key]();
      return module?.default || [];
    }
    return [];
  };

  // Load all subcategories under a category
  const loadCategorySources = async (categoryKey, subcategoryKey = null) => {
    const sources = DATA_SOURCES[categoryKey];
    if (!sources) return [];

    if (subcategoryKey && subcategoryKey !== 'all' && sources[subcategoryKey]) {
      return await loadSubcategory(sources, subcategoryKey);
    }

    let all = [];
    for (const key in sources) {
      const loaded = await loadSubcategory(sources, key);
      all = all.concat(loaded);
    }
    return all;
  };

  if (!category || category === 'all') {
    // Load from all categories
    for (const catKey in DATA_SOURCES) {
      const loaded = await loadCategorySources(catKey);
      questions = questions.concat(loaded);
    }
  } else {
    const loaded = await loadCategorySources(category, subcategory);
    questions = questions.concat(loaded);
  }

  if (level && level !== 'all') {
    questions = questions.filter(q => q.level.toLowerCase() === level.toLowerCase());
    console.log(`Filtered questions by level "${level}": ${questions.length} remaining`);
  }

  return questions;
}
