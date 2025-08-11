//quizMetaUtils.js

import { quizMeta } from '../data/quizMeta.js';

export function getSubcategoriesForCategory(categoryValue) {
  if (!categoryValue) return [];

  // Return only subcategories matching the category field
  return quizMeta.subcategories.filter(subcat => subcat.category === categoryValue);
}
