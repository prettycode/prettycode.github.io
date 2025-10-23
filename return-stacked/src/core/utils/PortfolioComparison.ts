/**
 * Portfolio comparison utilities
 * Provides functions to compare portfolios for equality
 */

import type { Portfolio } from '../domain/Portfolio';
import { percentToBasisPoints } from '../calculators/precision';

/**
 * Compares two portfolios for equality based on holdings and allocations
 * Uses basis points for exact comparison (10 basis points = 0.1%)
 */
export function arePortfoliosEqual(portfolio1: Portfolio, portfolio2: Portfolio): boolean {
    // Check if number of holdings is different
    if (portfolio1.holdings.size !== portfolio2.holdings.size) {
        return false;
    }

    // Compare each holding using basis points for precision
    for (const [ticker, holding1] of portfolio1.holdings.entries()) {
        const holding2 = portfolio2.holdings.get(ticker);

        if (!holding2) {
            return false;
        }

        // Extract percentage from holding (could be number or Holding object)
        const percentage1 = typeof holding1 === 'number' ? holding1 : holding1.percentage;
        const percentage2 = typeof holding2 === 'number' ? holding2 : holding2.percentage;

        // Convert to basis points for exact comparison
        const basisPoints1 =
            holding1 && typeof holding1 === 'object' && 'basisPoints' in holding1
                ? holding1.basisPoints
                : percentToBasisPoints(percentage1);
        const basisPoints2 =
            holding2 && typeof holding2 === 'object' && 'basisPoints' in holding2
                ? holding2.basisPoints
                : percentToBasisPoints(percentage2);

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
