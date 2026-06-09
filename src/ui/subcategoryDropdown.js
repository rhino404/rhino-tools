// subcategoryDropdown.js
import { getCatalogSync } from '../core/dataProvider.js';
import { state } from '../core/state.js';

function normalizeKey(key) {
  return key.toLowerCase().replace(/\s+/g, '-');
}

// A featured pool refresh shows a cycle badge (e.g. "2026–2030") in the selector.
// Gated live against the `until` date so it self-expires with no rebuild — the
// static homepage badge is presence-based, this runtime one is time-based.
function appendFeaturedBadge(li, featured) {
  if (!featured || !featured.badge) return;
  if (featured.until && new Date(featured.until) < new Date()) return;
  const badge = document.createElement('span');
  badge.className = 'subcat-badge';
  badge.textContent = featured.badge;
  if (featured.headline) badge.title = featured.headline;
  li.appendChild(badge);
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
    appendFeaturedBadge(li, sc.featured);

    li.addEventListener('click', () => {
      // Update state
      state.currentSubcategory = normalizeKey(sc.value);

      // ✅ Refresh buttons immediately
      if (typeof state.syncButtons === 'function') state.syncButtons();
    });

    containerEl.appendChild(li);
  });
}
