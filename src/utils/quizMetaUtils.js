// quizMetaUtils.js
import { getCatalogSync } from '../core/dataProvider.js';

export function getSubcategoriesForCategory(categoryValue) {
  if (!categoryValue) return [];
  return getCatalogSync().subcategories.filter(sc => sc.category === categoryValue);
}
