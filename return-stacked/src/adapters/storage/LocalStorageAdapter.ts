/**
 * LocalStorageAdapter - Browser localStorage implementation of IStorageAdapter
 * This is a framework adapter that provides browser-specific storage
 */

import type { SerializedPortfolio } from '../../core/domain/SerializedPortfolio';
import type { IStorageAdapter } from '../../core/services/IStorageAdapter';
import { defaultSavedPortfolios } from '../../core/data/catalogs/portfolioTemplates';
import { serializePortfolio } from '../../core/utils/serialization';

const STORAGE_KEY = 'saved_portfolios';

export class LocalStorageAdapter implements IStorageAdapter {
    /**
     * Saves a portfolio to localStorage
     */
    async savePortfolio(portfolio: SerializedPortfolio): Promise<void> {
        try {
            const savedPortfolios = await this.loadPortfolios();
            const existingIndex = savedPortfolios.findIndex((p) => p.name === portfolio.name);

            if (existingIndex >= 0) {
                savedPortfolios[existingIndex] = portfolio;
            } else {
                savedPortfolios.push(portfolio);
            }

            localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPortfolios));
        } catch (error) {
            console.error('Error saving portfolio:', error);
            throw new Error('Failed to save portfolio');
        }
    }

    /**
     * Loads all saved portfolios, merged with defaults
     */
    async loadPortfolios(): Promise<SerializedPortfolio[]> {
        try {
            // Get user-saved portfolios from localStorage
            const savedPortfoliosJson = localStorage.getItem(STORAGE_KEY);
            const userSavedPortfolios = savedPortfoliosJson ? (JSON.parse(savedPortfoliosJson) as SerializedPortfolio[]) : [];

            // Serialize default portfolios
            const defaultSerialized = defaultSavedPortfolios.map(serializePortfolio);

            // Get names of user-saved portfolios to avoid duplicates
            const userPortfolioNames = new Set(userSavedPortfolios.map((p) => p.name));

            // Filter out any default portfolios that have been overwritten by user
            const filteredDefaults = defaultSerialized.filter((p) => !userPortfolioNames.has(p.name));

            // Merge defaults first, then user portfolios (so user portfolios appear last)
            return [...filteredDefaults, ...userSavedPortfolios];
        } catch (error) {
            console.error('Error loading saved portfolios:', error);
            // On error, still return default portfolios
            return defaultSavedPortfolios.map(serializePortfolio);
        }
    }

    /**
     * Deletes a portfolio from localStorage by name
     */
    async deletePortfolio(name: string): Promise<void> {
        try {
            const savedPortfolios = await this.loadPortfolios();
            const updatedPortfolios = savedPortfolios.filter((portfolio) => portfolio.name !== name);

            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPortfolios));
        } catch (error) {
            console.error('Error deleting portfolio:', error);
            throw new Error('Failed to delete portfolio');
        }
    }

    /**
     * Checks if a portfolio with the given name exists
     */
    async portfolioExists(name: string): Promise<boolean> {
        try {
            const portfolios = await this.loadPortfolios();
            return portfolios.some((p) => p.name === name);
        } catch (error) {
            console.error('Error checking portfolio existence:', error);
            return false;
        }
    }
}
