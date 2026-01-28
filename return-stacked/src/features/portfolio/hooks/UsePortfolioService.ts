/**
 * usePortfolioService - React hook that provides access to the PortfolioService
 * This is the main React adapter for the framework-agnostic business logic
 */

'use client';

import { useMemo } from 'react';
import { PortfolioService } from '../core/services/PortfolioService';
import { LocalStorageAdapter } from '../adapters/storage/LocalStorageAdapter';

/**
 * Creates and returns a memoized PortfolioService instance
 * The service is created once per component lifecycle
 */
export function usePortfolioService(): PortfolioService {
    const service = useMemo(() => {
        // Only create storage adapter in browser environment
        const storageAdapter = typeof window !== 'undefined' ? new LocalStorageAdapter() : undefined;
        return new PortfolioService(storageAdapter);
    }, []);

    return service;
}
