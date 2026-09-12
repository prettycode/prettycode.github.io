/**
 * Disclaimer Component
 * Displays important notes and disclaimers
 */
import { memo } from 'react';
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
        <aside
            className="mt-6 flex items-start gap-2 rounded-lg border bg-muted/50 p-4 text-muted-foreground"
            aria-labelledby="disclaimer-heading"
        >
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="text-sm">
                <p id="disclaimer-heading" className="mb-1 font-semibold text-foreground">
                    Important Notes:
                </p>
                <ul className="list-inside list-disc space-y-1">
                    {DISCLAIMER_ITEMS.map((item, index) => (
                        <li key={index}>{item}</li>
                    ))}
                </ul>
            </div>
        </aside>
    );
});

Disclaimer.displayName = 'Disclaimer';
