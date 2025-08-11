// subcategoryDropdown.js
import { quizMeta } from '../data/quizMeta.js';

function normalizeKey(key) {
  return key.toLowerCase().replace(/\s+/g, '-');
}

export function populateSubcategoryDropdown(containerEl, category) {
  if (!containerEl) return;

  const subcategories = quizMeta.subcategories?.filter(sc => sc.category === category) || [];

  containerEl.innerHTML = '';

  if (subcategories.length === 0) {
    // If no subcategories, optionally show "All" or blank
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.setAttribute('tabindex', '-1');
    li.dataset.value = '';
    li.textContent = 'All';
    containerEl.appendChild(li);
    return;
  }

  subcategories.forEach(sc => {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.setAttribute('tabindex', '-1');
    li.dataset.value = normalizeKey(sc.value);
    li.textContent = sc.label;
    containerEl.appendChild(li);
  });
}
