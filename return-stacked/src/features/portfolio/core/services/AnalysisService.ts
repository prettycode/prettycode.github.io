/**
 * AnalysisService - Framework-agnostic service for portfolio analysis
 * Provides detailed portfolio analysis including exposures, leverage, and ETF details
 */

import type { Portfolio } from '../domain/Portfolio';
import type { PortfolioAnalysis } from '../domain/PortfolioAnalysis';
import type { TemplateDetails } from '../domain/TemplateDetails';
import { analyzePortfolio } from '../calculators/ExposureCalculator';

export class AnalysisService {
    /**
     * Analyzes a portfolio and returns comprehensive analysis
     */
    public analyze(portfolio: Portfolio): PortfolioAnalysis {
        return analyzePortfolio(portfolio);
    }

    /**
     * Generates detailed template information for display
     */
    public getTemplateDetails(portfolio: Portfolio): TemplateDetails {
        const analysis = this.analyze(portfolio);
        return {
            totalLeverage: analysis.totalLeverage,
            isLevered: analysis.isLevered,
            analysis,
        };
    }
}
