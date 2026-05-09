/**
 * usePortfolio - React hook for portfolio state management
 * Wraps PortfolioService with React state management
 */


import React, { useState, useCallback, useEffect } from 'react';
import type { Portfolio } from '../core/domain/Portfolio';
import { usePortfolioService } from './UsePortfolioService';

interface UsePortfolioOptions {
    initialPortfolio?: Portfolio;
    onPortfolioChange?: (portfolio: Portfolio) => void;
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
    service: ReturnType<typeof usePortfolioService>;
} {
    const service = usePortfolioService();
    const [portfolio, setPortfolio] = useState<Portfolio>(options.initialPortfolio ?? service.createEmptyPortfolio('New Portfolio'));

    // Call onChange callback when portfolio changes
    useEffect(() => {
        if (options.onPortfolioChange) {
            options.onPortfolioChange(portfolio);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [portfolio]);

    // Allocation management
    const addHolding = useCallback(
        (ticker: string, percentage: number) => {
            setPortfolio((prev) => service.addHolding(prev, ticker, percentage));
        },
        [service]
    );

    const removeHolding = useCallback(
        (ticker: string) => {
            setPortfolio((prev) => service.removeHolding(prev, ticker));
        },
        [service]
    );

    const updateAllocation = useCallback(
        (ticker: string, newPercentage: number) => {
            setPortfolio((prev) => service.updateAllocation(prev, ticker, newPercentage));
        },
        [service]
    );

    const bulkUpdateAllocations = useCallback(
        (updates: Array<{ ticker: string; percentage: number }>) => {
            setPortfolio((prev) => service.bulkUpdateAllocations(prev, updates));
        },
        [service]
    );

    const lockHolding = useCallback(
        (ticker: string, locked: boolean) => {
            setPortfolio((prev) => service.lockHolding(prev, ticker, locked));
        },
        [service]
    );

    const disableHolding = useCallback(
        (ticker: string, disabled: boolean) => {
            setPortfolio((prev) => service.disableHolding(prev, ticker, disabled));
        },
        [service]
    );

    // Portfolio management
    const loadPortfolio = useCallback((newPortfolio: Portfolio) => {
        setPortfolio(newPortfolio);
    }, []);

    const resetPortfolio = useCallback(
        (name: string) => {
            setPortfolio(service.createEmptyPortfolio(name));
        },
        [service]
    );

    const totalAllocation = service.getTotalAllocation(portfolio);

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
        service,
    };
}
