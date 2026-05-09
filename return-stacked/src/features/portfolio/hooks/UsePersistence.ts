import { useState, useEffect } from 'react';
import type { Portfolio } from '../core/domain/Portfolio';
import { loadSavedPortfolios } from '../storage/SavedPortfolios';
import { deserializePortfolio } from '../core/utils/Serialization';

export function usePersistence(): {
    savedPortfolios: Portfolio[];
} {
    const [savedPortfolios, setSavedPortfolios] = useState<Portfolio[]>([]);

    useEffect(() => {
        setSavedPortfolios(loadSavedPortfolios().map(deserializePortfolio));
    }, []);

    return { savedPortfolios };
}
