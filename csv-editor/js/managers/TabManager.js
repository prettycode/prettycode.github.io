class TabManager {
    constructor() {
        this.tabs = new Map();
        this.activeTabId = null;
        this.tabCounter = 0;
        this.editor = null;
        this.pendingCloseTabId = null;

        this.tabBar = document.getElementById('tabBar');
        this.tabList = document.getElementById('tabList');
        this.addTabBtn = document.getElementById('addTabBtn');
        this.uploadZone = document.getElementById('uploadZone');
        this.fileInput = document.getElementById('fileInput');
        this.editorSection = document.getElementById('editorSection');

        // Close tab confirmation modal
        this.confirmCloseTabModal = document.getElementById('confirmCloseTabModal');
        this.cancelCloseTabBtn = document.getElementById('cancelCloseTab');
        this.confirmCloseTabBtn = document.getElementById('confirmCloseTab');

        this.attachEventListeners();
        this.createTab();
    }

    attachEventListeners() {
        this.addTabBtn.addEventListener('click', () => {
            this.createTab();
            this.fileInput.click();
        });

        // Handle file input for multiple files
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Handle drag and drop on upload zone
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
            const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.csv'));
            if (files.length > 0) {
                this.loadFiles(files);
            } else {
                showToast('Please drop valid CSV file(s)', 'error');
            }
        });

        // Handle drag and drop anywhere on the page for files
        document.addEventListener('dragover', (e) => {
            if (e.dataTransfer.types.includes('Files')) {
                e.preventDefault();
            }
        });

        document.addEventListener('drop', (e) => {
            if (e.dataTransfer.types.includes('Files') && !e.target.closest('.upload-zone')) {
                e.preventDefault();
                const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.csv'));
                if (files.length > 0) {
                    this.loadFiles(files);
                }
            }
        });

        // Close tab confirmation modal
        this.cancelCloseTabBtn.addEventListener('click', () => this.hideCloseTabModal());
        this.confirmCloseTabBtn.addEventListener('click', () => {
            this.hideCloseTabModal();
            if (this.pendingCloseTabId) {
                this.forceCloseTab(this.pendingCloseTabId);
                this.pendingCloseTabId = null;
            }
        });
        this.confirmCloseTabModal.addEventListener('click', (e) => {
            if (e.target === this.confirmCloseTabModal) {
                this.hideCloseTabModal();
            }
        });
    }

    showCloseTabModal(tabId) {
        this.pendingCloseTabId = tabId;
        this.confirmCloseTabModal.classList.remove('hidden');
    }

    hideCloseTabModal() {
        this.confirmCloseTabModal.classList.add('hidden');
        this.pendingCloseTabId = null;
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files).filter(f => f.name.endsWith('.csv'));
        if (files.length > 0) {
            this.loadFiles(files);
        }
        // Reset input so same file can be selected again
        e.target.value = '';
    }

    loadFiles(files) {
        files.forEach((file, index) => {
            if (index === 0 && !this.hasDataInCurrentTab()) {
                // Load into current tab if it's empty
                this.loadFileIntoTab(this.activeTabId, file);
            } else {
                // Create new tabs for additional files
                const tabId = this.createTab(false);
                this.loadFileIntoTab(tabId, file);
            }
        });
    }

    hasDataInCurrentTab() {
        const tabData = this.tabs.get(this.activeTabId);
        return tabData && tabData.currentData && tabData.currentData.length > 0;
    }

    loadFileIntoTab(tabId, file) {
        this.switchToTab(tabId);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                this.editor.fileName = file.name;
                this.editor.parseCSV(content);
                this.editor.showEditor();
                this.updateTabTitle(tabId, file.name);
                this.saveTabState(tabId);
                showToast(`Loaded ${file.name} successfully`, 'success');
            } catch (error) {
                showToast('Error parsing CSV file', 'error');
                console.error(error);
            }
        };
        reader.readAsText(file);
    }

    createTab(switchTo = true) {
        const tabId = `tab-${++this.tabCounter}`;
        const tabData = this.createEmptyTabData();
        this.tabs.set(tabId, tabData);

        const tabElement = this.createTabElement(tabId, '(Empty)');
        tabElement.classList.add('empty');
        this.tabList.appendChild(tabElement);

        if (switchTo) {
            this.switchToTab(tabId);
        }

        this.updateTabCloseButtons();
        return tabId;
    }

    createEmptyTabData() {
        return {
            title: '(Empty)',
            fileName: '',
            originalData: [],
            currentData: [],
            headers: [],
            originalHeaders: [],
            selectedRows: new Set(),
            filters: [],
            filterLogic: LOGIC.AND,
            filterAsHighlight: false,
            sortColumns: [],
            groupColumns: [],
            highlightTerms: [],
            searchLogic: LOGIC.AND,
            searchHighlightRow: true,
            collapsedGroups: new Set(),
            isModified: false,
            modStats: {
                rowsAdded: 0,
                rowsDeleted: 0,
                columnsAdded: 0,
                columnsDeleted: 0,
                columnsReordered: 0,
                rowsChanged: new Set()
            },
            modifiedCells: new Map(),
            addedColumns: new Set(),
            showAggregates: false,
            showEmptyAsDash: false,
            rainbowBgColumns: false,
            rainbowTextColumns: false
        };
    }

    createTabElement(tabId, title) {
        const tab = document.createElement('div');
        tab.className = 'tab';
        tab.dataset.tabId = tabId;
        tab.draggable = true;

        tab.innerHTML = `
            <span class="tab-title">${title}</span>
            <button class="tab-close" title="Close tab">×</button>
        `;

        tab.addEventListener('click', (e) => {
            if (!e.target.classList.contains('tab-close')) {
                this.switchToTab(tabId);
            }
        });

        tab.querySelector('.tab-close').addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeTab(tabId);
        });

        // Tab drag events for reordering
        tab.addEventListener('dragstart', (e) => {
            tab.classList.add('dragging');
            e.dataTransfer.setData('text/plain', tabId);
            e.dataTransfer.effectAllowed = 'move';
        });

        tab.addEventListener('dragend', () => {
            tab.classList.remove('dragging');
        });

        tab.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingTab = this.tabList.querySelector('.dragging');
            if (draggingTab && draggingTab !== tab) {
                tab.classList.add('drag-over');
            }
        });

        tab.addEventListener('dragleave', () => {
            tab.classList.remove('drag-over');
        });

        tab.addEventListener('drop', (e) => {
            e.preventDefault();
            tab.classList.remove('drag-over');
            const draggedTabId = e.dataTransfer.getData('text/plain');
            const draggedTab = this.tabList.querySelector(`[data-tab-id="${draggedTabId}"]`);
            if (draggedTab && draggedTab !== tab) {
                const rect = tab.getBoundingClientRect();
                const midpoint = rect.left + rect.width / 2;
                if (e.clientX < midpoint) {
                    this.tabList.insertBefore(draggedTab, tab);
                } else {
                    this.tabList.insertBefore(draggedTab, tab.nextSibling);
                }
            }
        });

        return tab;
    }

    switchToTab(tabId) {
        if (this.activeTabId === tabId) return;

        // Save current tab state
        if (this.activeTabId && this.editor) {
            this.saveTabState(this.activeTabId);
        }

        // Update tab UI
        this.tabList.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tabId === tabId);
        });

        this.activeTabId = tabId;
        const tabData = this.tabs.get(tabId);

        if (!this.editor) {
            // Create editor on first tab switch
            this.editor = new CSVEditor(this);
        }

        // Restore tab state
        this.restoreTabState(tabData);
    }

    saveTabState(tabId) {
        if (!this.editor) return;

        const tabData = this.tabs.get(tabId);
        if (!tabData) return;

        tabData.fileName = this.editor.fileName;
        tabData.originalData = JSON.parse(JSON.stringify(this.editor.originalData));
        tabData.currentData = JSON.parse(JSON.stringify(this.editor.currentData));
        tabData.headers = [...this.editor.headers];
        tabData.originalHeaders = [...this.editor.originalHeaders];
        tabData.selectedRows = new Set(this.editor.selectedRows);
        tabData.filters = JSON.parse(JSON.stringify(this.editor.filters));
        tabData.filterLogic = this.editor.filterLogic;
        tabData.filterAsHighlight = this.editor.filterAsHighlight;
        tabData.sortColumns = JSON.parse(JSON.stringify(this.editor.sortColumns));
        tabData.groupColumns = [...this.editor.groupColumns];
        // highlightTerms may contain Symbols, so we need to serialize them specially
        tabData.highlightTerms = this.editor.highlightTerms.map(term => ({
            term: term.term === EMPTY_CELL_MARKER ? '__EMPTY_CELL_MARKER__' : term.term,
            caseSensitive: term.caseSensitive
        }));
        tabData.searchLogic = this.editor.searchLogic;
        tabData.searchHighlightRow = this.editor.searchHighlightRow;
        tabData.collapsedGroups = new Set(this.editor.collapsedGroups);
        tabData.isModified = this.editor.isModified;
        tabData.modStats = {
            rowsAdded: this.editor.modStats.rowsAdded,
            rowsDeleted: this.editor.modStats.rowsDeleted,
            rowsChanged: new Set(this.editor.modStats.rowsChanged),
            columnsAdded: this.editor.modStats.columnsAdded,
            columnsDeleted: this.editor.modStats.columnsDeleted,
            columnsReordered: this.editor.modStats.columnsReordered
        };
        // modifiedCells is Map<number, Set<number>>, need to deep copy
        tabData.modifiedCells = new Map();
        this.editor.modifiedCells.forEach((colSet, rowIdx) => {
            tabData.modifiedCells.set(rowIdx, new Set(colSet));
        });
        tabData.addedColumns = new Set(this.editor.addedColumns);
        tabData.showAggregates = this.editor.showAggregates;
        tabData.showEmptyAsDash = this.editor.showEmptyAsDash;
        tabData.rainbowBgColumns = this.editor.rainbowBgColumns;
        tabData.rainbowTextColumns = this.editor.rainbowTextColumns;

        // Update modified indicator on tab
        this.updateTabModifiedState(tabId);
    }

    restoreTabState(tabData) {
        if (!this.editor) return;

        this.editor.fileName = tabData.fileName;
        this.editor.originalData = JSON.parse(JSON.stringify(tabData.originalData));
        this.editor.currentData = JSON.parse(JSON.stringify(tabData.currentData));
        this.editor.headers = [...tabData.headers];
        this.editor.originalHeaders = [...tabData.originalHeaders];
        this.editor.selectedRows = new Set(tabData.selectedRows);
        this.editor.filters = JSON.parse(JSON.stringify(tabData.filters));
        this.editor.filterLogic = tabData.filterLogic;
        this.editor.filterAsHighlight = tabData.filterAsHighlight;
        this.editor.sortColumns = JSON.parse(JSON.stringify(tabData.sortColumns));
        this.editor.groupColumns = [...tabData.groupColumns];
        // Restore highlightTerms with Symbol handling
        this.editor.highlightTerms = tabData.highlightTerms.map(term => ({
            term: term.term === '__EMPTY_CELL_MARKER__' ? EMPTY_CELL_MARKER : term.term,
            caseSensitive: term.caseSensitive
        }));
        this.editor.searchLogic = tabData.searchLogic;
        this.editor.searchHighlightRow = tabData.searchHighlightRow;
        this.editor.collapsedGroups = new Set(tabData.collapsedGroups);
        this.editor.isModified = tabData.isModified;
        this.editor.modStats = {
            rowsAdded: tabData.modStats.rowsAdded,
            rowsDeleted: tabData.modStats.rowsDeleted,
            rowsChanged: new Set(tabData.modStats.rowsChanged),
            columnsAdded: tabData.modStats.columnsAdded,
            columnsDeleted: tabData.modStats.columnsDeleted,
            columnsReordered: tabData.modStats.columnsReordered
        };
        // Restore modifiedCells with deep copy
        this.editor.modifiedCells = new Map();
        tabData.modifiedCells.forEach((colSet, rowIdx) => {
            this.editor.modifiedCells.set(rowIdx, new Set(colSet));
        });
        this.editor.addedColumns = new Set(tabData.addedColumns);
        this.editor.showAggregates = tabData.showAggregates;
        this.editor.showEmptyAsDash = tabData.showEmptyAsDash;
        this.editor.rainbowBgColumns = tabData.rainbowBgColumns;
        this.editor.rainbowTextColumns = tabData.rainbowTextColumns;

        // Update UI based on state
        if (tabData.currentData.length > 0) {
            this.uploadZone.classList.add('hidden');
            this.editorSection.classList.remove('hidden');
            this.editor.exportBtn.disabled = false;
        } else {
            this.uploadZone.classList.remove('hidden');
            this.editorSection.classList.add('hidden');
            this.editor.exportBtn.disabled = true;
        }

        // Update toggle buttons
        this.editor.aggregateToggle.classList.toggle('active', tabData.showAggregates);
        this.editor.emptyDashToggle.classList.toggle('active', tabData.showEmptyAsDash);
        this.editor.rainbowBgToggle.classList.toggle('active', tabData.rainbowBgColumns);
        this.editor.rainbowTextToggle.classList.toggle('active', tabData.rainbowTextColumns);

        // Repopulate dropdowns and render
        if (tabData.currentData.length > 0) {
            this.editor.populateDropdowns();
            this.editor.renderTable();
            this.editor.updateSelectionUI();
            this.editor.updateModificationDisplay();

            if (this.editor.hasModifications()) {
                this.editor.undoChangesBtn.classList.remove('hidden');
            } else {
                this.editor.undoChangesBtn.classList.add('hidden');
            }
        } else {
            this.editor.tableHead.innerHTML = '';
            this.editor.tableBody.innerHTML = '';
            this.editor.tableFoot.innerHTML = '';
        }
    }

    updateTabTitle(tabId, title) {
        const tabData = this.tabs.get(tabId);
        if (tabData) {
            tabData.title = title;
        }

        const tabElement = this.tabList.querySelector(`[data-tab-id="${tabId}"]`);
        if (tabElement) {
            tabElement.querySelector('.tab-title').textContent = title;
            tabElement.classList.remove('empty');
        }
    }

    updateTabModifiedState(tabId) {
        const tabData = this.tabs.get(tabId);
        const tabElement = this.tabList.querySelector(`[data-tab-id="${tabId}"]`);

        if (tabData && tabElement) {
            const hasModifications = tabData.modStats.rowsDeleted > 0 ||
                tabData.modStats.rowsChanged.size > 0 ||
                tabData.modStats.columnsAdded > 0 ||
                tabData.modStats.columnsDeleted > 0 ||
                tabData.modStats.columnsReordered > 0;

            tabElement.classList.toggle('modified', hasModifications);
        }
    }

    closeTab(tabId) {
        const tabData = this.tabs.get(tabId);

        // Check for unsaved changes - show modal if modified
        if (tabData && tabData.isModified) {
            this.showCloseTabModal(tabId);
            return;
        }

        this.forceCloseTab(tabId);
    }

    forceCloseTab(tabId) {
        const tabElement = this.tabList.querySelector(`[data-tab-id="${tabId}"]`);
        if (tabElement) {
            tabElement.remove();
        }

        this.tabs.delete(tabId);

        // If closing active tab, switch to another
        if (this.activeTabId === tabId) {
            this.activeTabId = null;
            const remainingTabs = Array.from(this.tabs.keys());
            if (remainingTabs.length > 0) {
                this.switchToTab(remainingTabs[remainingTabs.length - 1]);
                this.updateTabCloseButtons();
            } else {
                // Create a new empty tab (this will call updateTabCloseButtons)
                this.createTab();
            }
        } else {
            this.updateTabCloseButtons();
        }
    }

    getCurrentTabId() {
        return this.activeTabId;
    }

    updateTabCloseButtons() {
        const closeButtons = this.tabList.querySelectorAll('.tab-close');
        const shouldShow = this.tabs.size > 1;
        closeButtons.forEach(btn => {
            btn.style.display = shouldShow ? '' : 'none';
        });
    }

    markCurrentTabModified() {
        if (this.activeTabId) {
            const tabData = this.tabs.get(this.activeTabId);
            if (tabData) {
                tabData.isModified = true;
            }
            this.updateTabModifiedState(this.activeTabId);
        }
    }
}
