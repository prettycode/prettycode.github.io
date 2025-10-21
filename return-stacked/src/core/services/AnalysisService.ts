/**
 * AnalysisService - Framework-agnostic service for portfolio analysis
 * Provides detailed portfolio analysis including exposures, leverage, and ETF details
 */

import type { Portfolio } from '../domain/Portfolio';
import type { PortfolioAnalysis } from '../domain/PortfolioAnalysis';
import type { TemplateDetails } from '../domain/TemplateDetails';
import type { ETFDetails } from '../domain/ETFDetails';
import type { EquityBreakdown } from '../domain/EquityBreakdown';
import type { AssetClass } from '../domain/AssetClass';
import { analyzePortfolio, calculateEquityBreakdown, getDominantAssetClasses } from '../calculators/exposureCalculator';
import { getETFByTicker } from '../data/catalogs/etfCatalog';
import { parseExposureKey } from '../utils/exposureKeys';

export class AnalysisService {
    /**
     * Analyzes a portfolio and returns comprehensive analysis
     */
    public analyze(portfolio: Portfolio): PortfolioAnalysis {
        return analyzePortfolio(portfolio);
    }

    /**
     * Generates detailed template information for display
     */
    public getTemplateDetails(portfolio: Portfolio): TemplateDetails {
        const analysis = this.analyze(portfolio);
        const etfDetails: ETFDetails[] = [];
        const assetClassSummary = new Map<string, number>();
        const leverageTypesWithAmounts = new Map<string, number>();

        for (const [ticker, holdingValue] of portfolio.holdings) {
            const percentage = typeof holdingValue === 'number' ? holdingValue : holdingValue.percentage;
            const etf = getETFByTicker(ticker);
            if (!etf) {
                continue;
            }

            let leverageAmount = 0;
            for (const [, amount] of etf.exposures) {
                leverageAmount = Math.max(leverageAmount, amount);
            }

            if (etf.leverageType !== 'None') {
                const key = etf.leverageType;
                const existingAmount = leverageTypesWithAmounts.get(key) ?? 0;
                leverageTypesWithAmounts.set(key, Math.max(existingAmount, leverageAmount));
            }

            const primaryAssetClasses: AssetClass[] = [];
            for (const [exposureKey] of etf.exposures) {
                const parsed = parseExposureKey(exposureKey);
                if (!primaryAssetClasses.includes(parsed.assetClass)) {
                    primaryAssetClasses.push(parsed.assetClass);
                }
            }

            etfDetails.push({
                ticker,
                percentage,
                leverageType: etf.leverageType,
                leverageAmount,
                assetClasses: primaryAssetClasses,
            });

            primaryAssetClasses.forEach((assetClass) => {
                const current = assetClassSummary.get(assetClass) ?? 0;
                assetClassSummary.set(assetClass, current + percentage);
            });
        }

        const dominantAssetClasses = getDominantAssetClasses(analysis);
        const equityBreakdown = calculateEquityBreakdown(portfolio);

        return {
            name: portfolio.name,
            etfCount: portfolio.holdings.size,
            totalLeverage: analysis.totalLeverage,
            isLevered: analysis.isLevered,
            dominantAssetClasses,
            leverageTypesWithAmounts,
            etfDetails,
            analysis,
            equityBreakdown,
        };
    }

    /**
     * Gets equity breakdown for a portfolio
     */
    public getEquityBreakdown(portfolio: Portfolio): EquityBreakdown | null {
        return calculateEquityBreakdown(portfolio);
    }

    /**
     * Checks if a portfolio is levered
     */
    public isLevered(portfolio: Portfolio): boolean {
        const analysis = this.analyze(portfolio);
        return analysis.isLevered;
    }

    /**
     * Gets total leverage of a portfolio
     */
    public getTotalLeverage(portfolio: Portfolio): number {
        const analysis = this.analyze(portfolio);
        return analysis.totalLeverage;
    }
}
