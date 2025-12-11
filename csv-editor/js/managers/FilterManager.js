// ============================================
// FilterManager - Handles filter controls and logic
// ============================================
class FilterManager {
    constructor(editor) {
        this.editor = editor;
    }

    // State accessors (state lives in editor)
    get filters() { return this.editor.filters; }
    set filters(val) { this.editor.filters = val; }
    get filterLogic() { return this.editor.filterLogic; }
    set filterLogic(val) { this.editor.filterLogic = val; }
    get filterAsHighlight() { return this.editor.filterAsHighlight; }
    set filterAsHighlight(val) { this.editor.filterAsHighlight = val; }

    createSelect(level, showRemove = false) {
        const wrapper = document.createElement('div');
        wrapper.className = 'filter-select-wrapper';

        if (level > 0) {
            wrapper.appendChild(this.editor.createLogicToggle('filter'));
        }

        const colSelect = document.createElement('select');
        colSelect.className = 'filter-column-select';
        colSelect.dataset.level = level;
        populateColumnOptions(colSelect, this.editor.headers, level === 0 ? 'No filter' : 'Select column');
        wrapper.appendChild(colSelect);

        const valueSelect = document.createElement('select');
        valueSelect.className = 'filter-value-select';
        valueSelect.dataset.level = level;
        valueSelect.innerHTML = `<option value="${FILTER_VALUES.PLACEHOLDER}">Select value...</option>`;
        valueSelect.disabled = true;
        wrapper.appendChild(valueSelect);

        // Add count badge (hidden by default, shown when filter is active)
        const countBadge = document.createElement('span');
        countBadge.className = 'filter-count-badge';
        countBadge.dataset.level = level;
        countBadge.style.display = 'none';
        wrapper.appendChild(countBadge);

        // Add remove button for non-first filters (first filter gets it when complete)
        if (level > 0) {
            wrapper.appendChild(createRemoveButton('remove-filter', 'Remove this filter'));
        }

        return wrapper;
    }

    populateValueSelect(colSelect) {
        const wrapper = colSelect.closest('.filter-select-wrapper');
        const valueSelect = wrapper.querySelector('.filter-value-select');
        const colIdx = colSelect.value;

        valueSelect.innerHTML = `<option value="${FILTER_VALUES.PLACEHOLDER}">Select value...</option>`;

        if (colIdx === '') {
            valueSelect.disabled = true;
            return;
        }

        // Get unique values from this column
        const uniqueValues = new Set();
        let hasEmpty = false;
        this.editor.currentData.forEach(row => {
            const val = row[colIdx];
            if (isEmpty(val)) {
                hasEmpty = true;
            } else {
                uniqueValues.add(val);
            }
        });

        // Sort values based on column type
        const colIdxNum = parseInt(colIdx);
        const isNumeric = this.editor.numericColumnsCache && this.editor.numericColumnsCache.has(colIdxNum);
        const isTimestamp = this.editor.timestampColumnsCache && this.editor.timestampColumnsCache.has(colIdxNum);

        const sortedValues = Array.from(uniqueValues).sort((a, b) => {
            if (isNumeric) {
                return Number(a) - Number(b);
            } else if (isTimestamp) {
                const dateA = this.editor.parseTimestamp(a);
                const dateB = this.editor.parseTimestamp(b);
                if (dateA && dateB) {
                    return dateA.getTime() - dateB.getTime();
                }
            }
            return String(a).localeCompare(String(b));
        });

        // Add empty option first if there are empty values
        if (hasEmpty) {
            const emptyOption = document.createElement('option');
            emptyOption.value = FILTER_VALUES.EMPTY;
            emptyOption.textContent = '(empty)';
            valueSelect.appendChild(emptyOption);
        }

        sortedValues.forEach(val => {
            const option = document.createElement('option');
            option.value = val;
            option.textContent = val;
            valueSelect.appendChild(option);
        });

        valueSelect.disabled = false;
    }

    addLevel() {
        const container = this.editor.filterSelectsContainer;
        const colSelects = container.querySelectorAll('.filter-column-select');
        const lastWrapper = colSelects[colSelects.length - 1].closest('.filter-select-wrapper');
        const lastSelect = lastWrapper.querySelector('.filter-column-select');
        const lastValueSelect = lastWrapper.querySelector('.filter-value-select');

        if (!lastSelect.value || lastValueSelect.value === FILTER_VALUES.PLACEHOLDER) {
            showToast('Complete the current filter first', 'error');
            return;
        }

        const newLevel = colSelects.length;
        const newWrapper = this.createSelect(newLevel, true);
        container.appendChild(newWrapper);
    }

