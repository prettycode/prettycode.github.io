/**
 * ETF details for display
 */
import type { AssetClass } from './AssetClass';
import type { LeverageType } from './LeverageType';

export interface ETFDetails {
    ticker: string;
    percentage: number;
    leverageType: LeverageType;
    leverageAmount: number;
    assetClasses: AssetClass[];
}
