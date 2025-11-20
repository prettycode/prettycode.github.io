/**
 * ETF Card Component
 * Displays a single ETF with selection dropdown and yield information
 */
import React, { memo } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { ETFData } from '../../types/etf-calculator';

interface ETFCardProps {
    title: string;
    icon: LucideIcon;
    bgColor: string;
    titleColor: string;
    accentColor: string;
    selectedETF: string | null;
    yieldValue: number;
    afterTaxYield: number;
    sortedETFs: Array<[string, ETFData & { yield: number }]>;
    lastFetch?: string;
    onETFChange: (ticker: string) => void;
    onYieldChange: (yield_: number) => void;
}

export const ETFCard = memo<ETFCardProps>(
    ({
        title,
        icon: Icon,
        bgColor,
        titleColor,
        accentColor,
        selectedETF,
        yieldValue,
        afterTaxYield,
        sortedETFs,
        lastFetch,
        onETFChange,
        onYieldChange,
    }) => {
        const selectId = `etf-select-${title.replace(/\s+/g, '-').toLowerCase()}`;
        const yieldId = `yield-input-${title.replace(/\s+/g, '-').toLowerCase()}`;

        return (
            <div className={`${bgColor} rounded-lg p-6`}>
                <h2 className={`text-xl font-semibold ${titleColor} mb-4 flex items-center`}>
                    <Icon className="w-5 h-5 mr-2" aria-hidden="true" />
                    {title}
                </h2>

                <div className="mb-4">
                    <label htmlFor={selectId} className="block text-sm font-medium text-gray-700 mb-2">
                        Select ETF
                    </label>
                    <select
                        id={selectId}
                        value={selectedETF || ''}
                        onChange={(e) => onETFChange(e.target.value)}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-${accentColor} focus:border-transparent`}
                        aria-label={`Select ${title}`}
                    >
                        {sortedETFs.length === 0 && <option value="">Loading...</option>}
                        {sortedETFs.map(([ticker, data]) => (
                            <option key={ticker} value={ticker}>
                                {ticker} - {data.name} ({data.yield.toFixed(2)}%)
                            </option>
                        ))}
                    </select>
                </div>

                <div className="mb-4">
                    <label htmlFor={yieldId} className="block text-sm font-medium text-gray-700 mb-2">
                        Pre-Tax Yield (%)
                    </label>
                    <input
                        id={yieldId}
                        type="number"
                        value={yieldValue}
                        onChange={(e) => onYieldChange(parseFloat(e.target.value) || 0)}
                        step="0.1"
                        min="0"
                        max="100"
                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-${accentColor} focus:border-transparent`}
                        aria-label={`${title} pre-tax yield percentage`}
                    />
                    {lastFetch && (
                        <div className="text-xs text-gray-500 mt-1" role="status">
                            Updated: {lastFetch}
                        </div>
                    )}
                </div>

                <div className="bg-white rounded p-3">
                    <div className="text-sm text-gray-600">After-Tax Yield</div>
                    <div className={`text-2xl font-bold text-${accentColor}`} aria-live="polite">
                        {afterTaxYield.toFixed(2)}%
                    </div>
                </div>
            </div>
        );
    }
);

ETFCard.displayName = 'ETFCard';
