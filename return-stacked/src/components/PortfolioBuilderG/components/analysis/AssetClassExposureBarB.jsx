import React, { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown } from 'lucide-react';
import { roundForDisplay } from '../../utils/precisionUtils';
import { analyzePortfolio, assetClassColors } from '../../utils/etfData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';

// Component to display asset class exposures as a stacked bar with compact modern visuals
const AssetClassExposureBarB = ({ portfolio, sortByValue = false, showRelative = true }) => {
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

    return (
        <Card className="overflow-hidden border-border/60 bg-gradient-to-br from-card/20 to-card mb-2 py-0">
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
                        <div className="space-y-1">
                            {assetClassItems.map(([assetClass, amount]) => {
                                if (amount === 0) return null;

                                const percentage = showRelative
                                    ? roundForDisplay((amount / totalLeverage) * 100)
                                    : roundForDisplay(amount * 100);
                                const displayName = getDisplayName(assetClass);

                                return (
                                    <div key={assetClass} className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            {/* Label always on the left */}
                                            <div className="flex-shrink-0 w-14 text-left">
                                                <span className="text-xs font-medium text-foreground">
                                                    {displayName}
                                                </span>
                                            </div>

                                            {/* Bar container */}
                                            <div className="flex-1 relative">
                                                <div
                                                    className="relative h-6 bg-muted rounded-sm overflow-hidden cursor-pointer"
                                                    title={`${assetClass}: ${(amount * 100).toFixed(4)}% (${
                                                        showRelative ? 'relative' : 'absolute'
                                                    })`}
                                                >
                                                    <div
                                                        className="absolute inset-y-0 left-0 rounded-sm"
                                                        style={{
                                                            width: `${percentage}%`,
                                                            minWidth: percentage < 3 ? '2px' : 'auto',
                                                            backgroundColor: assetClassColors[assetClass],
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Percentage always on the right */}
                                            <div className="flex-shrink-0 w-10 text-right">
                                                <span
                                                    className="text-xs font-medium text-muted-foreground cursor-help"
                                                    title={`${
                                                        showRelative
                                                            ? ((amount / totalLeverage) * 100).toFixed(4)
                                                            : (amount * 100).toFixed(4)
                                                    }%`}
                                                >
                                                    {Math.round(percentage)}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default AssetClassExposureBarB;
