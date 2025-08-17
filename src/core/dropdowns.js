// dropdowns.js

import { quizMeta, getCategoryIcon } from '../data/quizMeta.js';
import { getSubcategoriesForCategory } from '../utils/quizMetaUtils.js';
import { startQuiz } from './quizLoader.js';
import { saveSession } from './sessionManager.js';
import { renderTagFilter } from '../ui/tagFilter.js';

export function closeDropdown(toggleBtn, optionsEl) {
  try {
    toggleBtn.setAttribute('aria-expanded', 'false');
    optionsEl.parentElement.classList.remove('show');
  } catch {}
}

export function populateDropdown(listEl, options, selectedVal) {
  listEl.innerHTML = '';
  options.forEach(opt => {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.dataset.value = opt.value;
    li.innerHTML = `${opt.icon ? `${opt.icon} ` : ''}${opt.label}`;
    if (opt.value === selectedVal) {
      li.classList.add('selected');
    }
    listEl.appendChild(li);
  });
}

export function setupDropdowns(toggleBtn, optionsEl, optionsArray, filterKey, state) {
  populateDropdown(optionsEl, optionsArray, state[filterKey]);

  // Fresh start for category dropdown
  if (filterKey === 'currentCategory' && !state[filterKey]) {
    toggleBtn.innerHTML = `👉 Select Category ▾`;
  }

  // ------------------------
  // Toggle button click
  // ------------------------
  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';

    // Close all other dropdowns before opening this one
    document.querySelectorAll('.dropdown.show').forEach(drop => {
      if (drop !== toggleBtn.parentElement) {
        const otherToggle = drop.querySelector('button');
        const otherOptions = drop.querySelector('ul');
        closeDropdown(otherToggle, otherOptions);
      }
    });

    toggleBtn.setAttribute('aria-expanded', String(!expanded));
    toggleBtn.parentElement.classList.toggle('show', !expanded);
  });


  // ------------------------
  // Dropdown option click
  // ------------------------
  optionsEl.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (e.target.tagName !== 'LI') return;

    const val = e.target.dataset.value;
    closeDropdown(toggleBtn, optionsEl);
    if (val === state[filterKey]) return;

    state[filterKey] = val;

    if (filterKey === 'currentCategory') {
      const icon = getCategoryIcon[val] || '';
      const label = quizMeta.categories.find(o => o.value === val)?.label || '';
      toggleBtn.innerHTML = `${icon} ${label} ▾`;

      // Reset subcategory
      const subcategories = getSubcategoriesForCategory(val);
      const subcatOptions = [
        { label: 'All Subcategories', value: 'all', icon: '🌐' },
        ...subcategories
      ];
      state.currentSubcategory = 'all';
      state.subcategoryToggle.parentElement.style.display = 'block';
      populateDropdown(state.subcategoryOptions, subcatOptions, state.currentSubcategory);
      state.subcategoryToggle.innerHTML = `🌐 All Subcategories ▾`;

      import('../ui/statsTracker.js').then(({ statsTracker }) => {
        statsTracker.setCategory(val);
      });

      // Load questions for category
      const questions = await startQuiz(val, 'all', state);

      // Render tags
      const tagFilterEl = document.getElementById('tag-filter');
      if (tagFilterEl) {
        state.selectedTags = [];
        renderTagFilter(tagFilterEl, [...new Set(questions.flatMap(q => q.tags || []))].sort(), null);
      }

    } else if (filterKey === 'currentSubcategory') {
      const label = optionsEl.querySelector(`li[data-value="${val}"]`)?.textContent || 'Select';
      toggleBtn.textContent = `${label} ▾`;

      // Load questions for subcategory
      const questions = await startQuiz(state.currentCategory, val, state);

      // Render tags
      const tagFilterEl = document.getElementById('tag-filter');
      if (tagFilterEl) {
        state.selectedTags = [];
        renderTagFilter(tagFilterEl, [...new Set(questions.flatMap(q => q.tags || []))].sort(), null);
      }

      try { closeDropdown(toggleBtn, optionsEl); } catch {}
    }

    saveSession(state);
  });

  // ------------------------
  // Click outside closes dropdown
  // ------------------------
  if (!toggleBtn._outsideHandlerAdded) {
    document.addEventListener('click', (e) => {
      if (!toggleBtn.parentElement.contains(e.target)) {
        closeDropdown(toggleBtn, optionsEl);
      }
    });
    toggleBtn._outsideHandlerAdded = true;
  }

  // ------------------------
  // Tag Filter Listener (single attach, future-proof for multi-tag)
  // ------------------------
  const tagFilterEl = document.getElementById('tag-filter');
  if (tagFilterEl && !tagFilterEl._listenerAdded) {
    tagFilterEl.addEventListener('tagsChanged', async (e) => {
      // Always treat detail as an array (future-proof for multi-tag)
      const selectedTags = Array.isArray(e.detail) ? e.detail : [];
      state.selectedTags = selectedTags;

      const currentCategory = state.currentCategory;
      const currentSubcategory = state.currentSubcategory || 'all';

      // Load questions filtered by selected tags
      await startQuiz(currentCategory, currentSubcategory, state, selectedTags);
    });
    tagFilterEl._listenerAdded = true;
  }
}
