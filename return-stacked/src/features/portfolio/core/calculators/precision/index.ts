/**
 * Precision calculators - Barrel export for convenience
 */

// Basis points functions
export { percentToBasisPoints, basisPointsToPercent, ensureBasisPoints, MAX_BASIS_POINTS } from './BasisPointsCalculator';

// Percentage functions
export {
    roundForDisplay,
    percentToWeight,
    weightToPercent,
    calculateRelativePercent,
    roundToWholePercent,
    calculateTotalAllocation,
} from './PercentageCalculator';
