/**
 * Template portfolio details
 */
import type { PortfolioAnalysis } from './PortfolioAnalysis';

export interface TemplateDetails {
    totalLeverage: number;
    isLevered: boolean;
    analysis: PortfolioAnalysis;
}
