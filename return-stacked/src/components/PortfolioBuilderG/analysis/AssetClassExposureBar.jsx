import React from 'react';
import { analyzePortfolio, assetClassColors } from '../utils/etfData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';

// Component to display asset class exposures as a stacked bar with compact modern visuals
const AssetClassExposureBar = ({ portfolio, sortByValue = false }) => {
    const { assetClasses, totalLeverage } = analyzePortfolio(portfolio);

    // Function to get display name for asset classes
    const getDisplayName = (assetClass) => {
        switch (assetClass) {
            case 'Managed Futures':
                return 'Trend';
            case 'Futures Yield':
                return 'Yield';
            case 'U.S. Treasuries':
                return 'T-Bonds';
            default:
                return assetClass;
        }
    };

    // Function to get description for asset classes
    const getDescription = (assetClass) => {
        switch (assetClass) {
            case 'Equity':
                return 'Stock market exposure across various regions and styles';
            case 'U.S. Treasuries':
                return 'U.S. government bonds with various durations';
            case 'Managed Futures':
                return 'Trend-following strategies across multiple asset classes';
            case 'Futures Yield':
                return 'Strategies focusing on capturing futures yield';
            case 'Gold':
                return 'Exposure to gold as a precious metal';
            case 'Bitcoin':
                return 'Exposure to Bitcoin cryptocurrency';
            default:
                return '';
        }
    };

    // Convert to array and prepare for display
    let assetClassItems = Array.from(assetClasses.entries());

    // Apply sorting if enabled, otherwise maintain original order defined in code
    if (sortByValue) {
        assetClassItems = assetClassItems.sort((a, b) => b[1] - a[1]);
    }

    return (
        <Card className="overflow-hidden border-border/60 bg-gradient-to-br from-card/20 to-card">
            <CardContent className="p-3">
                <div className="flex flex-col space-y-2">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-1">
                            <h3 className="font-medium text-sm">Asset Allocation</h3>
                            <div className="relative group">
                                <Info className="h-3 w-3 text-muted-foreground/70 cursor-help" />
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 w-40 p-1.5 bg-black/90 text-xs text-white rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-50">
                                    Shows portfolio allocation across asset classes
                                </div>
                            </div>
                        </div>
                        <Badge variant="outline" className="flex items-center gap-1 font-medium px-1.5 py-0.5 text-xs">
                            <span className="opacity-70 text-[9px] tracking-wider uppercase mr-0.5">Leverage</span>
                            <span>{totalLeverage.toFixed(2)}x</span>
                        </Badge>
                    </div>

                    <div>
                        {/* Main stacked bar */}
                        <div className="h-10 w-full flex rounded-md overflow-hidden shadow-sm">
                            {assetClassItems.map(([assetClass, amount], index) => {
                                const percentage = (amount / totalLeverage) * 100;
                                const displayName = getDisplayName(assetClass);

                                return (
                                    <div
                                        key={index}
                                        style={{
                                            width: `${percentage}%`,
                                            backgroundColor: assetClassColors[assetClass],
                                        }}
                                        className="flex items-center justify-center h-full"
                                        title={`${assetClass}: ${(amount * 100).toFixed(1)}%`}
                                    >
                                        {percentage >= 10 && (
                                            <span className="text-[10px] text-white drop-shadow-md font-medium z-10">
                                                {displayName} {percentage.toFixed(0)}%
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1 justify-center">
                        {assetClassItems.map(([assetClass, amount], index) => (
                            <div key={index} className="flex items-center text-[10px]">
                                <div
                                    className="w-2 h-2 rounded-sm mr-0.5 border border-white/10"
                                    style={{ backgroundColor: assetClassColors[assetClass] }}
                                ></div>
                                <span>{getDisplayName(assetClass)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default AssetClassExposureBar;
