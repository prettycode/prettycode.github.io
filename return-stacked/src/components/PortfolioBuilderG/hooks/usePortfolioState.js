import { useState, useCallback, useMemo } from 'react';

export const usePortfolioState = (initialPortfolio) => {
    const [portfolio, setPortfolio] = useState(initialPortfolio);
    const [tempInputs, setTempInputs] = useState({});

    // Function to update custom portfolio
    const updatePortfolio = useCallback((updatedHoldings) => {
        setPortfolio((prevPortfolio) => ({
            ...prevPortfolio,
            holdings: new Map(updatedHoldings),
        }));
    }, []);

    // Function to add an ETF to the portfolio with initial 0% allocation
    const addETF = useCallback(
        (ticker) => {
            const holdings = new Map(portfolio.holdings);

            // If this is the first ETF, set it to 100%
            const initialPercentage = holdings.size === 0 ? 100 : 0;

            holdings.set(ticker, {
                percentage: initialPercentage,
                locked: false,
                disabled: false,
            });

            updatePortfolio(holdings);
        },
        [portfolio.holdings, updatePortfolio]
    );

    // Function to remove an ETF from the portfolio and redistribute its allocation
    const removeETF = useCallback(
        (ticker) => {
            if (portfolio.holdings.size <= 1) return; // Don't remove the last ETF

            const holdings = new Map(portfolio.holdings);
            const holdingToRemove = holdings.get(ticker);
            const deletedAllocation = holdingToRemove ? holdingToRemove.percentage : 0;

            // Remove the ETF
            holdings.delete(ticker);

            // If deleted ETF had 0% allocation, no need to redistribute
            if (deletedAllocation === 0) {
                updatePortfolio(holdings);
                return;
            }

            // Find available ETFs for redistribution (not locked or disabled)
            const availableETFs = Array.from(holdings.entries())
                .filter(([_, holding]) => !holding.locked && !holding.disabled)
                .map(([etfTicker]) => etfTicker);

            // If no available ETFs, unlock or enable one if possible
            if (availableETFs.length === 0) {
                const remainingETFs = Array.from(holdings.keys());

                if (remainingETFs.length > 0) {
                    const targetETF = remainingETFs[0];
                    const targetHolding = holdings.get(targetETF);

                    // If disabled, enable it first
                    if (targetHolding.disabled) {
                        holdings.set(targetETF, {
                            ...targetHolding,
                            disabled: false,
                            percentage: deletedAllocation,
                        });
                    }
                    // If locked, unlock it
                    else if (targetHolding.locked) {
                        holdings.set(targetETF, {
                            ...targetHolding,
                            locked: false,
                            percentage: targetHolding.percentage + deletedAllocation,
                        });
                    }
                }
            } else {
                // Redistribute proportionally among available ETFs
                const totalAvailableAllocation = availableETFs.reduce((sum, etf) => {
                    const holding = holdings.get(etf);
                    return sum + (holding ? holding.percentage : 0);
                }, 0);

                // If all available ETFs have 0%, distribute equally
                if (totalAvailableAllocation <= 0) {
                    const equalShare = deletedAllocation / availableETFs.length;

                    for (const etf of availableETFs) {
                        const holding = holdings.get(etf);
                        holdings.set(etf, {
                            ...holding,
                            percentage: equalShare,
                        });
                    }
                }
                // Distribute proportionally based on current allocations
                else {
                    for (const etf of availableETFs) {
                        const holding = holdings.get(etf);
                        const proportion = holding.percentage / totalAvailableAllocation;

                        holdings.set(etf, {
                            ...holding,
                            percentage: holding.percentage + deletedAllocation * proportion,
                        });
                    }
                }
            }

            // Round percentages to one decimal place for cleaner UI
            for (const [etf, holding] of holdings.entries()) {
                holdings.set(etf, {
                    ...holding,
                    percentage: parseFloat(holding.percentage.toFixed(1)),
                });
            }

            updatePortfolio(holdings);
        },
        [portfolio.holdings, updatePortfolio]
    );

    // Function to update an ETF's allocation and adjust others to maintain 100% total
    const updateAllocation = useCallback(
        (ticker, newPercentage) => {
            const holdings = new Map(portfolio.holdings);
            const currentHolding = holdings.get(ticker);

            // Don't allow changes to locked or disabled ETFs
            if (currentHolding.locked || currentHolding.disabled) return;

            // Parse and constrain the new value
            const parsedValue = Math.max(0, Math.min(100, parseFloat(newPercentage) || 0));
            const oldValue = currentHolding.percentage;
            const difference = parsedValue - oldValue;

            if (difference === 0) return;

            // Set the new allocation for this ETF
            holdings.set(ticker, {
                ...currentHolding,
                percentage: parsedValue,
            });

            // Find ETFs that can be adjusted (not locked or disabled)
            const adjustableETFs = Array.from(holdings.entries())
                .filter(([etfTicker, holding]) => etfTicker !== ticker && !holding.locked && !holding.disabled)
                .map(([etfTicker]) => etfTicker);

            // If no adjustable ETFs, revert the change
            if (adjustableETFs.length === 0) {
                return;
            }

            // Calculate how much allocation is already locked
            const lockedAllocation = Array.from(holdings.entries())
                .filter(([etfTicker, holding]) => etfTicker !== ticker && (holding.locked || holding.disabled))
                .reduce((sum, [_, holding]) => sum + (holding.disabled ? 0 : holding.percentage), 0);

            // Calculate how much is available to distribute
            const remainingAllocation = 100 - lockedAllocation - parsedValue;

            // If remaining allocation is negative, we can't make this change
            if (remainingAllocation < 0) {
                return;
            }

            // Calculate current total of adjustable ETFs to maintain proportions
            const currentAdjustableTotal = adjustableETFs.reduce((sum, etf) => {
                const holding = holdings.get(etf);
                return sum + holding.percentage;
            }, 0);

            // If all adjustable ETFs have 0%, distribute equally
            if (currentAdjustableTotal <= 0) {
                const equalShare = remainingAllocation / adjustableETFs.length;

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
                        percentage: remainingAllocation * proportion,
                    });
                }
            }

            // Round percentages to one decimal place
            for (const [etf, holding] of holdings.entries()) {
                holdings.set(etf, {
                    ...holding,
                    percentage: parseFloat(holding.percentage.toFixed(1)),
                });
            }

            updatePortfolio(holdings);
        },
        [portfolio.holdings, updatePortfolio]
    );

    // Function to toggle lock status
    const toggleLock = useCallback(
        (ticker) => {
            const holdings = new Map(portfolio.holdings);
            const currentHolding = holdings.get(ticker);

            // Can't lock a disabled ETF
            if (currentHolding.disabled) return;

            holdings.set(ticker, {
                ...currentHolding,
                locked: !currentHolding.locked,
            });

            updatePortfolio(holdings);
        },
        [portfolio.holdings, updatePortfolio]
    );

    // Function to toggle disabled status
    const toggleDisable = useCallback(
        (ticker) => {
            const holdings = new Map(portfolio.holdings);
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

                updatePortfolio(holdings);

                // After enabling, redistribute allocations
                // We need to set a timer to ensure the state is updated first
                setTimeout(() => {
                    // Default to 0 initially, then the user can adjust
                    updateAllocation(ticker, 0);
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

            updatePortfolio(holdings);
        },
        [portfolio.holdings, updateAllocation, updatePortfolio]
    );

    // Function to load an example portfolio
    const loadExamplePortfolio = useCallback((examplePortfolio) => {
        // Convert the example portfolio's holdings to the format used by the builder
        const newHoldings = new Map();

        for (const [ticker, percentage] of examplePortfolio.holdings.entries()) {
            newHoldings.set(ticker, {
                percentage,
                locked: false,
                disabled: false,
            });
        }

        // Update the custom portfolio with the example portfolio's data
        setPortfolio({
            name: examplePortfolio.name,
            description: examplePortfolio.description,
            holdings: newHoldings,
        });
    }, []);

    // Function to reset the portfolio builder (clear all ETFs)
    const resetPortfolio = useCallback((createPortfolio) => {
        setPortfolio(createPortfolio('My Custom Portfolio', 'Build your own portfolio', []));
    }, []);

    // Function to handle temp input state for number fields
    const handleInputChange = useCallback((ticker, value) => {
        setTempInputs((prev) => ({
            ...prev,
            [ticker]: value,
        }));
    }, []);

    // Function to handle input blur and apply changes
    const handleInputBlur = useCallback(
        (ticker) => {
            if (tempInputs[ticker] !== undefined) {
                updateAllocation(ticker, tempInputs[ticker]);

                // Clear the temp input
                setTempInputs((prev) => ({
                    ...prev,
                    [ticker]: undefined,
                }));
            }
        },
        [tempInputs, updateAllocation]
    );

    // Calculate total allocation (only for non-disabled holdings)
    const totalAllocation = useMemo(
        () =>
            Array.from(portfolio.holdings.entries())
                .filter(([_, holding]) => !holding.disabled)
                .reduce((sum, [_, holding]) => sum + holding.percentage, 0),
        [portfolio.holdings]
    );

    return {
        portfolio,
        tempInputs,
        totalAllocation,
        addETF,
        removeETF,
        updateAllocation,
        toggleLock,
        toggleDisable,
        loadExamplePortfolio,
        resetPortfolio,
        handleInputChange,
        handleInputBlur,
    };
};
