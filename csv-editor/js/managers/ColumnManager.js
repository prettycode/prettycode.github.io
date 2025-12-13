// ============================================
// ColumnManager - Handles column operations (drag, move, delete, add)
// ============================================
class ColumnManager {
    constructor(editor) {
        this.editor = editor;
    }

    // State accessors (state lives in editor)
    get draggedColIdx() { return this.editor.draggedColIdx; }
    set draggedColIdx(val) { this.editor.draggedColIdx = val; }
    get dragGhost() { return this.editor.dragGhost; }
    set dragGhost(val) { this.editor.dragGhost = val; }
    get insertColumnIdx() { return this.editor.insertColumnIdx; }
    set insertColumnIdx(val) { this.editor.insertColumnIdx = val; }
    get addedColumns() { return this.editor.addedColumns; }
    set addedColumns(val) { this.editor.addedColumns = val; }

    handleDragStart(e, colIdx) {
        this.draggedColIdx = colIdx;
        e.target.classList.add(CSS.DRAGGING);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', colIdx);

        // Create custom drag ghost
        this.dragGhost = document.createElement('div');
        this.dragGhost.className = 'drag-ghost';
        this.dragGhost.textContent = this.editor.headers[colIdx];
        document.body.appendChild(this.dragGhost);
        e.dataTransfer.setDragImage(this.dragGhost, 0, 0);
    }

    handleDragEnd(e) {
        e.target.classList.remove(CSS.DRAGGING);
        this.draggedColIdx = null;

        // Remove drag ghost
        if (this.dragGhost) {
            this.dragGhost.remove();
            this.dragGhost = null;
        }

        // Remove all drag-over classes
        document.querySelectorAll('.' + CSS.DRAG_OVER_LEFT + ', .' + CSS.DRAG_OVER_RIGHT).forEach(el => {
            el.classList.remove(CSS.DRAG_OVER_LEFT, CSS.DRAG_OVER_RIGHT);
        });
    }

    handleDragOver(e, colIdx) {
        e.preventDefault();
        if (this.draggedColIdx === null || this.draggedColIdx === colIdx) return;

        const th = e.currentTarget;
        const rect = th.getBoundingClientRect();
        const midpoint = rect.left + rect.width / 2;

        // Remove existing classes
        th.classList.remove(CSS.DRAG_OVER_LEFT, CSS.DRAG_OVER_RIGHT);

        // Add appropriate class based on cursor position
        if (e.clientX < midpoint) {
            th.classList.add(CSS.DRAG_OVER_LEFT);
        } else {
            th.classList.add(CSS.DRAG_OVER_RIGHT);
        }
    }

    handleDragLeave(e) {
        e.currentTarget.classList.remove(CSS.DRAG_OVER_LEFT, CSS.DRAG_OVER_RIGHT);
    }

    handleDrop(e, targetColIdx) {
        e.preventDefault();
        const th = e.currentTarget;
        th.classList.remove(CSS.DRAG_OVER_LEFT, CSS.DRAG_OVER_RIGHT);

        if (this.draggedColIdx === null || this.draggedColIdx === targetColIdx) return;

        const rect = th.getBoundingClientRect();
        const midpoint = rect.left + rect.width / 2;
        const insertBefore = e.clientX < midpoint;

        this.move(this.draggedColIdx, targetColIdx, insertBefore);
    }

    move(fromIdx, toIdx, insertBefore) {
        // Calculate actual target index
        let targetIdx = insertBefore ? toIdx : toIdx + 1;
        if (fromIdx < targetIdx) targetIdx--;

        if (fromIdx === targetIdx) return;

        // Move header
        const header = this.editor.headers.splice(fromIdx, 1)[0];
        this.editor.headers.splice(targetIdx, 0, header);

        // Move data in all rows
        this.editor.currentData = this.editor.currentData.map(row => {
            const newRow = {};
            const values = [];

            // Extract values in current order
            for (let i = 0; i < this.editor.headers.length + 1; i++) {
                if (i !== fromIdx) {
                    values.push(row[i]);
                }
            }

            // Insert moved value at new position
            const movedValue = row[fromIdx];
            values.splice(targetIdx, 0, movedValue);

            // Rebuild row with new indices
            values.forEach((val, idx) => {
                newRow[idx] = val;
            });

            return newRow;
        });

        // Update sort columns, filters, and group columns to reflect new indices
        this.updateReferences(fromIdx, targetIdx);

        // Update modifiedCells column indices
        for (const [rowIdx, cols] of this.editor.modifiedCells) {
            const newCols = new Set();
            for (const col of cols) {
                newCols.add(adjustIndexAfterMove(col, fromIdx, targetIdx));
            }
            this.editor.modifiedCells.set(rowIdx, newCols);
        }

        // Update addedColumns indices
        this.addedColumns = new Set(
            Array.from(this.addedColumns).map(col => adjustIndexAfterMove(col, fromIdx, targetIdx))
        );

        this.editor.modStats.columnsReordered++;

        this.editor.markAsModified();
        this.editor.populateDropdowns();
        this.editor.renderTable();
        showToast(`Moved column "${header}"`, TOAST_TYPE.SUCCESS);
    }

    updateReferences(fromIdx, toIdx) {
        // Update sort columns
        this.editor.sortColumns = this.editor.sortColumns.map(s => ({
            ...s,
            column: String(adjustIndexAfterMove(parseInt(s.column), fromIdx, toIdx))
        }));

        // Update filters
        this.editor.filters = this.editor.filters.map(f => ({
            ...f,
            column: String(adjustIndexAfterMove(parseInt(f.column), fromIdx, toIdx))
        }));

        // Update group columns
        this.editor.groupColumns = this.editor.groupColumns.map(col => adjustIndexAfterMove(col, fromIdx, toIdx));
    }

