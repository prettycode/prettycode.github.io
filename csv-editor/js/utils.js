// ============================================
// Helper Functions
// ============================================

/**
 * Creates a fresh modification stats object
 */
function createModStats() {
    return {
        rowsAdded: 0,
        rowsDeleted: 0,
        columnsAdded: 0,
        columnsDeleted: 0,
        columnsReordered: 0,
        rowsChanged: new Set()
    };
}

/**
 * Checks if a value is empty (undefined, null, or empty string)
 */
function isEmpty(val) {
    return val === undefined || val === null || val === '';
}

/**
 * Adjusts a column index after a column move operation
 */
function adjustIndexAfterMove(idx, fromIdx, toIdx) {
    if (idx === fromIdx) return toIdx;
    if (fromIdx < toIdx) {
        return (idx > fromIdx && idx <= toIdx) ? idx - 1 : idx;
    } else {
        return (idx >= toIdx && idx < fromIdx) ? idx + 1 : idx;
    }
}

/**
 * Adjusts a column index after a column delete operation
 */
function adjustIndexAfterDelete(idx, deletedIdx) {
    if (idx === deletedIdx) return null;
    return idx > deletedIdx ? idx - 1 : idx;
}

/**
 * Adjusts a column index after a column insert operation
 */
function adjustIndexAfterInsert(idx, insertIdx) {
    return idx >= insertIdx ? idx + 1 : idx;
}

/**
 * Creates a remove button element
 */
function createRemoveButton(className, title) {
    const btn = document.createElement('button');
    btn.className = className;
    btn.innerHTML = UI.REMOVE_BTN_CHAR;
    btn.title = title;
    return btn;
}

/**
 * Creates an indicator span element
 */
function createIndicator(className, text) {
    const indicator = document.createElement('span');
    indicator.className = className;
    indicator.textContent = text;
    return indicator;
}

/**
 * Populates a select element with column options
 */
function populateColumnOptions(select, headers, placeholderText) {
    select.innerHTML = `<option value="">${placeholderText}</option>`;
    headers.forEach((header, idx) => {
        const option = document.createElement('option');
        option.value = idx;
        option.textContent = header;
        select.appendChild(option);
    });
}

/**
 * Shows a toast notification
 */
function showToast(message, type = 'info') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${TOAST_ICONS[type] || TOAST_ICONS.info}</span>
        ${message}
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), TIMING.TOAST_FADE);
    }, TIMING.TOAST_DURATION);
}
