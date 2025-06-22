import React, { useState, useEffect } from 'react';
import { etfCatalog, examplePortfolios, createPortfolio, parseExposureKey } from './utils';
import { redistributeAfterRemoval, updateAllocation, calculateTotalAllocation } from './utils';
import { savePortfolio, getSavedPortfolios, deserializePortfolio, deletePortfolio } from './utils';
import PortfolioBuilder from './components/builder/PortfolioBuilder';
import SavePortfolioModal from './components/builder/SavePortfolioModal';
import PortfolioAnalysis from './components/analysis/PortfolioAnalysis';

// Helper function to convert example portfolio to custom portfolio format
const convertExampleToCustomPortfolio = (examplePortfolio) => {
    const holdings = new Map();

    for (const [ticker, percentage] of examplePortfolio.holdings) {
        holdings.set(ticker, {
            percentage,
            locked: false,
            disabled: false,
        });
    }

    return {
        name: examplePortfolio.name,
        holdings,
    };
};

// Main component
const PortfolioBuilderG = () => {
    // Initialize with an example portfolio based on current time seconds
    const defaultPortfolio =
        examplePortfolios.length > 0
            ? convertExampleToCustomPortfolio(examplePortfolios[new Date().getSeconds() % examplePortfolios.length])
            : createPortfolio('My Custom Portfolio', []);

    const [customPortfolio, setCustomPortfolio] = useState(defaultPortfolio);
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

    // Function to update the entire portfolio
    const updatePortfolio = (portfolioData) => {
        setCustomPortfolio(portfolioData);
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

    // Function to bulk update multiple ETF allocations at once
    const bulkUpdateAllocations = (allocationUpdates, overrideLocks = false) => {
        const holdings = new Map(customPortfolio.holdings);

        // Apply all updates to the holdings map
        allocationUpdates.forEach(({ ticker, percentage }) => {
            const currentHolding = holdings.get(ticker);
            if (currentHolding) {
                // Skip disabled ETFs unless explicitly updating them to 0
                if (currentHolding.disabled && percentage !== 0) return;

                // Skip locked ETFs unless overriding locks
                if (currentHolding.locked && !overrideLocks) return;

                holdings.set(ticker, {
                    ...currentHolding,
                    percentage,
                });
            }
        });

        // Round percentages to one decimal place
        for (const [ticker, holding] of holdings.entries()) {
            holdings.set(ticker, {
                ...holding,
                percentage: parseFloat(holding.percentage.toFixed(1)),
            });
        }

        updateCustomPortfolio(holdings);
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

    // Function to toggle detail columns
    const toggleDetailColumns = () => {
        setShowDetailColumns(!showDetailColumns);
    };

    // Render the component
    return (
        <div className="max-w-full mx-auto p-6 bg-gray-50">
            <div className="flex flex-col md:flex-row gap-6">
                {/* LEFT COLUMN - Portfolio Selection and Building */}
                <div className="md:w-11/20 flex flex-col">
                    <div className="mb-6">
                        {/* Portfolio Builder Component */}
                        <PortfolioBuilder
                            customPortfolio={customPortfolio}
                            etfCatalog={etfCatalog}
                            tempInputs={tempInputs}
                            showDetailColumns={showDetailColumns}
                            totalAllocation={totalAllocation}
                            examplePortfolios={examplePortfolios}
                            savedPortfolios={savedPortfolios}
                            onAddETF={addETFToPortfolio}
                            onRemoveETF={removeETFFromPortfolio}
                            onUpdateAllocation={updateETFAllocation}
                            onBulkUpdateAllocations={bulkUpdateAllocations}
                            onToggleLock={toggleLockETF}
                            onToggleDisable={toggleDisableETF}
                            onInputChange={handleInputChange}
                            onInputBlur={handleInputBlur}
                            onResetPortfolio={resetPortfolio}
                            onSavePortfolio={openSaveModal}
                            onToggleDetailColumns={toggleDetailColumns}
                            onDeletePortfolio={handleDeletePortfolio}
                            onUpdatePortfolio={updatePortfolio}
                        />
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
