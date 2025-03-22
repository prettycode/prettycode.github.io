import React from 'react';
import { parseExposureKey } from '../utils';

const PortfolioTable = ({
    customPortfolio,
    etfCatalog,
    tempInputs,
    showDetailColumns,
    onUpdateAllocation,
    onToggleLock,
    onToggleDisable,
    onInputChange,
    onInputBlur,
    onRemoveETF,
}) => {
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
                    {Array.from(customPortfolio.holdings.entries()).map(([ticker, holding], index) => {
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

                        const isLeveraged = totalExposure > 1;
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
                                    <div className="flex items-center gap-2 w-full">
                                        {!showDetailColumns && (
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                value={percentage}
                                                onChange={(e) => onUpdateAllocation(ticker, e.target.value)}
                                                disabled={locked || disabled}
                                                className={`flex-grow ${disabled || locked ? 'opacity-50' : ''}`}
                                            />
                                        )}
                                        <div className="flex-shrink-0 flex items-center">
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={
                                                    tempInputs[ticker] !== undefined
                                                        ? tempInputs[ticker]
                                                        : percentage.toFixed(1)
                                                }
                                                onChange={(e) => onInputChange(ticker, e.target.value)}
                                                onBlur={() => onInputBlur(ticker)}
                                                disabled={locked || disabled}
                                                className={`w-16 p-1 border border-gray-300 rounded ${
                                                    disabled || locked ? 'bg-gray-100 text-gray-400' : ''
                                                }`}
                                            />
                                            <span className="text-gray-500 ml-1">%</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex gap-2 justify-end">
                                        <button
                                            onClick={() => onToggleLock(ticker)}
                                            className={`p-1 rounded-full hover:bg-gray-100 ${
                                                disabled ? 'opacity-50 cursor-not-allowed' : ''
                                            } ${locked ? 'text-yellow-500' : 'text-gray-400'}`}
                                            title={locked ? 'Unlock' : 'Lock'}
                                            disabled={disabled}
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-5 w-5"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                {locked ? (
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                                    />
                                                ) : (
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                                                    />
                                                )}
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => onToggleDisable(ticker)}
                                            className={`p-1 rounded-full hover:bg-gray-100 ${
                                                disabled ? 'text-red-500' : 'text-gray-400'
                                            }`}
                                            title={disabled ? 'Enable' : 'Disable'}
                                        >
                                            {disabled ? (
                                                // Show ban/X icon when disabled
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="h-5 w-5"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                                                    ></path>
                                                </svg>
                                            ) : (
                                                // Show eye icon when enabled
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="h-5 w-5"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M15 12a3 3 0 01-6 0 3 3 0 016 0z"
                                                    ></path>
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                                    ></path>
                                                </svg>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => onRemoveETF(ticker)}
                                            className={`p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-gray-100 ${
                                                customPortfolio.holdings.size <= 1
                                                    ? 'opacity-50 cursor-not-allowed'
                                                    : ''
                                            }`}
                                            title="Delete"
                                            disabled={customPortfolio.holdings.size <= 1}
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-5 w-5"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                />
                                            </svg>
                                        </button>
                                    </div>
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
};

export default PortfolioTable;
