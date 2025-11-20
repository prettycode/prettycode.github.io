/**
 * Disclaimer Component
 * Displays important notes and disclaimers
 */
import React, { memo } from 'react';
import { Info } from 'lucide-react';

const DISCLAIMER_ITEMS = [
    'This calculator considers only federal taxes. State and local taxes may apply.',
    'Municipal bond income may be subject to AMT (Alternative Minimum Tax).',
    'Bond ETF yields can vary based on market conditions and distribution schedules.',
    'Consider other factors like credit risk, duration, and liquidity when choosing investments.',
    'This tool is for informational purposes only and does not constitute financial advice.',
] as const;

export const Disclaimer = memo(() => {
    return (
        <aside className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200" aria-labelledby="disclaimer-heading">
            <div className="flex items-start">
                <Info className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <div className="text-sm text-gray-700">
                    <p id="disclaimer-heading" className="font-semibold mb-1">
                        Important Notes:
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                        {DISCLAIMER_ITEMS.map((item, index) => (
                            <li key={index}>{item}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </aside>
    );
});

Disclaimer.displayName = 'Disclaimer';
