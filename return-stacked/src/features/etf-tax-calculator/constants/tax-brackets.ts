/**
 * Federal tax brackets for 2026 (Single filers)
 * Source: IRS tax tables
 */
import type { TaxBracket } from '../types/etf-calculator';

export const TAX_BRACKETS_2026: TaxBracket[] = [
    { rate: 10, min: 0, max: 12400 },
    { rate: 12, min: 12401, max: 50400 },
    { rate: 22, min: 50401, max: 105700 },
    { rate: 24, min: 105701, max: 201775 },
    { rate: 32, min: 201776, max: 256225 },
    { rate: 35, min: 256226, max: 640600 },
    { rate: 37, min: 640601, max: Infinity },
];

/**
 * Find the tax bracket for a given income
 */
export const findTaxBracket = (income: number): TaxBracket | undefined => {
    return TAX_BRACKETS_2026.find((bracket) => income >= bracket.min && income <= bracket.max);
};
