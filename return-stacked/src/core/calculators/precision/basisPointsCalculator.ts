/**
 * Basis points calculator - framework-agnostic pure functions for basis points math
 * Uses basis points internally to ensure exact 100% totals without floating-point errors
 */

import type { Holding } from '../../domain/Holding';

/**
 * Basis points per percentage (1% = 100 basis points)
 */
const BASIS_POINTS_PER_PERCENT = 100;
export const MAX_BASIS_POINTS = 10000; // 100%

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
 * Ensures holding has basis points synchronized with percentage
 * Clamps values to valid range [0, 100%]
 */
export const ensureBasisPoints = (holding: Holding): Holding => {
    const basisPoints = Math.max(0, Math.min(MAX_BASIS_POINTS, holding.basisPoints ?? percentToBasisPoints(holding.percentage)));
    const percentage = basisPointsToPercent(basisPoints);
    const displayPercentage = Math.round(percentage * 10) / 10; // 1 decimal place
    return {
        ...holding,
        percentage,
        basisPoints,
        displayPercentage,
    };
};
