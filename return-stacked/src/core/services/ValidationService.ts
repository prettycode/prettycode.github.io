/**
 * ValidationService - Framework-agnostic service for portfolio validation
 * Provides warnings and recommendations for portfolio construction
 */

import type { Portfolio } from '../domain/Portfolio';
import type { Warning } from '../domain/Warning';
import { getETFByTicker } from '../data/catalogs/etfCatalog';
import { percentToWeight, weightToPercent } from '../calculators/precision';
import { parseExposureKey } from '../utils/exposureKeys';

interface PortfolioExposures {
    usEquity: number;
    exUsEquity: number;
    emEquity: number;
    intlDeveloped: number;
    smallCap: number;
    totalEquity: number;
    treasuries: number;
    gold: number;
    alternatives: number;
}

export class ValidationService {
    /**
     * Validates a portfolio and returns all warnings
     */
    public validate(portfolio: Portfolio): Warning[] {
        const warnings: Warning[] = [];

        // Check each rule
        const rules = [
            this.checkSingleETFConcentration,
            this.checkHighDailyResetLeverage,
            this.checkInternationalDevelopedExposure,
            this.checkEmergingMarketsExposure,
            this.checkSmallCapExposure,
        ];

        for (const rule of rules) {
            const warning = rule.call(this, portfolio);
            if (warning) {
                warnings.push(warning);
            }
        }

        return warnings;
    }

    /**
     * Calculates portfolio exposures across different dimensions
     */
    private getPortfolioExposures(portfolio: Portfolio): PortfolioExposures {
        let usEquity = 0;
        let exUsEquity = 0;
        let emEquity = 0;
        let intlDeveloped = 0;
        let smallCap = 0;
        let totalEquity = 0;
        let treasuries = 0;
        let gold = 0;
        let alternatives = 0;

        for (const [ticker, holdingData] of portfolio.holdings) {
            const percentage = typeof holdingData === 'object' ? holdingData.percentage : holdingData;
            const isDisabled = typeof holdingData === 'object' && holdingData.disabled;

            if (isDisabled) {
                continue;
            }

            const etf = getETFByTicker(ticker);
            if (!etf) {
                continue;
            }

            const weight = percentToWeight(percentage);

            for (const [key, amount] of etf.exposures) {
                const { assetClass, marketRegion, sizeFactor } = parseExposureKey(key);
                const weightedAmount = amount * weight;

                if (assetClass === 'Equity') {
                    totalEquity += weightedAmount;
                    if (marketRegion === 'U.S.') {
                        usEquity += weightedAmount;
                    } else if (marketRegion === 'International Developed' || marketRegion === 'Emerging') {
                        exUsEquity += weightedAmount;
                        if (marketRegion === 'Emerging') {
                            emEquity += weightedAmount;
                        }
                        if (marketRegion === 'International Developed') {
                            intlDeveloped += weightedAmount;
                        }
                    }

                    if (sizeFactor === 'Small Cap') {
                        smallCap += weightedAmount;
                    }
                } else if (assetClass === 'U.S. Treasuries') {
                    treasuries += weightedAmount;
                } else if (assetClass === 'Gold') {
                    gold += weightedAmount;
                } else if (assetClass === 'Managed Futures' || assetClass === 'Futures Yield' || assetClass === 'Bitcoin') {
                    alternatives += weightedAmount;
                }
            }
        }

        return {
            usEquity: weightToPercent(usEquity),
            exUsEquity: weightToPercent(exUsEquity),
            emEquity: weightToPercent(emEquity),
            intlDeveloped: weightToPercent(intlDeveloped),
            smallCap: weightToPercent(smallCap),
            totalEquity: weightToPercent(totalEquity),
            treasuries: weightToPercent(treasuries),
            gold: weightToPercent(gold),
            alternatives: weightToPercent(alternatives),
        };
    }

    /**
     * Check for single ETF concentration risk
     */
    private checkSingleETFConcentration(portfolio: Portfolio): Warning | null {
        const concentratedETFs: Array<{ ticker: string; percentage: number }> = [];

        for (const [ticker, holdingData] of portfolio.holdings) {
            const percentage = typeof holdingData === 'object' ? holdingData.percentage : holdingData;
            const isDisabled = typeof holdingData === 'object' && holdingData.disabled;

            if (isDisabled) {
                continue;
            }

            if (percentage > 25) {
                concentratedETFs.push({ ticker, percentage });
            }
        }

        if (concentratedETFs.length > 0) {
            const etfList = concentratedETFs.map((item) => `${item.ticker} (${item.percentage}%)`).join(', ');
            return {
                type: 'warning',
                message: `High single ETF concentration: ${etfList}`,
                description: 'Consider diversifying across more holdings to reduce concentration risk',
            };
        }
        return null;
    }

    /**
     * Check for high daily reset leverage
     */
    private checkHighDailyResetLeverage(portfolio: Portfolio): Warning | null {
        const highLeverageETFs: string[] = [];

        for (const [ticker, holdingData] of portfolio.holdings) {
            const isDisabled = typeof holdingData === 'object' && holdingData.disabled;
            if (isDisabled) {
                continue;
            }

            const etf = getETFByTicker(ticker);
            if (!etf || etf.leverageType !== 'Daily Reset') {
                continue;
            }

            for (const [, amount] of etf.exposures) {
                if (amount > 2.0) {
                    highLeverageETFs.push(ticker);
                    break;
                }
            }
        }

        if (highLeverageETFs.length > 0) {
            const etfList = highLeverageETFs.join(', ');
            return {
                type: 'warning',
                message: `High daily reset leverage detected (${etfList})`,
                description: 'Daily reset ETFs with >2x leverage can experience decay during volatile markets',
            };
        }
        return null;
    }

    /**
     * Check for sufficient International Developed Markets exposure
     */
    private checkInternationalDevelopedExposure(portfolio: Portfolio): Warning | null {
        const { intlDeveloped } = this.getPortfolioExposures(portfolio);
        if (intlDeveloped < 10) {
            return {
                type: 'info',
                message: `Insufficient International Developed Markets exposure (${intlDeveloped.toFixed(1)}%)`,
                description: 'Consider adding at least 10% International Developed exposure for global diversification',
            };
        }
        return null;
    }

    /**
     * Check for sufficient Emerging Markets exposure
     */
    private checkEmergingMarketsExposure(portfolio: Portfolio): Warning | null {
        const { emEquity } = this.getPortfolioExposures(portfolio);
        if (emEquity < 10) {
            return {
                type: 'info',
                message: `Insufficient Emerging Markets exposure (${emEquity.toFixed(1)}%)`,
                description: 'Consider adding at least 10% EM exposure for global diversification',
            };
        }
        return null;
    }

    /**
     * Check for sufficient Small Cap exposure
     */
    private checkSmallCapExposure(portfolio: Portfolio): Warning | null {
        const { smallCap } = this.getPortfolioExposures(portfolio);
        if (smallCap < 10) {
            return {
                type: 'info',
                message: `Insufficient Small Cap exposure (${smallCap.toFixed(1)}%)`,
                description: 'Consider adding at least 10% small cap exposure for potential enhanced returns',
            };
        }
        return null;
    }

    /**
     * Gets portfolio exposures (public method)
     */
    public getExposures(portfolio: Portfolio): PortfolioExposures {
        return this.getPortfolioExposures(portfolio);
    }
}
