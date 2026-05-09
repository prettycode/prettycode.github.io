/**
 * Portfolio comparison utilities
 * Provides functions to compare portfolios for equality
 */

import type { Portfolio } from '../domain/Portfolio';
import { percentToBasisPoints } from '../calculators/Precision';

export function arePortfoliosEqual(portfolio1: Portfolio, portfolio2: Portfolio): boolean {
    if (portfolio1.holdings.size !== portfolio2.holdings.size) {
        return false;
    }

    for (const [ticker, holding1] of portfolio1.holdings.entries()) {
        const holding2 = portfolio2.holdings.get(ticker);

        if (!holding2) {
            return false;
        }

        const basisPoints1 = holding1.basisPoints ?? percentToBasisPoints(holding1.percentage);
        const basisPoints2 = holding2.basisPoints ?? percentToBasisPoints(holding2.percentage);

        if (basisPoints1 !== basisPoints2) {
            return false;
        }
    }

    return true;
}

/**
 * Checks if a portfolio has been modified compared to its original template
 */
export function isPortfolioModified(currentPortfolio: Portfolio, originalPortfolio: Portfolio | null): boolean {
    if (!originalPortfolio) {
        return false;
    }

    return !arePortfoliosEqual(currentPortfolio, originalPortfolio);
}
