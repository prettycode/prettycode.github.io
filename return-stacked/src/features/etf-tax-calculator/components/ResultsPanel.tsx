/**
 * Results Panel Component
 * Displays the comparison results and recommendation
 */
import React, { memo } from 'react';
import type { ETFComparison } from '../../types/etf-calculator';

interface ResultsPanelProps {
    comparison: ETFComparison;
    taxExemptTicker: string;
    taxableTicker: string;
}

export const ResultsPanel = memo<ResultsPanelProps>(({ comparison, taxExemptTicker, taxableTicker }) => {
    const { taxExemptYield, taxableYield, afterTaxYield, taxEquivalentYield, difference, taxExemptBetter } = comparison;

    const winnerTicker = taxExemptBetter ? taxExemptTicker : taxableTicker;
    const winnerType = taxExemptBetter ? 'tax-exempt municipal bond' : 'taxable Treasury';
    const bgColor = taxExemptBetter ? 'bg-blue-100' : 'bg-green-100';
    const winnerColor = taxExemptBetter ? 'text-blue-600' : 'text-green-600';

    return (
        <section className={`rounded-lg p-6 ${bgColor}`} aria-labelledby="results-heading">
            <h2 id="results-heading" className="text-2xl font-bold mb-4 text-gray-800">
                Recommendation
            </h2>

            <div className="bg-white rounded-lg p-4 mb-4" role="status" aria-live="polite">
                <div className="text-lg mb-2">
                    <span className="font-semibold">Winner:</span> <span className={`font-bold ${winnerColor}`}>{winnerTicker}</span>
                </div>

                <p className="text-gray-700">
                    The {winnerType} ETF provides a <strong>{difference.toFixed(2)}%</strong> higher effective yield after taxes.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white rounded p-4">
                    <div className="text-sm text-gray-600 mb-1">Tax-Exempt Yield</div>
                    <div className="text-xl font-bold text-blue-600">{taxExemptYield.toFixed(2)}%</div>
                    <div className="text-xs text-gray-500 mt-1">Equivalent to {taxEquivalentYield.toFixed(2)}% taxable yield</div>
                </div>

                <div className="bg-white rounded p-4">
                    <div className="text-sm text-gray-600 mb-1">After-Tax Treasury Yield</div>
                    <div className="text-xl font-bold text-green-600">{afterTaxYield.toFixed(2)}%</div>
                    <div className="text-xs text-gray-500 mt-1">From {taxableYield.toFixed(2)}% pre-tax yield</div>
                </div>
            </div>
        </section>
    );
});

ResultsPanel.displayName = 'ResultsPanel';
