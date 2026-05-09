import type { Holding } from '../domain/Portfolio';

const BASIS_POINTS_PER_PERCENT = 100;
export const MAX_BASIS_POINTS = 10000;

export const percentToBasisPoints = (percentage: number): number => {
    return Math.round(percentage * BASIS_POINTS_PER_PERCENT);
};

export const basisPointsToPercent = (basisPoints: number): number => {
    return basisPoints / BASIS_POINTS_PER_PERCENT;
};

export const ensureBasisPoints = (holding: Holding): Holding => {
    const basisPoints = Math.max(
        0,
        Math.min(MAX_BASIS_POINTS, holding.basisPoints ?? percentToBasisPoints(holding.percentage))
    );
    const percentage = basisPointsToPercent(basisPoints);
    const displayPercentage = Math.round(percentage * 10) / 10;
    return {
        ...holding,
        percentage,
        basisPoints,
        displayPercentage,
    };
};

export const roundForDisplay = (percentage: number): number => {
    return Math.round(percentage * 10) / 10;
};

export const percentToWeight = (percentage: number): number => {
    return percentage / 100;
};

export const weightToPercent = (weight: number): number => {
    return weight * 100;
};

export const calculateRelativePercent = (part: number, total: number): number => {
    return total > 0 ? (part / total) * 100 : 0;
};

export const roundToWholePercent = (percentage: number): number => {
    return Math.round(percentage);
};

export const calculateTotalAllocation = (holdings: Map<string, Holding>): number => {
    const totalBasisPoints = Array.from(holdings.entries())
        .filter(([, holding]) => !holding.disabled)
        .reduce((sum, [, holding]) => {
            const bp = holding.basisPoints ?? percentToBasisPoints(holding.percentage);
            return sum + bp;
        }, 0);
    return basisPointsToPercent(totalBasisPoints);
};
