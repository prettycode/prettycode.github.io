import React from 'react';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/Card';
import { ChevronDown, ChevronRight, Receipt } from 'lucide-react';
import { cn } from '@/shared/lib/Cn';
import { taxEfficiencyByTicker } from '@/features/portfolio/core/data/catalogs/TaxEfficiencyCatalog';
import type { Portfolio } from '@/features/portfolio/core/domain/Portfolio';

interface TaxRollupCardProps {
    portfolio: Portfolio;
}

interface HoldingTaxRow {
    ticker: string;
    percentage: number;
    score: number | null;
    rationale: string | null;
}

interface TaxRollup {
    rows: HoldingTaxRow[];
    weightedScore: number | null;
    coverageWeight: number;
    activeWeight: number;
    unknownTickers: string[];
}

const computeRollup = (portfolio: Portfolio): TaxRollup => {
    const rows: HoldingTaxRow[] = [];
    const unknownTickers: string[] = [];
    let scoreNumerator = 0;
    let coverageWeight = 0;
    let activeWeight = 0;

    for (const [ticker, holding] of portfolio.holdings) {
        if (holding.disabled || holding.percentage <= 0) {
            continue;
        }

        const percentage = holding.percentage;
        activeWeight += percentage;
        const entry = taxEfficiencyByTicker[ticker];

        if (entry) {
            scoreNumerator += entry.score * percentage;
            coverageWeight += percentage;
            rows.push({ ticker, percentage, score: entry.score, rationale: entry.rationale });
        } else {
            unknownTickers.push(ticker);
            rows.push({ ticker, percentage, score: null, rationale: null });
        }
    }

    const weightedScore = coverageWeight > 0 ? scoreNumerator / coverageWeight : null;

    return { rows, weightedScore, coverageWeight, activeWeight, unknownTickers };
};

const scoreBucket = (score: number): { label: string; tone: 'good' | 'mixed' | 'poor' } => {
    if (score >= 8) {
        return { label: 'Efficient', tone: 'good' };
    }
    if (score >= 6) {
        return { label: 'Moderate', tone: 'mixed' };
    }
    return { label: 'Inefficient', tone: 'poor' };
};

const toneClasses = {
    good: {
        border: 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20',
        text: 'text-green-900 dark:text-green-100',
        chevron: 'text-green-700 dark:text-green-400',
        icon: 'text-green-600 dark:text-green-500',
    },
    mixed: {
        border: 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20',
        text: 'text-amber-900 dark:text-amber-100',
        chevron: 'text-amber-700 dark:text-amber-400',
        icon: 'text-amber-600 dark:text-amber-500',
    },
    poor: {
        border: 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20',
        text: 'text-red-900 dark:text-red-100',
        chevron: 'text-red-700 dark:text-red-400',
        icon: 'text-red-600 dark:text-red-500',
    },
    neutral: {
        border: 'border-border/40',
        text: 'text-foreground',
        chevron: 'text-muted-foreground',
        icon: 'text-muted-foreground',
    },
} as const;

const TaxRollupCard: React.FC<TaxRollupCardProps> = ({ portfolio }) => {
    const [isExpanded, setIsExpanded] = React.useState(false);
    const { rows, weightedScore, coverageWeight, activeWeight, unknownTickers } = computeRollup(portfolio);

    if (activeWeight === 0) {
        return null;
    }

    const bucket = weightedScore !== null ? scoreBucket(weightedScore) : null;
    const tone = bucket ? toneClasses[bucket.tone] : toneClasses.neutral;
    const coveragePct = activeWeight > 0 ? (coverageWeight / activeWeight) * 100 : 0;

    const sortedRows = [...rows].sort((a, b) => {
        const aDrag = a.score !== null ? (10 - a.score) * a.percentage : -1;
        const bDrag = b.score !== null ? (10 - b.score) * b.percentage : -1;
        return bDrag - aDrag;
    });

    return (
        <Card className={cn('overflow-hidden shadow-sm mb-2 py-0 gap-0 border', tone.border)}>
            <CardHeader
                className="cursor-pointer py-3 px-4 flex flex-row items-center justify-between"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center space-x-2">
                    <Receipt className={cn('h-4 w-4', tone.icon)} />
                    <h3 className={cn('font-medium text-sm', tone.text)}>Tax Efficiency</h3>
                    {weightedScore !== null && bucket && (
                        <span className={cn('text-xs font-medium', tone.text)}>
                            {weightedScore.toFixed(1)} / 10 · {bucket.label}
                        </span>
                    )}
                    {weightedScore === null && <span className="text-xs text-muted-foreground">No coverage</span>}
                </div>
                <div className={cn('text-xs flex items-center', tone.chevron)}>
                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </div>
            </CardHeader>

            {isExpanded && (
                <CardContent className="px-4 pt-0 pb-3">
                    <div className={cn('text-xs mb-2', tone.text)}>
                        Weighted average across active holdings (excludes expense ratios). Score ranges 1 (least
                        efficient) to 10 (most efficient). Most relevant in taxable accounts; in IRAs/401(k)s this
                        matters less.
                    </div>

                    {coveragePct < 100 && (
                        <div className="text-xs text-muted-foreground mb-2">
                            Coverage: {coveragePct.toFixed(0)}% of active weight
                            {unknownTickers.length > 0 && <> · No tax data for: {unknownTickers.join(', ')}</>}
                        </div>
                    )}

                    <div className="w-full overflow-hidden">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b">
                                    <th className="px-2 py-2 text-left align-middle font-medium">Ticker</th>
                                    <th className="px-2 py-2 text-right align-middle font-medium">Weight</th>
                                    <th className="px-2 py-2 text-right align-middle font-medium">Score</th>
                                    <th className="px-2 py-2 text-left align-middle font-medium">Rationale</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedRows.map((row) => {
                                    const rowTone =
                                        row.score === null
                                            ? toneClasses.neutral
                                            : toneClasses[scoreBucket(row.score).tone];
                                    return (
                                        <tr key={row.ticker} className="border-b">
                                            <td className={cn('p-2 align-top font-medium', rowTone.text)}>
                                                {row.ticker}
                                            </td>
                                            <td className="p-2 align-top text-right tabular-nums">
                                                {row.percentage.toFixed(1)}%
                                            </td>
                                            <td className={cn('p-2 align-top text-right tabular-nums', rowTone.text)}>
                                                {row.score !== null ? row.score.toFixed(0) : '—'}
                                            </td>
                                            <td className="p-2 align-top text-muted-foreground">
                                                {row.rationale ?? 'No tax-efficiency data on file.'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            )}
        </Card>
    );
};

export default TaxRollupCard;
