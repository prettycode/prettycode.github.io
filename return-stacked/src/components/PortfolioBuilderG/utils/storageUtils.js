/**
 * Utility functions for localStorage operations
 */

const STORAGE_KEY = 'saved_portfolios';

/**
 * Save a portfolio to localStorage
 * @param {Object} portfolio - The portfolio to save
 * @returns {Array} Updated list of saved portfolios
 */
export const savePortfolio = (portfolio) => {
    try {
        // Convert holdings Map to a serializable format
        const serializablePortfolio = {
            ...portfolio,
            holdings: Array.from(portfolio.holdings.entries()),
        };

        // Get existing saved portfolios
        const savedPortfolios = getSavedPortfolios();

        // Check if a portfolio with this name already exists
        const existingIndex = savedPortfolios.findIndex((p) => p.name === portfolio.name);

        if (existingIndex >= 0) {
            // Update existing portfolio
            savedPortfolios[existingIndex] = serializablePortfolio;
        } else {
            // Add new portfolio
            savedPortfolios.push(serializablePortfolio);
        }

        // Save to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPortfolios));

        return savedPortfolios;
    } catch (error) {
        console.error('Error saving portfolio:', error);
        return [];
    }
};

/**
 * Delete a portfolio from localStorage by name
 * @param {string} portfolioName - The name of the portfolio to delete
 * @returns {Array} Updated list of saved portfolios
 */
export const deletePortfolio = (portfolioName) => {
    try {
        // Get existing saved portfolios
        const savedPortfolios = getSavedPortfolios();

        // Filter out the portfolio with the specified name
        const updatedPortfolios = savedPortfolios.filter((portfolio) => portfolio.name !== portfolioName);

        // Save the updated list to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPortfolios));

        return updatedPortfolios;
    } catch (error) {
        console.error('Error deleting portfolio:', error);
        return [];
    }
};

/**
 * Get all saved portfolios from localStorage
 * @returns {Array} List of saved portfolios
 */
export const getSavedPortfolios = () => {
    try {
        const savedPortfolios = localStorage.getItem(STORAGE_KEY);
        return savedPortfolios ? JSON.parse(savedPortfolios) : [];
    } catch (error) {
        console.error('Error getting saved portfolios:', error);
        return [];
    }
};

/**
 * Convert serialized portfolio to proper format
 * @param {Object} serializedPortfolio - The serialized portfolio from localStorage
 * @returns {Object} Properly formatted portfolio with Map for holdings
 */
export const deserializePortfolio = (serializedPortfolio) => {
    return {
        ...serializedPortfolio,
        holdings: new Map(serializedPortfolio.holdings),
    };
};
