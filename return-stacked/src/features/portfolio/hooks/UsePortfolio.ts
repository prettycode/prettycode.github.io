import React, { useState, useCallback } from 'react';
import type { Portfolio } from '../core/domain/Portfolio';
import * as ops from '../core/PortfolioOperations';

interface UsePortfolioOptions {
    initialPortfolio?: Portfolio;
}

export function usePortfolio(options: UsePortfolioOptions = {}): {
    portfolio: Portfolio;
    setPortfolio: React.Dispatch<React.SetStateAction<Portfolio>>;
    addHolding: (ticker: string, percentage: number) => void;
    removeHolding: (ticker: string) => void;
    updateAllocation: (ticker: string, newPercentage: number) => void;
    bulkUpdateAllocations: (updates: Array<{ ticker: string; percentage: number }>) => void;
    lockHolding: (ticker: string, locked: boolean) => void;
    disableHolding: (ticker: string, disabled: boolean) => void;
    loadPortfolio: (newPortfolio: Portfolio) => void;
    resetPortfolio: (name: string) => void;
    totalAllocation: number;
    clonePortfolio: (portfolio: Portfolio, newName?: string) => Portfolio;
} {
    const [portfolio, setPortfolio] = useState<Portfolio>(
        options.initialPortfolio ?? ops.createEmptyPortfolio('New Portfolio')
    );

    const addHolding = useCallback((ticker: string, percentage: number) => {
        setPortfolio((prev) => ops.addHolding(prev, ticker, percentage));
    }, []);

    const removeHolding = useCallback((ticker: string) => {
        setPortfolio((prev) => ops.removeHolding(prev, ticker));
    }, []);

    const updateAllocation = useCallback((ticker: string, newPercentage: number) => {
        setPortfolio((prev) => ops.setAllocation(prev, ticker, newPercentage));
    }, []);

    const bulkUpdateAllocations = useCallback((updates: Array<{ ticker: string; percentage: number }>) => {
        setPortfolio((prev) => ops.bulkSetAllocations(prev, updates));
    }, []);

    const lockHolding = useCallback((ticker: string, locked: boolean) => {
        setPortfolio((prev) => ops.setHoldingLocked(prev, ticker, locked));
    }, []);

    const disableHolding = useCallback((ticker: string, disabled: boolean) => {
        setPortfolio((prev) => ops.setHoldingDisabled(prev, ticker, disabled));
    }, []);

    const loadPortfolio = useCallback((newPortfolio: Portfolio) => {
        setPortfolio(newPortfolio);
    }, []);

    const resetPortfolio = useCallback((name: string) => {
        setPortfolio(ops.createEmptyPortfolio(name));
    }, []);

    const totalAllocation = ops.getTotalAllocation(portfolio);

    return {
        portfolio,
        setPortfolio,
        addHolding,
        removeHolding,
        updateAllocation,
        bulkUpdateAllocations,
        lockHolding,
        disableHolding,
        loadPortfolio,
        resetPortfolio,
        totalAllocation,
        clonePortfolio: ops.clonePortfolio,
    };
}
