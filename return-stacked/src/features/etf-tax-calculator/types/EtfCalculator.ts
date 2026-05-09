/**
 * Type definitions for the ETF Tax Yield Calculator
 */

export type Duration = 'any' | 'cash' | 'ultra-short' | 'short' | 'intermediate' | 'long' | 'extended' | 'total-market';

export interface TaxBracket {
    rate: number;
    min: number;
    max: number;
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
