import type { Holding } from '@/types/portfolio';
import { percentToBasisPoints, basisPointsToPercent, roundForDisplay } from './precisionUtils';

/**
 * Maximum basis points for 100% allocation
 */
const MAX_BASIS_POINTS = 10000;

/**
 * Ensures holding has basis points synchronized with percentage
 * Clamps values to valid range [0, 100%]
 */
const ensureBasisPoints = (holding: Holding): Holding => {
    const basisPoints = Math.max(0, Math.min(MAX_BASIS_POINTS, holding.basisPoints ?? percentToBasisPoints(holding.percentage)));
    const percentage = basisPointsToPercent(basisPoints);
    return {
        ...holding,
        percentage,
        basisPoints,
        displayPercentage: roundForDisplay(percentage),
    };
};

/**
 * Redistributes allocation when an ETF is removed from holdings
 * Uses basis points internally to guarantee exact 100% allocation
 */
export const redistributeAfterRemoval = (holdings: Map<string, Holding>, ticker: string): Map<string, Holding> => {
    const holdingToRemove = holdings.get(ticker);
    const deletedBasisPoints = holdingToRemove?.basisPoints ?? percentToBasisPoints(holdingToRemove?.percentage ?? 0);

    holdings.delete(ticker);

    if (deletedBasisPoints === 0 || holdings.size === 0) {
        return holdings;
    }

    const availableETFs = Array.from(holdings.entries())
        .filter(([, holding]) => !holding.locked && !holding.disabled)
        .map(([etfTicker]) => etfTicker);

    if (availableETFs.length === 0) {
        // No unlocked ETFs - must unlock one to maintain 100%
        const remainingETFs = Array.from(holdings.keys());

        if (remainingETFs.length > 0) {
            const targetETF = remainingETFs[0];
            const targetHolding = holdings.get(targetETF)!;
            const targetBasisPoints = targetHolding.basisPoints ?? percentToBasisPoints(targetHolding.percentage);

            holdings.set(
                targetETF,
                ensureBasisPoints({
                    ...targetHolding,
                    disabled: false,
                    locked: false,
                    basisPoints: targetBasisPoints + deletedBasisPoints,
                    percentage: basisPointsToPercent(targetBasisPoints + deletedBasisPoints),
                })
            );
        }
    } else {
        // Distribute proportionally among unlocked ETFs
        const currentAdjustableBasisPoints = availableETFs.reduce((sum, etf) => {
            const holding = holdings.get(etf);
            const bp = holding?.basisPoints ?? percentToBasisPoints(holding?.percentage ?? 0);
            return sum + bp;
        }, 0);

        let distributedBasisPoints = 0;

        availableETFs.forEach((etf, index) => {
            const holding = holdings.get(etf);
            if (!holding) {
                return;
            }

            const holdingBasisPoints = holding.basisPoints ?? percentToBasisPoints(holding.percentage);
            const isLast = index === availableETFs.length - 1;

            let targetBasisPoints: number;
            if (isLast) {
                // Last ETF gets remainder to ensure exact total
                targetBasisPoints = holdingBasisPoints + (deletedBasisPoints - distributedBasisPoints);
            } else {
                const proportion =
                    currentAdjustableBasisPoints > 0 ? holdingBasisPoints / currentAdjustableBasisPoints : 1 / availableETFs.length;
                const additionalBasisPoints = Math.round(deletedBasisPoints * proportion);
                targetBasisPoints = holdingBasisPoints + additionalBasisPoints;
                distributedBasisPoints += additionalBasisPoints;
            }

            holdings.set(
                etf,
                ensureBasisPoints({
                    ...holding,
                    basisPoints: targetBasisPoints,
                    percentage: basisPointsToPercent(targetBasisPoints),
                })
            );
        });
    }

    return holdings;
};

