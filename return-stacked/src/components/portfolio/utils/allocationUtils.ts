import type { Holding } from '@/types/portfolio';

/**
 * Redistributes allocation when an ETF is removed from holdings
 */
export const redistributeAfterRemoval = (holdings: Map<string, Holding>, ticker: string): Map<string, Holding> => {
    const holdingToRemove = holdings.get(ticker);
    const deletedAllocation = holdingToRemove?.percentage ?? 0;

    holdings.delete(ticker);

    if (deletedAllocation === 0) {
        return holdings;
    }

    const availableETFs = Array.from(holdings.entries())
        .filter(([, holding]) => !holding.locked && !holding.disabled)
        .map(([etfTicker]) => etfTicker);

    if (availableETFs.length === 0) {
        const remainingETFs = Array.from(holdings.keys());

        if (remainingETFs.length > 0) {
            const targetETF = remainingETFs[0];
            const targetHolding = holdings.get(targetETF)!;

            if (targetHolding.disabled) {
                holdings.set(targetETF, {
                    ...targetHolding,
                    disabled: false,
                    percentage: deletedAllocation,
                });
            } else if (targetHolding.locked) {
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

    roundHoldingPercentages(holdings);

    return holdings;
};

/**
 * Updates an ETF's allocation and rebalances others to maintain 100% total
 */
export const updateAllocation = (holdings: Map<string, Holding>, ticker: string, newPercentage: number): Map<string, Holding> | null => {
    const currentHolding = holdings.get(ticker);
    if (!currentHolding) {
        return null;
    }

    if (currentHolding.locked || currentHolding.disabled) {
        return null;
    }

    const parsedValue = Math.max(0, Math.min(100, parseFloat(String(newPercentage)) || 0));
    const oldValue = currentHolding.percentage;
    const difference = parsedValue - oldValue;

    if (difference === 0) {
        return null;
    }

    holdings.set(ticker, {
        ...currentHolding,
        percentage: parsedValue,
    });

    const adjustableETFs = Array.from(holdings.entries())
        .filter(([etfTicker, holding]) => etfTicker !== ticker && !holding.locked && !holding.disabled)
        .map(([etfTicker]) => etfTicker);

    if (adjustableETFs.length === 0) {
        return null;
    }

    const lockedAllocation = Array.from(holdings.entries())
        .filter(([etfTicker, holding]) => etfTicker !== ticker && (holding.locked || holding.disabled))
        .reduce((sum, [, holding]) => sum + (holding.disabled ? 0 : holding.percentage), 0);

    const remainingAllocation = 100 - lockedAllocation - parsedValue;

    if (remainingAllocation < 0) {
        return null;
    }

    redistributeAmongAvailable(holdings, adjustableETFs, remainingAllocation, true);

    roundHoldingPercentages(holdings);

    return holdings;
};

/**
 * Redistributes allocation proportionally among available ETFs
 */
export const redistributeAmongAvailable = (
    holdings: Map<string, Holding>,
    availableETFs: string[],
    allocationToDistribute: number,
    setDirectly = false
): Map<string, Holding> => {
    const currentAdjustableTotal = availableETFs.reduce((sum, etf) => {
        const holding = holdings.get(etf);
        return sum + (holding?.percentage ?? 0);
    }, 0);

    if (currentAdjustableTotal <= 0) {
        const equalShare = allocationToDistribute / availableETFs.length;

        for (const etf of availableETFs) {
            const holding = holdings.get(etf);
            if (holding) {
                holdings.set(etf, {
                    ...holding,
                    percentage: equalShare,
                });
            }
        }
    } else {
        for (const etf of availableETFs) {
            const holding = holdings.get(etf);
            if (holding) {
                const proportion = holding.percentage / currentAdjustableTotal;

                holdings.set(etf, {
                    ...holding,
                    percentage: setDirectly ? allocationToDistribute * proportion : holding.percentage + allocationToDistribute * proportion,
                });
            }
        }
    }

    return holdings;
};

/**
 * Rounds all holding percentages to one decimal place for cleaner display
 */
export const roundHoldingPercentages = (holdings: Map<string, Holding>): Map<string, Holding> => {
    for (const [etf, holding] of holdings.entries()) {
        holdings.set(etf, {
            ...holding,
            percentage: parseFloat(holding.percentage.toFixed(1)),
        });
    }
    return holdings;
};

/**
 * Calculates total portfolio allocation excluding disabled holdings
 */
export const calculateTotalAllocation = (holdings: Map<string, Holding>): number => {
    return Array.from(holdings.entries())
        .filter(([, holding]) => !holding.disabled)
        .reduce((sum, [, holding]) => sum + holding.percentage, 0);
};
