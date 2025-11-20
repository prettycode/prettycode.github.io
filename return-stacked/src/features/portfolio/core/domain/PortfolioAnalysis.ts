/**
 * Portfolio analysis results
 */
export interface PortfolioAnalysis {
    exposures: Map<string, number>;
    assetClasses: Map<string, number>;
    totalLeverage: number;
    isLevered: boolean;
}
