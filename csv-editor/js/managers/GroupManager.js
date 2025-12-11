// ============================================
// GroupManager - Handles group controls and logic
// ============================================
class GroupManager {
    constructor(editor) {
        this.editor = editor;
    }

    // State accessors (state lives in editor)
    get groupColumns() { return this.editor.groupColumns; }
    set groupColumns(val) { this.editor.groupColumns = val; }
    get collapsedGroups() { return this.editor.collapsedGroups; }

    createSelect(level, showRemove = false) {
        const wrapper = document.createElement('div');
        wrapper.className = 'group-select-wrapper';

        if (level > 0) {
            wrapper.appendChild(createIndicator('group-level-indicator', '→'));
        }

        const colSelect = document.createElement('select');
        colSelect.className = 'group-column-select';
        colSelect.dataset.level = level;
        populateColumnOptions(colSelect, this.editor.headers, level === 0 ? 'No grouping' : 'Then by...');
        wrapper.appendChild(colSelect);

        // Add count badge (hidden by default, shown when column is selected)
        const countBadge = document.createElement('span');
        countBadge.className = 'group-count-badge';
        countBadge.dataset.level = level;
        countBadge.style.display = 'none';
        wrapper.appendChild(countBadge);

        if (showRemove) {
            wrapper.appendChild(createRemoveButton('remove-group', 'Remove this group level'));
        }

        return wrapper;
    }

    addLevel() {
        const container = this.editor.groupSelectsContainer;
        const colSelects = container.querySelectorAll('.group-column-select');
        const lastSelect = colSelects[colSelects.length - 1];

        if (!lastSelect.value) {
            showToast('Select a column to group by first', 'error');
            return;
        }

        const newLevel = colSelects.length;
        const newWrapper = this.createSelect(newLevel, true);
        container.appendChild(newWrapper);
    }

    update() {
        const container = this.editor.groupSelectsContainer;
        const selects = container.querySelectorAll('.group-column-select');
        this.groupColumns = [];

        selects.forEach(select => {
            if (select.value !== '') {
                this.groupColumns.push(parseInt(select.value));
            }
        });

        this.collapsedGroups.clear();
        this.editor.renderTable();
        this.updateLevels();
    }

    updateLevels() {
        this.editor.updateSelectLevels({
            container: this.editor.groupSelectsContainer,
            wrapperClass: 'group-select-wrapper',
            colSelectClass: 'group-column-select',
            removeClass: 'remove-group',
            indicatorClass: 'group-level-indicator',
            placeholders: ['No grouping', 'Then by...'],
            removeTitle: 'Remove this group level',
            type: 'group'
        });
    }

    updateCounts() {
        const container = this.editor.groupSelectsContainer;
        const badges = container.querySelectorAll('.group-count-badge');
        const selects = container.querySelectorAll('.group-column-select');
        const filteredData = this.editor.getFilteredData();

        badges.forEach((badge, level) => {
            const select = selects[level];
            if (!select || select.value === '') {
                badge.style.display = 'none';
                return;
            }

            // Calculate unique groups at this level
            // For level 0: count unique values in that column
            // For level > 0: count total unique combinations considering parent groups
            const colIdx = parseInt(select.value);
            let count = 0;

            if (level === 0) {
                // Simple count of unique values in this column
                const uniqueValues = new Set();
                filteredData.forEach(row => {
                    uniqueValues.add(row[colIdx] || '(empty)');
                });
                count = uniqueValues.size;
            } else {
                // Count unique groups at this level across all parent group combinations
                // Build a set of all unique group paths up to this level
                const uniquePaths = new Set();
                filteredData.forEach(row => {
                    let path = '';
                    for (let i = 0; i <= level; i++) {
                        const groupColIdx = parseInt(selects[i].value);
                        if (isNaN(groupColIdx)) break;
                        const val = row[groupColIdx] || '(empty)';
                        path += (i > 0 ? '|' : '') + val;
                    }
                    uniquePaths.add(path);
                });
                count = uniquePaths.size;
            }

            badge.innerHTML = `(<span class="count-num">${count}</span>)`;
            badge.style.display = 'inline';
        });
    }

    // Called when a group is removed via click
    handleRemove(wrapper) {
        wrapper.remove();
        const container = this.editor.groupSelectsContainer;
        // If no groups left, add a fresh empty one
        if (container.children.length === 0) {
            container.appendChild(this.createSelect(0));
        }
        this.update();
        this.updateLevels();
    }
}