    update() {
        const container = this.editor.filterSelectsContainer;
        const wrappers = container.querySelectorAll('.filter-select-wrapper');
        this.filters = [];

        wrappers.forEach(wrapper => {
            const colSelect = wrapper.querySelector('.filter-column-select');
            const valueSelect = wrapper.querySelector('.filter-value-select');

            // Check if a column is selected and a valid value is selected (not the placeholder)
            if (colSelect.value !== '' && valueSelect.value !== FILTER_VALUES.PLACEHOLDER) {
                this.filters.push({
                    column: colSelect.value,
                    value: valueSelect.value === FILTER_VALUES.EMPTY ? '' : valueSelect.value,
                    isEmpty: valueSelect.value === FILTER_VALUES.EMPTY
                });
            }
        });

        // Deselect rows that are no longer visible due to filtering
        const filteredData = this.editor.getFilteredData();
        const visibleIndices = new Set(filteredData.map(row => this.editor.currentData.indexOf(row)));
        for (const idx of this.editor.selectedRows) {
            if (!visibleIndices.has(idx)) {
                this.editor.selectedRows.delete(idx);
            }
        }

        this.editor.renderTable();
        this.editor.selectionManager.updateUI();
        this.updateLevels();
    }

    updateLevels() {
        this.editor.updateSelectLevels({
            container: this.editor.filterSelectsContainer,
            wrapperClass: 'filter-select-wrapper',
            colSelectClass: 'filter-column-select',
            removeClass: 'remove-filter',
            logicClass: 'filter-logic-toggle',
            extraSelectClass: 'filter-value-select',
            placeholders: ['No filter', 'Select column'],
            removeTitle: 'Remove this filter',
            type: 'filter'
        });
    }

    updateCounts() {
        const container = this.editor.filterSelectsContainer;
        const badges = container.querySelectorAll('.filter-count-badge');
        const wrappers = container.querySelectorAll('.filter-select-wrapper');

        // Build list of active filters up to each level
        const activeFilters = [];
        wrappers.forEach((wrapper, level) => {
            const colSelect = wrapper.querySelector('.filter-column-select');
            const valueSelect = wrapper.querySelector('.filter-value-select');
            const badge = badges[level];

            if (!colSelect || !valueSelect || colSelect.value === '' ||
                valueSelect.value === FILTER_VALUES.PLACEHOLDER || valueSelect.disabled) {
                if (badge) badge.style.display = 'none';
                return;
            }

            // Add this filter to active filters
            const filterConfig = {
                column: parseInt(colSelect.value),
                value: valueSelect.value,
                isEmpty: valueSelect.value === FILTER_VALUES.EMPTY
            };
            activeFilters.push(filterConfig);

            // Count matching rows using all filters up to this level
            const filtersUpToHere = [...activeFilters];
            let count = 0;

            this.editor.currentData.forEach(row => {
                const matchFunction = fc => {
                    const cellValue = String(row[fc.column] || '');
                    if (fc.isEmpty) {
                        return cellValue === '';
                    }
                    return cellValue === fc.value;
                };

                let matches;
                if (this.filterLogic === LOGIC.OR) {
                    matches = filtersUpToHere.some(matchFunction);
                } else {
                    matches = filtersUpToHere.every(matchFunction);
                }

                if (matches) count++;
            });

            if (badge) {
                badge.innerHTML = `(<span class="count-num">${count}</span>)`;
                badge.style.display = 'inline';
            }
        });
    }

    setMode(mode) {
        this.filterAsHighlight = mode === 'highlight';
        this.editor.filterModeBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filterMode === mode);
        });
        this.editor.renderTable();
    }

    // Called when a filter is removed via click
    handleRemove(wrapper) {
        wrapper.remove();
        const container = this.editor.filterSelectsContainer;
        // If no filters left, add a fresh empty one
        if (container.children.length === 0) {
            container.appendChild(this.createSelect(0));
        }
        this.update();
        this.updateLevels();
    }
}
