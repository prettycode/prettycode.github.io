// ============================================
// SearchManager - Handles search controls and logic
// ============================================
class SearchManager {
    constructor(editor) {
        this.editor = editor;
    }

    // State accessors (state lives in editor)
    get highlightTerms() { return this.editor.highlightTerms; }
    set highlightTerms(val) { this.editor.highlightTerms = val; }
    get searchLogic() { return this.editor.searchLogic; }
    set searchLogic(val) { this.editor.searchLogic = val; }
    get searchHighlightRow() { return this.editor.searchHighlightRow; }
    set searchHighlightRow(val) { this.editor.searchHighlightRow = val; }

    createSelect(level, showRemove = false) {
        const wrapper = document.createElement('div');
        wrapper.className = 'search-select-wrapper';

        if (level > 0) {
            wrapper.appendChild(this.editor.createLogicToggle('search'));
        }

        const valueInput = document.createElement('input');
        valueInput.type = 'text';
        valueInput.className = 'search-value-input';
        valueInput.dataset.level = level;
        valueInput.placeholder = `${UI.MIN_SEARCH_CHARS}+ chars, or "" for empty`;
        wrapper.appendChild(valueInput);

        // Add count badge (hidden by default, shown when search is active)
        const countBadge = document.createElement('span');
        countBadge.className = 'search-count-badge';
        countBadge.dataset.level = level;
        countBadge.style.display = 'none';
        wrapper.appendChild(countBadge);

        if (showRemove) {
            wrapper.appendChild(createRemoveButton('remove-search', 'Remove this search term'));
        }

        return wrapper;
    }

    addLevel() {
        const container = this.editor.searchSelectsContainer;
        const inputs = container.querySelectorAll('.search-value-input');
        const lastInput = inputs[inputs.length - 1];
        const term = lastInput.value.trim();

        // Allow "" for empty cells, otherwise require minimum characters
        const isValid = term === UI.EMPTY_CELL_SEARCH || term.length >= UI.MIN_SEARCH_CHARS;
        if (!term || !isValid) {
            showToast(`Enter at least ${UI.MIN_SEARCH_CHARS} characters first`, 'error');
            return;
        }

        const newLevel = inputs.length;
        const newWrapper = this.createSelect(newLevel, true);
        container.appendChild(newWrapper);
    }

    update() {
        const container = this.editor.searchSelectsContainer;
        const inputs = container.querySelectorAll('.search-value-input');
        this.highlightTerms = [];

        inputs.forEach(input => {
            const term = input.value.trim();
            // Special case: "" matches empty cells
            if (term === UI.EMPTY_CELL_SEARCH) {
                this.highlightTerms.push(EMPTY_CELL_MARKER);
            } else if (term && term.length >= UI.MIN_SEARCH_CHARS) {
                this.highlightTerms.push(term.toLowerCase());
            }
        });

        this.editor.renderTable();
        this.updateLevels();
    }

    clear() {
        this.highlightTerms = [];
        this.searchLogic = LOGIC.AND;
        const container = this.editor.searchSelectsContainer;
        container.innerHTML = '';
        container.appendChild(this.createSelect(0));
        this.editor.renderTable();
    }

    updateLevels() {
        this.editor.updateSelectLevels({
            container: this.editor.searchSelectsContainer,
            wrapperClass: 'search-select-wrapper',
            colSelectClass: 'search-value-input',
            removeClass: 'remove-search',
            logicClass: 'search-logic-toggle',
            placeholders: ['', ''],
            removeTitle: 'Remove this search term',
            type: 'search'
        });
    }

    updateCounts() {
        const container = this.editor.searchSelectsContainer;
        const badges = container.querySelectorAll('.search-count-badge');
        const wrappers = container.querySelectorAll('.search-select-wrapper');
        const filteredData = this.editor.getFilteredData();

        // Build list of active search terms up to each level
        const activeTerms = [];
        wrappers.forEach((wrapper, level) => {
            const input = wrapper.querySelector('.search-value-input');
            const badge = badges[level];

            if (!input) {
                if (badge) badge.style.display = 'none';
                return;
            }

            const term = input.value.trim();
            // Check if term is valid (either empty cell search or meets minimum length)
            const isValid = term === UI.EMPTY_CELL_SEARCH || term.length >= UI.MIN_SEARCH_CHARS;

            if (!term || !isValid) {
                if (badge) badge.style.display = 'none';
                return;
            }

            // Add this term to active terms (convert to search format)
            const searchTerm = term === UI.EMPTY_CELL_SEARCH ? EMPTY_CELL_MARKER : term.toLowerCase();
            activeTerms.push(searchTerm);

            // Count matching rows using all terms up to this level
            const termsUpToHere = [...activeTerms];
            let count = 0;

            filteredData.forEach(row => {
                const termFoundInRow = new Set();

                this.editor.headers.forEach((_, colIdx) => {
                    const cellValue = row[colIdx];
                    const cellLower = String(cellValue || '').toLowerCase();
                    termsUpToHere.forEach((t, termIdx) => {
                        const matches = t === EMPTY_CELL_MARKER
                            ? String(cellValue || '') === ''
                            : cellLower.includes(t);
                        if (matches) {
                            termFoundInRow.add(termIdx);
                        }
                    });
                });

                let rowMatches;
                if (this.searchLogic === LOGIC.AND) {
                    rowMatches = termFoundInRow.size === termsUpToHere.length;
                } else {
                    rowMatches = termFoundInRow.size > 0;
                }

                if (rowMatches) count++;
            });

            if (badge) {
                badge.innerHTML = `(<span class="count-num">${count}</span>)`;
                badge.style.display = 'inline';
            }
        });
    }

    setMode(mode) {
        this.searchHighlightRow = mode === 'row';
        this.editor.searchHighlightModeBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.highlightMode === mode);
        });
        this.editor.renderTable();
    }

    // Called when a search is removed via click
    handleRemove(wrapper) {
        wrapper.remove();
        const container = this.editor.searchSelectsContainer;
        // If no searches left, add a fresh empty one
        if (container.children.length === 0) {
            container.appendChild(this.createSelect(0));
        }
        this.update();
        this.updateLevels();
    }
}
