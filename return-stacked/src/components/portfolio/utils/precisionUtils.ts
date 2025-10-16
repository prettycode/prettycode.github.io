import type { Holding } from '@/types/portfolio';

/**
 * Basis points per percentage (1% = 100 basis points)
 */
const BASIS_POINTS_PER_PERCENT = 100;
const MAX_BASIS_POINTS = 10000; // 100%

/**
 * Converts percentage to basis points for high-precision calculations
 */
export const percentToBasisPoints = (percentage: number): number => {
    return Math.round(percentage * BASIS_POINTS_PER_PERCENT);
};

/**
 * Converts basis points back to percentage
 */
export const basisPointsToPercent = (basisPoints: number): number => {
    return basisPoints / BASIS_POINTS_PER_PERCENT;
};

/**
 * Rounds percentage to display precision (1 decimal place)
 */
export const roundForDisplay = (percentage: number): number => {
    return Math.round(percentage * 10) / 10;
};

/**
 * Safely retrieves display percentage from holding using dual-precision architecture
 */
export const getDisplayPercentage = (holding: Holding): number => {
    return holding.displayPercentage ?? holding.percentage ?? 0;
};

/**
 * Redistributes allocation with precision constraints, guaranteeing exact 100% total
 */
export const redistributeWithPrecisionConstraints = (
    holdings: Map<string, Holding>,
    changedTicker: string,
    newPercentage: number
): Map<string, Holding> | null => {
    const newBasisPoints = percentToBasisPoints(newPercentage);
    const maxBasisPoints = MAX_BASIS_POINTS;

    const adjustableEntries = Array.from(holdings.entries()).filter(
        ([ticker, holding]) => ticker !== changedTicker && !holding.locked && !holding.disabled
    );

    if (adjustableEntries.length === 0) {
        return null;
    }

    const lockedBasisPoints = Array.from(holdings.entries())
        .filter(([ticker, holding]) => ticker !== changedTicker && (holding.locked || holding.disabled))
        .reduce((sum, [, holding]) => sum + (holding.disabled ? 0 : (holding.basisPoints ?? 0)), 0);

    const remainingBasisPoints = maxBasisPoints - lockedBasisPoints - newBasisPoints;

    if (remainingBasisPoints < 0) {
        return null;
    }

    const currentAdjustableBasisPoints = adjustableEntries.reduce((sum, [, holding]) => sum + (holding.basisPoints ?? 0), 0);

    const newHoldings = new Map(holdings);

    const changedHolding = holdings.get(changedTicker);
    if (changedHolding) {
        newHoldings.set(changedTicker, {
            ...changedHolding,
            basisPoints: newBasisPoints,
            percentage: basisPointsToPercent(newBasisPoints),
            displayPercentage: roundForDisplay(basisPointsToPercent(newBasisPoints)),
        });
    }

    if (adjustableEntries.length === 1) {
        const [singleTicker, singleHolding] = adjustableEntries[0];
        newHoldings.set(singleTicker, {
            ...singleHolding,
            basisPoints: remainingBasisPoints,
            percentage: basisPointsToPercent(remainingBasisPoints),
            displayPercentage: roundForDisplay(basisPointsToPercent(remainingBasisPoints)),
        });
    } else {
        let distributedBasisPoints = 0;

        const distributions = adjustableEntries.map(([ticker, holding], index) => {
            const isLast = index === adjustableEntries.length - 1;

            let targetBasisPoints: number;
            if (isLast) {
                targetBasisPoints = remainingBasisPoints - distributedBasisPoints;
            } else {
                const proportion =
                    currentAdjustableBasisPoints > 0
                        ? (holding.basisPoints ?? 0) / currentAdjustableBasisPoints
                        : 1 / adjustableEntries.length;
                targetBasisPoints = Math.round(remainingBasisPoints * proportion);
                distributedBasisPoints += targetBasisPoints;
            }

            return { ticker, targetBasisPoints };
        });

        distributions.forEach(({ ticker, targetBasisPoints }) => {
            const holding = holdings.get(ticker);
            if (holding) {
                newHoldings.set(ticker, {
                    ...holding,
                    basisPoints: targetBasisPoints,
                    percentage: basisPointsToPercent(targetBasisPoints),
                    displayPercentage: roundForDisplay(basisPointsToPercent(targetBasisPoints)),
                });
            }
        });
    }

    return newHoldings;
};

/**
 * Calculates total allocation in basis points (should always be 10000 for valid portfolios)
 */
export const calculateTotalBasisPoints = (holdings: Map<string, Holding>): number => {
    return Array.from(holdings.entries())
        .filter(([, holding]) => !holding.disabled)
        .reduce((sum, [, holding]) => sum + (holding.basisPoints ?? percentToBasisPoints(holding.percentage)), 0);
};

/**
 * Validates portfolio precision - should always be exactly 10000 basis points
 */
export const isPortfolioPrecise = (holdings: Map<string, Holding>): boolean => {
    const totalBasisPoints = calculateTotalBasisPoints(holdings);
    return totalBasisPoints === MAX_BASIS_POINTS;
};

/**
 * Converts percentage to decimal weight (for multiplication)
 * Example: 25% -> 0.25
 */
export const percentToWeight = (percentage: number): number => {
    return percentage / 100;
};

/**
 * Converts decimal weight to percentage
 * Example: 0.25 -> 25
 */
export const weightToPercent = (weight: number): number => {
    return weight * 100;
};

/**
 * Calculates relative percentage of a part to a total
 * Example: 50 out of 200 -> 25%
 */
export const calculateRelativePercent = (part: number, total: number): number => {
    return total > 0 ? (part / total) * 100 : 0;
};

/**
 * Rounds percentage to whole number
 * Example: 25.7% -> 26%
 */
export const roundToWholePercent = (percentage: number): number => {
    return Math.round(percentage);
};
