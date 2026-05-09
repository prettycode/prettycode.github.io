/**
 * IStorageAdapter - Framework-agnostic storage interface
 * Allows different storage implementations (localStorage, IndexedDB, Firebase, etc.)
 */

import type { SerializedPortfolio } from '../domain/SerializedPortfolio';

export interface IStorageAdapter {
    /**
     * Saves a portfolio to storage
     */
    savePortfolio(portfolio: SerializedPortfolio): Promise<void>;

    /**
     * Loads all saved portfolios
     */
    loadPortfolios(): Promise<SerializedPortfolio[]>;
}
