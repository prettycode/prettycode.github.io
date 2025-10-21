/**
 * Serialized portfolio for storage
 */
import type { Holding } from './Holding';

export interface SerializedPortfolio {
    name: string;
    holdings: Array<[string, Holding]>;
    createdAt: number;
    etfCount?: number; // Optional for backward compatibility with existing saved portfolios
}
