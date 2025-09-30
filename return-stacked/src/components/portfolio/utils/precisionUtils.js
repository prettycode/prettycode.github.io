/**
 * Precision utilities for portfolio allocation calculations
 * Implements dual-precision architecture: high-precision internal calculations + display rounding
 */

/**
 * High-precision percentage storage and calculations
 * Uses basis points (1/100th of 1%) internally for precision
 */
const BASIS_POINTS_PER_PERCENT = 100;
const MAX_BASIS_POINTS = 10000; // 100%

/**
 * Convert percentage to basis points for internal calculations
 * @param {number} percentage - Percentage value (e.g., 25.67)
 * @returns {number} Basis points (e.g., 2567)
 */
export const percentToBasisPoints = (percentage) => {
    return Math.round(percentage * BASIS_POINTS_PER_PERCENT);
};

/**
 * Convert basis points back to percentage
 * @param {number} basisPoints - Basis points value
 * @returns {number} Percentage value
 */
export const basisPointsToPercent = (basisPoints) => {
    return basisPoints / BASIS_POINTS_PER_PERCENT;
};

/**
 * Round percentage to display precision (1 decimal place)
 * @param {number} percentage - Raw percentage value
 * @returns {number} Rounded percentage for display
 */
export const roundForDisplay = (percentage) => {
    return Math.round(percentage * 10) / 10;
};

/**
 * Safely get the display percentage from a holding using dual-precision architecture
 * @param {Object} holding - Holding object that may contain displayPercentage and/or percentage
 * @returns {number} Most precise percentage value available
 */
export const getDisplayPercentage = (holding) => {
    // Prioritize displayPercentage (dual-precision), fall back to percentage, then to 0
    if (holding.displayPercentage !== undefined) {
        return holding.displayPercentage;
    } else if (holding.percentage !== undefined) {
        return holding.percentage;
    } else {
        return 0;
    }
};

/**
 * Enhanced holdings structure with dual precision
 * @param {Map} holdings - Current holdings map
 * @returns {Map} Holdings with both precise and display values
 */
export const enhanceHoldingsWithPrecision = (holdings) => {
    const enhanced = new Map();
    
    for (const [ticker, holding] of holdings.entries()) {
        enhanced.set(ticker, {
            ...holding,
            // High-precision internal value
            basisPoints: percentToBasisPoints(holding.percentage),
            // Display value (rounded)
            displayPercentage: roundForDisplay(holding.percentage),
            // Keep original for compatibility
            percentage: holding.percentage
        });
    }
    
    return enhanced;
};

/**
 * Redistribute allocation with precision constraint enforcement
 * Guarantees exact 100% total while minimizing rounding artifacts
 * @param {Map} holdings - Enhanced holdings map
 * @param {string} changedTicker - Ticker that was modified 
 * @param {number} newPercentage - New percentage for changed ticker
 * @returns {Map} Updated holdings map
 */
export const redistributeWithPrecisionConstraints = (holdings, changedTicker, newPercentage) => {
    const newBasisPoints = percentToBasisPoints(newPercentage);
    const maxBasisPoints = MAX_BASIS_POINTS;
    
    // Get adjustable ETFs (not locked/disabled, not the changed one)
    const adjustableEntries = Array.from(holdings.entries())
        .filter(([ticker, holding]) => 
            ticker !== changedTicker && !holding.locked && !holding.disabled
        );
    
    if (adjustableEntries.length === 0) {
        return null; // Cannot redistribute
    }
    
    // Calculate locked/disabled allocation in basis points
    const lockedBasisPoints = Array.from(holdings.entries())
        .filter(([ticker, holding]) => 
            ticker !== changedTicker && (holding.locked || holding.disabled)
        )
        .reduce((sum, [, holding]) => sum + (holding.disabled ? 0 : holding.basisPoints), 0);
    
    // Calculate remaining basis points to distribute
    const remainingBasisPoints = maxBasisPoints - lockedBasisPoints - newBasisPoints;
    
    if (remainingBasisPoints < 0) {
        return null; // Invalid allocation
    }
    
    // Calculate current total of adjustable ETFs for proportional distribution
    const currentAdjustableBasisPoints = adjustableEntries
        .reduce((sum, [, holding]) => sum + holding.basisPoints, 0);
    
    // Create new holdings map
    const newHoldings = new Map(holdings);
    
    // Update the changed ticker
    const changedHolding = holdings.get(changedTicker);
    newHoldings.set(changedTicker, {
        ...changedHolding,
        basisPoints: newBasisPoints,
        percentage: basisPointsToPercent(newBasisPoints),
        displayPercentage: roundForDisplay(basisPointsToPercent(newBasisPoints))
    });
    
    // Distribute remaining basis points
    if (adjustableEntries.length === 1) {
        // Single ETF gets all remaining
        const [singleTicker, singleHolding] = adjustableEntries[0];
        newHoldings.set(singleTicker, {
            ...singleHolding,
            basisPoints: remainingBasisPoints,
            percentage: basisPointsToPercent(remainingBasisPoints),
            displayPercentage: roundForDisplay(basisPointsToPercent(remainingBasisPoints))
        });
    } else {
        // Multiple ETFs - distribute proportionally with constraint enforcement
        let distributedBasisPoints = 0;
        
        // Calculate proportional distribution
        const distributions = adjustableEntries.map(([ticker, holding], index) => {
            const isLast = index === adjustableEntries.length - 1;
            
            let targetBasisPoints;
            if (isLast) {
                // Last ETF gets remainder to ensure exact 100%
                targetBasisPoints = remainingBasisPoints - distributedBasisPoints;
            } else {
                // Proportional distribution
                const proportion = currentAdjustableBasisPoints > 0 
                    ? holding.basisPoints / currentAdjustableBasisPoints
                    : 1 / adjustableEntries.length;
                targetBasisPoints = Math.round(remainingBasisPoints * proportion);
                distributedBasisPoints += targetBasisPoints;
            }
            
            return { ticker, targetBasisPoints };
        });
        
        // Apply distributions
        distributions.forEach(({ ticker, targetBasisPoints }) => {
            const holding = holdings.get(ticker);
            newHoldings.set(ticker, {
                ...holding,
                basisPoints: targetBasisPoints,
                percentage: basisPointsToPercent(targetBasisPoints),
                displayPercentage: roundForDisplay(basisPointsToPercent(targetBasisPoints))
            });
        });
    }
    
    return newHoldings;
};

/**
 * Calculate total allocation in basis points (should always be 10000 for valid portfolios)
 * @param {Map} holdings - Holdings map
 * @returns {number} Total basis points
 */
export const calculateTotalBasisPoints = (holdings) => {
    return Array.from(holdings.entries())
        .filter(([, holding]) => !holding.disabled)
        .reduce((sum, [, holding]) => sum + (holding.basisPoints || percentToBasisPoints(holding.percentage)), 0);
};

/**
 * Validate portfolio precision - should always be exactly 10000 basis points
 * @param {Map} holdings - Holdings map
 * @returns {boolean} True if portfolio is precisely 100%
 */
export const isPortfolioPrecise = (holdings) => {
    const totalBasisPoints = calculateTotalBasisPoints(holdings);
    return totalBasisPoints === MAX_BASIS_POINTS;
};

/**
 * Convert legacy holdings to precision-enhanced holdings
 * @param {Map} legacyHoldings - Existing holdings map
 * @returns {Map} Enhanced holdings with precision data
 */
export const migrateToPrecisionHoldings = (legacyHoldings) => {
    return enhanceHoldingsWithPrecision(legacyHoldings);
}; 