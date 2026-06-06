// subcategoryDropdown.js
import { getCatalogSync } from '../core/dataProvider.js';
import { state } from '../core/state.js';

function normalizeKey(key) {
  return key.toLowerCase().replace(/\s+/g, '-');
}

export function populateSubcategoryDropdown(containerEl, category) {
  if (!containerEl) return;

  const subcategories = getCatalogSync().subcategories.filter(sc => sc.category === category);
  containerEl.innerHTML = '';

  if (subcategories.length === 0) {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.setAttribute('tabindex', '-1');
    li.dataset.value = '';
    li.textContent = 'All';

    li.addEventListener('click', () => {
      state.currentSubcategory = 'all';

      // ✅ Refresh buttons immediately
      if (typeof state.syncButtons === 'function') state.syncButtons();
    });

    containerEl.appendChild(li);
    return;
  }

  subcategories.forEach(sc => {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.setAttribute('tabindex', '-1');
    li.dataset.value = normalizeKey(sc.value);
    li.textContent = sc.label;

    li.addEventListener('click', () => {
      // Update state
      state.currentSubcategory = normalizeKey(sc.value);

      // ✅ Refresh buttons immediately
      if (typeof state.syncButtons === 'function') state.syncButtons();
    });

    containerEl.appendChild(li);
  });
}
