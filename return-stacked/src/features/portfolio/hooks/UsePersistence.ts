/**
 * usePersistence - React hook for portfolio persistence operations
 * Loads saved portfolios from storage
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Portfolio } from '../core/domain/Portfolio';
import { usePortfolioService } from './UsePortfolioService';

export function usePersistence(): {
    savedPortfolios: Portfolio[];
} {
    const service = usePortfolioService();
    const [savedPortfolios, setSavedPortfolios] = useState<Portfolio[]>([]);

    const loadSavedPortfolios = useCallback(async () => {
        try {
            const portfolios = await service.loadAll();
            setSavedPortfolios(portfolios);
        } catch (err) {
            console.error('Error loading portfolios:', err);
        }
    }, [service]);

    useEffect(() => {
        loadSavedPortfolios();
    }, [loadSavedPortfolios]);

    return {
        savedPortfolios,
    };
}
