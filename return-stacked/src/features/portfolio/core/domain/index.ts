/**
 * Core domain types - Public API boundary
 * Barrel export for external consumers only
 */

// Type unions
export type { AssetClass } from './AssetClass';
export type { MarketRegion } from './MarketRegion';
export type { FactorStyle } from './FactorStyle';
export type { SizeFactor } from './SizeFactor';
export type { LeverageType } from './LeverageType';

// Core entity interfaces
export type { Exposure } from './Exposure';
export type { ExposureAmount } from './ExposureAmount';
export type { ETF } from './ETF';
export type { Holding } from './Holding';

// Portfolio interfaces
export type { Portfolio } from './Portfolio';
export type { SerializedPortfolio } from './SerializedPortfolio';

// Analysis interfaces
export type { PortfolioAnalysis } from './PortfolioAnalysis';
export type { ETFDetails } from './ETFDetails';
export type { EquityBreakdown } from './EquityBreakdown';
export type { TemplateDetails } from './TemplateDetails';

// Display interfaces
export type { ColorMap } from './ColorMap';
export type { Warning } from './Warning';
export type { ExpandedCategories } from './ExpandedCategories';
