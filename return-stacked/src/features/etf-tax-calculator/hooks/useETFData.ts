/**
 * Custom hook for fetching and managing ETF data from API
 */
import { useState, useEffect, useCallback } from 'react';
import type { YieldMap, FetchTimeMap, ETFYieldData } from '../types/etf-calculator';

interface ETFDataMap {
    [ticker: string]: ETFYieldData;
}

interface UseETFDataResult {
    yieldMap: YieldMap;
    fetchTimeMap: FetchTimeMap;
    etfDataMap: ETFDataMap;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export const useETFData = (): UseETFDataResult => {
    const [yieldMap, setYieldMap] = useState<YieldMap>({});
    const [fetchTimeMap, setFetchTimeMap] = useState<FetchTimeMap>({});
    const [etfDataMap, setEtfDataMap] = useState<ETFDataMap>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/bond-yields.json');

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (!data.etfs || !Array.isArray(data.etfs)) {
                throw new Error('Invalid data format received from API');
            }

            const newYieldMap: YieldMap = {};
            const newFetchTimeMap: FetchTimeMap = {};
            const newEtfDataMap: ETFDataMap = {};

            data.etfs.forEach((etf: ETFYieldData) => {
                if (etf.yield !== undefined && etf.yield !== null) {
                    newYieldMap[etf.ticker] = etf.yield;
                    newFetchTimeMap[etf.ticker] = new Date(etf.fetchedAt).toLocaleString();
                    newEtfDataMap[etf.ticker] = etf;
                }
            });

            setYieldMap(newYieldMap);
            setFetchTimeMap(newFetchTimeMap);
            setEtfDataMap(newEtfDataMap);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            console.error('Error loading yield data:', err);
            setError(`Failed to load yield data: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        yieldMap,
        fetchTimeMap,
        etfDataMap,
        loading,
        error,
        refetch: fetchData,
    };
};
