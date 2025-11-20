/**
 * Custom hook for tax-related calculations
 */
import { useMemo } from 'react';
import type { ETFComparison } from '../types/etf-calculator';

interface UseTaxCalculationsParams {
    taxExemptYield: number;
    taxableYield: number;
    taxRate: number;
}

export const useTaxCalculations = ({ taxExemptYield, taxableYield, taxRate }: UseTaxCalculationsParams): ETFComparison => {
    return useMemo(() => {
        const taxMultiplier = 1 - taxRate / 100;
        const afterTaxYield = taxableYield * taxMultiplier;
        const taxEquivalentYield = taxExemptYield / taxMultiplier;
        const difference = Math.abs(taxExemptYield - afterTaxYield);
        const taxExemptBetter = taxExemptYield > afterTaxYield;

        return {
            taxExemptYield,
            taxableYield,
            afterTaxYield,
            taxEquivalentYield,
            difference,
            taxExemptBetter,
        };
    }, [taxExemptYield, taxableYield, taxRate]);
};
