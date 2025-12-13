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

const TOAST_TYPE = {
    SUCCESS: 'success',
    ERROR: 'error',
    INFO: 'info'
};

const TOAST_ICONS = {
    [TOAST_TYPE.SUCCESS]: '✓',
    [TOAST_TYPE.ERROR]: '✕',
    [TOAST_TYPE.INFO]: 'ℹ'
};

const CSS = {
    HIDDEN: 'hidden',
    ACTIVE: 'active',
    SELECTED: 'selected',
    MODIFIED: 'modified',
    DRAGGING: 'dragging',
    DRAG_OVER: 'drag-over',
    DRAG_OVER_LEFT: 'drag-over-left',
    DRAG_OVER_RIGHT: 'drag-over-right',
    COLLAPSED: 'collapsed',
    HAS_SELECTION: 'has-selection',
    ROW_HIGHLIGHTED: 'row-highlighted',
    CELL_HIGHLIGHTED: 'cell-highlighted',
    ROW_HAS_MATCH: 'row-has-match',
    CELL_MODIFIED: 'cell-modified',
    ROW_MODIFIED: 'row-modified',
    COL_ADDED: 'col-added',
    COL_NUMERIC: 'col-numeric',
    EMPTY: 'empty',
    EMPTY_CELL_DASH: 'empty-cell-dash',
    FULL_WIDTH: 'full-width',
    HIDING: 'hiding'
};

const THEME = {
    DARK: 'dark',
    LIGHT: 'light'
};

const PLACEHOLDER = {
    EMPTY: '(empty)',
    EMPTY_TAB: '(Empty)'
};

const FILE_EXT = {
    CSV: '.csv'
};

const MIME_TYPE = {
    CSV: 'text/csv;charset=utf-8;'
};
