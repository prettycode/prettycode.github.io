class CSVEditor {
    constructor() {
        this.originalData = [];
        this.currentData = [];
        this.headers = [];
        this.originalHeaders = [];
        this.selectedRows = new Set();
        this.filters = [];
        this.filterLogic = LOGIC.AND;
        this.filterAsHighlight = false;  // false = filter mode (default), true = highlight mode
        this.sortColumns = [];
        this.groupColumns = [];
        this.highlightTerms = [];
        this.searchLogic = LOGIC.AND;
        this.searchHighlightRow = true;  // true = highlight row, false = cell only
        this.collapsedGroups = new Set();
        this.isModified = false;
        this.editingCell = null;
        this.tableDensity = 'compact';
        this.showAggregates = false;
        this.showEmptyAsDash = false;
        this.rainbowBgColumns = false;
        this.rainbowTextColumns = false;
        this.fileName = '';
        this.isFullWidth = false;

        // Drag state
        this.draggedColIdx = null;
        this.dragGhost = null;

        // Insert position for new column
        this.insertColumnIdx = null;

        // Last clicked row for shift-select
        this.lastClickedRowIdx = null;

        // Modification tracking
        this.modStats = createModStats();
        this.modifiedCells = new Map();
        this.addedColumns = new Set();

        this.initializeElements();
        this.initializeManagers();
        this.attachEventListeners();
        this.renderTable();

        // Ensure export button is disabled until a CSV is imported
        this.exportBtn.disabled = true;
    }

    initializeManagers() {
        this.filterManager = new FilterManager(this);
        this.sortManager = new SortManager(this);
        this.groupManager = new GroupManager(this);
        this.searchManager = new SearchManager(this);
        this.columnManager = new ColumnManager(this);
        this.selectionManager = new SelectionManager(this);
    }

    initializeElements() {
        this.uploadZone = document.getElementById('uploadZone');
        this.fileInput = document.getElementById('fileInput');
        this.browseBtn = document.getElementById('browseBtn');
        this.editorSection = document.getElementById('editorSection');
        this.tableHead = document.getElementById('tableHead');
        this.tableBody = document.getElementById('tableBody');
        this.tableFoot = document.getElementById('tableFoot');
        this.filterControls = document.getElementById('filterControls');
        this.filterSelectsContainer = this.filterControls.querySelector('.filter-selects');
        this.addFilterBtn = document.getElementById('addFilterBtn');
        this.filterModeBtns = document.querySelectorAll('#filterModeSelector .density-btn');
        this.sortControls = document.getElementById('sortControls');
        this.sortSelectsContainer = this.sortControls.querySelector('.sort-selects');
        this.addSortBtn = document.getElementById('addSortBtn');
        this.groupControls = document.getElementById('groupControls');
        this.groupSelectsContainer = this.groupControls.querySelector('.group-selects');
        this.addGroupBtn = document.getElementById('addGroupBtn');
        this.searchControls = document.getElementById('searchControls');
        this.searchSelectsContainer = this.searchControls.querySelector('.search-selects');
        this.addSearchBtn = document.getElementById('addSearchBtn');
        this.searchHighlightModeBtns = document.querySelectorAll('#searchHighlightModeSelector .density-btn');

        // Aggregate toggle
        this.aggregateToggle = document.getElementById('aggregateToggle');
        this.emptyDashToggle = document.getElementById('emptyDashToggle');
        this.rainbowBgToggle = document.getElementById('rainbowBgToggle');
        this.rainbowTextToggle = document.getElementById('rainbowTextToggle');
        this.controlsToggle = document.getElementById('controlsToggle');
        this.controlsPanel = document.getElementById('controlsPanel');

        // Navigation arrows
        this.tableScroll = document.getElementById('tableScroll');
        this.rowNavUp = document.getElementById('rowNavUp');
        this.rowNavDown = document.getElementById('rowNavDown');
        this.rowNavUpCount = document.getElementById('rowNavUpCount');
        this.rowNavDownCount = document.getElementById('rowNavDownCount');
        this.clearSelectionBtn = document.getElementById('clearSelectionBtn');
        this.deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
        this.importBtn = document.getElementById('importBtn');
        this.undoChangesBtn = document.getElementById('undoChangesBtn');
        this.exportBtn = document.getElementById('exportBtn');
        this.exportMenu = document.getElementById('exportMenu');
        this.exportSelectedOption = document.getElementById('exportSelectedOption');
        this.exportDeselectedOption = document.getElementById('exportDeselectedOption');
        this.tableTitleText = document.getElementById('tableTitleText');
        this.tableRowCount = document.getElementById('tableRowCount');
        this.selectedRowsSpan = document.getElementById('selectedRows');
        this.selectedDisplay = document.getElementById('selectedDisplay');
        this.selectionActions = document.getElementById('selectionActions');
        this.modificationIndicator = document.getElementById('modificationIndicator');
        this.densityBtns = document.querySelectorAll('.density-btn[data-density]');
        this.tableElement = document.querySelector('table');

        // Add column modal elements
        this.addColumnModal = document.getElementById('addColumnModal');
        this.newColumnNameInput = document.getElementById('newColumnName');
        this.newColumnDefaultInput = document.getElementById('newColumnDefault');
        this.cancelAddColumnBtn = document.getElementById('cancelAddColumn');
        this.confirmAddColumnBtn = document.getElementById('confirmAddColumn');
        
        // Confirm import modal elements
        this.confirmImportModal = document.getElementById('confirmImportModal');
        this.cancelImportBtn = document.getElementById('cancelImport');
        this.confirmImportBtn = document.getElementById('confirmImport');
        
        // Theme toggle
        this.themeToggle = document.getElementById('themeToggle');
        this.themeIcon = this.themeToggle.querySelector('.theme-icon');

        // Full-width toggle
        this.fullWidthToggle = document.getElementById('fullWidthToggle');
        this.appContainer = document.querySelector('.app-container');
    }

    attachEventListeners() {
        // File upload
        this.browseBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Drag and drop files
        this.uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadZone.classList.add('drag-over');
        });
        this.uploadZone.addEventListener('dragleave', () => {
            this.uploadZone.classList.remove('drag-over');
        });
        this.uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadZone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file && file.name.endsWith('.csv')) {
                this.loadFile(file);
            } else {
                showToast('Please drop a valid CSV file', 'error');
            }
        });

        // Filter controls
        this.filterSelectsContainer.addEventListener('change', (e) => {
            if (e.target.classList.contains('filter-column-select')) {
                this.populateFilterValueSelect(e.target);
                this.updateFilters();
            }
            if (e.target.classList.contains('filter-value-select')) {
                this.updateFilters();
            }
        });
        this.filterSelectsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-filter')) {
                const wrapper = e.target.closest('.filter-select-wrapper');
                if (wrapper) {
                    wrapper.remove();
                    // If no filters left, add a fresh empty one
                    if (this.filterSelectsContainer.children.length === 0) {
                        this.filterSelectsContainer.appendChild(this.createFilterSelect(0));
                    }
                    this.updateFilters();
                    this.updateFilterSelectLevels();
                }
            }
        });
        this.addFilterBtn.addEventListener('click', () => this.addFilterLevel());
        this.filterModeBtns.forEach(btn => {
            btn.addEventListener('click', () => this.setFilterMode(btn.dataset.filterMode));
        });

        // Sort controls
        this.sortSelectsContainer.addEventListener('change', (e) => {
            if (e.target.classList.contains('sort-column-select') || 
                e.target.classList.contains('sort-direction-select')) {
                this.updateSortColumns();
            }
        });
        this.sortSelectsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-sort')) {
                const wrapper = e.target.closest('.sort-select-wrapper');
                if (wrapper) {
                    wrapper.remove();
                    // If no sorts left, add a fresh empty one
                    if (this.sortSelectsContainer.children.length === 0) {
                        this.sortSelectsContainer.appendChild(this.createSortSelect(0));
                    }
                    this.updateSortColumns();
                    this.updateSortSelectLevels();
                }
            }
        });
        this.addSortBtn.addEventListener('click', () => this.addSortLevel());
        
        // Group controls
        this.groupSelectsContainer.addEventListener('change', (e) => {
            if (e.target.classList.contains('group-column-select')) {
                this.updateGroupColumns();
            }
        });
        this.groupSelectsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-group')) {
                const wrapper = e.target.closest('.group-select-wrapper');
                if (wrapper) {
                    wrapper.remove();
                    // If no groups left, add a fresh empty one
                    if (this.groupSelectsContainer.children.length === 0) {
                        this.groupSelectsContainer.appendChild(this.createGroupSelect(0));
                    }
                    this.updateGroupColumns();
                    this.updateGroupSelectLevels();
                }
            }
        });
        this.addGroupBtn.addEventListener('click', () => this.addGroupLevel());
        
        // Search controls
        this.searchSelectsContainer.addEventListener('input', (e) => {
            if (e.target.classList.contains('search-value-input')) {
                this.updateSearch();
            }
        });
        this.searchSelectsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-search')) {
                e.target.closest('.search-select-wrapper').remove();
                // If no searches left, add a fresh empty one
                if (this.searchSelectsContainer.children.length === 0) {
                    this.searchSelectsContainer.appendChild(this.createSearchSelect(0));
                }
                this.updateSearch();
                this.updateSearchSelectLevels();
            }
        });
        this.addSearchBtn.addEventListener('click', () => this.addSearchLevel());
        this.searchHighlightModeBtns.forEach(btn => {
            btn.addEventListener('click', () => this.setSearchHighlightMode(btn.dataset.highlightMode));
        });

        // Navigation arrows
        this.tableScroll.addEventListener('scroll', () => this.updateNavArrows());
        this.rowNavUp.addEventListener('click', () => this.scrollToMatchingRow('up'));
        this.rowNavDown.addEventListener('click', () => this.scrollToMatchingRow('down'));
        
        // Aggregate toggle
        this.aggregateToggle.addEventListener('click', () => this.toggleAggregates());
        this.emptyDashToggle.addEventListener('click', () => this.toggleEmptyAsDash());
        this.rainbowBgToggle.addEventListener('click', () => this.toggleRainbowBg());
        this.rainbowTextToggle.addEventListener('click', () => this.toggleRainbowText());
        this.controlsToggle.addEventListener('click', () => this.toggleControlsPanel());
        window.addEventListener('resize', () => this.updateNavArrows());

        // Selection buttons
        this.clearSelectionBtn.addEventListener('click', () => this.deselectAll());
        this.deleteSelectedBtn.addEventListener('click', () => this.deleteSelected());

        // Header actions
        this.importBtn.addEventListener('click', () => this.handleImportClick());
        this.undoChangesBtn.addEventListener('click', () => this.undoChanges());
        
        // Export dropdown
        this.exportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // If no rows selected, export all directly
            if (this.selectedRows.size === 0) {
                this.exportCSV('all');
            } else {
                this.exportMenu.classList.toggle('hidden');
            }
        });
        
        document.addEventListener('click', (e) => {
            if (!this.exportMenu.classList.contains('hidden') && 
                !e.target.closest('.export-dropdown')) {
                this.exportMenu.classList.add('hidden');
            }
        });
        
        this.exportMenu.addEventListener('click', (e) => {
            const option = e.target.closest('.export-option');
            if (option && !option.disabled) {
                const exportType = option.dataset.export;
                this.exportCSV(exportType);
                this.exportMenu.classList.add('hidden');
            }
        });

        // Add column modal
        this.cancelAddColumnBtn.addEventListener('click', () => this.hideAddColumnModal());
        this.confirmAddColumnBtn.addEventListener('click', () => this.addColumn());
        this.addColumnModal.addEventListener('click', (e) => {
            if (e.target === this.addColumnModal) {
                this.hideAddColumnModal();
            }
        });
        this.newColumnNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.addColumn();
            } else if (e.key === 'Escape') {
                this.hideAddColumnModal();
            }
        });

        // Confirm import modal
        this.cancelImportBtn.addEventListener('click', () => this.hideConfirmImportModal());
        this.confirmImportBtn.addEventListener('click', () => {
            this.hideConfirmImportModal();
            this.fileInput.click();
        });
        this.confirmImportModal.addEventListener('click', (e) => {
            if (e.target === this.confirmImportModal) {
                this.hideConfirmImportModal();
            }
        });

        // Density selector
        this.densityBtns.forEach(btn => {
            btn.addEventListener('click', () => this.setDensity(btn.dataset.density));
        });
        
        // Theme toggle
        this.themeToggle.addEventListener('click', () => this.toggleTheme());

        // Full-width toggle
        this.fullWidthToggle.addEventListener('click', () => this.toggleFullWidth());

        // Initialize theme from localStorage or system preference
        this.initTheme();

        // Initialize full-width from localStorage
        this.initFullWidth();

        // Initialize density from localStorage
        this.initDensity();
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.loadFile(file);
        }
    }

    loadFile(file) {
        this.fileName = file.name;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                this.parseCSV(content);
                this.showEditor();
                showToast(`Loaded ${file.name} successfully`, 'success');
            } catch (error) {
                showToast('Error parsing CSV file', 'error');
                console.error(error);
            }
        };
        reader.readAsText(file);
    }

    parseCSV(content) {
        const rows = this.parseCSVContent(content);
        if (rows.length === 0) {
            throw new Error('Empty CSV file');
        }

        this.headers = rows[0];
        this.originalHeaders = [...this.headers];
        this.originalData = [];
        this.currentData = [];

        for (let i = 1; i < rows.length; i++) {
            const values = rows[i];
            const row = {};
            for (let idx = 0; idx < this.headers.length; idx++) {
                row[idx] = idx < values.length ? values[idx] : '';
            }
            this.originalData.push(row);
        }

        this.currentData = JSON.parse(JSON.stringify(this.originalData));
        this.selectedRows.clear();
        this.lastClickedRowIdx = null;
        this.isModified = false;
        this.collapsedGroups.clear();
        this.filters = [];
        this.filterLogic = LOGIC.AND;
        this.filterAsHighlight = false;
        this.filterModeBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filterMode === 'filter');
        });
        this.highlightTerms = [];
        this.searchLogic = LOGIC.AND;
        this.sortColumns = [];
        this.groupColumns = [];
        this.modStats = createModStats();
        this.modifiedCells = new Map();
        this.addedColumns = new Set();

        // Clear search and reset
        if (this.searchSelectsContainer) {
            this.searchSelectsContainer.innerHTML = '';
            this.searchSelectsContainer.appendChild(this.createSearchSelect(0));
        }
    }

    parseCSVContent(content) {
        const rows = [];
        let currentRow = [];
        let currentValue = '';
        let inQuotes = false;
        
        for (let i = 0; i < content.length; i++) {
            const char = content[i];
            const nextChar = content[i + 1];
            
            if (inQuotes) {
                if (char === '"' && nextChar === '"') {
                    currentValue += '"';
                    i++;
                } else if (char === '"') {
                    inQuotes = false;
                } else {
                    currentValue += char;
                }
            } else {
                if (char === '"') {
                    inQuotes = true;
                } else if (char === ',') {
                    currentRow.push(currentValue);
                    currentValue = '';
                } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
                    currentRow.push(currentValue);
                    if (currentRow.length > 0 && currentRow.some(v => v.trim() !== '')) {
                        rows.push(currentRow);
                    }
                    currentRow = [];
                    currentValue = '';
                    if (char === '\r') i++;
                } else if (char !== '\r') {
                    currentValue += char;
                }
            }
        }
        
        if (currentValue || currentRow.length > 0) {
            currentRow.push(currentValue);
            if (currentRow.some(v => v.trim() !== '')) {
                rows.push(currentRow);
            }
        }
        
        return rows;
    }

    showEditor() {
        this.uploadZone.classList.add('hidden');
        this.editorSection.classList.remove('hidden');
        this.exportBtn.disabled = false;
        this.undoChangesBtn.classList.add('hidden');
        this.modificationIndicator.classList.add('hidden');
        
        // Hide dropdown arrow initially (no rows selected)
        const dropdownArrow = this.exportBtn.querySelector('.dropdown-arrow');
        if (dropdownArrow) {
            dropdownArrow.style.display = 'none';
        }

        this.populateDropdowns();
        this.renderTable();
    }

    populateDropdowns() {
        // Filter dropdowns
        this.filterSelectsContainer.innerHTML = '';
        const firstFilterSelect = this.createFilterSelect(0);
        this.filterSelectsContainer.appendChild(firstFilterSelect);
        this.filters = [];
        
        // Sort dropdowns
        this.sortSelectsContainer.innerHTML = '';
        const firstSortSelect = this.createSortSelect(0);
        this.sortSelectsContainer.appendChild(firstSortSelect);
        this.sortColumns = [];
        
        // Group dropdowns
        this.groupSelectsContainer.innerHTML = '';
        const firstGroupSelect = this.createGroupSelect(0);
        this.groupSelectsContainer.appendChild(firstGroupSelect);
        this.groupColumns = [];
    }

    createFilterSelect(level, showRemove = false) {
        return this.filterManager.createSelect(level, showRemove);
    }

    /**
     * Creates a logic toggle button (AND/OR) for filter or search
     */
    createLogicToggle(type) {
        const isFilter = type === 'filter';
        const logic = isFilter ? this.filterLogic : this.searchLogic;

        const toggle = document.createElement('button');
        toggle.className = `${type}-logic-toggle`;
        toggle.textContent = logic;
        toggle.classList.toggle('active-or', logic === LOGIC.OR);
        toggle.title = 'Click to toggle AND/OR';
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            if (isFilter) {
                this.filterLogic = this.filterLogic === LOGIC.AND ? LOGIC.OR : LOGIC.AND;
                this.updateLogicToggles('filter');
                this.updateFilters();
            } else {
                this.searchLogic = this.searchLogic === LOGIC.AND ? LOGIC.OR : LOGIC.AND;
                this.updateLogicToggles('search');
                this.updateSearch();
            }
        });
        return toggle;
    }

    /**
     * Updates all logic toggles for a given type (filter or search)
     */
    updateLogicToggles(type) {
        const isFilter = type === 'filter';
        const container = isFilter ? this.filterSelectsContainer : this.searchSelectsContainer;
        const logic = isFilter ? this.filterLogic : this.searchLogic;

        container.querySelectorAll(`.${type}-logic-toggle`).forEach(toggle => {
            toggle.textContent = logic;
            toggle.classList.toggle('active-or', logic === LOGIC.OR);
        });
    }


    populateFilterValueSelect(colSelect) {
        this.filterManager.populateValueSelect(colSelect);
    }

    addFilterLevel() {
        this.filterManager.addLevel();
    }

    updateFilters() {
        this.filterManager.update();
    }

    /**
     * Generic method to update select levels for filter/sort/group controls
     */
    updateSelectLevels(config) {
        const {
            container,
            wrapperClass,
            colSelectClass,
            removeClass,
            indicatorClass,
            logicClass,
            extraSelectClass,
            placeholders,
            removeTitle,
            type
        } = config;

        const wrappers = container.querySelectorAll(`.${wrapperClass}`);
        wrappers.forEach((wrapper, idx) => {
            const colSelect = wrapper.querySelector(`.${colSelectClass}`);
            colSelect.dataset.level = idx;

            // Update extra select level if present
            if (extraSelectClass) {
                const extraSelect = wrapper.querySelector(`.${extraSelectClass}`);
                if (extraSelect) extraSelect.dataset.level = idx;
            }

            // Update placeholder text
            const firstOption = colSelect.querySelector('option[value=""]');
            if (firstOption) {
                firstOption.textContent = idx === 0 ? placeholders[0] : placeholders[1];
            }

            // Handle indicator (→ for sort/group)
            if (indicatorClass) {
                const indicator = wrapper.querySelector(`.${indicatorClass}`);
                if (idx === 0 && indicator) {
                    indicator.remove();
                } else if (idx > 0 && !indicator) {
                    wrapper.insertBefore(createIndicator(indicatorClass, '→'), colSelect);
                }
            }

            // Handle logic toggle (AND/OR for filter/search)
            if (logicClass && type) {
                const logicToggle = wrapper.querySelector(`.${logicClass}`);
                if (idx === 0 && logicToggle) {
                    logicToggle.remove();
                } else if (idx > 0 && !logicToggle) {
                    wrapper.insertBefore(this.createLogicToggle(type), colSelect);
                }
            }

            // Handle remove button
            const removeBtn = wrapper.querySelector(`.${removeClass}`);

            // For first row: only show remove if selection is complete
            if (idx === 0) {
                let isComplete = false;

                if (type === 'filter') {
                    const valueSelect = wrapper.querySelector(`.${extraSelectClass}`);
                    isComplete = colSelect.value !== '' &&
                        valueSelect && !valueSelect.disabled &&
                        valueSelect.value !== FILTER_VALUES.PLACEHOLDER;
                } else if (type === 'sort' || type === 'group') {
                    isComplete = colSelect.value !== '';
                } else if (type === 'search') {
                    const input = wrapper.querySelector('.search-value-input');
                    if (input) {
                        const term = input.value.trim();
                        isComplete = term === UI.EMPTY_CELL_SEARCH || term.length >= UI.MIN_SEARCH_CHARS;
                    }
                }

                if (isComplete && !removeBtn) {
                    wrapper.appendChild(createRemoveButton(removeClass, removeTitle));
                } else if (!isComplete && removeBtn) {
                    removeBtn.remove();
                }
            } else {
                // All other rows always have remove button
                if (!removeBtn) {
                    wrapper.appendChild(createRemoveButton(removeClass, removeTitle));
                }
            }
        });
    }

    updateFilterSelectLevels() {
        this.filterManager.updateLevels();
    }

    createSortSelect(level, showRemove = false) {
        return this.sortManager.createSelect(level, showRemove);
    }

    addSortLevel() {
        this.sortManager.addLevel();
    }

    updateSortColumns() {
        this.sortManager.update();
    }

    updateSortSelectLevels() {
        this.sortManager.updateLevels();
    }

    createGroupSelect(level, showRemove = false) {
        return this.groupManager.createSelect(level, showRemove);
    }

    addGroupLevel() {
        this.groupManager.addLevel();
    }

    updateGroupColumns() {
        this.groupManager.update();
    }

    updateGroupSelectLevels() {
        this.groupManager.updateLevels();
    }

    updateGroupCounts() {
        this.groupManager.updateCounts();
    }

    updateFilterCounts() {
        this.filterManager.updateCounts();
    }

    updateSearchCounts() {
        this.searchManager.updateCounts();
    }

    createSearchSelect(level, showRemove = false) {
        return this.searchManager.createSelect(level, showRemove);
    }

    addSearchLevel() {
        this.searchManager.addLevel();
    }

    updateSearch() {
        this.searchManager.update();
    }

    clearSearch() {
        this.searchManager.clear();
    }

    updateSearchSelectLevels() {
        this.searchManager.updateLevels();
    }

    setSearchHighlightMode(mode) {
        this.searchManager.setMode(mode);
    }

    setFilterMode(mode) {
        this.filterManager.setMode(mode);
    }

    getMatchingRows() {
        return this.selectionManager.getMatchingRows();
    }

    updateNavArrows() {
        this.selectionManager.updateNavArrows();
    }

    scrollToMatchingRow(direction) {
        this.selectionManager.scrollToMatchingRow(direction);
    }

    /**
     * Applies column-level styling classes to a cell element.
     * REQUIREMENT: The alignment of aggregate row cell values should be the
     * same as the alignment of non-aggregate row cell values for that column.
     * This method ensures consistent styling is applied to all cells in a column.
     */
    applyColumnClasses(td, colIdx) {
        if (this.addedColumns.has(colIdx)) {
            td.classList.add('col-added');
        }
        if (this.numericColumnsCache && this.numericColumnsCache.has(colIdx)) {
            td.classList.add('col-numeric');
        }
    }

    renderTable() {
        // Cache numeric columns for this render
        this.numericColumnsCache = new Set();
        this.timestampColumnsCache = new Set();
        this.headers.forEach((_, colIdx) => {
            if (this.isColumnNumeric(colIdx)) {
                this.numericColumnsCache.add(colIdx);
            } else if (this.isColumnTimestamp(colIdx)) {
                this.timestampColumnsCache.add(colIdx);
            }
        });

        // Only render header if we have data
        if (this.currentData.length > 0) {
            this.renderHeader();
        } else {
            this.tableHead.innerHTML = '';
        }
        this.renderBody();
        this.updateStats();
        // Update navigation arrows after render
        setTimeout(() => this.updateNavArrows(), 0);
        // Update group, filter, and search count badges
        this.updateGroupCounts();
        this.updateFilterCounts();
        this.updateSearchCounts();
    }

    renderHeader() {
        this.tableHead.innerHTML = '';
        const tr = document.createElement('tr');

        // Checkbox column
        const thCheckbox = document.createElement('th');
        thCheckbox.className = 'checkbox-col';
        thCheckbox.innerHTML = `
            <div class="th-content">
                <input type="checkbox" id="headerCheckbox">
            </div>
        `;
        tr.appendChild(thCheckbox);

        // Line number column with inserter for first position
        const thLineNum = document.createElement('th');
        thLineNum.className = 'line-num-col';
        thLineNum.innerHTML = `
            <div class="th-content">#</div>
            <button class="col-inserter" title="Insert column at start">+</button>
        `;
        tr.appendChild(thLineNum);

        // Add inserter click handler for first position
        const startInserter = thLineNum.querySelector('.col-inserter');
        startInserter.addEventListener('click', (e) => {
            e.stopPropagation();
            this.insertColumnIdx = 0;
            this.showAddColumnModal();
        });

        // Data columns
        this.headers.forEach((header, colIdx) => {
            const th = document.createElement('th');
            th.className = 'draggable';
            if (this.addedColumns.has(colIdx)) {
                th.classList.add('col-added');
            }
            if (this.numericColumnsCache && this.numericColumnsCache.has(colIdx)) {
                th.classList.add('col-numeric');
            }
            // Apply rainbow column coloring to header if enabled
            if (this.rainbowBgColumns) {
                th.style.backgroundColor = this.getRainbowColor(colIdx, this.headers.length, false);
            }
            if (this.rainbowTextColumns) {
                th.style.color = this.getRainbowColor(colIdx, this.headers.length, true);
            }
            th.dataset.column = colIdx;
            th.draggable = true;
            const colIdxStr = String(colIdx);

            // Check if this column is in the sort list
            const sortIndex = this.sortColumns.findIndex(s => s.column === colIdxStr);
            
            // Build sort indicator
            let sortIndicator = '';
            if (sortIndex >= 0) {
                const sortConfig = this.sortColumns[sortIndex];
                const arrow = sortConfig.direction === SORT_DIR.ASC ? '↑' : '↓';
                const isSecondary = sortIndex > 0;
                const showNumber = this.sortColumns.length > 1;
                
                const indicatorClass = isSecondary ? 'sort-indicator sort-secondary' : 'sort-indicator';
                const orderSpan = showNumber ? `<span class="sort-order">${sortIndex + 1}</span>` : '';
                
                sortIndicator = `<span class="${indicatorClass}">${arrow}${orderSpan}</span>`;
            }

            th.innerHTML = `
                <div class="th-content">
                    <span class="drag-handle">⋮⋮</span>
                    <span class="header-text">${header}</span>
                    ${sortIndicator}
                    <div class="header-controls">
                        <button class="delete-col-btn" title="Delete column">×</button>
                    </div>
                </div>
                <button class="col-inserter" title="Insert column after">+</button>
            `;

            // Click to sort
            const thContent = th.querySelector('.th-content');
            thContent.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-col-btn') || 
                    e.target.classList.contains('drag-handle')) {
                    return;
                }
                
                if (sortIndex === 0) {
                    this.sortColumns[0].direction = this.sortColumns[0].direction === SORT_DIR.ASC ? SORT_DIR.DESC : SORT_DIR.ASC;
                } else {
                    this.sortColumns = [{ column: colIdxStr, direction: SORT_DIR.ASC }];
                }
                this.syncSortSelectsFromState();
                this.applySort();
            });

            // Delete column button
            const deleteBtn = th.querySelector('.delete-col-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteColumn(colIdx);
            });

            // Column inserter
            const inserter = th.querySelector('.col-inserter');
            inserter.addEventListener('click', (e) => {
                e.stopPropagation();
                this.insertColumnIdx = colIdx + 1;
                this.showAddColumnModal();
            });

            // Drag events
            th.addEventListener('dragstart', (e) => this.handleDragStart(e, colIdx));
            th.addEventListener('dragend', (e) => this.handleDragEnd(e));
            th.addEventListener('dragover', (e) => this.handleDragOver(e, colIdx));
            th.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            th.addEventListener('drop', (e) => this.handleDrop(e, colIdx));

            tr.appendChild(th);
        });

        this.tableHead.appendChild(tr);

        // Header checkbox event
        document.getElementById('headerCheckbox').addEventListener('change', (e) => {
            if (e.target.checked) {
                this.selectAll();
            } else {
                this.deselectAll();
            }
        });
    }

    // Drag and drop handlers
    handleDragStart(e, colIdx) {
        this.columnManager.handleDragStart(e, colIdx);
    }

    handleDragEnd(e) {
        this.columnManager.handleDragEnd(e);
    }

    handleDragOver(e, colIdx) {
        this.columnManager.handleDragOver(e, colIdx);
    }

    handleDragLeave(e) {
        this.columnManager.handleDragLeave(e);
    }

    handleDrop(e, targetColIdx) {
        this.columnManager.handleDrop(e, targetColIdx);
    }

    moveColumn(fromIdx, toIdx, insertBefore) {
        this.columnManager.move(fromIdx, toIdx, insertBefore);
    }

    updateColumnReferences(fromIdx, toIdx) {
        this.columnManager.updateReferences(fromIdx, toIdx);
    }

    deleteColumn(colIdx) {
        this.columnManager.delete(colIdx);
    }

    updateColumnReferencesAfterDelete(deletedIdx) {
        this.columnManager.updateReferencesAfterDelete(deletedIdx);
    }

    syncSortSelectsFromState() {
        this.sortManager.syncFromState();
    }

    renderBody() {
        this.tableBody.innerHTML = '';
        this.tableFoot.innerHTML = '';
        this.currentLineNum = 0; // Reset line number counter
        let data = this.getFilteredData();

        // Show empty state message if no data
        if (data.length === 0 && this.currentData.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.className = 'empty-table-message';
            const emptyCell = document.createElement('td');
            emptyCell.colSpan = Math.max(this.headers.length + 2, 3); // +2 for checkbox and line number columns
            emptyCell.innerHTML = `
                <div class="empty-table-message-text">No data loaded. Import a CSV file to get started.</div>
            `;
            emptyRow.appendChild(emptyCell);
            this.tableBody.appendChild(emptyRow);
            return;
        }

        if (this.groupColumns.length > 0) {
            this.renderGroupedData(data, 0, '');
            // Add overall aggregates to the footer (sticky)
            if (this.showAggregates && data.length > 0) {
                this.renderAggregateRows(data, 'All', false, this.tableFoot);
            }
        } else {
            data.forEach((row, idx) => {
                const originalIdx = this.currentData.indexOf(row);
                this.currentLineNum++;
                this.tableBody.appendChild(this.createDataRow(row, originalIdx, this.currentLineNum));
            });
            // Add aggregate rows to the footer (sticky)
            if (this.showAggregates && data.length > 0) {
                this.renderAggregateRows(data, '', false, this.tableFoot);
            }
        }
    }

    renderGroupedData(data, level, parentPath) {
        if (level >= this.groupColumns.length) {
            data.forEach(row => {
                const originalIdx = this.currentData.indexOf(row);
                this.currentLineNum++;
                this.tableBody.appendChild(this.createDataRow(row, originalIdx, this.currentLineNum));
            });
            return;
        }

        const groupCol = this.groupColumns[level];
        const groups = {};
        data.forEach(row => {
            const groupValue = row[groupCol] || '(empty)';
            if (!groups[groupValue]) {
                groups[groupValue] = [];
            }
            groups[groupValue].push(row);
        });

        const sortedGroups = Object.keys(groups).sort();
        const groupHeaderName = this.headers[groupCol];
        const indent = level * UI.GROUP_INDENT_PX;

        sortedGroups.forEach(groupValue => {
            const groupRows = groups[groupValue];
            const groupPath = parentPath ? `${parentPath}|${groupValue}` : groupValue;
            const isCollapsed = this.collapsedGroups.has(groupPath);

            const headerTr = document.createElement('tr');
            headerTr.className = 'group-header';
            headerTr.dataset.level = level;
            const headerTd = document.createElement('td');
            headerTd.colSpan = this.headers.length + 2; // +2 for checkbox and line number columns
            headerTd.innerHTML = `
                <span class="group-toggle" style="padding-left: ${indent}px;">
                    <span class="group-toggle-icon ${isCollapsed ? 'collapsed' : ''}">▼</span>
                    <span class="group-label"><b>${groupHeaderName}</b> = <b>${groupValue}</b></span>
                    <span class="group-count">(<span class="group-count-num">${groupRows.length}</span> rows)</span>
                </span>
            `;
            headerTd.addEventListener('click', () => {
                if (this.collapsedGroups.has(groupPath)) {
                    this.collapsedGroups.delete(groupPath);
                } else {
                    this.collapsedGroups.add(groupPath);
                }
                this.renderTable();
            });
            headerTr.appendChild(headerTd);
            this.tableBody.appendChild(headerTr);

            if (!isCollapsed) {
                this.renderGroupedData(groupRows, level + 1, groupPath);
                
                // Add aggregate rows for this group at the deepest level
                // REQUIREMENT: Do not show aggregates for a group if the count of rows in that group is only 1
                if (this.showAggregates && level === this.groupColumns.length - 1 && groupRows.length > 1) {
                    this.renderAggregateRows(groupRows, '', true);
                }
            }
        });
    }

    createDataRow(row, idx, lineNum) {
        const tr = document.createElement('tr');
        tr.dataset.index = idx;

        if (this.selectedRows.has(idx)) {
            tr.classList.add('selected');
        }

        const tdCheckbox = document.createElement('td');
        tdCheckbox.className = 'checkbox-col';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = this.selectedRows.has(idx);
        checkbox.addEventListener('click', (e) => {
            if (e.shiftKey && this.lastClickedRowIdx !== null) {
                // Shift-click: select range
                const start = Math.min(this.lastClickedRowIdx, idx);
                const end = Math.max(this.lastClickedRowIdx, idx);
                const filteredData = this.getFilteredData();
                const visibleIndices = filteredData.map(r => this.currentData.indexOf(r));
                
                // Select all visible rows in range
                for (const visibleIdx of visibleIndices) {
                    if (visibleIdx >= start && visibleIdx <= end) {
                        this.selectedRows.add(visibleIdx);
                    }
                }
                
                this.renderTable();
                this.updateSelectionUI();
                e.preventDefault();
            } else {
                // Normal click
                if (checkbox.checked) {
                    this.selectedRows.add(idx);
                    tr.classList.add('selected');
                } else {
                    this.selectedRows.delete(idx);
                    tr.classList.remove('selected');
                }
                this.lastClickedRowIdx = idx;
                this.updateSelectionUI();
            }
        });
        tdCheckbox.appendChild(checkbox);
        tr.appendChild(tdCheckbox);

        // Line number cell
        const tdLineNum = document.createElement('td');
        tdLineNum.className = 'line-num-col';
        tdLineNum.textContent = lineNum;
        
        // Check if this row has any modified cells
        if (this.modifiedCells.has(idx)) {
            tdLineNum.classList.add('row-modified');
        }
        tr.appendChild(tdLineNum);

        // Get modified cells for this row
        const modifiedColsForRow = this.modifiedCells.get(idx) || new Set();
        
        // Track which search terms match which cells
        const cellMatchesTerms = new Map(); // colIdx -> Set of matching term indices
        const termFoundInRow = new Set(); // Which terms have been found anywhere in row

        this.headers.forEach((header, colIdx) => {
            const td = document.createElement('td');
            td.className = 'editable-cell';

            this.applyColumnClasses(td, colIdx);

            // Check if this specific cell was modified
            if (modifiedColsForRow.has(colIdx)) {
                td.classList.add('cell-modified');
            }
            
            const cellValue = row[colIdx] || '';
            // Display dash for empty cells if setting is enabled
            if (cellValue === '' && this.showEmptyAsDash) {
                td.textContent = '—';
                td.classList.add('empty-cell-dash');
            } else {
                td.textContent = cellValue;
            }
            // Apply rainbow column coloring if enabled
            if (this.rainbowBgColumns) {
                td.style.backgroundColor = this.getRainbowColor(colIdx, this.headers.length, false);
            }
            if (this.rainbowTextColumns) {
                td.style.color = this.getRainbowColor(colIdx, this.headers.length, true);
            }
            td.dataset.column = colIdx;
            td.dataset.index = idx;
            
            // Check for highlight matches
            if (this.highlightTerms && this.highlightTerms.length > 0) {
                const cellLower = cellValue.toLowerCase();
                const matchingTerms = new Set();

                this.highlightTerms.forEach((searchObj, termIdx) => {
                    // searchObj is { term: string|Symbol, caseSensitive: boolean }
                    let matches;
                    if (searchObj.term === EMPTY_CELL_MARKER) {
                        // Special case: EMPTY_CELL_MARKER matches empty cells
                        matches = cellValue === '';
                    } else if (searchObj.caseSensitive) {
                        // Case-sensitive match (quoted search)
                        matches = cellValue.includes(searchObj.term);
                    } else {
                        // Case-insensitive match (unquoted search)
                        matches = cellLower.includes(searchObj.term);
                    }
                    if (matches) {
                        matchingTerms.add(termIdx);
                        termFoundInRow.add(termIdx);
                    }
                });

                if (matchingTerms.size > 0) {
                    cellMatchesTerms.set(colIdx, matchingTerms);
                }
            }

            td.addEventListener('dblclick', () => this.startEditing(td, idx, colIdx));
            tr.appendChild(td);
        });
        
        // Determine if row should be highlighted based on AND/OR logic
        let rowHasHighlight = false;
        if (this.highlightTerms && this.highlightTerms.length > 0) {
            if (this.searchLogic === LOGIC.AND) {
                // All terms must be found somewhere in the row
                rowHasHighlight = termFoundInRow.size === this.highlightTerms.length;
            } else {
                // Any term found
                rowHasHighlight = termFoundInRow.size > 0;
            }
        }

        // Apply highlighting to matching cells and row
        if (rowHasHighlight) {
            // Always mark row as having a match (for navigation)
            tr.classList.add('row-has-match');

            // Always highlight matching cells (for text emphasis)
            const cells = tr.querySelectorAll('td.editable-cell');
            cells.forEach((td, colIdx) => {
                if (cellMatchesTerms.has(colIdx)) {
                    td.classList.add('cell-highlighted');
                }
            });

            // Row mode: also highlight entire row
            if (this.searchHighlightRow) {
                tr.classList.add('row-highlighted');
            }
        }

        // Apply filter highlighting when in highlight mode
        if (this.filterAsHighlight && this.filters.length > 0) {
            const matchFunction = filterConfig => {
                const cellValue = String(row[filterConfig.column] || '');
                if (filterConfig.isEmpty) {
                    return cellValue === '';
                }
                return cellValue === filterConfig.value;
            };

            let filterMatches;
            if (this.filterLogic === LOGIC.OR) {
                filterMatches = this.filters.some(matchFunction);
            } else {
                filterMatches = this.filters.every(matchFunction);
            }

            if (filterMatches) {
                tr.classList.add('row-highlighted');
                tr.classList.add('row-has-match');
            }
        }

        return tr;
    }

    toggleAggregates() {
        this.showAggregates = !this.showAggregates;
        this.aggregateToggle.classList.toggle('active', this.showAggregates);
        this.renderTable();
    }

    toggleEmptyAsDash() {
        this.showEmptyAsDash = !this.showEmptyAsDash;
        this.emptyDashToggle.classList.toggle('active', this.showEmptyAsDash);
        this.renderTable();
    }

    toggleRainbowBg() {
        this.rainbowBgColumns = !this.rainbowBgColumns;
        this.rainbowBgToggle.classList.toggle('active', this.rainbowBgColumns);
        this.renderTable();
    }

    toggleRainbowText() {
        this.rainbowTextColumns = !this.rainbowTextColumns;
        this.rainbowTextToggle.classList.toggle('active', this.rainbowTextColumns);
        this.renderTable();
    }

    // Calculate a distinct color for a column using HSL color space
    getRainbowColor(colIdx, totalCols, forText = false) {
        // Use golden ratio offset to maximize visual distinction between adjacent columns
        const goldenAngle = 137.508;
        const adjustedHue = (colIdx * goldenAngle) % 360;
        // Check if dark theme is active
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

        if (forText) {
            if (isDark) {
                // Dark theme: bright, vivid colors - uniform treatment works well
                return `hsl(${adjustedHue}, 100%, 65%)`;
            } else {
                // Light theme: need hue-aware adjustment because perceived brightness varies
                // Yellow/lime (45-90°) and cyan (170-200°) appear brightest, need darker values
                // Red, blue, purple can be lighter while maintaining readability
                let lightness;
                const hue = adjustedHue;

                if ((hue >= 45 && hue <= 90) || (hue >= 170 && hue <= 200)) {
                    // Yellow, lime, cyan - need much darker for contrast
                    lightness = 32;
                } else if ((hue >= 30 && hue < 45) || (hue > 90 && hue <= 120) || (hue > 150 && hue < 170)) {
                    // Orange, green, teal - moderately dark
                    lightness = 38;
                } else {
                    // Red, magenta, purple, blue - can be slightly lighter
                    lightness = 45;
                }
                return `hsl(${hue}, 90%, ${lightness}%)`;
            }
        } else {
            // Background colors: subtle pastels
            // Light theme: high lightness, low saturation for subtle pastels
            // Dark theme: low lightness, moderate saturation
            const saturation = isDark ? 40 : 55;
            const lightness = isDark ? 20 : 92;
            return `hsl(${adjustedHue}, ${saturation}%, ${lightness}%)`;
        }
    }

    toggleControlsPanel() {
        const isHidden = this.controlsPanel.classList.contains('hidden');
        this.controlsPanel.classList.toggle('hidden');
        this.controlsToggle.classList.toggle('active', isHidden);
    }

    isColumnNumeric(colIdx) {
        // Check if all non-empty values in a column are numeric
        for (const row of this.currentData) {
            const val = row[colIdx];
            if (!isEmpty(val)) {
                // Check that the entire string is a valid number
                const trimmed = String(val).trim();
                if (trimmed === '') continue;
                // Use Number() instead of parseFloat to ensure entire string is numeric
                const num = Number(trimmed);
                if (isNaN(num)) {
                    return false;
                }
            }
        }
        return true;
    }

    parseTimestamp(val) {
        // Try to parse a value as a timestamp, return Date object or null
        if (!val || typeof val !== 'string') return null;
        
        const trimmed = val.trim();
        if (!trimmed) return null;
        
        // Try native Date parsing first (handles ISO 8601 and many formats)
        const date = new Date(trimmed);
        if (!isNaN(date.getTime())) {
            return date;
        }
        
        // Try common date formats that Date() might not handle
        // DD/MM/YYYY or DD-MM-YYYY
        const ddmmyyyy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (ddmmyyyy) {
            const [, day, month, year] = ddmmyyyy;
            const d = new Date(year, month - 1, day);
            if (!isNaN(d.getTime())) return d;
        }
        
        return null;
    }

    /**
     * Formats elapsed time in milliseconds to a human-readable string.
     * For aggregate "total" on date-type columns, shows elapsed time between min and max.
     */
    formatElapsedTime(ms) {
        if (ms === 0) return '0s';

        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        const years = Math.floor(days / 365);

        const parts = [];

        if (years > 0) {
            parts.push(`${years}y`);
            const remainingDays = days % 365;
            if (remainingDays > 0) parts.push(`${remainingDays}d`);
        } else if (days > 0) {
            parts.push(`${days}d`);
            const remainingHours = hours % 24;
            if (remainingHours > 0) parts.push(`${remainingHours}h`);
        } else if (hours > 0) {
            parts.push(`${hours}h`);
            const remainingMinutes = minutes % 60;
            if (remainingMinutes > 0) parts.push(`${remainingMinutes}m`);
        } else if (minutes > 0) {
            parts.push(`${minutes}m`);
            const remainingSeconds = seconds % 60;
            if (remainingSeconds > 0) parts.push(`${remainingSeconds}s`);
        } else {
            parts.push(`${seconds}s`);
        }

        return parts.join(' ');
    }

    isColumnTimestamp(colIdx) {
        // Check if all non-empty values in a column are valid timestamps
        // Must have at least one non-empty value
        let hasValue = false;
        
        for (const row of this.currentData) {
            const val = row[colIdx];
            if (!isEmpty(val)) {
                hasValue = true;
                if (this.parseTimestamp(val) === null) {
                    return false;
                }
            }
        }
        return hasValue;
    }

    calculateAggregates(data) {
        const aggregates = {};
        
        this.headers.forEach((header, colIdx) => {
            if (this.numericColumnsCache && this.numericColumnsCache.has(colIdx)) {
                const rawValues = data
                    .map(row => row[colIdx])
                    .filter(val => !isEmpty(val));
                
                // Calculate max decimal precision from original string values
                let maxPrecision = 0;
                rawValues.forEach(val => {
                    const str = String(val);
                    const decimalIdx = str.indexOf('.');
                    if (decimalIdx !== -1) {
                        const precision = str.length - decimalIdx - 1;
                        maxPrecision = Math.max(maxPrecision, precision);
                    }
                });
                
                const values = rawValues.map(val => parseFloat(val));
                
                if (values.length > 0) {
                    const sum = values.reduce((a, b) => a + b, 0);
                    aggregates[colIdx] = {
                        type: 'numeric',
                        precision: maxPrecision,
                        total: sum,
                        min: Math.min(...values),
                        max: Math.max(...values),
                        avg: sum / values.length,
                        count: values.length
                    };
                }
            } else if (this.timestampColumnsCache && this.timestampColumnsCache.has(colIdx)) {
                const dates = data
                    .map(row => row[colIdx])
                    .filter(val => !isEmpty(val))
                    .map(val => this.parseTimestamp(val))
                    .filter(d => d !== null);

                if (dates.length > 0) {
                    const timestamps = dates.map(d => d.getTime());
                    const minTime = Math.min(...timestamps);
                    const maxTime = Math.max(...timestamps);
                    const avgTime = timestamps.reduce((a, b) => a + b, 0) / timestamps.length;
                    const elapsedMs = maxTime - minTime;

                    aggregates[colIdx] = {
                        type: 'timestamp',
                        total: `${this.formatElapsedTime(elapsedMs)} span`,
                        min: new Date(minTime).toISOString(),
                        max: new Date(maxTime).toISOString(),
                        avg: new Date(avgTime).toISOString(),
                        count: dates.length
                    };
                }
            } else {
                // REQUIREMENT: For non-numeric and non-date aggregate row values, if all
                // the group's rows have the same value, display that value in the aggregate
                const values = data.map(row => row[colIdx]);
                const nonEmptyValues = values.filter(val => !isEmpty(val));

                if (nonEmptyValues.length > 0) {
                    const firstValue = nonEmptyValues[0];
                    const allSame = nonEmptyValues.every(val => val === firstValue);

                    if (allSame) {
                        aggregates[colIdx] = {
                            type: 'uniform',
                            value: firstValue
                        };
                    }
                }
            }
        });
        
        return aggregates;
    }

    formatAggregateValue(value, precision = 0) {
        // REQUIREMENT: If the value is numeric and all the rows are not whole numbers,
        // the aggregate value should display with the same number of decimals as the
        // row with the most number of decimals
        if (precision > 0) {
            return value.toFixed(precision);
        }
        return value.toLocaleString();
    }

    renderAggregateRows(data, label = '', isGroupAggregate = false, targetElement = null) {
        const target = targetElement || this.tableBody;
        const aggregates = this.calculateAggregates(data);
        
        if (Object.keys(aggregates).length === 0) {
            return; // No numeric or timestamp columns
        }
        
        const aggregateTypes = [
            { key: 'total', label: 'Total' },
            { key: 'min', label: 'Min' },
            { key: 'avg', label: 'Avg' },
            { key: 'max', label: 'Max' }
        ];
        
        aggregateTypes.forEach(({ key, label: typeLabel }) => {
            const tr = document.createElement('tr');
            tr.className = 'aggregate-row';
            if (isGroupAggregate) {
                tr.classList.add('group-aggregate');
            }
            
            // Label column spanning checkbox and line number columns
            const tdLabel = document.createElement('td');
            tdLabel.className = 'aggregate-label';
            tdLabel.colSpan = 2;
            tdLabel.textContent = label ? `${label} ${typeLabel}` : typeLabel;
            tr.appendChild(tdLabel);
            
            // Data columns
            this.headers.forEach((header, colIdx) => {
                const td = document.createElement('td');

                this.applyColumnClasses(td, colIdx);

                if (aggregates[colIdx]) {
                    td.classList.add('aggregate-value');
                    const aggData = aggregates[colIdx];

                    if (aggData.type === 'uniform') {
                        // Display uniform value for non-numeric/non-date columns
                        td.textContent = aggData.value;
                    } else if (aggData.type === 'timestamp') {
                        // Timestamp aggregates are already formatted as strings
                        td.textContent = aggData[key];
                    } else {
                        td.textContent = this.formatAggregateValue(aggData[key], aggData.precision);
                    }
                }

                tr.appendChild(td);
            });
            
            target.appendChild(tr);
        });
    }

    startEditing(td, rowIdx, column) {
        if (this.editingCell) {
            this.finishEditing();
        }

        this.editingCell = { td, rowIdx, column };
        const currentValue = this.currentData[rowIdx][column] || '';

        td.innerHTML = '';
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentValue;
        
        input.addEventListener('blur', () => this.finishEditing());
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.finishEditing();
            } else if (e.key === 'Escape') {
                this.cancelEditing();
            }
        });

        td.appendChild(input);
        input.focus();
        input.select();
    }

    finishEditing() {
        if (!this.editingCell) return;

        const { td, rowIdx, column } = this.editingCell;
        const input = td.querySelector('input');
        const newValue = input ? input.value.trim() : this.currentData[rowIdx][column];

        if (newValue !== this.currentData[rowIdx][column]) {
            this.currentData[rowIdx][column] = newValue;
            this.modStats.rowsChanged.add(rowIdx);
            
            // Track the specific cell that was modified
            if (!this.modifiedCells.has(rowIdx)) {
                this.modifiedCells.set(rowIdx, new Set());
            }
            this.modifiedCells.get(rowIdx).add(column);
            
            // Apply modified styling to the cell
            td.classList.add('cell-modified');
            
            // Apply modified styling to the line number cell
            const row = td.closest('tr');
            const lineNumCell = row.querySelector('.line-num-col');
            if (lineNumCell) {
                lineNumCell.classList.add('row-modified');
            }
            
            this.markAsModified();
        }

        td.textContent = newValue;
        this.editingCell = null;
    }

    cancelEditing() {
        if (!this.editingCell) return;

        const { td, rowIdx, column } = this.editingCell;
        td.textContent = this.currentData[rowIdx][column];
        this.editingCell = null;
    }

    getFilteredData() {
        let data = [...this.currentData];

        // Only filter when not in highlight mode
        if (this.filters.length > 0 && !this.filterAsHighlight) {
            data = data.filter(row => {
                const matchFunction = filterConfig => {
                    const cellValue = String(row[filterConfig.column] || '');
                    if (filterConfig.isEmpty) {
                        // Match empty cells
                        return cellValue === '';
                    }
                    return cellValue === filterConfig.value;
                };

                if (this.filterLogic === LOGIC.OR) {
                    return this.filters.some(matchFunction);
                } else {
                    return this.filters.every(matchFunction);
                }
            });
        }

        if (this.sortColumns.length > 0) {
            data.sort((a, b) => {
                for (const sortConfig of this.sortColumns) {
                    const colIdx = parseInt(sortConfig.column);
                    const aVal = a[sortConfig.column] || '';
                    const bVal = b[sortConfig.column] || '';
                    
                    let comparison;
                    
                    // Check if this is a timestamp column
                    if (this.timestampColumnsCache && this.timestampColumnsCache.has(colIdx)) {
                        const aDate = this.parseTimestamp(aVal);
                        const bDate = this.parseTimestamp(bVal);
                        
                        // Handle empty values - sort them to the end
                        if (!aDate && !bDate) {
                            comparison = 0;
                        } else if (!aDate) {
                            comparison = 1;
                        } else if (!bDate) {
                            comparison = -1;
                        } else {
                            comparison = aDate.getTime() - bDate.getTime();
                        }
                    } else if (this.numericColumnsCache && this.numericColumnsCache.has(colIdx)) {
                        // Numeric comparison
                        const aNum = Number(aVal);
                        const bNum = Number(bVal);
                        
                        // Handle empty values
                        if (aVal === '' && bVal === '') {
                            comparison = 0;
                        } else if (aVal === '') {
                            comparison = 1;
                        } else if (bVal === '') {
                            comparison = -1;
                        } else {
                            comparison = aNum - bNum;
                        }
                    } else {
                        // String comparison
                        comparison = String(aVal).localeCompare(String(bVal));
                    }
                    
                    if (comparison !== 0) {
                        return sortConfig.direction === SORT_DIR.ASC ? comparison : -comparison;
                    }
                }
                return 0;
            });
        }

        return data;
    }

    applyFilters() {
        this.renderTable();
    }

    applySort() {
        this.renderTable();
    }

    selectAll() {
        this.selectionManager.selectAll();
    }

    deselectAll() {
        this.selectionManager.deselectAll();
    }

    deleteSelected() {
        this.selectionManager.deleteSelected();
    }

    updateSelectionUI() {
        this.selectionManager.updateUI();
    }

    updateStats() {
        const total = this.currentData.length;
        const visible = this.getFilteredData().length;

        // Update table title with filename and row count
        const percent = total > 0 ? (visible / total) * 100 : 0;
        const isWholeNumber = percent === Math.floor(percent);
        const percentText = total > 0
            ? (isWholeNumber ? `${Math.round(percent)}%` : `~${percent.toFixed(1)}%`)
            : '0%';

        // Highlight visible count if filtering is active
        const isFiltered = visible !== total;

        // Check if rows have been added or deleted
        const rowsModified = this.modStats.rowsDeleted > 0 || this.modStats.rowsAdded > 0;

        // Build filename (in title area)
        if (this.fileName) {
            if (this.hasModifications()) {
                this.tableTitleText.innerHTML = `<strong style="color: var(--accent-red); cursor: help;" title="File has been modified">${this.fileName}</strong>`;
            } else {
                this.tableTitleText.innerHTML = `<strong>${this.fileName}</strong>`;
            }
        } else {
            this.tableTitleText.innerHTML = '';
        }

        // Build the row count line (after controls panel)
        if (isFiltered) {
            // Build total count with red color if rows added/deleted
            let totalPart = '';
            if (rowsModified) {
                totalPart = `<strong style="color: var(--accent-red); cursor: help;" title="Rows have been added or deleted">${total}</strong>`;
            } else {
                totalPart = `<strong>${total}</strong>`;
            }

            this.tableRowCount.innerHTML = `<strong style="color: var(--accent-blue); font-weight: 700;">${visible}</strong> / ${totalPart} rows (<strong>${percentText}</strong>) showing`;
        } else {
            // All rows showing - simpler format
            let countPart = '';
            if (rowsModified) {
                countPart = `<strong style="color: var(--accent-red); cursor: help;" title="Rows have been added or deleted">${total}</strong>`;
            } else {
                countPart = `<strong>${total}</strong>`;
            }

            this.tableRowCount.innerHTML = `${countPart} rows (<strong>100%</strong>) showing`;
        }

        this.selectedRowsSpan.textContent = this.selectedRows.size;
        
        // Show/hide selection actions area
        if (this.selectedRows.size > 0) {
            this.selectionActions.classList.add('has-selection');
        } else {
            this.selectionActions.classList.remove('has-selection');
        }
    }

    hasModifications() {
        return this.modStats.rowsDeleted > 0 ||
               this.modStats.rowsChanged.size > 0 ||
               this.modStats.columnsAdded > 0 ||
               this.modStats.columnsDeleted > 0 ||
               this.modStats.columnsReordered > 0;
    }

    markAsModified() {
        this.isModified = true;

        // Show/hide undo button based on whether there are actual modifications
        if (this.hasModifications()) {
            this.undoChangesBtn.classList.remove('hidden');
        } else {
            this.undoChangesBtn.classList.add('hidden');
        }

        this.updateModificationDisplay();
        this.updateStats(); // Update the title to reflect modifications
    }

    updateModificationDisplay() {
        const hasChanges = this.hasModifications();
        
        if (hasChanges) {
            this.modificationIndicator.classList.remove('hidden');
            
            // Update each stat
            const rowsDeletedEl = document.getElementById('modRowsDeleted');
            const rowsChangedEl = document.getElementById('modRowsChanged');
            const colsAddedEl = document.getElementById('modColsAdded');
            const colsDeletedEl = document.getElementById('modColsDeleted');
            const colsReorderedEl = document.getElementById('modColsReordered');
            
            if (this.modStats.rowsDeleted > 0) {
                rowsDeletedEl.classList.remove('hidden');
                rowsDeletedEl.querySelector('.mod-num').textContent = this.modStats.rowsDeleted;
            } else {
                rowsDeletedEl.classList.add('hidden');
            }
            
            if (this.modStats.rowsChanged.size > 0) {
                rowsChangedEl.classList.remove('hidden');
                rowsChangedEl.querySelector('.mod-num').textContent = this.modStats.rowsChanged.size;
            } else {
                rowsChangedEl.classList.add('hidden');
            }
            
            if (this.modStats.columnsAdded > 0) {
                colsAddedEl.classList.remove('hidden');
                colsAddedEl.querySelector('.mod-num').textContent = this.modStats.columnsAdded;
            } else {
                colsAddedEl.classList.add('hidden');
            }
            
            if (this.modStats.columnsDeleted > 0) {
                colsDeletedEl.classList.remove('hidden');
                colsDeletedEl.querySelector('.mod-num').textContent = this.modStats.columnsDeleted;
            } else {
                colsDeletedEl.classList.add('hidden');
            }
            
            if (this.modStats.columnsReordered > 0) {
                colsReorderedEl.classList.remove('hidden');
            } else {
                colsReorderedEl.classList.add('hidden');
            }
        } else {
            this.modificationIndicator.classList.add('hidden');
        }
    }

    handleImportClick() {
        if (this.isModified) {
            this.confirmImportModal.classList.remove('hidden');
        } else {
            this.fileInput.click();
        }
    }

    hideConfirmImportModal() {
        this.confirmImportModal.classList.add('hidden');
    }

    undoChanges() {
        if (!this.isModified) return;

        this.currentData = JSON.parse(JSON.stringify(this.originalData));
        this.headers = [...this.originalHeaders];
        this.selectedRows.clear();
        this.lastClickedRowIdx = null;
        this.isModified = false;
        this.modificationIndicator.classList.add('hidden');
        this.undoChangesBtn.classList.add('hidden');
        this.modStats = createModStats();
        this.modifiedCells = new Map();
        this.addedColumns = new Set();
        this.filters = [];
        this.filterLogic = LOGIC.AND;
        this.filterAsHighlight = false;
        this.filterModeBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filterMode === 'filter');
        });
        this.highlightTerms = [];
        this.searchLogic = LOGIC.AND;
        this.searchSelectsContainer.innerHTML = '';
        this.searchSelectsContainer.appendChild(this.createSearchSelect(0));
        this.sortColumns = [];
        this.groupColumns = [];
        this.collapsedGroups.clear();

        this.populateDropdowns();
        this.renderTable();
        this.updateSelectionUI();
        this.updateStats(); // Update title to reflect no modifications
        showToast('All changes have been undone', 'success');
    }

    exportCSV(exportType = 'all') {
        const escapeCSV = (value) => {
            const str = String(value);
            return '"' + str.replace(/"/g, '""') + '"';
        };

        let dataToExport;
        let filename;
        
        switch (exportType) {
            case 'selected':
                dataToExport = this.currentData.filter((_, idx) => this.selectedRows.has(idx));
                filename = 'exported_selected.csv';
                break;
            case 'deselected':
                dataToExport = this.currentData.filter((_, idx) => !this.selectedRows.has(idx));
                filename = 'exported_deselected.csv';
                break;
            default:
                dataToExport = this.currentData;
                filename = 'exported_data.csv';
        }

        let csv = this.headers.map(escapeCSV).join(',') + '\n';
        dataToExport.forEach(row => {
            csv += this.headers.map((_, colIdx) => escapeCSV(row[colIdx])).join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        const rowCount = dataToExport.length;
        const typeLabel = exportType === 'all' ? '' : ` (${exportType})`;
        showToast(`Exported ${rowCount} row${rowCount !== 1 ? 's' : ''}${typeLabel}`, 'success');
    }

    showAddColumnModal() {
        this.columnManager.showAddModal();
    }

    hideAddColumnModal() {
        this.columnManager.hideAddModal();
    }

    addColumn() {
        this.columnManager.add();
    }

    updateColumnReferencesAfterInsert(insertIdx) {
        this.columnManager.updateReferencesAfterInsert(insertIdx);
    }

    setDensity(density) {
        this.tableDensity = density;

        // Update button states
        this.densityBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.density === density);
        });

        // Update table class
        this.tableElement.classList.remove('table-compact', 'table-normal');
        if (density !== 'compact') {
            this.tableElement.classList.add(`table-${density}`);
        }

        // Save preference
        localStorage.setItem(STORAGE_KEYS.DENSITY, density);
    }

    initDensity() {
        const savedDensity = localStorage.getItem(STORAGE_KEYS.DENSITY) || 'compact';
        this.setDensity(savedDensity);
    }

    initTheme() {
        const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = savedTheme || (prefersDark ? 'dark' : 'light');

        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            this.themeIcon.textContent = '☀️';
        } else {
            document.documentElement.removeAttribute('data-theme');
            this.themeIcon.textContent = '🌙';
        }
    }

    toggleTheme() {
        const isDark = document.documentElement.hasAttribute('data-theme');

        if (isDark) {
            document.documentElement.removeAttribute('data-theme');
            this.themeIcon.textContent = '🌙';
            localStorage.setItem(STORAGE_KEYS.THEME, 'light');
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            this.themeIcon.textContent = '☀️';
            localStorage.setItem(STORAGE_KEYS.THEME, 'dark');
        }
    }

    initFullWidth() {
        const savedFullWidth = localStorage.getItem(STORAGE_KEYS.FULLWIDTH);
        if (savedFullWidth === 'true') {
            this.isFullWidth = true;
            this.appContainer.classList.add('full-width');
        }
    }

    toggleFullWidth() {
        this.isFullWidth = !this.isFullWidth;

        if (this.isFullWidth) {
            this.appContainer.classList.add('full-width');
            localStorage.setItem(STORAGE_KEYS.FULLWIDTH, 'true');
        } else {
            this.appContainer.classList.remove('full-width');
            localStorage.setItem(STORAGE_KEYS.FULLWIDTH, 'false');
        }
    }

}