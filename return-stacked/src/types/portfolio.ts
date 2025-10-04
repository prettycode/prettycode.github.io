/**
 * Core TypeScript type definitions for portfolio management
 */

/**
 * Asset class categories
 */
export type AssetClass = 'Equity' | 'U.S. Treasuries' | 'Managed Futures' | 'Futures Yield' | 'Gold' | 'Bitcoin';

/**
 * Market regions for equity exposures
 */
export type MarketRegion = 'U.S.' | 'International Developed' | 'Emerging';

/**
 * Factor styles for equity classifications
 */
export type FactorStyle = 'Blend' | 'Growth' | 'Value';

/**
 * Size factors for market cap classifications
 */
export type SizeFactor = 'Large Cap' | 'Small Cap';

/**
 * Leverage types for ETFs
 */
export type LeverageType = 'None' | 'Stacked' | 'Daily Reset' | 'Extended Duration';

/**
 * Asset exposure characteristics
 */
export interface Exposure {
    assetClass: AssetClass;
    marketRegion?: MarketRegion;
    factorStyle?: FactorStyle;
    sizeFactor?: SizeFactor;
}

/**
 * Exposure with allocation amount
 */
export interface ExposureAmount {
    exposure: Exposure;
    amount: number;
}

/**
 * ETF definition with exposures
 */
export interface ETF {
    ticker: string;
    exposures: Map<string, number>;
    leverageType: LeverageType;
}

/**
 * Portfolio holding metadata
 */
export interface Holding {
    percentage: number;
    locked?: boolean;
    disabled?: boolean;
    basisPoints?: number;
    displayPercentage?: number;
}

/**
 * Portfolio definition
 */
export interface Portfolio {
    name: string;
    holdings: Map<string, Holding>;
    createdAt?: number;
    etfCount?: number;
}

/**
 * Serialized portfolio for storage
 */
export interface SerializedPortfolio {
    name: string;
    holdings: Array<[string, Holding]>;
    createdAt: number;
    etfCount: number;
}

/**
 * Portfolio analysis results
 */
export interface PortfolioAnalysis {
    exposures: Map<string, number>;
    assetClasses: Map<string, number>;
    totalLeverage: number;
    isLevered: boolean;
}

/**
 * ETF details for display
 */
export interface ETFDetails {
    ticker: string;
    percentage: number;
    leverageType: LeverageType;
    leverageAmount: number;
    assetClasses: AssetClass[];
}

/**
 * Equity breakdown by region
 */
export interface EquityBreakdown {
    us: number;
    exUs: number;
    totalEquity: number;
}

/**
 * Template portfolio details
 */
export interface TemplateDetails {
    name: string;
    etfCount: number;
    totalLeverage: number;
    isLevered: boolean;
    dominantAssetClasses: AssetClass[];
    leverageTypesWithAmounts: Map<string, number>;
    etfDetails: ETFDetails[];
    analysis: PortfolioAnalysis;
    equityBreakdown: EquityBreakdown | null;
}

/**
 * Color configuration
 */
export interface ColorMap {
    [key: string]: string;
}

/**
 * Warning types for portfolio validation
 */
export interface Warning {
    type: 'error' | 'warning' | 'info';
    message: string;
    description?: string;
}
