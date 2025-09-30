/**
 * Utility functions for portfolio allocations
 */

/**
 * Redistributes allocation when an ETF is removed
 * @param {Map} holdings - Current portfolio holdings
 * @param {string} ticker - Ticker of ETF being removed
 * @returns {Map} Updated holdings map
 */
export const redistributeAfterRemoval = (holdings, ticker) => {
    const holdingToRemove = holdings.get(ticker);
    const deletedAllocation = holdingToRemove ? holdingToRemove.percentage : 0;

    // Remove the ETF
    holdings.delete(ticker);

    // If deleted ETF had 0% allocation, no need to redistribute
    if (deletedAllocation === 0) {
        return holdings;
    }

    // Find available ETFs for redistribution (not locked or disabled)
    const availableETFs = Array.from(holdings.entries())
        .filter(([, holding]) => !holding.locked && !holding.disabled)
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
        redistributeAmongAvailable(holdings, availableETFs, deletedAllocation);
    }

    // Round percentages to one decimal place for cleaner UI
    roundHoldingPercentages(holdings);

    return holdings;
};

/**
 * Updates an ETF's allocation and adjusts others to maintain 100% total
 * @param {Map} holdings - Current portfolio holdings
 * @param {string} ticker - Ticker to update
 * @param {number} newPercentage - New allocation percentage
 * @returns {Map|null} Updated holdings map or null if update not possible
 */
export const updateAllocation = (holdings, ticker, newPercentage) => {
    const currentHolding = holdings.get(ticker);

    // Don't allow changes to locked or disabled ETFs
    if (currentHolding.locked || currentHolding.disabled) return null;

    // Parse and constrain the new value
    const parsedValue = Math.max(0, Math.min(100, parseFloat(newPercentage) || 0));
    const oldValue = currentHolding.percentage;
    const difference = parsedValue - oldValue;

    if (difference === 0) return null;

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
        return null;
    }

    // Calculate how much allocation is already locked
    const lockedAllocation = Array.from(holdings.entries())
        .filter(([etfTicker, holding]) => etfTicker !== ticker && (holding.locked || holding.disabled))
        .reduce((sum, [, holding]) => sum + (holding.disabled ? 0 : holding.percentage), 0);

    // Calculate how much is available to distribute
    const remainingAllocation = 100 - lockedAllocation - parsedValue;

    // If remaining allocation is negative, we can't make this change
    if (remainingAllocation < 0) {
        return null;
    }

    redistributeAmongAvailable(holdings, adjustableETFs, remainingAllocation, true);

    // Round percentages to one decimal place
    roundHoldingPercentages(holdings);

    return holdings;
};

/**
 * Redistributes allocation proportionally among available ETFs
 * @param {Map} holdings - Current portfolio holdings
 * @param {Array} availableETFs - List of available ETF tickers
 * @param {number} allocationToDistribute - Amount to distribute
 * @param {boolean} setDirectly - If true, set values directly; if false, add to existing
 */
export const redistributeAmongAvailable = (holdings, availableETFs, allocationToDistribute, setDirectly = false) => {
    // Calculate current total of adjustable ETFs to maintain proportions
    const currentAdjustableTotal = availableETFs.reduce((sum, etf) => {
        const holding = holdings.get(etf);
        return sum + holding.percentage;
    }, 0);

    // If all available ETFs have 0%, distribute equally
    if (currentAdjustableTotal <= 0) {
        const equalShare = allocationToDistribute / availableETFs.length;

        for (const etf of availableETFs) {
            const holding = holdings.get(etf);
            holdings.set(etf, {
                ...holding,
                percentage: equalShare,
            });
        }
    }
    // Otherwise, distribute proportionally
    else {
        for (const etf of availableETFs) {
            const holding = holdings.get(etf);
            const proportion = holding.percentage / currentAdjustableTotal;

            holdings.set(etf, {
                ...holding,
                percentage: setDirectly
                    ? allocationToDistribute * proportion
                    : holding.percentage + allocationToDistribute * proportion,
            });
        }
    }

    return holdings;
};

/**
 * Rounds all holdings percentages to one decimal place
 * @param {Map} holdings - Portfolio holdings to round
 * @returns {Map} Holdings with rounded percentages
 */
export const roundHoldingPercentages = (holdings) => {
    for (const [etf, holding] of holdings.entries()) {
        holdings.set(etf, {
            ...holding,
            percentage: parseFloat(holding.percentage.toFixed(1)),
        });
    }
    return holdings;
};

/**
 * Calculates the total allocation of a portfolio
 * @param {Map} holdings - Portfolio holdings
 * @returns {number} Total allocation
 */
export const calculateTotalAllocation = (holdings) => {
    return Array.from(holdings.entries())
        .filter(([, holding]) => !holding.disabled)
        .reduce((sum, [, holding]) => sum + holding.percentage, 0);
};
