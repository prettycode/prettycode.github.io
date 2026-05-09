export type AssetClass = 'Equity' | 'U.S. Treasuries' | 'Managed Futures' | 'Futures Yield' | 'Gold' | 'Bitcoin';

export type MarketRegion = 'U.S.' | 'International Developed' | 'Emerging';

export type FactorStyle = 'Blend' | 'Growth' | 'Value';

export type SizeFactor = 'Large Cap' | 'Small Cap';

export interface Exposure {
    assetClass: AssetClass;
    marketRegion?: MarketRegion;
    factorStyle?: FactorStyle;
    sizeFactor?: SizeFactor;
}

export interface ExposureAmount {
    exposure: Exposure;
    amount: number;
}

export interface ColorMap {
    [key: string]: string;
}
