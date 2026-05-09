/**
 * Exposure calculator - framework-agnostic pure functions for portfolio exposure analysis
 */

import type { Portfolio } from '../domain/Portfolio';
import type { PortfolioAnalysis } from '../domain/PortfolioAnalysis';
import { percentToWeight, weightToPercent, calculateRelativePercent } from './Precision';
import { getETFByTicker } from '../data/catalogs/EtfCatalog';

/**
 * Analyzes portfolio exposure and leverage
 */
export const analyzePortfolio = (portfolio: Portfolio): PortfolioAnalysis => {
    const exposures = new Map<string, number>();
    const assetClasses = new Map<string, number>();
    let totalExposure = 0;

    for (const [ticker, holding] of portfolio.holdings) {
        if (holding.disabled) {
            continue;
        }

        const etf = getETFByTicker(ticker);
        if (!etf) {
            console.error(`ETF with ticker ${ticker} not found in catalog`);
            continue;
        }

        const weight = percentToWeight(holding.percentage);

        for (const [key, amount] of etf.exposures) {
            const weightedAmount = amount * weight;
            const currentAmount = exposures.get(key) ?? 0;
            exposures.set(key, currentAmount + weightedAmount);

            const [assetClass] = key.split('|');
            const currentAssetClassAmount = assetClasses.get(assetClass) ?? 0;
            assetClasses.set(assetClass, currentAssetClassAmount + weightedAmount);

            totalExposure += weightedAmount;
        }
    }

    if (typeof console !== 'undefined' && console.table) {
        const assetAllocationTable: Record<string, Record<string, string | number>> = {};
        for (const [assetClass, amount] of assetClasses) {
            assetAllocationTable[assetClass] = {
                'Absolute Exposure': `${weightToPercent(amount).toFixed(2)}%`,
                'Relative Exposure': `${calculateRelativePercent(amount, totalExposure).toFixed(2)}%`,
                'Raw Value': amount.toFixed(4),
            };
        }

        if (Object.keys(assetAllocationTable).length > 0) {
            console.table(assetAllocationTable);
        }
    }

    return {
        exposures,
        assetClasses,
        totalLeverage: totalExposure,
        isLevered: totalExposure > 1,
    };
};
