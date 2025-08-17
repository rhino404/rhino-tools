/**
 * Render tag filter buttons.
 * @param {HTMLElement} containerEl - The container for the tags.
 * @param {string[]} availableTags - Array of tag strings.
 * @param {string|string[]} selectedTags - Currently selected tag(s). Can be a string (single-select) or array (multi-select).
 * @param {Object} options - Optional settings, e.g., { multiSelect: false }
 */
export function renderTagFilter(containerEl, availableTags, selectedTags = null, options = { multiSelect: false }) {
  if (!containerEl) return;
  containerEl.innerHTML = '';

  if (!availableTags || availableTags.length === 0) {
    containerEl.style.display = 'none';
    return;
  }

  containerEl.style.display = 'flex';

  // Normalize selectedTags for multi/single mode
  let selectedSet = new Set();
  if (options.multiSelect) {
    if (Array.isArray(selectedTags)) selectedSet = new Set(selectedTags);
  } else {
    if (typeof selectedTags === 'string' && selectedTags) selectedSet.add(selectedTags);
  }

  availableTags.forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'tag-filter-btn';
    btn.dataset.value = tag;
    btn.textContent = tag;

    if (selectedSet.has(tag)) btn.classList.add('active');

    btn.addEventListener('click', () => {
      let newSelected = null;

      if (options.multiSelect) {
        // Multi-select logic
        if (btn.classList.contains('active')) {
          btn.classList.remove('active');
          selectedSet.delete(tag);
        } else {
          btn.classList.add('active');
          selectedSet.add(tag);
        }
        newSelected = [...selectedSet];
      } else {
        // Single-select logic
        if (btn.classList.contains('active')) {
          btn.classList.remove('active'); // deselect
          newSelected = null;
        } else {
          containerEl.querySelectorAll('.tag-filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          newSelected = tag;
        }
      }

      containerEl.dispatchEvent(new CustomEvent('tagsChanged', { detail: newSelected }));
    });

    containerEl.appendChild(btn);
  });
}
