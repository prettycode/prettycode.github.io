/**
 * Custom hook for managing ETF selection and sorting
 */
import { useMemo, useEffect, useState } from 'react';
import type { YieldMap, ETFData } from '../types/etf-calculator';

interface UseETFSelectionParams {
    etfMap: Record<string, ETFData>;
    yieldMap: YieldMap;
    loading: boolean;
}

interface UseETFSelectionResult {
    sortedETFs: Array<[string, ETFData & { yield: number }]>;
    selectedETF: string | null;
    selectedYield: number;
    setSelectedETF: (ticker: string) => void;
    setSelectedYield: (yield_: number) => void;
}

export const useETFSelection = ({ etfMap, yieldMap, loading }: UseETFSelectionParams): UseETFSelectionResult => {
    const [selectedETF, setSelectedETF] = useState<string | null>(null);
    const [selectedYield, setSelectedYield] = useState(0);

    // Memoize sorted ETF list
    const sortedETFs = useMemo(() => {
        return Object.entries(etfMap)
            .filter(([ticker]) => yieldMap[ticker] !== undefined)
            .map(([ticker, data]) => [ticker, { ...data, yield: yieldMap[ticker] }] as [string, ETFData & { yield: number }])
            .sort((a, b) => b[1].yield - a[1].yield); // Descending order
    }, [etfMap, yieldMap]);

    // Auto-select highest-yielding ETF when data loads
    useEffect(() => {
        if (!loading && sortedETFs.length > 0 && !selectedETF) {
            const [ticker, data] = sortedETFs[0];
            setSelectedETF(ticker);
            setSelectedYield(data.yield);
        }
    }, [loading, sortedETFs, selectedETF]);

    // Update yield when selection changes
    useEffect(() => {
        if (selectedETF && yieldMap[selectedETF] !== undefined) {
            setSelectedYield(yieldMap[selectedETF]);
        }
    }, [selectedETF, yieldMap]);

    return {
        sortedETFs,
        selectedETF,
        selectedYield,
        setSelectedETF,
        setSelectedYield,
    };
};
