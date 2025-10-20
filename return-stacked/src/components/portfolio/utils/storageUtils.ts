import type { Portfolio, SerializedPortfolio, Holding } from '@/types/portfolio';
import { defaultSavedPortfolios } from './templates';

const STORAGE_KEY = 'saved_portfolios';

/**
 * Converts a Portfolio to a SerializedPortfolio
 */
const serializePortfolio = (portfolio: Portfolio): SerializedPortfolio => {
    return {
        name: portfolio.name,
        holdings: Array.from(portfolio.holdings.entries()),
        createdAt: portfolio.createdAt ?? Date.now(),
    };
};

/**
 * Saves a portfolio to localStorage
 */
export const savePortfolio = (portfolio: Portfolio): SerializedPortfolio[] => {
    try {
        const serializablePortfolio: SerializedPortfolio = {
            name: portfolio.name,
            holdings: Array.from(portfolio.holdings.entries()),
            createdAt: portfolio.createdAt ?? Date.now(),
        };

        const savedPortfolios = getSavedPortfolios();
        const existingIndex = savedPortfolios.findIndex((p) => p.name === portfolio.name);

        if (existingIndex >= 0) {
            savedPortfolios[existingIndex] = serializablePortfolio;
        } else {
            savedPortfolios.push(serializablePortfolio);
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPortfolios));

        return savedPortfolios;
    } catch (error) {
        console.error('Error saving portfolio:', error);
        return [];
    }
};

/**
 * Deletes a portfolio from localStorage by name
 */
export const deletePortfolio = (portfolioName: string): SerializedPortfolio[] => {
    try {
        const savedPortfolios = getSavedPortfolios();
        const updatedPortfolios = savedPortfolios.filter((portfolio) => portfolio.name !== portfolioName);

        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPortfolios));

        return updatedPortfolios;
    } catch (error) {
        console.error('Error deleting portfolio:', error);
        return [];
    }
};

/**
 * Retrieves all saved portfolios from localStorage, merged with default saved portfolios
 */
export const getSavedPortfolios = (): SerializedPortfolio[] => {
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
        console.error('Error getting saved portfolios:', error);
        // On error, still return default portfolios
        return defaultSavedPortfolios.map(serializePortfolio);
    }
};

/**
 * Deserializes a portfolio from storage format to runtime format
 */
export const deserializePortfolio = (serializedPortfolio: SerializedPortfolio): Portfolio => {
    return {
        ...serializedPortfolio,
        holdings: new Map<string, Holding>(serializedPortfolio.holdings),
    };
};
