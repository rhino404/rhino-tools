import { applyTagFilter } from '../core/quizLoader.js';
import { state } from '../core/state.js';

/**
 * Render a tag filter UI inside a container.
 * @param {HTMLElement} containerEl - Container element for tags
 * @param {string[]} availableTags - List of all possible tags
 * @param {string[]} selectedTags - Tags initially selected
 */
export function renderTagFilter(containerEl, availableTags, selectedTags = []) {
  if (!containerEl) return;

  // 🚫 Don’t show tags until a category is chosen
  if (!state.currentCategory) {
    containerEl.innerHTML = '';
    containerEl.style.display = 'none';
    return;
  }

  // ✅ Show container when category is set
  containerEl.style.display = 'block';
  containerEl.innerHTML = '';

  const title = document.createElement('div');
  title.className = 'tag-filter-title';
  title.textContent = "Filter by Tag"; // optional label
  containerEl.appendChild(title);

  const tagList = document.createElement('div');
  tagList.className = 'tag-filter-list';

  availableTags.forEach(tag => {
    const btn = document.createElement('button');
    btn.textContent = tag;
    btn.className = 'tag-filter-btn';
    if (selectedTags.includes(tag)) btn.classList.add('active');

    btn.onclick = () => {
      if (selectedTags.includes(tag)) {
        selectedTags = [];
        Array.from(tagList.children).forEach(b => b.classList.remove('active'));
      } else {
        selectedTags = [tag];
        Array.from(tagList.children).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }

      state.selectedTags = selectedTags;
      applyTagFilter(selectedTags);
    };

    tagList.appendChild(btn);
  });

  containerEl.appendChild(tagList);

  function handleWheel(e) {
    if (window.innerWidth >= 768) return;
    if (e.deltaY !== 0) {
      e.preventDefault();
      tagList.scrollLeft += e.deltaY;
    }
  }

  tagList.addEventListener('wheel', handleWheel, { passive: false });
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) tagList.scrollLeft = 0;
  });
}

