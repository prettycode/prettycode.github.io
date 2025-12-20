// ============================================
// Constants
// ============================================

export const STORAGE_KEYS = {
    THEME: 'csv-editor-theme',
    DENSITY: 'csv-editor-density',
    FULLWIDTH: 'csv-editor-fullwidth'
};

export const LOGIC = {
    AND: 'AND',
    OR: 'OR'
};

export const SORT_DIR = {
    ASC: 'asc',
    DESC: 'desc'
};

export const FILTER_VALUES = {
    PLACEHOLDER: '__placeholder__',
    EMPTY: '__empty__'
};

// Filter operators by column type
export const FILTER_OPERATORS = {
    NUMERIC: [
        { value: 'equals', label: '=' },
        { value: 'notEquals', label: '≠' },
        { value: 'gt', label: '>' },
        { value: 'gte', label: '≥' },
        { value: 'lt', label: '<' },
        { value: 'lte', label: '≤' },
        { value: 'isEmpty', label: 'is empty' },
        { value: 'isNotEmpty', label: 'is not empty' }
    ],
    DATE: [
        { value: 'equals', label: '=' },
        { value: 'notEquals', label: '≠' },
        { value: 'gt', label: 'after' },
        { value: 'gte', label: 'on or after' },
        { value: 'lt', label: 'before' },
        { value: 'lte', label: 'on or before' },
        { value: 'isEmpty', label: 'is empty' },
        { value: 'isNotEmpty', label: 'is not empty' }
    ],
    TEXT: [
        { value: 'equals', label: 'equals' },
        { value: 'notEquals', label: 'not equals' },
        { value: 'contains', label: 'contains' },
        { value: 'startsWith', label: 'starts with' },
        { value: 'endsWith', label: 'ends with' },
        { value: 'isEmpty', label: 'is empty' },
        { value: 'isNotEmpty', label: 'is not empty' }
    ]
};

// Operators that don't require a value input
export const NO_VALUE_OPERATORS = ['isEmpty', 'isNotEmpty'];

// Operators that should use dropdown for text columns
export const DROPDOWN_OPERATORS = ['equals', 'notEquals'];

export const TIMING = {
    TOAST_DURATION: 3000,
    TOAST_FADE: 300,
    SCROLL_DELAY: 300
};

export const UI = {
    MIN_SEARCH_CHARS: 2,
    GROUP_INDENT_PX: 20,
    REMOVE_BTN_CHAR: '×',
    EMPTY_CELL_SEARCH: '""'  // Search term to match empty cells
};

// Special marker for empty cell search (won't match any actual content)
export const EMPTY_CELL_MARKER = Symbol('empty-cell');

export const TOAST_TYPE = {
    SUCCESS: 'success',
    ERROR: 'error',
    INFO: 'info'
};

export const TOAST_ICONS = {
    [TOAST_TYPE.SUCCESS]: '✓',
    [TOAST_TYPE.ERROR]: '✕',
    [TOAST_TYPE.INFO]: 'ℹ'
};

