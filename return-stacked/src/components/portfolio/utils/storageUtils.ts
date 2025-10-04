import type { Portfolio, SerializedPortfolio, Holding } from '@/types/portfolio';

const STORAGE_KEY = 'saved_portfolios';

/**
 * Saves a portfolio to localStorage
 */
export const savePortfolio = (portfolio: Portfolio): SerializedPortfolio[] => {
    try {
        const serializablePortfolio: SerializedPortfolio = {
            name: portfolio.name,
            holdings: Array.from(portfolio.holdings.entries()),
            createdAt: portfolio.createdAt ?? Date.now(),
            etfCount: portfolio.holdings.size,
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
 * Retrieves all saved portfolios from localStorage
 */
export const getSavedPortfolios = (): SerializedPortfolio[] => {
    try {
        const savedPortfolios = localStorage.getItem(STORAGE_KEY);
        return savedPortfolios ? (JSON.parse(savedPortfolios) as SerializedPortfolio[]) : [];
    } catch (error) {
        console.error('Error getting saved portfolios:', error);
        return [];
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
