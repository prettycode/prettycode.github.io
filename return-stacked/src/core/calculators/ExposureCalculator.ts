/**
 * Exposure calculator - framework-agnostic pure functions for portfolio exposure analysis
 */

import type { Portfolio } from '../domain/Portfolio';
import type { PortfolioAnalysis } from '../domain/PortfolioAnalysis';
import type { AssetClass } from '../domain/AssetClass';
import { percentToWeight, weightToPercent, calculateRelativePercent } from './precision';
import { getETFByTicker } from '../data/catalogs/EtfCatalog';

/**
 * Analyzes portfolio exposure and leverage
 */
export const analyzePortfolio = (portfolio: Portfolio): PortfolioAnalysis => {
    const exposures = new Map<string, number>();
    const assetClasses = new Map<string, number>();
    let totalExposure = 0;

    for (const [ticker, holdingData] of portfolio.holdings) {
        const percentage = typeof holdingData === 'number' ? holdingData : holdingData.percentage;
        const isDisabled = typeof holdingData === 'object' && holdingData.disabled;

        if (isDisabled) {
            continue;
        }

        const etf = getETFByTicker(ticker);
        if (!etf) {
            console.error(`ETF with ticker ${ticker} not found in catalog`);
            continue;
        }

        const weight = percentToWeight(percentage);

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

    // Log analysis table for debugging (can be removed in production or made optional)
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

/**
 * Calculates equity breakdown by region (US vs ex-US)
 */
export const calculateEquityBreakdown = (portfolio: Portfolio): { us: number; exUs: number; totalEquity: number } | null => {
    let usEquityExposure = 0;
    let exUsEquityExposure = 0;

    for (const [ticker, holdingValue] of portfolio.holdings) {
        const percentage = typeof holdingValue === 'number' ? holdingValue : holdingValue.percentage;
        const isDisabled = typeof holdingValue === 'object' && holdingValue.disabled;

        if (isDisabled) {
            continue;
        }

        const etf = getETFByTicker(ticker);
        if (!etf) {
            continue;
        }

        const weight = percentToWeight(percentage);

        for (const [exposureKey, amount] of etf.exposures) {
            const [assetClass, marketRegion] = exposureKey.split('|');
            if (assetClass === 'Equity') {
                const weightedAmount = amount * weight;

                if (marketRegion === 'U.S.') {
                    usEquityExposure += weightedAmount;
                } else if (marketRegion === 'International Developed' || marketRegion === 'Emerging') {
                    exUsEquityExposure += weightedAmount;
                }
            }
        }
    }

    const totalEquityExposure = usEquityExposure + exUsEquityExposure;

    if (totalEquityExposure === 0) {
        return null;
    }

    return {
        us: calculateRelativePercent(usEquityExposure, totalEquityExposure),
        exUs: calculateRelativePercent(exUsEquityExposure, totalEquityExposure),
        totalEquity: totalEquityExposure,
    };
};

/**
 * Gets dominant asset classes sorted by exposure (top 3)
 */
export const getDominantAssetClasses = (analysis: PortfolioAnalysis): AssetClass[] => {
    return Array.from(analysis.assetClasses.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([assetClass]) => assetClass as AssetClass);
};
