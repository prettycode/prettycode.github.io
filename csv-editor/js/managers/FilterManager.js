// ============================================
// FilterManager - Handles filter controls and logic
// ============================================

import { FILTER_VALUES, FILTER_OPERATORS, NO_VALUE_OPERATORS, DROPDOWN_OPERATORS, LOGIC, PLACEHOLDER, CSS, TOAST_TYPE } from '../constants.js';
import { isEmpty, createRemoveButton, populateColumnOptions, showToast } from '../utils.js';

export class FilterManager {
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

        // Operator select (populated when column is selected)
        const opSelect = document.createElement('select');
        opSelect.className = 'filter-operator-select';
        opSelect.dataset.level = level;
        opSelect.innerHTML = '<option value="">Select operator...</option>';
        opSelect.disabled = true;
        wrapper.appendChild(opSelect);

        // Value dropdown (for text equals/notEquals)
        const valueSelect = document.createElement('select');
        valueSelect.className = 'filter-value-select';
        valueSelect.dataset.level = level;
        valueSelect.innerHTML = `<option value="${FILTER_VALUES.PLACEHOLDER}">Select value...</option>`;
        valueSelect.disabled = true;
        valueSelect.style.display = 'none';
        wrapper.appendChild(valueSelect);

        // Value input (for numeric/date/text patterns)
        const valueInput = document.createElement('input');
        valueInput.type = 'text';
        valueInput.className = 'filter-value-input';
        valueInput.dataset.level = level;
        valueInput.placeholder = 'Enter value...';
        valueInput.disabled = true;
        valueInput.style.display = 'none';
        wrapper.appendChild(valueInput);

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
        for (const row of this.editor.currentData) {
            const val = row[colIdx];
            if (isEmpty(val)) {
                hasEmpty = true;
            } else {
                uniqueValues.add(val);
            }
        }

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

        // Build all options in a fragment to minimize reflows
        const fragment = document.createDocumentFragment();

        // Add empty option first if there are empty values
        if (hasEmpty) {
            const emptyOption = document.createElement('option');
            emptyOption.value = FILTER_VALUES.EMPTY;
            emptyOption.textContent = PLACEHOLDER.EMPTY;
            fragment.appendChild(emptyOption);
        }

        for (const val of sortedValues) {
            const option = document.createElement('option');
            option.value = val;
            option.textContent = val;
            fragment.appendChild(option);
        }