/**
 * Updates an ETF's allocation and rebalances others to maintain exact 100% total
 * Uses basis points internally for precision
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
    const newBasisPoints = percentToBasisPoints(parsedValue);
    const oldBasisPoints = currentHolding.basisPoints ?? percentToBasisPoints(currentHolding.percentage);

    if (newBasisPoints === oldBasisPoints) {
        return null;
    }

    // Calculate locked/disabled basis points
    const lockedBasisPoints = Array.from(holdings.entries())
        .filter(([etfTicker, holding]) => etfTicker !== ticker && (holding.locked || holding.disabled))
        .reduce((sum, [, holding]) => {
            if (holding.disabled) {
                return sum;
            }
            const bp = holding.basisPoints ?? percentToBasisPoints(holding.percentage);
            return sum + bp;
        }, 0);

    // Calculate remaining basis points for adjustable ETFs
    const remainingBasisPoints = MAX_BASIS_POINTS - lockedBasisPoints - newBasisPoints;

    if (remainingBasisPoints < 0) {
        return null;
    }

    // Get adjustable ETFs
    const adjustableETFs = Array.from(holdings.entries())
        .filter(([etfTicker, holding]) => etfTicker !== ticker && !holding.locked && !holding.disabled)
        .map(([etfTicker]) => etfTicker);

    if (adjustableETFs.length === 0) {
        return null;
    }

    // Update the changed holding
    holdings.set(
        ticker,
        ensureBasisPoints({
            ...currentHolding,
            basisPoints: newBasisPoints,
            percentage: basisPointsToPercent(newBasisPoints),
        })
    );

    // Redistribute among adjustable ETFs
    const currentAdjustableBasisPoints = adjustableETFs.reduce((sum, etf) => {
        const holding = holdings.get(etf);
        const bp = holding?.basisPoints ?? percentToBasisPoints(holding?.percentage ?? 0);
        return sum + bp;
    }, 0);

    let distributedBasisPoints = 0;

    adjustableETFs.forEach((etf, index) => {
        const holding = holdings.get(etf);
        if (!holding) {
            return;
        }

        const isLast = index === adjustableETFs.length - 1;
        let targetBasisPoints: number;

        if (isLast) {
            // Last ETF gets remainder to ensure exact 100%
            targetBasisPoints = remainingBasisPoints - distributedBasisPoints;
        } else {
            const holdingBasisPoints = holding.basisPoints ?? percentToBasisPoints(holding.percentage);
            const proportion =
                currentAdjustableBasisPoints > 0 ? holdingBasisPoints / currentAdjustableBasisPoints : 1 / adjustableETFs.length;
            targetBasisPoints = Math.round(remainingBasisPoints * proportion);
            distributedBasisPoints += targetBasisPoints;
        }

        holdings.set(
            etf,
            ensureBasisPoints({
                ...holding,
                basisPoints: targetBasisPoints,
                percentage: basisPointsToPercent(targetBasisPoints),
            })
        );
    });

    return holdings;
};

/**
 * Redistributes allocation proportionally among available ETFs
 * Uses basis points to guarantee exact totals
 */
export const redistributeAmongAvailable = (
    holdings: Map<string, Holding>,
    availableETFs: string[],
    allocationToDistribute: number,
    setDirectly = false
): Map<string, Holding> => {
    const basisPointsToDistribute = percentToBasisPoints(allocationToDistribute);

    const currentAdjustableBasisPoints = availableETFs.reduce((sum, etf) => {
        const holding = holdings.get(etf);
        const bp = holding?.basisPoints ?? percentToBasisPoints(holding?.percentage ?? 0);
        return sum + bp;
    }, 0);

    let distributedBasisPoints = 0;

    availableETFs.forEach((etf, index) => {
        const holding = holdings.get(etf);
        if (!holding) {
            return;
        }

        const holdingBasisPoints = holding.basisPoints ?? percentToBasisPoints(holding.percentage);
        const isLast = index === availableETFs.length - 1;

        let targetBasisPoints: number;

        if (isLast) {
            // Last ETF gets remainder to ensure exact total
            if (setDirectly) {
                targetBasisPoints = basisPointsToDistribute - distributedBasisPoints;
            } else {
                targetBasisPoints = holdingBasisPoints + (basisPointsToDistribute - distributedBasisPoints);
            }
        } else {
            if (currentAdjustableBasisPoints === 0) {
                // Equal distribution
                const share = Math.round(basisPointsToDistribute / availableETFs.length);
                targetBasisPoints = setDirectly ? share : holdingBasisPoints + share;
                distributedBasisPoints += setDirectly ? share : share;
            } else {
                // Proportional distribution
                const proportion = holdingBasisPoints / currentAdjustableBasisPoints;
                const share = Math.round(basisPointsToDistribute * proportion);
                targetBasisPoints = setDirectly ? share : holdingBasisPoints + share;
                distributedBasisPoints += setDirectly ? share : share;
            }
        }

        holdings.set(
            etf,
            ensureBasisPoints({
                ...holding,
                basisPoints: targetBasisPoints,
                percentage: basisPointsToPercent(targetBasisPoints),
            })
        );
    });

    return holdings;
};

/**
 * Rounds all holding percentages for display (deprecated - now automatic)
 * Kept for backward compatibility
 */
export const roundHoldingPercentages = (holdings: Map<string, Holding>): Map<string, Holding> => {
    for (const [etf, holding] of holdings.entries()) {
        holdings.set(etf, ensureBasisPoints(holding));
    }
    return holdings;
};

/**
 * Calculates total portfolio allocation as percentage
 * Uses basis points for precision, then converts
 */
export const calculateTotalAllocation = (holdings: Map<string, Holding>): number => {
    const totalBasisPoints = Array.from(holdings.entries())
        .filter(([, holding]) => !holding.disabled)
        .reduce((sum, [, holding]) => {
            const bp = holding.basisPoints ?? percentToBasisPoints(holding.percentage);
            return sum + bp;
        }, 0);
    return basisPointsToPercent(totalBasisPoints);
};
