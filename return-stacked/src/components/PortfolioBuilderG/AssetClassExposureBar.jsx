import React from 'react';
import { analyzePortfolio, assetClassColors } from './etfData';

// Component to display asset class exposures as a stacked bar
const AssetClassExposureBar = ({ portfolio }) => {
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

    return (
        <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium text-gray-700">Asset Class Exposure</h3>
                <div className="text-sm font-medium bg-gray-100 px-3 py-1 rounded text-gray-700">
                    {totalLeverage.toFixed(2)}x Leverage
                </div>
            </div>
            <div className="h-12 w-full flex rounded-md overflow-hidden border border-gray-200">
                {Array.from(assetClasses.entries()).map(([assetClass, amount], index) => {
                    const percentage = (amount / totalLeverage) * 100;
                    const displayName = getDisplayName(assetClass);

                    return (
                        <div
                            key={index}
                            style={{
                                width: `${percentage}%`,
                                backgroundColor: assetClassColors[assetClass],
                            }}
                            className="flex items-center justify-center text-xs font-medium text-white border-r border-white"
                            title={`${assetClass}: ${(amount * 100).toFixed(1)}%`}
                        >
                            {percentage >= 10 ? `${displayName} ${percentage.toFixed(0)}%` : ''}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AssetClassExposureBar;
