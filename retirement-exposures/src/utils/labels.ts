import type { AssetClass, FactorStyle, MarketRegion, SizeFactor } from '../types';

export const REGION_ORDER: MarketRegion[] = ['U.S.', 'International Developed', 'Emerging'];
export const REGION_LABEL: Record<MarketRegion, string> = {
  'U.S.': 'US',
  'International Developed': "Int'l",
  'Emerging': 'EM',
};

export const STYLE_ORDER: FactorStyle[] = ['Blend', 'Value', 'Growth'];

export const SIZE_ORDER: SizeFactor[] = ['Large Cap', 'Small Cap'];
export const SIZE_LABEL: Record<SizeFactor, string> = {
  'Large Cap': 'Large',
  'Small Cap': 'Small',
};

const ASSET_CLASS_LABEL: Partial<Record<AssetClass, string>> = {
  'U.S. Treasuries': 'Treasuries',
  'Managed Futures': 'Trend',
  'Futures Yield': 'Carry',
};

export function labelFor(ac: AssetClass): string {
  return ASSET_CLASS_LABEL[ac] ?? ac;
}
