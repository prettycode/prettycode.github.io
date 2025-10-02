import { ALLOCATION_CONSTRAINTS } from '../constants';
import type { Holding } from '../types';

export const redistributeAfterRemoval = (holdings: Map<string, Holding>, ticker: string): Map<string, Holding> => {
    if (!holdings || holdings.size === 0) {
        throw new Error('Holdings map cannot be empty');
    }

    if (!ticker) {
        throw new Error('Ticker is required');
    }

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
            const targetHolding = holdings.get(targetETF);

            if (!targetHolding) {
                throw new Error(`Holding for ${targetETF} not found`);
            }

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

export const updateAllocation = (
    holdings: Map<string, Holding>,
    ticker: string,
    newPercentage: number
): Map<string, Holding> | null => {
    if (!holdings || holdings.size === 0) {
        throw new Error('Holdings map cannot be empty');
    }

    if (!ticker) {
        throw new Error('Ticker is required');
    }

    const currentHolding = holdings.get(ticker);

    if (!currentHolding || currentHolding.locked || currentHolding.disabled) {
        return null;
    }

    const parsedValue = Math.max(
        ALLOCATION_CONSTRAINTS.MIN_PERCENTAGE,
        Math.min(ALLOCATION_CONSTRAINTS.MAX_PERCENTAGE, parseFloat(String(newPercentage)) || 0)
    );
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

    const remainingAllocation = ALLOCATION_CONSTRAINTS.MAX_PERCENTAGE - lockedAllocation - parsedValue;

    if (remainingAllocation < 0) {
        return null;
    }

    redistributeAmongAvailable(holdings, adjustableETFs, remainingAllocation, true);

    roundHoldingPercentages(holdings);

    return holdings;
};

export const redistributeAmongAvailable = (
    holdings: Map<string, Holding>,
    availableETFs: string[],
    allocationToDistribute: number,
    setDirectly: boolean = false
): Map<string, Holding> => {
    if (!holdings || holdings.size === 0) {
        throw new Error('Holdings map cannot be empty');
    }

    if (!availableETFs || availableETFs.length === 0) {
        throw new Error('Available ETFs array cannot be empty');
    }

    const currentAdjustableTotal = availableETFs.reduce((sum, etf) => {
        const holding = holdings.get(etf);
        if (!holding) {
            throw new Error(`Holding for ${etf} not found`);
        }
        return sum + holding.percentage;
    }, 0);

    if (currentAdjustableTotal <= 0) {
        const equalShare = allocationToDistribute / availableETFs.length;

        for (const etf of availableETFs) {
            const holding = holdings.get(etf);
            if (!holding) {
                throw new Error(`Holding for ${etf} not found`);
            }
            holdings.set(etf, {
                ...holding,
                percentage: equalShare,
            });
        }
    } else {
        for (const etf of availableETFs) {
            const holding = holdings.get(etf);
            if (!holding) {
                throw new Error(`Holding for ${etf} not found`);
            }
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

export const roundHoldingPercentages = (holdings: Map<string, Holding>): Map<string, Holding> => {
    if (!holdings) {
        throw new Error('Holdings map is required');
    }

    for (const [etf, holding] of holdings.entries()) {
        holdings.set(etf, {
            ...holding,
            percentage: parseFloat(holding.percentage.toFixed(ALLOCATION_CONSTRAINTS.DECIMAL_PLACES)),
        });
    }
    return holdings;
};

export const calculateTotalAllocation = (holdings: Map<string, Holding>): number => {
    return Array.from(holdings.entries())
        .filter(([, holding]) => !holding.disabled)
        .reduce((sum, [, holding]) => sum + holding.percentage, 0);
};
