/**
 * ETF definition with exposures
 */
import type { LeverageType } from './LeverageType';

export interface ETFMetadata {
    name?: string;
    inceptionDate?: string;
    expenseRatio?: number;
    netAssets?: string;
    yield?: number;
}

export interface ETF {
    ticker: string;
    exposures: Map<string, number>;
    leverageType: LeverageType;
    metadata?: ETFMetadata;
}
