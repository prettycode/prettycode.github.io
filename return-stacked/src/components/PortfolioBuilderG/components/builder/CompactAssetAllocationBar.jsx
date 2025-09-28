import React from 'react';
import { analyzePortfolio, assetClassColors } from '../../utils/etfData';

// Compact version of AssetClassExposureBar optimized for table cells
const CompactAssetAllocationBar = ({ portfolio, height = 24 }) => {
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

    // Convert to array and sort by value for better visualization
    const assetClassItems = Array.from(assetClasses.entries()).sort((a, b) => b[1] - a[1]);

    if (assetClassItems.length === 0) {
        return (
            <div
                className="w-full bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500"
                style={{ height }}
            >
                No assets
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Compact stacked bar */}
            <div className="w-full flex rounded overflow-hidden" style={{ height }}>
                {assetClassItems.map(([assetClass, amount], index) => {
                    // Calculate percentage based on relative exposure
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
                            title={`${assetClass}: ${(amount * 100).toFixed(2)}% (${totalLeverage.toFixed(
                                2
                            )}x total leverage)`}
                        >
                            {/* Only show text for segments that are wide enough */}
                            {percentage >= 20 && (
                                <span className="text-[9px] text-white drop-shadow font-medium leading-none">
                                    {displayName}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Compact legend - only show for hover/tooltip context */}
            <div className="sr-only">
                {assetClassItems.map(([assetClass, amount], index) => {
                    const percentage = (amount / totalLeverage) * 100;
                    return (
                        <span key={index}>
                            {getDisplayName(assetClass)}: {percentage.toFixed(1)}%
                            {index < assetClassItems.length - 1 ? ', ' : ''}
                        </span>
                    );
                })}
            </div>
        </div>
    );
};

export default CompactAssetAllocationBar;

