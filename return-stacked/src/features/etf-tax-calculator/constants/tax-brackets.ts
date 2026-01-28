/**
 * Federal tax brackets for 2026
 * Source: IRS tax tables
 */
import type { TaxBracket } from '../types/etf-calculator';

export const TAX_BRACKETS_2026_SINGLE: TaxBracket[] = [
    { rate: 10, min: 0, max: 12400 },
    { rate: 12, min: 12401, max: 50400 },
    { rate: 22, min: 50401, max: 105700 },
    { rate: 24, min: 105701, max: 201775 },
    { rate: 32, min: 201776, max: 256225 },
    { rate: 35, min: 256226, max: 640600 },
    { rate: 37, min: 640601, max: Infinity },
];

export const TAX_BRACKETS_2026_MARRIED: TaxBracket[] = [
    { rate: 10, min: 0, max: 24800 },
    { rate: 12, min: 24801, max: 100800 },
    { rate: 22, min: 100801, max: 211400 },
    { rate: 24, min: 211401, max: 403550 },
    { rate: 32, min: 403551, max: 512450 },
    { rate: 35, min: 512451, max: 681200 },
    { rate: 37, min: 681201, max: Infinity },
];

// Keep backwards compatibility
export const TAX_BRACKETS_2026 = TAX_BRACKETS_2026_SINGLE;

/**
 * Find the tax bracket for a given income and filing status
 */
export const findTaxBracket = (income: number, filingStatus: 'single' | 'married' = 'single'): TaxBracket | undefined => {
    const brackets = filingStatus === 'married' ? TAX_BRACKETS_2026_MARRIED : TAX_BRACKETS_2026_SINGLE;
    return brackets.find((bracket) => income >= bracket.min && income <= bracket.max);
};
