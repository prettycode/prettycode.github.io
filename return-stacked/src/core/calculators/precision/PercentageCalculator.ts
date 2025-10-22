/**
 * Percentage calculator - framework-agnostic pure functions for percentage math
 */

import type { Holding } from '../../domain/Holding';
import { percentToBasisPoints, basisPointsToPercent } from './BasisPointsCalculator';

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
