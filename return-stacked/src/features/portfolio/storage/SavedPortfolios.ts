import type { SerializedPortfolio } from '../core/domain/Portfolio';
import { defaultSavedPortfolios } from '../core/data/catalogs/PortfolioTemplates';
import { serializePortfolio } from '../core/utils/Serialization';

const STORAGE_KEY = 'saved_portfolios';

export const loadSavedPortfolios = (): SerializedPortfolio[] => {
    const userJson = localStorage.getItem(STORAGE_KEY);
    const userSaved = userJson ? (JSON.parse(userJson) as SerializedPortfolio[]) : [];

    const defaults = defaultSavedPortfolios.map(serializePortfolio);
    const userNames = new Set(userSaved.map((p) => p.name));
    const filteredDefaults = defaults.filter((p) => !userNames.has(p.name));

    return [...filteredDefaults, ...userSaved];
};

export const saveUserPortfolio = (portfolio: SerializedPortfolio): void => {
    const userJson = localStorage.getItem(STORAGE_KEY);
    const userSaved = userJson ? (JSON.parse(userJson) as SerializedPortfolio[]) : [];

    const existingIndex = userSaved.findIndex((p) => p.name === portfolio.name);
    if (existingIndex >= 0) {
        userSaved[existingIndex] = portfolio;
    } else {
        userSaved.push(portfolio);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(userSaved));
};
