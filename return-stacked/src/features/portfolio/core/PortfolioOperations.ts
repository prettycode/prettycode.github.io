import type { Portfolio, Holding } from './domain/Portfolio';
import {
    redistributeAfterRemoval,
    updateAllocation,
    redistributeAmongAvailable,
} from './calculators/AllocationCalculator';
import {
    calculateTotalAllocation,
    ensureBasisPoints,
    percentToBasisPoints,
    basisPointsToPercent,
} from './calculators/Precision';

export const createEmptyPortfolio = (name: string): Portfolio => {
    return {
        name,
        holdings: new Map<string, Holding>(),
        createdAt: Date.now(),
    };
};

export const clonePortfolio = (portfolio: Portfolio, newName?: string): Portfolio => {
    return {
        ...portfolio,
        name: newName ?? portfolio.name,
        holdings: new Map(portfolio.holdings),
        createdAt: Date.now(),
    };
};

export const addHolding = (portfolio: Portfolio, ticker: string, percentage: number): Portfolio => {
    const newHoldings = new Map(portfolio.holdings);

    if (newHoldings.has(ticker)) {
        return setAllocation(portfolio, ticker, percentage);
    }

    const newHolding: Holding = {
        percentage,
        basisPoints: percentToBasisPoints(percentage),
        locked: false,
        disabled: false,
    };

    newHoldings.set(ticker, ensureBasisPoints(newHolding));

    const totalAllocation = calculateTotalAllocation(newHoldings);
    if (totalAllocation > 100) {
        const availableETFs = Array.from(newHoldings.keys()).filter((t) => {
            const h = newHoldings.get(t);
            return t !== ticker && h && !h.locked && !h.disabled;
        });

        if (availableETFs.length > 0) {
            redistributeAmongAvailable(newHoldings, availableETFs, 100 - percentage, true);
        }
    }

    return { ...portfolio, holdings: newHoldings };
};

export const removeHolding = (portfolio: Portfolio, ticker: string): Portfolio => {
    const newHoldings = new Map(portfolio.holdings);
    redistributeAfterRemoval(newHoldings, ticker);
    return { ...portfolio, holdings: newHoldings };
};

export const setAllocation = (portfolio: Portfolio, ticker: string, newPercentage: number): Portfolio => {
    const newHoldings = new Map(portfolio.holdings);
    const result = updateAllocation(newHoldings, ticker, newPercentage);

    if (result === null) {
        return portfolio;
    }

    return { ...portfolio, holdings: result };
};

export const setHoldingLocked = (portfolio: Portfolio, ticker: string, locked: boolean): Portfolio => {
    const newHoldings = new Map(portfolio.holdings);
    const holding = newHoldings.get(ticker);

    if (!holding) {
        return portfolio;
    }

    newHoldings.set(ticker, ensureBasisPoints({ ...holding, locked }));
    return { ...portfolio, holdings: newHoldings };
};

export const setHoldingDisabled = (portfolio: Portfolio, ticker: string, disabled: boolean): Portfolio => {
    const newHoldings = new Map(portfolio.holdings);
    const holding = newHoldings.get(ticker);

    if (!holding) {
        return portfolio;
    }

    if (disabled) {
        const holdingBasisPoints = holding.basisPoints ?? percentToBasisPoints(holding.percentage);
        newHoldings.set(ticker, ensureBasisPoints({ ...holding, disabled: true }));

        const availableETFs = Array.from(newHoldings.entries())
            .filter(([t, h]) => t !== ticker && !h.locked && !h.disabled)
            .map(([t]) => t);

        if (availableETFs.length > 0 && holdingBasisPoints > 0) {
            redistributeAmongAvailable(newHoldings, availableETFs, basisPointsToPercent(holdingBasisPoints), false);
        }
    } else {
        newHoldings.set(ticker, ensureBasisPoints({ ...holding, disabled: false }));

        const availableETFs = Array.from(newHoldings.entries())
            .filter(([t, h]) => t !== ticker && !h.locked && !h.disabled)
            .map(([t]) => t);

        if (availableETFs.length > 0) {
            const result = updateAllocation(newHoldings, ticker, holding.percentage);
            if (result) {
                return { ...portfolio, holdings: result };
            }
        }
    }

    return { ...portfolio, holdings: newHoldings };
};

export const bulkSetAllocations = (
    portfolio: Portfolio,
    updates: Array<{ ticker: string; percentage: number }>
): Portfolio => {
    const newHoldings = new Map(portfolio.holdings);

    updates.forEach(({ ticker, percentage }) => {
        const holding = newHoldings.get(ticker);
        if (!holding) {
            return;
        }

        const basisPoints = percentToBasisPoints(percentage);
        newHoldings.set(
            ticker,
            ensureBasisPoints({ ...holding, basisPoints, percentage: basisPointsToPercent(basisPoints) })
        );
    });

    return { ...portfolio, holdings: newHoldings };
};

export const getTotalAllocation = (portfolio: Portfolio): number => {
    return calculateTotalAllocation(portfolio.holdings);
};
