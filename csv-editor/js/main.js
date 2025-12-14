// ============================================
// Application Entry Point
// ============================================

import { TabManager } from './managers/TabManager.js';

// Initialize the Tab Manager which creates and manages CSV Editors
document.addEventListener('DOMContentLoaded', () => {
    window.tabManager = new TabManager();
});
