import React from 'react';
import { parseExposureKey } from '../../utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock, Eye, EyeOff, Trash2, BarChart, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const PortfolioTable = ({
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
    return (
        <div className="rounded-md border border-border overflow-hidden">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead
                                className={cn('font-medium', {
                                    'w-[15%]': !showDetailColumns,
                                })}
                            >
                                Ticker
                            </TableHead>
                            {showDetailColumns && (
                                <>
                                    <TableHead className="font-medium">Constituents</TableHead>
                                    <TableHead className="font-medium">Leverage</TableHead>
                                    <TableHead className="font-medium">Leverage Type</TableHead>
                                </>
                            )}
                            <TableHead
                                className={cn('font-medium', {
                                    'w-[70%]': !showDetailColumns,
                                })}
                            >
                                Allocation (%)
                            </TableHead>
                            <TableHead className="text-right font-medium w-[15%]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.from(customPortfolio.holdings.entries()).map(([ticker, holding], index) => {
                            const etf = etfCatalog.find((e) => e.ticker === ticker);
                            let totalExposure = 0;
                            const constituents = [];

                            if (etf) {
                                for (const [key, amount] of etf.exposures) {
                                    totalExposure += amount;

                                    // Parse the exposure key to create a readable constituent description
                                    const { assetClass, marketRegion, factorStyle, sizeFactor } = parseExposureKey(key);
                                    let description = assetClass;

                                    if (marketRegion || factorStyle || sizeFactor) {
                                        const details = [];
                                        if (sizeFactor) details.push(sizeFactor);
                                        if (factorStyle) details.push(factorStyle);
                                        if (marketRegion) details.push(marketRegion);
                                        description += ` (${details.join(' ')})`;
                                    }

                                    constituents.push(`${description}: ${(amount * 100).toFixed(1)}%`);
                                }
                            }

                            const isLeveraged = totalExposure > 1;
                            const { percentage, locked, disabled } = holding;

                            // Badge variants based on leverage type
                            const leverageBadgeVariant =
                                etf?.leverageType === 'Stacked'
                                    ? 'blue'
                                    : etf?.leverageType === 'Daily Reset'
                                    ? 'yellow'
                                    : 'secondary';

                            return (
                                <TableRow
                                    key={index}
                                    className={cn(disabled && 'opacity-60', 'hover:bg-muted/40 transition-colors')}
                                >
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-1.5">
                                            <span className={cn(disabled && 'text-muted-foreground')}>{ticker}</span>
                                            {!showDetailColumns && (
                                                <>
                                                    {totalExposure > 1 && (
                                                        <Badge variant="destructive" className="ml-1 text-xs">
                                                            {totalExposure.toFixed(1)}x
                                                        </Badge>
                                                    )}
                                                    {etf.leverageType !== 'None' && (
                                                        <Badge
                                                            variant={
                                                                etf.leverageType === 'Stacked'
                                                                    ? 'blue'
                                                                    : etf.leverageType === 'Daily Reset'
                                                                    ? 'warning'
                                                                    : 'default'
                                                            }
                                                            className="text-xs"
                                                        >
                                                            {etf.leverageType.charAt(0)}
                                                        </Badge>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                    {showDetailColumns && (
                                        <>
                                            <TableCell className="text-sm text-muted-foreground">
                                                <div className="max-w-md">
                                                    {constituents.map((constituent, i) => (
                                                        <div key={i} className="text-xs mb-1">
                                                            {constituent}
                                                        </div>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-right text-muted-foreground">
                                                {totalExposure.toFixed(1)}x
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        etf.leverageType === 'None'
                                                            ? 'outline'
                                                            : etf.leverageType === 'Stacked'
                                                            ? 'blue'
                                                            : etf.leverageType === 'Daily Reset'
                                                            ? 'warning'
                                                            : 'secondary'
                                                    }
                                                    className="text-xs"
                                                >
                                                    {etf.leverageType === 'None' ? 'Unlevered' : etf.leverageType}
                                                </Badge>
                                            </TableCell>
                                        </>
                                    )}
                                    <TableCell>
                                        <div className="flex items-center gap-3 w-full">
                                            {!showDetailColumns && (
                                                <Slider
                                                    value={[percentage]}
                                                    min={0}
                                                    max={100}
                                                    step={0.1}
                                                    onValueChange={(values) => onUpdateAllocation(ticker, values[0])}
                                                    disabled={locked || disabled}
                                                    className={cn('flex-grow', disabled || (locked && 'opacity-50'))}
                                                />
                                            )}
                                            <div className="flex-shrink-0 flex items-center gap-1">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="0.1"
                                                    value={
                                                        tempInputs[ticker] !== undefined
                                                            ? tempInputs[ticker]
                                                            : percentage.toFixed(1)
                                                    }
                                                    onChange={(e) => onInputChange(ticker, e.target.value)}
                                                    onBlur={() => onInputBlur(ticker)}
                                                    disabled={locked || disabled}
                                                    className="w-19 h-8 text-sm text-center"
                                                />
                                                <span className="text-muted-foreground ml-0.5">%</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex gap-1 justify-end">
                                            <Button
                                                onClick={() => onToggleLock(ticker)}
                                                variant="ghost"
                                                size="icon"
                                                className={cn(
                                                    'h-7 w-7',
                                                    locked && 'text-amber-500',
                                                    disabled && 'opacity-50 cursor-not-allowed'
                                                )}
                                                title={locked ? 'Unlock' : 'Lock'}
                                                disabled={disabled}
                                            >
                                                {locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                                            </Button>
                                            <Button
                                                onClick={() => onToggleDisable(ticker)}
                                                variant="ghost"
                                                size="icon"
                                                className={cn('h-7 w-7', disabled && 'text-destructive')}
                                                title={disabled ? 'Enable' : 'Disable'}
                                            >
                                                {disabled ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </Button>
                                            <Button
                                                onClick={() => onRemoveETF(ticker)}
                                                variant="ghost"
                                                size="icon"
                                                className={cn(
                                                    'h-7 w-7 hover:text-destructive',
                                                    customPortfolio.holdings.size <= 1 &&
                                                        'opacity-50 cursor-not-allowed'
                                                )}
                                                title="Delete"
                                                disabled={customPortfolio.holdings.size <= 1}
                                            >
                                                <Trash2 className="h-4 w-4" />
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
            </div>
        </div>
    );
};

export default PortfolioTable;
