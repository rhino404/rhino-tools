// dropdown.js
import { quizMeta } from './quizMeta.js';

// Normalize keys: lowercase and replace spaces with dash
function normalizeKey(key) {
  return key.toLowerCase().replace(/\s+/g, '-');
}

export function populateDropdown(containerEl, type) {
  if (!containerEl) return;

  const options = quizMeta[type] || [];

  containerEl.innerHTML = '';
  options.forEach(opt => {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.setAttribute('tabindex', '-1');
    // Use normalized key for the value to match DATA_SOURCES keys
    li.dataset.value = normalizeKey(opt.value);
    li.textContent = `${opt.label}`;
    containerEl.appendChild(li);
  });
}

export function setupDropdown(toggleEl, containerEl, onSelect) {
  if (!toggleEl || !containerEl) return;

  toggleEl.addEventListener('click', () => {
    const expanded = toggleEl.getAttribute('aria-expanded') === 'true';
    toggleEl.setAttribute('aria-expanded', String(!expanded));
    containerEl.style.display = expanded ? 'none' : 'block';
  });

  containerEl.addEventListener('click', e => {
    const option = e.target.closest('li[role="option"]');
    if (option) {
      const val = option.dataset.value;
      toggleEl.textContent = option.textContent;
      toggleEl.setAttribute('aria-expanded', 'false');
      containerEl.style.display = 'none';
      onSelect(val);
    }
  });

  // Close dropdown on outside click
  document.addEventListener('click', e => {
    if (!toggleEl.contains(e.target) && !containerEl.contains(e.target)) {
      toggleEl.setAttribute('aria-expanded', 'false');
      containerEl.style.display = 'none';
    }
  });
}
