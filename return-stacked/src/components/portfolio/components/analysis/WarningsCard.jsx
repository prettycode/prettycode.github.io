import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { analyzePortfolio, parseExposureKey, etfCatalog } from '../../utils/etfData';

const MARKET_TOLERANCE = 0.25;

const getVTRatios = () => {
    const vtEtf = etfCatalog.find((e) => e.ticker === 'VT');
    if (!vtEtf) {
        return { usRatio: 0.6, exUsRatio: 0.4 };
    }

    let usEquity = 0;
    let exUsEquity = 0;

    for (const [key, amount] of vtEtf.exposures) {
        const { assetClass, marketRegion } = parseExposureKey(key);

        if (assetClass === 'Equity') {
            if (marketRegion === 'U.S.') {
                usEquity += amount;
            } else if (marketRegion === 'International Developed' || marketRegion === 'Emerging') {
                exUsEquity += amount;
            }
        }
    }

    const totalEquity = usEquity + exUsEquity;
    return {
        usRatio: totalEquity > 0 ? usEquity / totalEquity : 0.6,
        exUsRatio: totalEquity > 0 ? exUsEquity / totalEquity : 0.4,
    };
};

const getPortfolioExposures = (portfolio) => {
    const { exposures } = analyzePortfolio(portfolio);

    let usEquity = 0;
    let exUsEquity = 0;
    let emEquity = 0;
    let smallCap = 0;

    for (const [key, amount] of exposures.entries()) {
        const { assetClass, marketRegion, sizeFactor } = parseExposureKey(key);

        if (assetClass === 'Equity') {
            if (marketRegion === 'U.S.') {
                usEquity += amount;
            } else if (marketRegion === 'International Developed' || marketRegion === 'Emerging') {
                exUsEquity += amount;
                if (marketRegion === 'Emerging') {
                    emEquity += amount;
                }
            }

            if (sizeFactor === 'Small Cap') {
                smallCap += amount;
            }
        }
    }

    return { usEquity, exUsEquity, emEquity, smallCap };
};

const warningRules = [
    {
        id: 'no-em-exposure',
        check: (portfolio) => {
            const { emEquity } = getPortfolioExposures(portfolio);
            if (emEquity === 0) {
                return {
                    message: 'No Emerging Markets exposure',
                    description: 'Consider adding EM exposure for global diversification',
                };
            }
            return null;
        },
    },
    {
        id: 'us-underweight',
        check: (portfolio) => {
            const { usEquity, exUsEquity } = getPortfolioExposures(portfolio);
            const totalEquity = usEquity + exUsEquity;

            if (totalEquity === 0) {
                return null;
            }

            const { usRatio: vtUsRatio } = getVTRatios();
            const usRatio = usEquity / totalEquity;
            const minAcceptableRatio = vtUsRatio * (1 - MARKET_TOLERANCE);

            if (usRatio < minAcceptableRatio) {
                const currentUsPercent = (usRatio * 100).toFixed(1);
                const vtUsPercent = (vtUsRatio * 100).toFixed(0);
                const minAcceptablePercent = (minAcceptableRatio * 100).toFixed(0);
                return {
                    message: `U.S. exposure (${currentUsPercent}%) is significantly below VT's (${vtUsPercent}%)`,
                    description: `Your portfolio is underweight U.S. equities (threshold: ${minAcceptablePercent}%)`,
                };
            }
            return null;
        },
    },
    {
        id: 'us-overweight',
        check: (portfolio) => {
            const { usEquity, exUsEquity } = getPortfolioExposures(portfolio);
            const totalEquity = usEquity + exUsEquity;

            if (totalEquity === 0) {
                return null;
            }

            const { usRatio: vtUsRatio } = getVTRatios();
            const usRatio = usEquity / totalEquity;
            const maxAcceptableRatio = vtUsRatio * (1 + MARKET_TOLERANCE);

            if (usRatio > maxAcceptableRatio) {
                const currentUsPercent = (usRatio * 100).toFixed(1);
                const vtUsPercent = (vtUsRatio * 100).toFixed(0);
                const maxAcceptablePercent = (maxAcceptableRatio * 100).toFixed(0);
                return {
                    message: `U.S. exposure (${currentUsPercent}%) is significantly above VT's (${vtUsPercent}%)`,
                    description: `Your portfolio is overweight U.S. equities (threshold: ${maxAcceptablePercent}%)`,
                };
            }
            return null;
        },
    },
    {
        id: 'no-small-cap',
        check: (portfolio) => {
            const { smallCap } = getPortfolioExposures(portfolio);
            if (smallCap === 0) {
                return {
                    message: 'No Small Cap exposure',
                    description: 'Consider adding small cap stocks for potential enhanced returns',
                };
            }
            return null;
        },
    },
    {
        id: 'high-daily-reset-leverage',
        check: (portfolio) => {
            const highLeverageETFs = [];

            for (const [ticker, holdingData] of portfolio.holdings) {
                const isDisabled = typeof holdingData === 'object' && holdingData.disabled;
                if (isDisabled) {
                    continue;
                }

                const etf = etfCatalog.find((e) => e.ticker === ticker);
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
                    message: `High daily reset leverage detected (${etfList})`,
                    description: 'Daily reset ETFs with >2x leverage can experience decay during volatile markets',
                };
            }
            return null;
        },
    },
    {
        id: 'single-etf-concentration',
        check: (portfolio) => {
            const concentratedETFs = [];

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
                    message: `High single ETF concentration: ${etfList}`,
                    description: 'Consider diversifying across more holdings to reduce concentration risk',
                };
            }
            return null;
        },
    },
];

const WarningsCard = ({ portfolio, isExpanded = false, onToggleExpanded }) => {
    const warnings = warningRules
        .map((rule) => {
            const warning = rule.check(portfolio);
            return warning ? { ...warning, id: rule.id } : null;
        })
        .filter((warning) => warning !== null);

    if (warnings.length === 0) {
        return null;
    }

    return (
        <Card className="overflow-hidden border border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20 shadow-sm mb-2 py-0 gap-0">
            <CardHeader
                className={cn('cursor-pointer py-3 px-4 flex flex-row items-center justify-between')}
                onClick={onToggleExpanded}
            >
                <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                    <h3 className="font-medium text-sm text-amber-900 dark:text-amber-100">
                        Portfolio Warnings ({warnings.length})
                    </h3>
                </div>
                <div className="text-xs text-amber-700 dark:text-amber-400 flex items-center">
                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </div>
            </CardHeader>

            {isExpanded && (
                <CardContent className="px-4 pt-0 pb-3">
                    <div className="space-y-2">
                        {warnings.map((warning) => (
                            <div
                                key={warning.id}
                                className="flex items-start space-x-2 p-2 rounded-md bg-amber-100/50 dark:bg-amber-900/20"
                            >
                                <div className="flex-shrink-0 mt-0.5">
                                    <div className="h-1.5 w-1.5 rounded-full bg-amber-600 dark:bg-amber-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
                                        {warning.message}
                                    </p>
                                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                                        {warning.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            )}
        </Card>
    );
};

export default WarningsCard;
