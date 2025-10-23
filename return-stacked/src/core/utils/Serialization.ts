/**
 * Serialization utilities - framework-agnostic functions for data conversion
 */

import type { Portfolio } from '../domain/Portfolio';
import type { SerializedPortfolio } from '../domain/SerializedPortfolio';
import type { Holding } from '../domain/Holding';

/**
 * Serializes a portfolio for storage (converts Map to Array)
 */
export const serializePortfolio = (portfolio: Portfolio): SerializedPortfolio => {
    return {
        name: portfolio.name,
        holdings: Array.from(portfolio.holdings.entries()),
        createdAt: portfolio.createdAt ?? Date.now(),
        etfCount: portfolio.holdings.size,
    };
};

/**
 * Deserializes a portfolio from storage (converts Array to Map)
 */
export const deserializePortfolio = (serialized: SerializedPortfolio): Portfolio => {
    const holdings = new Map<string, Holding>(serialized.holdings);
    return {
        name: serialized.name,
        holdings,
        createdAt: serialized.createdAt,
    };
};