    delete(colIdx) {
        if (this.editor.headers.length <= 1) {
            showToast('Cannot delete the last column', TOAST_TYPE.ERROR);
            return;
        }

        const headerName = this.editor.headers[colIdx];

        // Remove from headers
        this.editor.headers.splice(colIdx, 1);

        // Remove from data and reindex
        this.editor.currentData = this.editor.currentData.map(row => {
            const newRow = {};
            let newIdx = 0;
            for (let i = 0; i < this.editor.headers.length + 1; i++) {
                if (i !== colIdx) {
                    newRow[newIdx] = row[i];
                    newIdx++;
                }
            }
            return newRow;
        });

        // Update modifiedCells - remove deleted column and adjust remaining indices
        for (const [rowIdx, cols] of this.editor.modifiedCells) {
            const newCols = new Set();
            for (const col of cols) {
                const adjusted = adjustIndexAfterDelete(col, colIdx);
                if (adjusted !== null) newCols.add(adjusted);
            }
            if (newCols.size > 0) {
                this.editor.modifiedCells.set(rowIdx, newCols);
            } else {
                this.editor.modifiedCells.delete(rowIdx);
            }
        }

        // Update addedColumns - remove deleted column and adjust remaining indices
        const newAddedColumns = new Set();
        for (const col of this.addedColumns) {
            const adjusted = adjustIndexAfterDelete(col, colIdx);
            if (adjusted !== null) newAddedColumns.add(adjusted);
        }
        this.addedColumns = newAddedColumns;

        // Update references
        this.updateReferencesAfterDelete(colIdx);

        this.editor.modStats.columnsDeleted++;

        this.editor.markAsModified();
        this.editor.populateDropdowns();
        this.editor.renderTable();
        showToast(`Deleted column "${headerName}"`, TOAST_TYPE.SUCCESS);
    }

    updateReferencesAfterDelete(deletedIdx) {
        // Update sort columns
        this.editor.sortColumns = this.editor.sortColumns
            .map(s => ({ ...s, column: adjustIndexAfterDelete(parseInt(s.column), deletedIdx) }))
            .filter(s => s.column !== null)
            .map(s => ({ ...s, column: String(s.column) }));

        // Update filters
        this.editor.filters = this.editor.filters
            .map(f => ({ ...f, column: adjustIndexAfterDelete(parseInt(f.column), deletedIdx) }))
            .filter(f => f.column !== null)
            .map(f => ({ ...f, column: String(f.column) }));

        // Update group columns
        this.editor.groupColumns = this.editor.groupColumns
            .map(col => adjustIndexAfterDelete(col, deletedIdx))
            .filter(col => col !== null);
    }

    showAddModal() {
        this.editor.newColumnNameInput.value = '';
        this.editor.newColumnDefaultInput.value = '';
        this.editor.addColumnModal.classList.remove(CSS.HIDDEN);
        this.editor.newColumnNameInput.focus();
    }

    hideAddModal() {
        this.editor.addColumnModal.classList.add(CSS.HIDDEN);
        this.insertColumnIdx = null;
    }

    add() {
        const columnName = this.editor.newColumnNameInput.value.trim();

        if (!columnName) {
            showToast('Please enter a column name', TOAST_TYPE.ERROR);
            return;
        }

        const defaultValue = this.editor.newColumnDefaultInput.value;
        const originalColCount = this.editor.headers.length;

        // Use insertColumnIdx if set, otherwise append to end
        const insertIdx = this.insertColumnIdx !== null ? this.insertColumnIdx : originalColCount;

        // Helper function to shift row indices
        const shiftRowIndices = (row, fromIdx) => {
            const newRow = {};
            for (let i = 0; i < originalColCount; i++) {
                if (i < fromIdx) {
                    newRow[i] = row[i];
                } else {
                    newRow[i + 1] = row[i];
                }
            }
            newRow[fromIdx] = defaultValue;
            return newRow;
        };

        // Add header at position
        this.editor.headers.splice(insertIdx, 0, columnName);

        // Shift data indices in all rows
        this.editor.currentData = this.editor.currentData.map(row => shiftRowIndices(row, insertIdx));

        // Update references for columns after insert
        this.updateReferencesAfterInsert(insertIdx);

        // Update modifiedCells column indices
        for (const [rowIdx, cols] of this.editor.modifiedCells) {
            const newCols = new Set();
            for (const col of cols) {
                newCols.add(adjustIndexAfterInsert(col, insertIdx));
            }
            this.editor.modifiedCells.set(rowIdx, newCols);
        }

        // Update addedColumns indices and add new column
        this.addedColumns = new Set(
            Array.from(this.addedColumns).map(col => adjustIndexAfterInsert(col, insertIdx))
        );
        this.addedColumns.add(insertIdx);

        this.editor.modStats.columnsAdded++;

        this.editor.markAsModified();
        this.editor.populateDropdowns();
        this.editor.renderTable();
        this.hideAddModal();
        showToast(`Column "${columnName}" added`, TOAST_TYPE.SUCCESS);
    }

    updateReferencesAfterInsert(insertIdx) {
        // Update sort columns
        this.editor.sortColumns = this.editor.sortColumns.map(s => ({
            ...s,
            column: String(adjustIndexAfterInsert(parseInt(s.column), insertIdx))
        }));

        // Update filters
        this.editor.filters = this.editor.filters.map(f => ({
            ...f,
            column: String(adjustIndexAfterInsert(parseInt(f.column), insertIdx))
        }));

        // Update group columns
        this.editor.groupColumns = this.editor.groupColumns.map(col => adjustIndexAfterInsert(col, insertIdx));
    }
}
