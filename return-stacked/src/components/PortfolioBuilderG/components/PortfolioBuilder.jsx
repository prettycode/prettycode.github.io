import React from 'react';
import { ETFSelector, PortfolioControls } from './';
import { parseExposureKey, deserializePortfolio } from '../utils';
import PortfolioTable from './PortfolioTable';

const PortfolioBuilder = ({
    customPortfolio,
    etfCatalog,
    tempInputs,
    showDetailColumns,
    totalAllocation,
    examplePortfolios,
    savedPortfolios,
    onAddETF,
    onRemoveETF,
    onUpdateAllocation,
    onToggleLock,
    onToggleDisable,
    onInputChange,
    onInputBlur,
    onResetPortfolio,
    onSavePortfolio,
    onToggleDetailColumns,
    onDeletePortfolio,
    onUpdatePortfolio,
}) => {
    // Function to load a portfolio (example or saved)
    const loadPortfolio = (portfolio, isSaved = false) => {
        try {
            // If it's a saved portfolio, it needs to be deserialized
            const portfolioToLoad = isSaved ? deserializePortfolio(portfolio) : portfolio;

            // Convert the portfolio's holdings to the format used by the builder
            const newHoldings = new Map();

            for (const [ticker, percentage] of portfolioToLoad.holdings.entries()) {
                if (typeof percentage === 'number') {
                    // Simple percentage (used by example portfolios)
                    newHoldings.set(ticker, {
                        percentage,
                        locked: false,
                        disabled: false,
                    });
                } else {
                    // Full holding object (used by saved portfolios)
                    newHoldings.set(ticker, percentage);
                }
            }

            // Update the portfolio with the loaded data
            onUpdatePortfolio({
                name: portfolioToLoad.name,
                description: portfolioToLoad.description || '',
                holdings: newHoldings,
            });
        } catch (error) {
            console.error('Error loading portfolio:', error);
            alert('There was an error loading the portfolio. Please try again.');
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-4">
            {/* Portfolio Controls for selecting templates and saved portfolios */}
            <div className="mb-4">
                <PortfolioControls
                    examplePortfolios={examplePortfolios}
                    savedPortfolios={savedPortfolios}
                    loadPortfolio={loadPortfolio}
                    onDeletePortfolio={onDeletePortfolio}
                />
            </div>

            {/* ETF Selection */}
            <div className="mb-4">
                <ETFSelector
                    etfCatalog={etfCatalog}
                    onSelect={onAddETF}
                    existingTickers={Array.from(customPortfolio.holdings.keys())}
                />
            </div>

            {/* Combined ETF Allocation and Builder */}
            {customPortfolio.holdings.size > 0 && (
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="text-md font-medium">Portfolio Allocations</h4>
                        <button
                            onClick={onToggleDetailColumns}
                            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 transition-colors"
                        >
                            {showDetailColumns ? (
                                <>
                                    <span>Hide Details</span>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M19 9l-7 7-7-7"
                                        />
                                    </svg>
                                </>
                            ) : (
                                <>
                                    <span>Show Details</span>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 5l7 7-7 7"
                                        />
                                    </svg>
                                </>
                            )}
                        </button>
                    </div>

                    <PortfolioTable
                        customPortfolio={customPortfolio}
                        etfCatalog={etfCatalog}
                        tempInputs={tempInputs}
                        showDetailColumns={showDetailColumns}
                        onUpdateAllocation={onUpdateAllocation}
                        onToggleLock={onToggleLock}
                        onToggleDisable={onToggleDisable}
                        onInputChange={onInputChange}
                        onInputBlur={onInputBlur}
                        onRemoveETF={onRemoveETF}
                    />

                    {/* Portfolio action buttons */}
                    <div className="flex justify-end gap-2 mt-4">
                        <button
                            onClick={onResetPortfolio}
                            className="px-3 py-1 text-sm rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                        >
                            Clear All
                        </button>
                        <button
                            onClick={onSavePortfolio}
                            disabled={Math.abs(totalAllocation - 100) > 0.1}
                            className={`px-3 py-1 text-sm rounded-md ${
                                Math.abs(totalAllocation - 100) <= 0.1
                                    ? 'bg-gray-800 text-white hover:bg-gray-700'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            Save Portfolio
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PortfolioBuilder;
