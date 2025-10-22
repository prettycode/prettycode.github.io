/**
 * usePortfolio - React hook for portfolio state management
 * Wraps PortfolioService with React state management
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import type { Portfolio } from '../../../core/domain/Portfolio';
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
    equalWeight: () => void;
    loadPortfolio: (newPortfolio: Portfolio) => void;
    resetPortfolio: (name: string) => void;
    clonePortfolio: (newName?: string) => void;
    analysis: ReturnType<ReturnType<typeof usePortfolioService>['analyze']>;
    templateDetails: ReturnType<ReturnType<typeof usePortfolioService>['getTemplateDetails']>;
    warnings: ReturnType<ReturnType<typeof usePortfolioService>['validate']>;
    equityBreakdown: ReturnType<ReturnType<typeof usePortfolioService>['getEquityBreakdown']>;
    totalAllocation: number;
    isPrecise: boolean;
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

    const equalWeight = useCallback(() => {
        setPortfolio((prev) => service.equalWeight(prev));
    }, [service]);

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

    const clonePortfolio = useCallback(
        (newName?: string) => {
            setPortfolio((prev) => service.clone(prev, newName));
        },
        [service]
    );

    // Analysis
    const analysis = service.analyze(portfolio);
    const templateDetails = service.getTemplateDetails(portfolio);
    const warnings = service.validate(portfolio);
    const equityBreakdown = service.getEquityBreakdown(portfolio);
    const totalAllocation = service.getTotalAllocation(portfolio);
    const isPrecise = service.isPrecise(portfolio);

    return {
        // State
        portfolio,
        setPortfolio,

        // Allocation operations
        addHolding,
        removeHolding,
        updateAllocation,
        bulkUpdateAllocations,
        lockHolding,
        disableHolding,
        equalWeight,

        // Portfolio operations
        loadPortfolio,
        resetPortfolio,
        clonePortfolio,

        // Analysis (computed)
        analysis,
        templateDetails,
        warnings,
        equityBreakdown,
        totalAllocation,
        isPrecise,

        // Service reference (for advanced usage)
        service,
    };
}
