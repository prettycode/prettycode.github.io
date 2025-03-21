import React, { useState, useEffect } from 'react';
import { etfCatalog, examplePortfolios, createPortfolio, parseExposureKey } from './utils';
import { redistributeAfterRemoval, updateAllocation, calculateTotalAllocation } from './utils';
import { savePortfolio, getSavedPortfolios, deserializePortfolio, deletePortfolio } from './utils';
import { ETFSelector, PortfolioControls, SavePortfolioModal } from './components';
import { PortfolioAnalysis } from './analysis';

// Main component
const PortfolioBuilderG = () => {
    const [customPortfolio, setCustomPortfolio] = useState(createPortfolio('My Custom Portfolio', []));
    const [tempInputs, setTempInputs] = useState({});
    const [showDetailColumns, setShowDetailColumns] = useState(false);
    const [savedPortfolios, setSavedPortfolios] = useState([]);
    const [showSaveModal, setShowSaveModal] = useState(false);

    // Load saved portfolios from localStorage on initial render
    useEffect(() => {
        loadSavedPortfolios();
    }, []);

    // Function to load saved portfolios
    const loadSavedPortfolios = () => {
        const portfolios = getSavedPortfolios();
        setSavedPortfolios(portfolios);
    };

    // Function to update custom portfolio
    const updateCustomPortfolio = (updatedHoldings) => {
        setCustomPortfolio({
            ...customPortfolio,
            holdings: new Map(updatedHoldings),
        });
    };

    // Function to add an ETF to the custom portfolio with initial 0% allocation
    const addETFToPortfolio = (ticker) => {
        const holdings = new Map(customPortfolio.holdings);

        // If this is the first ETF, set it to 100%
        const initialPercentage = holdings.size === 0 ? 100 : 0;

        holdings.set(ticker, {
            percentage: initialPercentage,
            locked: false,
            disabled: false,
        });

        updateCustomPortfolio(holdings);
    };

    // Function to remove an ETF from the custom portfolio and redistribute its allocation
    const removeETFFromPortfolio = (ticker) => {
        if (customPortfolio.holdings.size <= 1) return; // Don't remove the last ETF

        const holdings = new Map(customPortfolio.holdings);
        const updatedHoldings = redistributeAfterRemoval(holdings, ticker);

        if (updatedHoldings) {
            updateCustomPortfolio(updatedHoldings);
        }
    };

    // Function to update an ETF's allocation and adjust others to maintain 100% total
    const updateETFAllocation = (ticker, newPercentage) => {
        const holdings = new Map(customPortfolio.holdings);
        const updatedHoldings = updateAllocation(holdings, ticker, newPercentage);

        if (updatedHoldings) {
            updateCustomPortfolio(updatedHoldings);
        }
    };

    // Function to toggle lock status
    const toggleLockETF = (ticker) => {
        const holdings = new Map(customPortfolio.holdings);
        const currentHolding = holdings.get(ticker);

        // Can't lock a disabled ETF
        if (currentHolding.disabled) return;

        holdings.set(ticker, {
            ...currentHolding,
            locked: !currentHolding.locked,
        });

        updateCustomPortfolio(holdings);
    };

    // Function to toggle disabled status
    const toggleDisableETF = (ticker) => {
        const holdings = new Map(customPortfolio.holdings);
        const currentHolding = holdings.get(ticker);

        // If we're enabling a disabled ETF
        if (currentHolding.disabled) {
            // First update the ETF to be enabled
            holdings.set(ticker, {
                ...currentHolding,
                disabled: false,
                locked: false,
                // Keep its original percentage, it will be redistributed after
                percentage: currentHolding.percentage,
            });

            updateCustomPortfolio(holdings);

            // After enabling, redistribute allocations
            // We need to set a timer to ensure the state is updated first
            setTimeout(() => {
                // Default to 0 initially, then the user can adjust
                updateETFAllocation(ticker, 0);
            }, 0);

            return;
        }

        // If we're disabling an ETF
        // Save current percentage
        const oldPercentage = currentHolding.percentage;

        // Update the ETF to be disabled with 0%
        holdings.set(ticker, {
            ...currentHolding,
            disabled: true,
            locked: false,
            percentage: 0,
        });

        // Find ETFs that can be adjusted
        const adjustableETFs = Array.from(holdings.entries())
            .filter(([etfTicker, holding]) => etfTicker !== ticker && !holding.locked && !holding.disabled)
            .map(([etfTicker]) => etfTicker);

        // If no adjustable ETFs, revert the change
        if (adjustableETFs.length === 0 && oldPercentage > 0) {
            return;
        }

        // Redistribute the old percentage
        if (oldPercentage > 0) {
            // Calculate current total of adjustable ETFs
            const currentAdjustableTotal = adjustableETFs.reduce((sum, etf) => {
                const holding = holdings.get(etf);
                return sum + holding.percentage;
            }, 0);

            // If all adjustable ETFs have 0%, distribute equally
            if (currentAdjustableTotal <= 0) {
                const equalShare = oldPercentage / adjustableETFs.length;

                for (const etf of adjustableETFs) {
                    const holding = holdings.get(etf);
                    holdings.set(etf, {
                        ...holding,
                        percentage: equalShare,
                    });
                }
            }
            // Otherwise, distribute proportionally
            else {
                for (const etf of adjustableETFs) {
                    const holding = holdings.get(etf);
                    const proportion = holding.percentage / currentAdjustableTotal;

                    holdings.set(etf, {
                        ...holding,
                        percentage: holding.percentage + oldPercentage * proportion,
                    });
                }
            }

            // Round percentages
            for (const [etf, holding] of holdings.entries()) {
                holdings.set(etf, {
                    ...holding,
                    percentage: parseFloat(holding.percentage.toFixed(1)),
                });
            }
        }

        updateCustomPortfolio(holdings);
    };

    // Calculate total allocation
    const totalAllocation = calculateTotalAllocation(customPortfolio.holdings);

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

            // Update the custom portfolio with the loaded portfolio's data
            setCustomPortfolio({
                name: portfolioToLoad.name,
                description: portfolioToLoad.description || '',
                holdings: newHoldings,
            });
        } catch (error) {
            console.error('Error loading portfolio:', error);
            alert('There was an error loading the portfolio. Please try again.');
        }
    };

    // Function to delete a saved portfolio
    const handleDeletePortfolio = (portfolioName) => {
        try {
            // Delete the portfolio from localStorage
            const updatedPortfolios = deletePortfolio(portfolioName);

            // Update the state with the new list
            setSavedPortfolios(updatedPortfolios);

            // If the currently loaded portfolio was deleted, reset to default
            if (customPortfolio.name === portfolioName) {
                resetPortfolio();
            }

            // Show success message
            alert(`Portfolio "${portfolioName}" deleted successfully.`);
        } catch (error) {
            console.error('Error deleting portfolio:', error);
            alert('There was an error deleting the portfolio. Please try again.');
        }
    };

    // Function to reset the portfolio builder (clear all ETFs)
    const resetPortfolio = () => {
        setCustomPortfolio(createPortfolio('My Custom Portfolio', []));
    };

    // Function to handle temp input state for number fields
    const handleInputChange = (ticker, value) => {
        setTempInputs((prev) => ({
            ...prev,
            [ticker]: value,
        }));
    };

    // Function to handle input blur and apply changes
    const handleInputBlur = (ticker) => {
        if (tempInputs[ticker] !== undefined) {
            updateETFAllocation(ticker, tempInputs[ticker]);

            // Clear the temp input
            setTempInputs((prev) => ({
                ...prev,
                [ticker]: undefined,
            }));
        }
    };

    // Function to open save modal
    const openSaveModal = () => {
        setShowSaveModal(true);
    };

    // Function to save custom portfolio
    const saveCustomPortfolio = (portfolioName) => {
        try {
            // Create a new portfolio object with the provided name
            const portfolioToSave = {
                ...customPortfolio,
                name: portfolioName,
            };

            // Save to localStorage and update local state
            const updatedSavedPortfolios = savePortfolio(portfolioToSave);
            setSavedPortfolios(updatedSavedPortfolios);

            // Update current portfolio name
            setCustomPortfolio((prev) => ({
                ...prev,
                name: portfolioName,
            }));

            // Close the modal
            setShowSaveModal(false);

            // Show success message
            alert(`Portfolio "${portfolioName}" saved successfully!`);
        } catch (error) {
            console.error('Error saving portfolio:', error);
            alert('There was an error saving your portfolio. Please try again.');
        }
    };

    // Render the component
    return (
        <div className="max-w-full mx-auto p-6 bg-gray-50">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">Portfolio Exposure</h1>

            <div className="flex flex-col md:flex-row gap-6">
                {/* LEFT COLUMN - Portfolio Selection and Building */}
                <div className="md:w-11/20 flex flex-col">
                    <div className="mb-6">
                        <PortfolioControls
                            examplePortfolios={examplePortfolios}
                            savedPortfolios={savedPortfolios}
                            loadPortfolio={loadPortfolio}
                            onDeletePortfolio={handleDeletePortfolio}
                        />

                        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-4">
                            {/* ETF Selection */}
                            <div className="mb-4">
                                <ETFSelector
                                    etfCatalog={etfCatalog}
                                    onSelect={addETFToPortfolio}
                                    existingTickers={Array.from(customPortfolio.holdings.keys())}
                                />
                            </div>

                            {/* Combined ETF Allocation and Builder */}
                            {customPortfolio.holdings.size > 0 && (
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="text-md font-medium">Portfolio Allocations</h4>
                                        <button
                                            onClick={() => setShowDetailColumns(!showDetailColumns)}
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
                                                {Array.from(customPortfolio.holdings.entries()).map(
                                                    ([ticker, holding], index) => {
                                                        const etf = etfCatalog.find((e) => e.ticker === ticker);
                                                        let totalExposure = 0;
                                                        const constituents = [];

                                                        if (etf) {
                                                            for (const [key, amount] of etf.exposures) {
                                                                totalExposure += amount;

                                                                // Parse the exposure key to create a readable constituent description
                                                                const {
                                                                    assetClass,
                                                                    marketRegion,
                                                                    factorStyle,
                                                                    sizeFactor,
                                                                } = parseExposureKey(key);
                                                                let description = assetClass;

                                                                if (marketRegion || factorStyle || sizeFactor) {
                                                                    const details = [];
                                                                    if (sizeFactor) details.push(sizeFactor);
                                                                    if (factorStyle) details.push(factorStyle);
                                                                    if (marketRegion) details.push(marketRegion);
                                                                    description += ` (${details.join(' ')})`;
                                                                }

                                                                constituents.push(
                                                                    `${description}: ${(amount * 100).toFixed(1)}%`
                                                                );
                                                            }
                                                        }

                                                        const isLeveraged = totalExposure > 1;
                                                        const { percentage, locked, disabled } = holding;

                                                        return (
                                                            <tr
                                                                key={index}
                                                                className={`${
                                                                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                                                } ${disabled ? 'opacity-60' : ''}`}
                                                            >
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                                    <span className={disabled ? 'text-gray-400' : ''}>
                                                                        {ticker}
                                                                    </span>
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
                                                                                            : etf.leverageType ===
                                                                                              'Daily Reset'
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
                                                                                    <div
                                                                                        key={i}
                                                                                        className="text-xs mb-1"
                                                                                    >
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
                                                                                        : etf.leverageType ===
                                                                                          'Daily Reset'
                                                                                        ? 'bg-yellow-100 text-yellow-800'
                                                                                        : 'bg-purple-100 text-purple-800'
                                                                                }`}
                                                                            >
                                                                                {etf.leverageType === 'None'
                                                                                    ? 'Unlevered'
                                                                                    : etf.leverageType}
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
                                                                                onChange={(e) =>
                                                                                    updateETFAllocation(
                                                                                        ticker,
                                                                                        e.target.value
                                                                                    )
                                                                                }
                                                                                disabled={locked || disabled}
                                                                                className={`flex-grow ${
                                                                                    disabled || locked
                                                                                        ? 'opacity-50'
                                                                                        : ''
                                                                                }`}
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
                                                                                onChange={(e) =>
                                                                                    handleInputChange(
                                                                                        ticker,
                                                                                        e.target.value
                                                                                    )
                                                                                }
                                                                                onBlur={() => handleInputBlur(ticker)}
                                                                                disabled={locked || disabled}
                                                                                className={`w-16 p-1 border border-gray-300 rounded ${
                                                                                    disabled || locked
                                                                                        ? 'bg-gray-100 text-gray-400'
                                                                                        : ''
                                                                                }`}
                                                                            />
                                                                            <span className="text-gray-500 ml-1">
                                                                                %
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                                    <div className="flex gap-2 justify-end">
                                                                        <button
                                                                            onClick={() => toggleLockETF(ticker)}
                                                                            className={`p-1 rounded-full hover:bg-gray-100 ${
                                                                                disabled
                                                                                    ? 'opacity-50 cursor-not-allowed'
                                                                                    : ''
                                                                            } ${
                                                                                locked
                                                                                    ? 'text-yellow-500'
                                                                                    : 'text-gray-400'
                                                                            }`}
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
                                                                            onClick={() => toggleDisableETF(ticker)}
                                                                            className={`p-1 rounded-full hover:bg-gray-100 ${
                                                                                disabled
                                                                                    ? 'text-red-500'
                                                                                    : 'text-gray-400'
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
                                                                            onClick={() =>
                                                                                removeETFFromPortfolio(ticker)
                                                                            }
                                                                            className={`p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-gray-100 ${
                                                                                customPortfolio.holdings.size <= 1
                                                                                    ? 'opacity-50 cursor-not-allowed'
                                                                                    : ''
                                                                            }`}
                                                                            title="Delete"
                                                                            disabled={
                                                                                customPortfolio.holdings.size <= 1
                                                                            }
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
                                                    }
                                                )}
                                                {customPortfolio.holdings.size === 0 && (
                                                    <tr>
                                                        <td
                                                            colSpan={showDetailColumns ? '6' : '3'}
                                                            className="px-6 py-4 text-center text-sm text-gray-500"
                                                        >
                                                            No ETFs added yet. Add ETFs from the list above or select a
                                                            template.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Portfolio action buttons */}
                                    <div className="flex justify-end gap-2 mt-4">
                                        <button
                                            onClick={resetPortfolio}
                                            className="px-3 py-1 text-sm rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                                        >
                                            Clear All
                                        </button>
                                        <button
                                            onClick={openSaveModal}
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
                    </div>
                </div>

                {/* RIGHT COLUMN - Portfolio Analysis and Visualization */}
                <div className="md:w-9/20 flex flex-col">
                    <PortfolioAnalysis portfolio={customPortfolio} />
                </div>
            </div>

            {/* Save Portfolio Modal */}
            <SavePortfolioModal
                isOpen={showSaveModal}
                onClose={() => setShowSaveModal(false)}
                onSave={saveCustomPortfolio}
                initialName={customPortfolio.name !== 'My Custom Portfolio' ? customPortfolio.name : ''}
            />
        </div>
    );
};

export default PortfolioBuilderG;
