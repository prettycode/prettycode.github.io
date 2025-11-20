/**
 * Template portfolio details
 */
import type { AssetClass } from './AssetClass';
import type { PortfolioAnalysis } from './PortfolioAnalysis';
import type { ETFDetails } from './ETFDetails';
import type { EquityBreakdown } from './EquityBreakdown';

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
