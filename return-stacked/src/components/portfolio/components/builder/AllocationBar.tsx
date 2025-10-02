import React from 'react';
import { analyzePortfolio, assetClassColors, convertCustomPortfolioToPortfolio } from '../../utils/etfData';
import type { CustomPortfolio } from '../../types';

interface AllocationBarProps {
    portfolio: CustomPortfolio;
    height?: number;
}

const AllocationBar: React.FC<AllocationBarProps> = ({ portfolio, height = 24 }) => {
    const { assetClasses, totalLeverage } = analyzePortfolio(convertCustomPortfolioToPortfolio(portfolio));

    const getDisplayName = (assetClass: string): string => {
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

    const assetClassItems = Array.from(assetClasses.entries())
        .filter(([, amount]) => amount > 0)
        .sort((a, b) => b[1] - a[1]);

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
            <div className="w-full flex rounded overflow-hidden" style={{ height }}>
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
                            title={`${assetClass}: ${(amount * 100).toFixed(2)}% (${totalLeverage.toFixed(
                                2
                            )}x total leverage)`}
                        >
                            {percentage >= 20 && (
                                <span className="text-[9px] text-white drop-shadow font-medium leading-none">
                                    {displayName}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

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

export default AllocationBar;
