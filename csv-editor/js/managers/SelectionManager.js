// ============================================
// SelectionManager - Handles row selection and navigation
// ============================================
class SelectionManager {
    constructor(editor) {
        this.editor = editor;
    }

    // State accessors (state lives in editor)
    get selectedRows() { return this.editor.selectedRows; }
    get lastClickedRowIdx() { return this.editor.lastClickedRowIdx; }
    set lastClickedRowIdx(val) { this.editor.lastClickedRowIdx = val; }

    selectAll() {
        const filteredData = this.editor.getFilteredData();
        filteredData.forEach(row => {
            const idx = this.editor.currentData.indexOf(row);
            this.selectedRows.add(idx);
        });
        this.editor.renderTable();
        this.updateUI();
    }

    deselectAll() {
        this.selectedRows.clear();
        this.lastClickedRowIdx = null;
        this.editor.renderTable();
        this.updateUI();
    }

    deleteSelected() {
        if (this.selectedRows.size === 0) return;

        const indicesToDelete = Array.from(this.selectedRows).sort((a, b) => b - a);

        // Update rowsChanged set - remove deleted indices and adjust remaining
        const newRowsChanged = new Set();
        for (const changedIdx of this.editor.modStats.rowsChanged) {
            if (!this.selectedRows.has(changedIdx)) {
                // Count how many deleted indices are below this one
                let adjustment = 0;
                for (const delIdx of indicesToDelete) {
                    if (delIdx < changedIdx) adjustment++;
                }
                newRowsChanged.add(changedIdx - adjustment);
            }
        }
        this.editor.modStats.rowsChanged = newRowsChanged;

        // Update modifiedCells - remove deleted rows and adjust remaining indices
        const newModifiedCells = new Map();
        for (const [rowIdx, cols] of this.editor.modifiedCells) {
            if (!this.selectedRows.has(rowIdx)) {
                let adjustment = 0;
                for (const delIdx of indicesToDelete) {
                    if (delIdx < rowIdx) adjustment++;
                }
                newModifiedCells.set(rowIdx - adjustment, cols);
            }
        }
        this.editor.modifiedCells = newModifiedCells;

        indicesToDelete.forEach(idx => {
            this.editor.currentData.splice(idx, 1);
        });

        this.editor.modStats.rowsDeleted += indicesToDelete.length;

        this.selectedRows.clear();
        this.lastClickedRowIdx = null;
        this.editor.markAsModified();
        this.editor.renderTable();
        this.updateUI();
        showToast(`Deleted ${indicesToDelete.length} row${indicesToDelete.length !== 1 ? 's' : ''}`, TOAST_TYPE.SUCCESS);
    }

    updateUI() {
        const hasSelected = this.selectedRows.size > 0;
        this.editor.clearSelectionBtn.disabled = !hasSelected;
        this.editor.deleteSelectedBtn.disabled = !hasSelected;
        this.editor.selectedRowsSpan.textContent = this.selectedRows.size;

        // Show/hide selection actions area
        if (hasSelected) {
            this.editor.selectionActions.classList.add(CSS.HAS_SELECTION);
        } else {
            this.editor.selectionActions.classList.remove(CSS.HAS_SELECTION);
        }

        // Update export dropdown options and arrow visibility
        const hasDeselected = this.selectedRows.size < this.editor.currentData.length;
        this.editor.exportSelectedOption.disabled = !hasSelected;
        this.editor.exportDeselectedOption.disabled = !hasDeselected || !hasSelected;

        // Show/hide dropdown arrow based on whether menu is needed
        const dropdownArrow = this.editor.exportBtn.querySelector('.dropdown-arrow');
        if (dropdownArrow) {
            dropdownArrow.style.display = hasSelected ? '' : 'none';
        }

        // Close menu if no rows selected
        if (!hasSelected) {
            this.editor.exportMenu.classList.add(CSS.HIDDEN);
        }

        const headerCheckbox = document.getElementById('headerCheckbox');
        if (headerCheckbox) {
            const filteredData = this.editor.getFilteredData();
            const allSelected = filteredData.length > 0 &&
                filteredData.every(row => this.selectedRows.has(this.editor.currentData.indexOf(row)));
            headerCheckbox.checked = allSelected;
        }

        // Update navigation arrows
        this.updateNavArrows();
    }

    getMatchingRows() {
        // Get all rows that are selected, row-highlighted, or contain highlighted cells (exclude group headers)
        const rows = this.editor.tableBody.querySelectorAll(
            'tr.selected:not(.group-header), tr.row-highlighted:not(.group-header), tr:has(.cell-highlighted):not(.group-header)'
        );
        return Array.from(rows);
    }

    updateNavArrows() {
        const matchingRows = this.getMatchingRows();

        if (matchingRows.length === 0) {
            this.editor.rowNavUp.classList.add(CSS.HIDDEN);
            this.editor.rowNavDown.classList.add(CSS.HIDDEN);
            return;
        }

        const scrollRect = this.editor.tableScroll.getBoundingClientRect();
        const headerHeight = this.editor.tableHead.offsetHeight;
        const viewTop = scrollRect.top + headerHeight;
        const viewBottom = scrollRect.bottom;

        let aboveCount = 0;
        let belowCount = 0;

        matchingRows.forEach(row => {
            const rowRect = row.getBoundingClientRect();

            if (rowRect.bottom < viewTop) {
                aboveCount++;
            } else if (rowRect.top > viewBottom) {
                belowCount++;
            }
        });

        if (aboveCount > 0) {
            this.editor.rowNavUp.classList.remove(CSS.HIDDEN);
            this.editor.rowNavUpCount.textContent = aboveCount;
        } else {
            this.editor.rowNavUp.classList.add(CSS.HIDDEN);
        }

        if (belowCount > 0) {
            this.editor.rowNavDown.classList.remove(CSS.HIDDEN);
            this.editor.rowNavDownCount.textContent = belowCount;
        } else {
            this.editor.rowNavDown.classList.add(CSS.HIDDEN);
        }
    }

    scrollToMatchingRow(direction) {
        const matchingRows = this.getMatchingRows();
        if (matchingRows.length === 0) return;

        const scrollRect = this.editor.tableScroll.getBoundingClientRect();
        const headerHeight = this.editor.tableHead.offsetHeight;
        const viewTop = scrollRect.top + headerHeight;
        const viewBottom = scrollRect.bottom;

        if (direction === 'up') {
            // Find the nearest row above the viewport
            for (let i = matchingRows.length - 1; i >= 0; i--) {
                const row = matchingRows[i];
                const rowRect = row.getBoundingClientRect();
                if (rowRect.bottom < viewTop) {
                    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setTimeout(() => this.updateNavArrows(), TIMING.SCROLL_DELAY);
                    return;
                }
            }
        } else {
            // Find the nearest row below the viewport
            for (let i = 0; i < matchingRows.length; i++) {
                const row = matchingRows[i];
                const rowRect = row.getBoundingClientRect();
                if (rowRect.top > viewBottom) {
                    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setTimeout(() => this.updateNavArrows(), TIMING.SCROLL_DELAY);
                    return;
                }
            }
        }
    }
}
