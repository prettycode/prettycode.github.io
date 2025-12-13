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
        valueInput.placeholder = `${UI.MIN_SEARCH_CHARS}+ chars, "x" for 1, "" for empty`;
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

    // Check if a search term is valid (quoted literal, empty cell search, or meets min chars)
    isValidSearchTerm(term) {
        if (!term) return false;
        // "" matches empty cells
        if (term === UI.EMPTY_CELL_SEARCH) return true;
        // Quoted literal search (e.g., "a" or "hello world")
        if (term.startsWith('"') && term.endsWith('"') && term.length >= 3) return true;
        // Standard search requires minimum characters
        return term.length >= UI.MIN_SEARCH_CHARS;
    }

    // Convert user input to search term object (handles quoted literals)
    // Returns { term: string|Symbol, caseSensitive: boolean }
    parseSearchTerm(term) {
        if (term === UI.EMPTY_CELL_SEARCH) {
            return { term: EMPTY_CELL_MARKER, caseSensitive: false };
        }
        // Quoted literal: case-sensitive, extract content between quotes (preserve case)
        if (term.startsWith('"') && term.endsWith('"') && term.length >= 3) {
            return { term: term.slice(1, -1), caseSensitive: true };
        }
        // Unquoted: case-insensitive
        return { term: term.toLowerCase(), caseSensitive: false };
    }

    addLevel() {
        const container = this.editor.searchSelectsContainer;
        const inputs = container.querySelectorAll('.search-value-input');
        const lastInput = inputs[inputs.length - 1];
        const term = lastInput.value.trim();

        if (!this.isValidSearchTerm(term)) {
            showToast(`Enter at least ${UI.MIN_SEARCH_CHARS} characters, or use quotes for single character`, TOAST_TYPE.ERROR);
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
            if (this.isValidSearchTerm(term)) {
                this.highlightTerms.push(this.parseSearchTerm(term));
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
            if (!this.isValidSearchTerm(term)) {
                if (badge) badge.style.display = 'none';
                return;
            }

            // Add this term to active terms (convert to search format)
            const searchTerm = this.parseSearchTerm(term);
            activeTerms.push(searchTerm);

            // Count matching rows using all terms up to this level
            const termsUpToHere = [...activeTerms];
            let count = 0;

            filteredData.forEach(row => {
                const termFoundInRow = new Set();

                this.editor.headers.forEach((_, colIdx) => {
                    const cellValue = String(row[colIdx] || '');
                    const cellLower = cellValue.toLowerCase();
                    termsUpToHere.forEach((searchObj, termIdx) => {
                        // searchObj is { term: string|Symbol, caseSensitive: boolean }
                        let matches;
                        if (searchObj.term === EMPTY_CELL_MARKER) {
                            matches = cellValue === '';
                        } else if (searchObj.caseSensitive) {
                            matches = cellValue.includes(searchObj.term);
                        } else {
                            matches = cellLower.includes(searchObj.term);
                        }
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
            btn.classList.toggle(CSS.ACTIVE, btn.dataset.highlightMode === mode);
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
