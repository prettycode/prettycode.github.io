import { STORAGE_KEYS } from '../constants';
import type { CustomPortfolio, SerializedPortfolio } from '../types';

export const savePortfolio = (portfolio: CustomPortfolio): SerializedPortfolio[] => {
    if (!portfolio?.name) {
        throw new Error('Portfolio must have a name');
    }

    if (!portfolio.holdings || portfolio.holdings.size === 0) {
        throw new Error('Portfolio must have at least one holding');
    }

    const serializablePortfolio: SerializedPortfolio = {
        ...portfolio,
        holdings: Array.from(portfolio.holdings.entries()),
        createdAt: Date.now(),
        etfCount: portfolio.holdings.size,
    };

    const savedPortfolios = getSavedPortfolios();
    const existingIndex = savedPortfolios.findIndex((p) => p.name === portfolio.name);

    if (existingIndex >= 0) {
        savedPortfolios[existingIndex] = serializablePortfolio;
    } else {
        savedPortfolios.push(serializablePortfolio);
    }

    localStorage.setItem(STORAGE_KEYS.SAVED_PORTFOLIOS, JSON.stringify(savedPortfolios));

    return savedPortfolios;
};

export const deletePortfolio = (portfolioName: string): SerializedPortfolio[] => {
    if (!portfolioName) {
        throw new Error('Portfolio name is required');
    }

    const savedPortfolios = getSavedPortfolios();
    const updatedPortfolios = savedPortfolios.filter((portfolio) => portfolio.name !== portfolioName);

    localStorage.setItem(STORAGE_KEYS.SAVED_PORTFOLIOS, JSON.stringify(updatedPortfolios));

    return updatedPortfolios;
};

export const getSavedPortfolios = (): SerializedPortfolio[] => {
    try {
        const savedPortfolios = localStorage.getItem(STORAGE_KEYS.SAVED_PORTFOLIOS);
        return savedPortfolios ? JSON.parse(savedPortfolios) : [];
    } catch (error) {
        console.error('Error getting saved portfolios:', error);
        return [];
    }
};

export const deserializePortfolio = (serializedPortfolio: SerializedPortfolio): CustomPortfolio => {
    return {
        ...serializedPortfolio,
        holdings: new Map(serializedPortfolio.holdings),
    };
};
