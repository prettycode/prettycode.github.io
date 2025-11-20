/**
 * Tax Rate Selector Component
 * Allows users to enter tax rate directly or calculate from income
 */
import React, { memo } from 'react';
import { Percent } from 'lucide-react';

interface TaxRateSelectorProps {
    taxRate: number;
    income: string;
    useCustomRate: boolean;
    onTaxRateChange: (rate: number) => void;
    onIncomeChange: (income: string) => void;
    onModeChange: (useCustom: boolean) => void;
}

export const TaxRateSelector = memo<TaxRateSelectorProps>(
    ({ taxRate, income, useCustomRate, onTaxRateChange, onIncomeChange, onModeChange }) => {
        return (
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                    <Percent className="w-5 h-5 mr-2" aria-hidden="true" />
                    Your Tax Situation
                </h2>

                <fieldset className="mb-4">
                    <legend className="sr-only">Choose tax rate input method</legend>

                    <div className="flex items-center mb-3">
                        <input
                            type="radio"
                            id="customRate"
                            name="taxRateMode"
                            checked={useCustomRate}
                            onChange={() => onModeChange(true)}
                            className="mr-2 h-4 w-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                            aria-describedby="customRate-description"
                        />
                        <label htmlFor="customRate" className="text-sm font-medium text-gray-700">
                            Enter tax rate directly
                        </label>
                    </div>

                    <div className="flex items-center">
                        <input
                            type="radio"
                            id="incomeCalc"
                            name="taxRateMode"
                            checked={!useCustomRate}
                            onChange={() => onModeChange(false)}
                            className="mr-2 h-4 w-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                            aria-describedby="incomeCalc-description"
                        />
                        <label htmlFor="incomeCalc" className="text-sm font-medium text-gray-700">
                            Calculate from income (single filer)
                        </label>
                    </div>
                </fieldset>

                {useCustomRate ? (
                    <div>
                        <label htmlFor="taxRateInput" className="block text-sm font-medium text-gray-700 mb-2">
                            Federal Tax Rate (%)
                        </label>
                        <input
                            id="taxRateInput"
                            type="number"
                            value={taxRate}
                            onChange={(e) => onTaxRateChange(parseFloat(e.target.value) || 0)}
                            step="1"
                            min="0"
                            max="100"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            aria-label="Federal tax rate percentage"
                        />
                    </div>
                ) : (
                    <div>
                        <label htmlFor="incomeInput" className="block text-sm font-medium text-gray-700 mb-2">
                            Annual Taxable Income ($)
                        </label>
                        <input
                            id="incomeInput"
                            type="number"
                            value={income}
                            onChange={(e) => onIncomeChange(e.target.value)}
                            placeholder="Enter your taxable income"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            aria-label="Annual taxable income in dollars"
                        />
                    </div>
                )}

                <div className="mt-4 flex items-center justify-between bg-white rounded p-3" role="status" aria-live="polite">
                    <span className="text-sm text-gray-600">Your Tax Rate:</span>
                    <span className="text-xl font-bold text-gray-800">{taxRate}%</span>
                </div>
            </div>
        );
    }
);

TaxRateSelector.displayName = 'TaxRateSelector';
