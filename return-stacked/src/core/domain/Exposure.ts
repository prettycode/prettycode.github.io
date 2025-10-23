/**
 * Asset exposure characteristics
 */
import type { AssetClass } from './AssetClass';
import type { MarketRegion } from './MarketRegion';
import type { FactorStyle } from './FactorStyle';
import type { SizeFactor } from './SizeFactor';

export interface Exposure {
    assetClass: AssetClass;
    marketRegion?: MarketRegion;
    factorStyle?: FactorStyle;
    sizeFactor?: SizeFactor;
}
