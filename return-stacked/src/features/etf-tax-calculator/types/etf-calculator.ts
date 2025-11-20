/**
 * Type definitions for the ETF Tax Yield Calculator
 */

export type Duration = 'any' | 'cash' | 'ultra-short' | 'short' | 'intermediate' | 'long' | 'extended' | 'total-market';

export interface TaxBracket {
    rate: number;
    min: number;
    max: number;
}

export interface ETFYieldData {
    ticker: string;
    name: string;
    yield: number;
    expenseRatio: number; // in percentage (e.g., 0.05 for 0.05%)
    netAssets?: string; // e.g., "$50.2B"
    managementStyle: 'active' | 'passive';
    duration: Duration;
    fetchedAt: string;
    success: boolean;
}

export interface YieldMap {
    [ticker: string]: number;
}

export interface FetchTimeMap {
    [ticker: string]: string;
}

export interface ETFData {
    name: string;
    ticker?: string;
}

export interface ETFComparison {
    taxExemptYield: number;
    taxableYield: number;
    afterTaxYield: number;
    taxEquivalentYield: number;
    difference: number;
    taxExemptBetter: boolean;
}

export interface TaxRateConfig {
    useCustomRate: boolean;
    customRate: number;
    income: string;
}
