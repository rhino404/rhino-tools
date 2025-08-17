export function renderTagFilter(containerEl, availableTags, selectedTags = null, options = { multiSelect: false }) {
  if (!containerEl) return;

  // ===== Clear previous buttons and reset selection =====
  containerEl.innerHTML = ''; 
  containerEl.style.display = 'flex';

  if (!availableTags || availableTags.length === 0) {
    containerEl.style.display = 'none';
    return;
  }

  // Normalize selection — start fresh for new category
  let selectedSet = new Set();
  if (options.multiSelect) {
    if (Array.isArray(selectedTags)) selectedSet = new Set(selectedTags);
  } else {
    if (typeof selectedTags === 'string' && selectedTags) selectedSet.add(selectedTags);
  }
  // If no selectedTags passed, this creates an empty set => old tags cleared

  availableTags.forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'tag-filter-btn';
    btn.dataset.value = tag;
    btn.textContent = tag;

    if (selectedSet.has(tag)) btn.classList.add('active');

    btn.addEventListener('click', () => {
      let newSelected = [];

      if (options.multiSelect) {
        if (btn.classList.contains('active')) {
          btn.classList.remove('active');
          selectedSet.delete(tag);
        } else {
          btn.classList.add('active');
          selectedSet.add(tag);
        }
        newSelected = [...selectedSet];
      } else {
        if (btn.classList.contains('active')) {
          btn.classList.remove('active');
          newSelected = [];
        } else {
          containerEl.querySelectorAll('.tag-filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          newSelected = [tag];
        }
      }

      containerEl.dispatchEvent(new CustomEvent('tagsChanged', { detail: newSelected }));
    });

    containerEl.appendChild(btn);
  });
}

