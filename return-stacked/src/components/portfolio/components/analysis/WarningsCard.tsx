import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AlertTriangle, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseExposureKey, etfCatalog } from '../../utils/etfData';
import type { Portfolio } from '@/types/portfolio';

interface PortfolioExposures {
    usEquity: number;
    exUsEquity: number;
    emEquity: number;
    intlDeveloped: number;
    smallCap: number;
}

interface WarningResult {
    message: string;
    description?: string;
}

interface WarningRule {
    id: string;
    check: (portfolio: Portfolio) => WarningResult | null;
}

interface RuleResult {
    id: string;
    passed: boolean;
    message: string | null;
    description: string | null;
}

interface WarningsCardProps {
    portfolio: Portfolio;
}

/**
 * Calculate portfolio exposures across different dimensions
 */
const getPortfolioExposures = (portfolio: Portfolio): PortfolioExposures => {
    let usEquity = 0;
    let exUsEquity = 0;
    let emEquity = 0;
    let intlDeveloped = 0;
    let smallCap = 0;

    // Calculate exposures directly from portfolio holdings
    for (const [ticker, holdingData] of portfolio.holdings) {
        const percentage = typeof holdingData === 'object' ? holdingData.percentage : holdingData;
        const isDisabled = typeof holdingData === 'object' && holdingData.disabled;

        if (isDisabled) {
            continue;
        }

        const etf = etfCatalog.find((e) => e.ticker === ticker);
        if (!etf) {
            continue;
        }

        const weight = percentage / 100; // Convert percentage to decimal

        for (const [key, amount] of etf.exposures) {
            const { assetClass, marketRegion, sizeFactor } = parseExposureKey(key);
            const weightedAmount = amount * weight;

            if (assetClass === 'Equity') {
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
            }
        }
    }

    // Convert to percentages
    return {
        usEquity: usEquity * 100,
        exUsEquity: exUsEquity * 100,
        emEquity: emEquity * 100,
        intlDeveloped: intlDeveloped * 100,
        smallCap: smallCap * 100,
    };
};

/**
 * Portfolio warning rules
 */
const warningRules: WarningRule[] = [
    {
        id: 'single-etf-concentration',
        check: (portfolio: Portfolio): WarningResult | null => {
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
                    message: `High single ETF concentration: ${etfList}`,
                    description: 'Consider diversifying across more holdings to reduce concentration risk',
                };
            }
            return null;
        },
    },
    {
        id: 'high-daily-reset-leverage',
        check: (portfolio: Portfolio): WarningResult | null => {
            const highLeverageETFs: string[] = [];

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
        id: 'no-intl-developed-exposure',
        check: (portfolio: Portfolio): WarningResult | null => {
            const { intlDeveloped } = getPortfolioExposures(portfolio);
            if (intlDeveloped < 10) {
                return {
                    message: `Insufficient International Developed Markets exposure (${intlDeveloped.toFixed(1)}%)`,
                    description: 'Consider adding at least 10% International Developed exposure for global diversification',
                };
            }
            return null;
        },
    },
    {
        id: 'no-em-exposure',
        check: (portfolio: Portfolio): WarningResult | null => {
            const { emEquity } = getPortfolioExposures(portfolio);
            if (emEquity < 10) {
                return {
                    message: `Insufficient Emerging Markets exposure (${emEquity.toFixed(1)}%)`,
                    description: 'Consider adding at least 10% EM exposure for global diversification',
                };
            }
            return null;
        },
    },
    {
        id: 'no-small-cap',
        check: (portfolio: Portfolio): WarningResult | null => {
            const { smallCap } = getPortfolioExposures(portfolio);
            if (smallCap < 10) {
                return {
                    message: `Insufficient Small Cap exposure (${smallCap.toFixed(1)}%)`,
                    description: 'Consider adding at least 10% small cap exposure for potential enhanced returns',
                };
            }
            return null;
        },
    },
];

/**
 * Component to display portfolio warnings and optimization suggestions
 */
const WarningsCard: React.FC<WarningsCardProps> = ({ portfolio }) => {
    const [isExpanded, setIsExpanded] = React.useState(false);
    const ruleResults: RuleResult[] = warningRules.map((rule) => {
        const warning = rule.check(portfolio);
        return {
            id: rule.id,
            passed: !warning,
            message: warning ? warning.message : null,
            description: warning?.description ?? null,
        };
    });

    const hasWarnings = ruleResults.some((result) => !result.passed);
    const warningCount = ruleResults.filter((result) => !result.passed).length;

    const ruleDescriptions: Record<string, string> = {
        'single-etf-concentration': 'Avoid single ETF concentration risk',
        'high-daily-reset-leverage': 'Avoid daily reset ETFs',
        'no-intl-developed-exposure': 'International Developed Markets exposure',
        'no-em-exposure': 'Emerging Markets exposure',
        'no-small-cap': 'Small Cap exposure',
    };

    return (
        <Card
            className={cn(
                'overflow-hidden shadow-sm mb-2 py-0 gap-0',
                hasWarnings
                    ? 'border border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20'
                    : 'border border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20'
            )}
        >
            <CardHeader
                className={cn('cursor-pointer py-3 px-4 flex flex-row items-center justify-between')}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center space-x-2">
                    {hasWarnings ? (
                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                    ) : (
                        <Check className="h-4 w-4 text-green-600 dark:text-green-500" />
                    )}
                    <h3
                        className={cn(
                            'font-medium text-sm',
                            hasWarnings ? 'text-amber-900 dark:text-amber-100' : 'text-green-900 dark:text-green-100'
                        )}
                    >
                        {hasWarnings ? `Portfolio Optimizations (${warningCount})` : 'Portfolio Optimizations (0)'}
                    </h3>
                </div>
                <div
                    className={cn(
                        'text-xs flex items-center',
                        hasWarnings ? 'text-amber-700 dark:text-amber-400' : 'text-green-700 dark:text-green-400'
                    )}
                >
                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </div>
            </CardHeader>

            {isExpanded && (
                <CardContent className="px-4 pt-0 pb-3">
                    <div className="w-full overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="px-2 py-2 text-left align-middle font-medium">Optimization</th>
                                    {hasWarnings && <th className="px-2 py-2 text-left align-middle font-medium">Details</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {ruleResults.map((result) => (
                                    <tr
                                        key={result.id}
                                        className={cn(
                                            'border-b',
                                            result.passed ? 'bg-green-50/30 dark:bg-green-950/10' : 'bg-amber-50/30 dark:bg-amber-950/10'
                                        )}
                                    >
                                        <td
                                            className={cn(
                                                'p-2 align-top font-medium text-xs',
                                                result.passed ? 'text-green-900 dark:text-green-100' : 'text-amber-900 dark:text-amber-100'
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                {result.passed ? (
                                                    <Check className="h-4 w-4 text-green-600 dark:text-green-500 flex-shrink-0" />
                                                ) : (
                                                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500 flex-shrink-0" />
                                                )}
                                                <span>{ruleDescriptions[result.id] || result.id}</span>
                                            </div>
                                        </td>
                                        {hasWarnings && (
                                            <td
                                                className={cn(
                                                    'p-2 align-top text-xs',
                                                    result.passed
                                                        ? 'text-green-700 dark:text-green-300'
                                                        : 'text-amber-700 dark:text-amber-300'
                                                )}
                                            >
                                                {!result.passed && (
                                                    <div>
                                                        <div className="font-medium">{result.message}</div>
                                                        <div className="text-xs mt-0.5">{result.description}</div>
                                                    </div>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            )}
        </Card>
    );
};

export default WarningsCard;
