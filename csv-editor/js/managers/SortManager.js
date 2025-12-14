// ============================================
// SortManager - Handles sort controls and logic
// ============================================

import { SORT_DIR, TOAST_TYPE } from '../constants.js';
import { createIndicator, createRemoveButton, populateColumnOptions, showToast } from '../utils.js';

export class SortManager {
    constructor(editor) {
        this.editor = editor;
    }

    // State accessors (state lives in editor)
    get sortColumns() { return this.editor.sortColumns; }
    set sortColumns(val) { this.editor.sortColumns = val; }

    createSelect(level, showRemove = false) {
        const wrapper = document.createElement('div');
        wrapper.className = 'sort-select-wrapper';

        if (level > 0) {
            wrapper.appendChild(createIndicator('sort-level-indicator', '→'));
        }

        const colSelect = document.createElement('select');
        colSelect.className = 'sort-column-select';
        colSelect.dataset.level = level;
        populateColumnOptions(colSelect, this.editor.headers, level === 0 ? 'No sorting' : 'Then by...');
        wrapper.appendChild(colSelect);

        const dirSelect = document.createElement('select');
        dirSelect.className = 'sort-direction-select';
        dirSelect.dataset.level = level;
        dirSelect.innerHTML = `
            <option value="${SORT_DIR.ASC}">Asc</option>
            <option value="${SORT_DIR.DESC}">Desc</option>
        `;
        wrapper.appendChild(dirSelect);

        if (showRemove) {
            wrapper.appendChild(createRemoveButton('remove-sort', 'Remove this sort level'));
        }

        return wrapper;
    }

    addLevel() {
        const container = this.editor.sortSelectsContainer;
        const colSelects = container.querySelectorAll('.sort-column-select');
        const lastSelect = colSelects[colSelects.length - 1];

        if (!lastSelect.value) {
            showToast('Select a column to sort by first', TOAST_TYPE.ERROR);
            return;
        }

        const newLevel = colSelects.length;
        const newWrapper = this.createSelect(newLevel, true);
        container.appendChild(newWrapper);
    }

    update() {
        const container = this.editor.sortSelectsContainer;
        const wrappers = container.querySelectorAll('.sort-select-wrapper');
        this.sortColumns = [];

        wrappers.forEach(wrapper => {
            const colSelect = wrapper.querySelector('.sort-column-select');
            const dirSelect = wrapper.querySelector('.sort-direction-select');
            if (colSelect.value !== '') {
                this.sortColumns.push({
                    column: colSelect.value,
                    direction: dirSelect.value
                });
            }
        });

        this.editor.renderTable();
        this.updateLevels();
    }

    updateLevels() {
        this.editor.updateSelectLevels({
            container: this.editor.sortSelectsContainer,
            wrapperClass: 'sort-select-wrapper',
            colSelectClass: 'sort-column-select',
            removeClass: 'remove-sort',
            indicatorClass: 'sort-level-indicator',
            extraSelectClass: 'sort-direction-select',
            placeholders: ['No sorting', 'Then by...'],
            removeTitle: 'Remove this sort level',
            type: 'sort'
        });
    }

    syncFromState() {
        const container = this.editor.sortSelectsContainer;
        container.innerHTML = '';

        if (this.sortColumns.length === 0) {
            const wrapper = this.createSelect(0);
            container.appendChild(wrapper);
        } else {
            this.sortColumns.forEach((sortConfig, idx) => {
                const wrapper = this.createSelect(idx, idx > 0);
                const colSelect = wrapper.querySelector('.sort-column-select');
                const dirSelect = wrapper.querySelector('.sort-direction-select');
                colSelect.value = sortConfig.column;
                dirSelect.value = sortConfig.direction;
                container.appendChild(wrapper);
            });
        }
    }

    // Called when a sort is removed via click
    handleRemove(wrapper) {
        wrapper.remove();
        const container = this.editor.sortSelectsContainer;
        // If no sorts left, add a fresh empty one
        if (container.children.length === 0) {
            container.appendChild(this.createSelect(0));
        }
        this.update();
        this.updateLevels();
    }
}
