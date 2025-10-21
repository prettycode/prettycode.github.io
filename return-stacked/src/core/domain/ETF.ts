/**
 * ETF definition with exposures
 */
import type { LeverageType } from './LeverageType';

export interface ETF {
    ticker: string;
    exposures: Map<string, number>;
    leverageType: LeverageType;
}
