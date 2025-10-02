export type AssetClass = 'Equity' | 'U.S. Treasuries' | 'Managed Futures' | 'Futures Yield' | 'Gold' | 'Bitcoin';

export type MarketRegion = 'U.S.' | 'International Developed' | 'Emerging';

export type FactorStyle = 'Blend' | 'Value' | 'Growth';

export type SizeFactor = 'Large Cap' | 'Small Cap';

export type LeverageType = 'None' | 'Stacked' | 'Daily Reset' | 'Extended Duration';

export interface Exposure {
    assetClass: AssetClass;
    marketRegion?: MarketRegion;
    factorStyle?: FactorStyle;
    sizeFactor?: SizeFactor;
}

export interface ExposureData {
    exposure: Exposure;
    amount: number;
}

export interface ETF {
    ticker: string;
    exposures: Map<string, number>;
    leverageType: LeverageType;
}

export interface Holding {
    percentage: number;
    locked: boolean;
    disabled: boolean;
}

export interface Portfolio {
    name: string;
    description?: string;
    holdings: Map<string, number>;
}

export interface CustomPortfolio {
    name: string;
    description?: string;
    holdings: Map<string, Holding>;
}

export interface SerializedPortfolio {
    name: string;
    description?: string;
    holdings: [string, Holding][];
    createdAt: number;
    etfCount: number;
}

export interface PortfolioAnalysis {
    exposures: Map<string, number>;
    assetClasses: Map<string, number>;
    totalLeverage: number;
    isLevered: boolean;
}

export interface ETFDetail {
    ticker: string;
    percentage: number;
    leverageType: LeverageType;
    leverageAmount: number;
    assetClasses: AssetClass[];
}

export interface EquityBreakdown {
    us: number;
    exUs: number;
    totalEquity: number;
}

export interface TemplateDetails {
    name: string;
    etfCount: number;
    totalLeverage: number;
    isLevered: boolean;
    dominantAssetClasses: AssetClass[];
    leverageTypesWithAmounts: Map<LeverageType, number>;
    etfDetails: ETFDetail[];
    analysis: PortfolioAnalysis;
    equityBreakdown: EquityBreakdown | null;
}

export interface AllocationUpdate {
    ticker: string;
    percentage: number;
}

export interface AssetClassColors {
    [key: string]: string;
}

export interface RegionColors {
    [key: string]: string;
}
