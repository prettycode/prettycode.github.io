// ============================================
// Constants
// ============================================
const STORAGE_KEYS = {
    THEME: 'csv-editor-theme',
    DENSITY: 'csv-editor-density',
    FULLWIDTH: 'csv-editor-fullwidth'
};

const LOGIC = {
    AND: 'AND',
    OR: 'OR'
};

const SORT_DIR = {
    ASC: 'asc',
    DESC: 'desc'
};

const FILTER_VALUES = {
    PLACEHOLDER: '__placeholder__',
    EMPTY: '__empty__'
};

const TIMING = {
    TOAST_DURATION: 3000,
    TOAST_FADE: 300,
    SCROLL_DELAY: 300
};

const UI = {
    MIN_SEARCH_CHARS: 2,
    GROUP_INDENT_PX: 20,
    REMOVE_BTN_CHAR: '×',
    EMPTY_CELL_SEARCH: '""'  // Search term to match empty cells
};

// Special marker for empty cell search (won't match any actual content)
const EMPTY_CELL_MARKER = Symbol('empty-cell');

const TOAST_ICONS = {
    success: '✓',
    error: '✕',
    info: 'ℹ'
};
