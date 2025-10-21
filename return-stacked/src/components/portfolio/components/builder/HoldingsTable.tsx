import React from 'react';
import type { Portfolio } from '@/core/domain/Portfolio';
import type { ETF } from '@/core/domain/ETF';
import { parseExposureKey } from '@/core/utils/exposureKeys';
import { weightToPercent } from '@/core/calculators/precision';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock, Eye, EyeOff, Trash2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HoldingsTableProps {
    customPortfolio: Portfolio;
    etfCatalog: ETF[];
    tempInputs: Record<string, number | undefined>;
    showDetailColumns: boolean;
    onUpdateAllocation: (ticker: string, value: number) => void;
    onToggleLock: (ticker: string) => void;
    onToggleDisable: (ticker: string) => void;
    onInputChange: (ticker: string, value: number) => void;
    onInputBlur: (ticker: string) => void;
    onRemoveETF: (ticker: string) => void;
}

const HoldingsTable: React.FC<HoldingsTableProps> = ({
    customPortfolio,
    etfCatalog,
    tempInputs,
    showDetailColumns,
    onUpdateAllocation,
    onToggleLock,
    onToggleDisable,
    onInputChange,
    onInputBlur,
    onRemoveETF,
}) => {
    /**
     * Check if leverage is effectively 1.0x (within floating point tolerance)
     */
    const isEffectivelyOneX = (leverage: number): boolean => {
        const tolerance = 0.001; // 0.1% tolerance for floating point precision
        return Math.abs(leverage - 1.0) < tolerance;
    };

    return (
        <Table>
            <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                    <TableHead
                        className={cn('font-medium text-xs h-8 px-3', {
                            'w-[8%]': !showDetailColumns,
                        })}
                    >
                        {!showDetailColumns ? 'Ticker' : 'Ticker'}
                    </TableHead>
                    {showDetailColumns && (
                        <>
                            <TableHead className="font-medium text-xs h-8">Constituents</TableHead>
                            <TableHead className="font-medium text-xs h-8">Leverage</TableHead>
                            <TableHead className="font-medium text-xs h-8">Leverage Type</TableHead>
                        </>
                    )}
                    <TableHead
                        className={cn('font-medium text-xs h-8', {
                            'w-[80%]': !showDetailColumns,
                        })}
                    >
                        Allocation
                    </TableHead>
                    <TableHead
                        className={cn('text-right font-medium text-xs h-8 px-2', {
                            'w-[12%]': !showDetailColumns,
                        })}
                    >
                        {/* Actions column - no label */}
                    </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {Array.from(customPortfolio.holdings.entries()).map(([ticker, holding], index) => {
                    const etf = etfCatalog.find((e) => e.ticker === ticker);
                    let totalExposure = 0;
                    const constituents: string[] = [];

                    if (etf) {
                        for (const [key, amount] of etf.exposures) {
                            totalExposure += amount;

                            // Parse the exposure key to create a readable constituent description
                            const { assetClass, marketRegion, factorStyle, sizeFactor } = parseExposureKey(key);
                            let description = assetClass;

                            if (marketRegion || factorStyle || sizeFactor) {
                                const details: string[] = [];
                                if (sizeFactor) {
                                    details.push(sizeFactor);
                                }
                                if (factorStyle) {
                                    details.push(factorStyle);
                                }
                                if (marketRegion) {
                                    details.push(marketRegion);
                                }
                                description += ` (${details.join(' ')})`;
                            }

                            constituents.push(`${description}: ${weightToPercent(amount).toFixed(1)}%`);
                        }
                    }

                    const { percentage, locked, disabled } = holding;

                    return (
                        <TableRow
                            key={index}
                            className={cn(
                                'border-t border-border/30 transition-colors',
                                disabled && 'opacity-60',
                                disabled ? 'hover:bg-muted/20' : 'hover:bg-accent/20'
                            )}
                        >
                            <TableCell className="font-medium py-1.5 px-3">
                                {!showDetailColumns ? (
                                    <div className="flex items-center">
                                        <span className={cn(disabled && 'text-muted-foreground')}>{ticker}</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5">
                                        <span className={cn(disabled && 'text-muted-foreground')}>{ticker}</span>
                                    </div>
                                )}
                            </TableCell>
                            {showDetailColumns && (
                                <>
                                    <TableCell className="text-xs text-muted-foreground py-1.5">
                                        <div className="max-w-md">
                                            {constituents.map((constituent, i) => (
                                                <div key={i} className="text-xs mb-1">
                                                    {constituent}
                                                </div>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs text-right text-muted-foreground py-1.5">
                                        {isEffectivelyOneX(totalExposure) ? (
                                            <span className="text-xs text-muted-foreground">-</span>
                                        ) : (
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    'text-[10px] px-1.5 py-0 font-medium',
                                                    totalExposure <= 1.2
                                                        ? 'bg-green-100 text-green-800 border-green-200'
                                                        : totalExposure <= 2.2
                                                          ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                                          : 'bg-red-100 text-red-800 border-red-200'
                                                )}
                                            >
                                                {totalExposure.toFixed(1)}x
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="py-1.5">
                                        {etf && (
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    'text-[10px] px-1.5 py-0 font-medium',
                                                    etf.leverageType === 'Stacked'
                                                        ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                                        : etf.leverageType === 'Daily Reset'
                                                          ? 'bg-red-100 text-red-800 border-red-200'
                                                          : 'bg-green-100 text-green-800 border-green-200'
                                                )}
                                            >
                                                {etf.leverageType === 'None' ? 'Unlevered' : etf.leverageType}
                                            </Badge>
                                        )}
                                    </TableCell>
                                </>
                            )}
                            <TableCell className="py-1.5">
                                <div className="flex items-center gap-2 w-full">
                                    {!showDetailColumns && (
                                        <Slider
                                            value={[percentage]}
                                            min={0}
                                            max={100}
                                            step={0.1}
                                            onValueChange={(values) => onUpdateAllocation(ticker, values[0])}
                                            disabled={locked || disabled}
                                            className={cn(
                                                'flex-grow cursor-pointer',
                                                disabled || (locked && 'opacity-50 cursor-not-allowed')
                                            )}
                                        />
                                    )}
                                    <div className="flex-shrink-0 flex items-center">
                                        <div className="relative w-21">
                                            <Input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.1"
                                                value={
                                                    tempInputs[ticker] !== undefined
                                                        ? tempInputs[ticker]
                                                        : Math.max(0, percentage).toFixed(1)
                                                }
                                                onChange={(e) => onInputChange(ticker, parseFloat(e.target.value) || 0)}
                                                onBlur={() => onInputBlur(ticker)}
                                                disabled={locked || disabled}
                                                className="pr-5 h-7 text-xs text-right"
                                            />
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                                %
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="text-right py-1.5 px-2">
                                <div className="flex gap-1 justify-end">
                                    <Button
                                        onClick={() => onToggleLock(ticker)}
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                            'h-6 w-6 text-muted-foreground',
                                            locked && 'text-amber-500',
                                            disabled && 'opacity-50 cursor-not-allowed',
                                            !disabled && 'cursor-pointer hover:text-foreground'
                                        )}
                                        title={locked ? 'Unlock' : 'Lock'}
                                        disabled={disabled}
                                    >
                                        {locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                                    </Button>
                                    <Button
                                        onClick={() => onToggleDisable(ticker)}
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                            'h-6 w-6 text-muted-foreground cursor-pointer',
                                            disabled && 'text-destructive',
                                            !disabled && 'hover:text-foreground'
                                        )}
                                        title={disabled ? 'Enable' : 'Disable'}
                                    >
                                        {disabled ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                    </Button>
                                    <Button
                                        onClick={() => onRemoveETF(ticker)}
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                            'h-6 w-6 text-muted-foreground',
                                            customPortfolio.holdings.size <= 1
                                                ? 'opacity-50 cursor-not-allowed'
                                                : 'cursor-pointer hover:text-destructive'
                                        )}
                                        title="Delete"
                                        disabled={customPortfolio.holdings.size <= 1}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    );
                })}
                {customPortfolio.holdings.size === 0 && (
                    <TableRow>
                        <TableCell colSpan={showDetailColumns ? 6 : 3} className="h-32 text-center">
                            <div className="flex flex-col items-center justify-center text-muted-foreground">
                                <Info className="h-8 w-8 text-muted-foreground/60 mb-2" />
                                <p className="font-medium">No ETFs added yet</p>
                                <p className="text-xs">Add ETFs from the list above or select a template.</p>
                            </div>
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
};

export default HoldingsTable;
