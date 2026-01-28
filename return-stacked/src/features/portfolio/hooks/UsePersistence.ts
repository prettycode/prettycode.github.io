/**
 * usePersistence - React hook for portfolio persistence operations
 * Handles saving, loading, and deleting portfolios
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Portfolio } from '../core/domain/Portfolio';
import { usePortfolioService } from './UsePortfolioService';

export function usePersistence(): {
    savedPortfolios: Portfolio[];
    isLoading: boolean;
    error: string | null;
    savePortfolio: (portfolio: Portfolio) => Promise<boolean>;
    deletePortfolio: (name: string) => Promise<boolean>;
    loadSavedPortfolios: () => Promise<void>;
    portfolioExists: (name: string) => Promise<boolean>;
    exportPortfolio: (portfolio: Portfolio) => string;
    importPortfolio: (json: string) => Portfolio | null;
    service: ReturnType<typeof usePortfolioService>;
} {
    const service = usePortfolioService();
    const [savedPortfolios, setSavedPortfolios] = useState<Portfolio[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load saved portfolios on mount
    useEffect(() => {
        loadSavedPortfolios();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadSavedPortfolios = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const portfolios = await service.loadAll();
            setSavedPortfolios(portfolios);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load portfolios');
            console.error('Error loading portfolios:', err);
        } finally {
            setIsLoading(false);
        }
    }, [service]);

    const savePortfolio = useCallback(
        async (portfolio: Portfolio) => {
            setError(null);
            try {
                await service.save(portfolio);
                await loadSavedPortfolios(); // Refresh list
                return true;
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to save portfolio');
                console.error('Error saving portfolio:', err);
                return false;
            }
        },
        [service, loadSavedPortfolios]
    );

    const deletePortfolio = useCallback(
        async (name: string) => {
            setError(null);
            try {
                await service.delete(name);
                await loadSavedPortfolios(); // Refresh list
                return true;
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to delete portfolio');
                console.error('Error deleting portfolio:', err);
                return false;
            }
        },
        [service, loadSavedPortfolios]
    );

    const portfolioExists = useCallback(
        async (name: string): Promise<boolean> => {
            try {
                return await service.exists(name);
            } catch (err) {
                console.error('Error checking portfolio existence:', err);
                return false;
            }
        },
        [service]
    );

    const exportPortfolio = useCallback(
        (portfolio: Portfolio): string => {
            return service.exportToJSON(portfolio);
        },
        [service]
    );

    const importPortfolio = useCallback(
        (json: string): Portfolio | null => {
            try {
                return service.importFromJSON(json);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to import portfolio');
                console.error('Error importing portfolio:', err);
                return null;
            }
        },
        [service]
    );

    return {
        // State
        savedPortfolios,
        isLoading,
        error,

        // Operations
        savePortfolio,
        deletePortfolio,
        loadSavedPortfolios,
        portfolioExists,
        exportPortfolio,
        importPortfolio,

        // Service reference
        service,
    };
}