export const CSS = {
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

export const THEME = {
    DARK: 'dark',
    LIGHT: 'light'
};

export const PLACEHOLDER = {
    EMPTY: '(empty)',
    EMPTY_TAB: '(Empty)'
};

export const FILE_EXT = {
    CSV: '.csv'
};

export const MIME_TYPE = {
    CSV: 'text/csv;charset=utf-8;'
};

// ============================================
// DOM Element IDs - Centralized for maintainability
// ============================================
export const DOM_ID = {
    // Main layout
    TAB_BAR: 'tabBar',
    TAB_LIST: 'tabList',
    ADD_TAB_BTN: 'addTabBtn',
    UPLOAD_ZONE: 'uploadZone',
    FILE_INPUT: 'fileInput',
    EDITOR_SECTION: 'editorSection',
    HEADER_ACTIONS: 'headerActions',

    // Table structure
    TABLE_SCROLL: 'tableScroll',
    DATA_TABLE: 'dataTable',
    TABLE_HEAD: 'tableHead',
    TABLE_BODY: 'tableBody',
    TABLE_FOOT: 'tableFoot',
    TABLE_TITLE_TEXT: 'tableTitleText',
    TABLE_ROW_COUNT: 'tableRowCount',

    // Controls panel
    CONTROLS_PANEL: 'controlsPanel',
    CONTROLS_TOGGLE: 'controlsToggle',

    // Filter controls
    FILTER_CONTROLS: 'filterControls',
    ADD_FILTER_BTN: 'addFilterBtn',
    FILTER_MODE_SELECTOR: 'filterModeSelector',

    // Sort controls
    SORT_CONTROLS: 'sortControls',
    ADD_SORT_BTN: 'addSortBtn',

    // Group controls
    GROUP_CONTROLS: 'groupControls',
    ADD_GROUP_BTN: 'addGroupBtn',

    // Search controls
    SEARCH_CONTROLS: 'searchControls',
    ADD_SEARCH_BTN: 'addSearchBtn',
    SEARCH_HIGHLIGHT_MODE_SELECTOR: 'searchHighlightModeSelector',

    // Toggle buttons
    AGGREGATE_TOGGLE: 'aggregateToggle',
    EMPTY_DASH_TOGGLE: 'emptyDashToggle',
    RAINBOW_BG_TOGGLE: 'rainbowBgToggle',
    RAINBOW_TEXT_TOGGLE: 'rainbowTextToggle',
    HIDE_EMPTY_COLS_TOGGLE: 'hideEmptyColsToggle',
    THEME_TOGGLE: 'themeToggle',
    FULL_WIDTH_TOGGLE: 'fullWidthToggle',

    // Navigation arrows
    ROW_NAV_UP: 'rowNavUp',
    ROW_NAV_DOWN: 'rowNavDown',
    ROW_NAV_UP_COUNT: 'rowNavUpCount',
    ROW_NAV_DOWN_COUNT: 'rowNavDownCount',

    // Selection controls
    SELECTION_ACTIONS: 'selectionActions',
    SELECTED_DISPLAY: 'selectedDisplay',
    SELECTED_ROWS: 'selectedRows',
    CLEAR_SELECTION_BTN: 'clearSelectionBtn',
    DELETE_SELECTED_BTN: 'deleteSelectedBtn',
    MOVE_TO_TAB_BTN: 'moveToTabBtn',

    // Header actions
    UNDO_CHANGES_BTN: 'undoChangesBtn',
    EXPORT_BTN: 'exportBtn',
    EXPORT_MENU: 'exportMenu',
    EXPORT_SELECTED_OPTION: 'exportSelectedOption',
    EXPORT_DESELECTED_OPTION: 'exportDeselectedOption',

    // Modification indicator
    MODIFICATION_INDICATOR: 'modificationIndicator',
    MOD_ROWS_DELETED: 'modRowsDeleted',
    MOD_ROWS_CHANGED: 'modRowsChanged',
    MOD_COLS_ADDED: 'modColsAdded',
    MOD_COLS_DELETED: 'modColsDeleted',
    MOD_COLS_REORDERED: 'modColsReordered',

    // Add column modal
    ADD_COLUMN_MODAL: 'addColumnModal',
    NEW_COLUMN_NAME: 'newColumnName',
    NEW_COLUMN_DEFAULT: 'newColumnDefault',
    CANCEL_ADD_COLUMN: 'cancelAddColumn',
    CONFIRM_ADD_COLUMN: 'confirmAddColumn',

    // Export filename modal
    EXPORT_FILENAME_MODAL: 'exportFilenameModal',
    EXPORT_FILENAME: 'exportFilename',
    CANCEL_EXPORT: 'cancelExport',
    CONFIRM_EXPORT: 'confirmExport',

    // Close tab confirmation modal
    CONFIRM_CLOSE_TAB_MODAL: 'confirmCloseTabModal',
    CANCEL_CLOSE_TAB: 'cancelCloseTab',
    CONFIRM_CLOSE_TAB: 'confirmCloseTab',

    // Move rows to tab modal
    MOVE_ROWS_MODAL: 'moveRowsModal',
    MOVE_ROWS_TAB_LIST: 'moveRowsTabList',
    NEW_TAB_NAME_GROUP: 'newTabNameGroup',
    NEW_TAB_NAME: 'newTabName',
    CANCEL_MOVE_ROWS: 'cancelMoveRows',
    CONFIRM_MOVE_ROWS: 'confirmMoveRows',

    // Dynamic elements (created at runtime)
    HEADER_CHECKBOX: 'headerCheckbox'
};
