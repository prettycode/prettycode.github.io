/**
 * Portfolio factory - Creates portfolio instances from allocations
 */

import type { Portfolio } from '../../domain/Portfolio';
import type { Holding } from '../../domain/Holding';

/**
 * Creates a portfolio from allocations
 */
export const createPortfolio = (name: string, allocations: Array<{ ticker: string; percentage: number }>): Portfolio => {
    const holdings = new Map<string, Holding>();

    for (const { ticker, percentage } of allocations) {
        holdings.set(ticker, { percentage });
    }

    return { name, holdings };
};
