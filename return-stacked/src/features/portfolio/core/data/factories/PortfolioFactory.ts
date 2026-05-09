/**
 * Portfolio factory - Creates portfolio instances from allocations
 */

import type { Portfolio, Holding } from '../../domain/Portfolio';
import { ensureBasisPoints } from '../../calculators/Precision';

/**
 * Creates a portfolio from allocations
 */
export const createPortfolio = (
    name: string,
    allocations: Array<{ ticker: string; percentage: number }>
): Portfolio => {
    const holdings = new Map<string, Holding>();

    for (const { ticker, percentage } of allocations) {
        holdings.set(ticker, ensureBasisPoints({ percentage }));
    }

    return { name, holdings };
};
