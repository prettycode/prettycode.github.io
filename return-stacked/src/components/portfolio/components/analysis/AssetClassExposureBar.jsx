import React from 'react';
import { analyzePortfolio, assetClassColors } from '../../utils/etfData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';

// Component to display asset class exposures as a stacked bar with compact modern visuals
const AssetClassExposureBar = ({ portfolio, sortByValue = false, showRelative = true, hideZeroValues = false }) => {
    const { assetClasses, totalLeverage } = analyzePortfolio(portfolio);

    // Function to get display name for asset classes
    const getDisplayName = (assetClass) => {
        switch (assetClass) {
            case 'Managed Futures':
                return 'Trend';
            case 'Futures Yield':
                return 'Carry';
            case 'U.S. Treasuries':
                return 'T-Bonds';
            default:
                return assetClass;
        }
    };

    // Convert to array and prepare for display
    let assetClassItems = Array.from(assetClasses.entries());

    // Apply sorting if enabled, otherwise maintain original order defined in code
    if (sortByValue) {
        assetClassItems = assetClassItems.sort((a, b) => b[1] - a[1]);
    }

    // Filter out zero values if hideZeroValues is enabled
    if (hideZeroValues) {
        assetClassItems = assetClassItems.filter(([_, value]) => value > 0);
    }

    return (
        <Card className="overflow-hidden border shadow-sm mb-2 py-0">
            <CardContent className="px-4 py-3">
                <div className="flex flex-col space-y-2">
                    <div className="flex items-center">
                        <h3 className="font-medium text-sm mr-2">Asset Allocation</h3>
                        <Badge
                            className="flex items-center gap-1 font-medium px-2 py-1 text-xs bg-gray-100 text-black border-0 cursor-help"
                            title={`Total Leverage: ${totalLeverage.toFixed(4)}x`}
                        >
                            <span>{totalLeverage.toFixed(2)}x</span> levered
                        </Badge>
                    </div>

                    <div>
                        {/* Main stacked bar */}
                        <div className="h-10 w-full flex rounded-md overflow-hidden shadow-sm">
                            {assetClassItems.map(([assetClass, amount], index) => {
                                // Calculate percentage based on display mode (relative or absolute)
                                const percentage = showRelative ? (amount / totalLeverage) * 100 : amount * 100;

                                const displayName = getDisplayName(assetClass);

                                return (
                                    <div
                                        key={index}
                                        style={{
                                            width: `${percentage}%`,
                                            backgroundColor: assetClassColors[assetClass],
                                        }}
                                        className="flex items-center justify-center h-full"
                                        title={`${assetClass}: ${(amount * 100).toFixed(4)}% (${
                                            showRelative ? 'relative' : 'absolute'
                                        })`}
                                    >
                                        {percentage >= 15 ? (
                                            <span
                                                className="text-[10px] text-white drop-shadow-md font-medium z-10 cursor-help"
                                                title={`${(showRelative
                                                    ? (amount / totalLeverage) * 100
                                                    : amount * 100
                                                ).toFixed(4)}%`}
                                            >
                                                {displayName} {percentage.toFixed(0)}%
                                            </span>
                                        ) : (
                                            percentage >= 5 && (
                                                <span
                                                    className="text-[10px] text-white drop-shadow-md font-medium z-10 cursor-help"
                                                    title={`${(showRelative
                                                        ? (amount / totalLeverage) * 100
                                                        : amount * 100
                                                    ).toFixed(4)}%`}
                                                >
                                                    {percentage.toFixed(0)}%
                                                </span>
                                            )
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1 justify-center">
                        {assetClassItems.map(([assetClass, amount], index) => {
                            // Calculate percentage based on display mode for tooltip display
                            const percentage = showRelative ? (amount / totalLeverage) * 100 : amount * 100;

                            return (
                                <div
                                    key={index}
                                    className="flex items-center text-[11px]"
                                    title={`${getDisplayName(assetClass)}: ${(amount * 100).toFixed(4)}% (${
                                        showRelative ? 'relative' : 'absolute'
                                    })`}
                                >
                                    <div
                                        className="w-2 h-2 rounded-sm mr-0.5 mt-0.25 border border-white/10"
                                        style={{ backgroundColor: assetClassColors[assetClass] }}
                                    ></div>
                                    <span>{getDisplayName(assetClass)}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default AssetClassExposureBar;
