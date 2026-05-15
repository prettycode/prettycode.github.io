export type AssetClass =
  | 'Equity'
  | 'U.S. Treasuries'
  | 'Managed Futures'
  | 'Futures Yield'
  | 'Gold'
  | 'Bitcoin'
  | 'Ethereum'
  | 'Cash'
  | 'Unknown';

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

export type LeverageType = 'None' | 'Stacked' | 'Daily Reset' | 'Extended Duration';

export interface ETF {
  ticker: string;
  exposures: ExposureAmount[];
  leverageType: LeverageType;
}

export interface Holding {
  symbol: string;
  description: string;
  value: number;
  inCatalog: boolean;
}

export interface PortfolioData {
  accountNumber: string;
  accountName: string;
  fileName: string;
  totalValue: number;
  holdings: Holding[];
  // Dollars per asset class (sums may exceed totalValue when leveraged/stacked).
  byAssetClass: Map<AssetClass, number>;
  // Dollars per equity sub-dimension. Only populated for the Equity slice.
  byMarketRegion: Map<MarketRegion, number>;
  byFactorStyle: Map<FactorStyle, number>;
  bySizeFactor: Map<SizeFactor, number>;
  totalEquity: number;
  totalExposure: number;
  // Sum of dollars in tickers we don't have a catalog mapping for.
  unknownValue: number;
}