        valueSelect.appendChild(fragment);
        valueSelect.disabled = false;
    }

    detectColumnType(colIdx) {
        const colIdxNum = parseInt(colIdx);
        if (this.editor.numericColumnsCache && this.editor.numericColumnsCache.has(colIdxNum)) {
            return 'numeric';
        }
        if (this.editor.timestampColumnsCache && this.editor.timestampColumnsCache.has(colIdxNum)) {
            return 'date';
        }
        return 'text';
    }

    populateOperatorSelect(colSelect) {
        const wrapper = colSelect.closest('.filter-select-wrapper');
        const opSelect = wrapper.querySelector('.filter-operator-select');
        const valueSelect = wrapper.querySelector('.filter-value-select');
        const valueInput = wrapper.querySelector('.filter-value-input');
        const colIdx = colSelect.value;

        // Hide value inputs
        valueSelect.style.display = 'none';
        valueSelect.disabled = true;
        valueInput.style.display = 'none';
        valueInput.disabled = true;

        if (colIdx === '') {
            opSelect.innerHTML = '<option value="">Select operator...</option>';
            opSelect.disabled = true;
            opSelect.dataset.columnType = '';
            return;
        }

        const columnType = this.detectColumnType(colIdx);
        const operators = FILTER_OPERATORS[columnType.toUpperCase()];

        // Build all options in a fragment to minimize reflows
        const fragment = document.createDocumentFragment();
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Select operator...';
        fragment.appendChild(placeholder);

        for (const op of operators) {
            const option = document.createElement('option');
            option.value = op.value;
            option.textContent = op.label;
            fragment.appendChild(option);
        }

        opSelect.innerHTML = '';
        opSelect.appendChild(fragment);
        opSelect.disabled = false;
        opSelect.dataset.columnType = columnType;
    }

    handleOperatorChange(opSelect) {
        const wrapper = opSelect.closest('.filter-select-wrapper');
        const colSelect = wrapper.querySelector('.filter-column-select');
        const valueSelect = wrapper.querySelector('.filter-value-select');
        const valueInput = wrapper.querySelector('.filter-value-input');
        const operator = opSelect.value;
        const columnType = opSelect.dataset.columnType;

        // Hide both inputs initially
        valueSelect.style.display = 'none';
        valueSelect.disabled = true;
        valueInput.style.display = 'none';
        valueInput.disabled = true;
        valueInput.value = '';

        if (!operator || NO_VALUE_OPERATORS.includes(operator)) {
            // No value needed for isEmpty/isNotEmpty
            return;
        }

        if (columnType === 'text' && DROPDOWN_OPERATORS.includes(operator)) {
            // Text equals/notEquals: show dropdown
            this.populateValueSelect(colSelect);
            valueSelect.style.display = '';
            valueSelect.disabled = false;
        } else {
            // All other cases: show text input
            valueInput.style.display = '';
            valueInput.disabled = false;

            // Set placeholder based on type
            if (columnType === 'numeric') {
                valueInput.placeholder = 'Enter number...';
            } else if (columnType === 'date') {
                valueInput.placeholder = 'Enter date...';
            } else {
                valueInput.placeholder = 'Enter text...';
            }
        }
    }

    addLevel() {
        const container = this.editor.filterSelectsContainer;
        const colSelects = container.querySelectorAll('.filter-column-select');
        const lastWrapper = colSelects[colSelects.length - 1].closest('.filter-select-wrapper');
        const lastColSelect = lastWrapper.querySelector('.filter-column-select');
        const lastOpSelect = lastWrapper.querySelector('.filter-operator-select');
        const lastValueSelect = lastWrapper.querySelector('.filter-value-select');
        const lastValueInput = lastWrapper.querySelector('.filter-value-input');

        // Check if filter is complete
        if (!lastColSelect.value || !lastOpSelect.value) {
            showToast('Complete the current filter first', TOAST_TYPE.ERROR);
            return;
        }

        const operator = lastOpSelect.value;
        // Check if value is required and provided
        if (!NO_VALUE_OPERATORS.includes(operator)) {
            const columnType = lastOpSelect.dataset.columnType;
            if (columnType === 'text' && DROPDOWN_OPERATORS.includes(operator)) {
                if (lastValueSelect.value === FILTER_VALUES.PLACEHOLDER) {
                    showToast('Complete the current filter first', TOAST_TYPE.ERROR);
                    return;
                }
            } else {
                if (!lastValueInput.value.trim()) {
                    showToast('Complete the current filter first', TOAST_TYPE.ERROR);
                    return;
                }
            }
        }

        const newLevel = colSelects.length;
        const newWrapper = this.createSelect(newLevel, true);
        container.appendChild(newWrapper);
    }

    update() {
        const container = this.editor.filterSelectsContainer;
        const wrappers = container.querySelectorAll('.filter-select-wrapper');
        this.filters = [];

        for (const wrapper of wrappers) {
            const colSelect = wrapper.querySelector('.filter-column-select');
            const opSelect = wrapper.querySelector('.filter-operator-select');
            const valueSelect = wrapper.querySelector('.filter-value-select');
            const valueInput = wrapper.querySelector('.filter-value-input');

            // Check if column and operator are selected
            if (colSelect.value === '' || !opSelect || opSelect.value === '') {
                continue; // Incomplete filter
            }

            const operator = opSelect.value;
            const columnType = opSelect.dataset.columnType || 'text';

            // Determine the value based on operator type
            let value = null;

            if (NO_VALUE_OPERATORS.includes(operator)) {
                // No value needed
                value = null;
            } else if (columnType === 'text' && DROPDOWN_OPERATORS.includes(operator)) {
                // Value from dropdown
                if (valueSelect.value === FILTER_VALUES.PLACEHOLDER) {
                    continue; // Incomplete filter
                }
                value = valueSelect.value === FILTER_VALUES.EMPTY ? '' : valueSelect.value;
            } else {
                // Value from text input
                value = valueInput.value.trim();
                if (value === '') {
                    continue; // Incomplete filter
                }
            }

            this.filters.push({
                column: colSelect.value,
                columnType: columnType,
                operator: operator,
                value: value
            });
        }

        // Deselect rows that are no longer visible due to filtering
        const filteredData = this.editor.getFilteredData();
        // Build row->index map for O(1) lookups
        const rowIndexMap = new Map();
        for (let idx = 0; idx < this.editor.currentData.length; idx++) {
            rowIndexMap.set(this.editor.currentData[idx], idx);
        }
        const visibleIndices = new Set();
        for (const row of filteredData) {
            visibleIndices.add(rowIndexMap.get(row));
        }
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
        for (let level = 0; level < wrappers.length; level++) {
            const wrapper = wrappers[level];
            const colSelect = wrapper.querySelector('.filter-column-select');
            const opSelect = wrapper.querySelector('.filter-operator-select');
            const valueSelect = wrapper.querySelector('.filter-value-select');
            const valueInput = wrapper.querySelector('.filter-value-input');
            const badge = badges[level];

            // Check if filter is complete
            if (!colSelect || colSelect.value === '' || !opSelect || opSelect.value === '') {
                if (badge) badge.style.display = 'none';
                continue;
            }

            const operator = opSelect.value;
            const columnType = opSelect.dataset.columnType || 'text';

            // Build filter config
            let value = null;
            if (!NO_VALUE_OPERATORS.includes(operator)) {
                if (columnType === 'text' && DROPDOWN_OPERATORS.includes(operator)) {
                    if (!valueSelect || valueSelect.value === FILTER_VALUES.PLACEHOLDER) {
                        if (badge) badge.style.display = 'none';
                        continue;
                    }
                    value = valueSelect.value === FILTER_VALUES.EMPTY ? '' : valueSelect.value;
                } else {
                    if (!valueInput || valueInput.value.trim() === '') {
                        if (badge) badge.style.display = 'none';
                        continue;
                    }
                    value = valueInput.value.trim();
                }
            }

            const filterConfig = {
                column: parseInt(colSelect.value),
                columnType: columnType,
                operator: operator,
                value: value
            };
            activeFilters.push(filterConfig);

            // Count matching rows using all filters up to this level
            const filtersUpToHere = [...activeFilters];
            let count = 0;

            for (const row of this.editor.currentData) {
                let matches;
                if (this.filterLogic === LOGIC.OR) {
                    matches = false;
                    for (const fc of filtersUpToHere) {
                        const cellStr = String(row[fc.column] || '');
                        if (this.editor.evaluateFilter(fc, cellStr)) {
                            matches = true;
                            break;
                        }
                    }
                } else {
                    matches = true;
                    for (const fc of filtersUpToHere) {
                        const cellStr = String(row[fc.column] || '');
                        if (!this.editor.evaluateFilter(fc, cellStr)) {
                            matches = false;
                            break;
                        }
                    }
                }

                if (matches) count++;
            }

            if (badge) {
                badge.innerHTML = `(<span class="count-num">${count}</span>)`;
                badge.style.display = 'inline';
            }
        }
    }

    setMode(mode) {
        this.filterAsHighlight = mode === 'highlight';
        for (const btn of this.editor.filterModeBtns) {
            btn.classList.toggle(CSS.ACTIVE, btn.dataset.filterMode === mode);
        }
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
