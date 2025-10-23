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

    /**
     * Deletes a portfolio by name
     */
    deletePortfolio(name: string): Promise<void>;

    /**
     * Checks if a portfolio with the given name exists
     */
    portfolioExists(name: string): Promise<boolean>;
}
