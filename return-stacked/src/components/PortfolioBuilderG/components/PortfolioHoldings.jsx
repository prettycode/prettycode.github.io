import React, { memo, useMemo } from 'react';
import { parseExposureKey } from '../utils/etfData';
import AllocationControls from './AllocationControls';
import ETFActions from './ETFActions';

const PortfolioHoldings = memo(
    ({
        customPortfolio,
        etfCatalog,
        showDetailColumns,
        tempInputs,
        handleInputChange,
        handleInputBlur,
        updateETFAllocation,
        toggleLockETF,
        toggleDisableETF,
        removeETFFromPortfolio,
    }) => {
        // Memoize the portfolio entries to prevent unnecessary re-renders
        const portfolioEntries = useMemo(() => {
            return Array.from(customPortfolio.holdings.entries()).map(([ticker, holding], index) => {
                const etf = etfCatalog.find((e) => e.ticker === ticker);
                let totalExposure = 0;
                const constituents = [];

                if (etf) {
                    for (const [key, amount] of etf.exposures) {
                        totalExposure += amount;

                        // Parse the exposure key to create a readable constituent description
                        const { assetClass, marketRegion, factorStyle, sizeFactor } = parseExposureKey(key);
                        let description = assetClass;

                        if (marketRegion || factorStyle || sizeFactor) {
                            const details = [];
                            if (sizeFactor) details.push(sizeFactor);
                            if (factorStyle) details.push(factorStyle);
                            if (marketRegion) details.push(marketRegion);
                            description += ` (${details.join(' ')})`;
                        }

                        constituents.push(`${description}: ${(amount * 100).toFixed(1)}%`);
                    }
                }

                return {
                    ticker,
                    holding,
                    etf,
                    totalExposure,
                    constituents,
                    index,
                };
            });
        }, [customPortfolio.holdings, etfCatalog]);

        return (
            <div className="overflow-x-auto border border-gray-200 rounded-md overflow-hidden">
                <table className="w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                style={{
                                    width: showDetailColumns ? 'auto' : '15%',
                                }}
                            >
                                Ticker
                            </th>
                            {showDetailColumns && (
                                <>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    >
                                        Constituents
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    >
                                        Leverage
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    >
                                        Leverage Type
                                    </th>
                                </>
                            )}
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                style={{
                                    width: showDetailColumns ? 'auto' : '70%',
                                }}
                            >
                                Allocation (%)
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                                style={{ width: '15%' }}
                            >
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {portfolioEntries.map(({ ticker, holding, etf, totalExposure, constituents, index }) => {
                            const { percentage, locked, disabled } = holding;

                            return (
                                <tr
                                    key={index}
                                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${
                                        disabled ? 'opacity-60' : ''
                                    }`}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        <span className={disabled ? 'text-gray-400' : ''}>{ticker}</span>
                                        {!showDetailColumns && (
                                            <>
                                                {totalExposure > 1 && (
                                                    <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                                        {totalExposure.toFixed(1)}x
                                                    </span>
                                                )}
                                                {etf.leverageType !== 'None' && (
                                                    <span
                                                        className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                            etf.leverageType === 'Stacked'
                                                                ? 'bg-blue-100 text-blue-800'
                                                                : etf.leverageType === 'Daily Reset'
                                                                ? 'bg-yellow-100 text-yellow-800'
                                                                : 'bg-purple-100 text-purple-800'
                                                        }`}
                                                    >
                                                        {etf.leverageType.charAt(0)}
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </td>
                                    {showDetailColumns && (
                                        <>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                <div className="max-w-md">
                                                    {constituents.map((constituent, i) => (
                                                        <div key={i} className="text-xs mb-1">
                                                            {constituent}
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                                                {totalExposure.toFixed(1)}x
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <span
                                                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                        etf.leverageType === 'None'
                                                            ? 'bg-green-100 text-green-800'
                                                            : etf.leverageType === 'Stacked'
                                                            ? 'bg-blue-100 text-blue-800'
                                                            : etf.leverageType === 'Daily Reset'
                                                            ? 'bg-yellow-100 text-yellow-800'
                                                            : 'bg-purple-100 text-purple-800'
                                                    }`}
                                                >
                                                    {etf.leverageType === 'None' ? 'Unlevered' : etf.leverageType}
                                                </span>
                                            </td>
                                        </>
                                    )}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <AllocationControls
                                            ticker={ticker}
                                            percentage={percentage}
                                            locked={locked}
                                            disabled={disabled}
                                            showDetailColumns={showDetailColumns}
                                            tempInputs={tempInputs}
                                            handleInputChange={handleInputChange}
                                            handleInputBlur={handleInputBlur}
                                            updateETFAllocation={updateETFAllocation}
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <ETFActions
                                            ticker={ticker}
                                            locked={locked}
                                            disabled={disabled}
                                            portfolioSize={customPortfolio.holdings.size}
                                            toggleLockETF={toggleLockETF}
                                            toggleDisableETF={toggleDisableETF}
                                            removeETFFromPortfolio={removeETFFromPortfolio}
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                        {customPortfolio.holdings.size === 0 && (
                            <tr>
                                <td
                                    colSpan={showDetailColumns ? '6' : '3'}
                                    className="px-6 py-4 text-center text-sm text-gray-500"
                                >
                                    No ETFs added yet. Add ETFs from the list above or select a template.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        );
    },
    (prevProps, nextProps) => {
        // Custom comparison function to prevent unnecessary re-renders
        return (
            prevProps.customPortfolio.holdings === nextProps.customPortfolio.holdings &&
            prevProps.showDetailColumns === nextProps.showDetailColumns &&
            prevProps.tempInputs === nextProps.tempInputs
        );
    }
);

export default PortfolioHoldings;
