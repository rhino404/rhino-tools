// =========================
// dropdowns.js
// =========================

import { quizMeta, getCategoryIcon } from '../data/quizMeta.js';
import { getSubcategoriesForCategory } from '../utils/quizMetaUtils.js';
import { startQuiz } from './quizLoader.js';
import { saveSession } from './sessionManager.js';
import { renderTagFilter } from '../ui/questions.js';

export function closeDropdown(toggleBtn, optionsEl) {
    try {
        toggleBtn.setAttribute('aria-expanded', 'false');
        optionsEl.parentElement.classList.remove('show');
    } catch { }
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
    // Populate dropdown initially
    populateDropdown(optionsEl, optionsArray, state[filterKey]);

    // Hide subcategory until a category is selected
    if (filterKey === 'currentSubcategory') {
        toggleBtn.parentElement.style.display = state.currentCategory ? 'block' : 'none';
    }

    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
        toggleBtn.setAttribute('aria-expanded', String(!expanded));
        toggleBtn.parentElement.classList.toggle('show', !expanded);
    });

    optionsEl.addEventListener('click', (e) => {
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

            // Populate subcategory dropdown when category is selected
            const subcategories = getSubcategoriesForCategory(val);
            const subcatOptions = [{ label: 'All Subcategories', value: 'all', icon: '🌐' }, ...subcategories];
            state.currentSubcategory = 'all';
            if (state.subcategoryToggle && state.subcategoryOptions) {
                state.subcategoryToggle.parentElement.style.display = 'block';
                populateDropdown(state.subcategoryOptions, subcatOptions, state.currentSubcategory);
                state.subcategoryToggle.innerHTML = '🌐 All Subcategories ▾';
            }

            import('../ui/statsTracker.js').then(({ statsTracker }) => statsTracker.setCategory(val));

            startQuiz(val, 'all', state).then(() => {
                const tagFilterEl = document.getElementById('tag-filter');
                if (tagFilterEl) {
                    const availableTags = [...new Set(state.questions.flatMap(q => q.tags || []))].sort();
                    state.selectedTags = []; // reset for new category
                    renderTagFilter(tagFilterEl, availableTags, state.selectedTags);

                }
            });
        } else if (filterKey === 'currentSubcategory') {
            const label = optionsEl.querySelector(`li[data-value="${val}"]`)?.textContent || 'Select';
            toggleBtn.textContent = `${label} ▾`;
            startQuiz(state.currentCategory, val, state).then(() => {
                const tagFilterEl = document.getElementById('tag-filter');
                if (tagFilterEl) {
                    const availableTags = [...new Set(state.questions.flatMap(q => q.tags || []))].sort();
                    state.selectedTags = []; // reset for new category
                    renderTagFilter(tagFilterEl, availableTags, state.selectedTags);

                }
            });
        }

        saveSession(state);
    });

    if (!toggleBtn._outsideHandlerAdded) {
        document.addEventListener('click', (e) => {
            if (!toggleBtn.parentElement.contains(e.target)) {
                closeDropdown(toggleBtn, optionsEl);
            }
        });
        toggleBtn._outsideHandlerAdded = true;
    }
}

