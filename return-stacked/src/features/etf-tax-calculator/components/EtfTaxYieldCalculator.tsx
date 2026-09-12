/**
 * ETF Tax Yield Calculator - Redesigned Comparison View
 * Helps investors visualize whether municipal bonds or treasury bonds are better given their tax scenario
 */
import React, { useState, useCallback, useMemo } from 'react';
import { Calculator, Building, Landmark, ChevronDown, ChevronUp, Info, Trophy, Target, BarChart3 } from 'lucide-react';
import { TAX_EXEMPT_MUNI_ETFS, TAXABLE_TREASURY_ETFS, DURATION_LABELS, type BondETF } from '../constants/EtfData';
import { findTaxBracket } from '../constants/TaxBrackets';
import type { Duration } from '../types/EtfCalculator';
import { Disclaimer } from './Disclaimer';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Label } from '@/shared/components/ui/Label';
import { Badge } from '@/shared/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/Table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/Select';

interface ETFWithYield extends BondETF {
    currentYield: number;
    afterTaxYield: number;
    taxEquivalentYield: number;
}

const ETFTaxYieldCalculator: React.FC = () => {
    // State management
    const [selectedDuration, setSelectedDuration] = useState<Duration>('any');
    const [customTaxRate, setCustomTaxRate] = useState(24);
    const [income, setIncome] = useState('');
    const [filingStatus, setFilingStatus] = useState<'single' | 'married'>('single');
    const [showAllETFs, setShowAllETFs] = useState(false);
    const [selectedMuniTicker, setSelectedMuniTicker] = useState<string>('');
    const [selectedTreasuryTicker, setSelectedTreasuryTicker] = useState<string>('');

    // Calculate tax rate from income and update customTaxRate when income changes
    const calculatedTaxRate = useMemo(() => {
        if (income) {
            const incomeNum = parseFloat(income);
            if (!isNaN(incomeNum)) {
                const bracket = findTaxBracket(incomeNum, filingStatus);
                return bracket?.rate ?? null;
            }
        }
        return null;
    }, [income, filingStatus]);

    // Update customTaxRate when income calculation changes
    React.useEffect(() => {
        if (calculatedTaxRate !== null) {
            setCustomTaxRate(calculatedTaxRate);
        }
    }, [calculatedTaxRate]);

    // The effective tax rate is always the customTaxRate
    const effectiveTaxRate = customTaxRate;

    // Process ETF data with calculations
    const processedData = useMemo(() => {
        const taxRateDecimal = effectiveTaxRate / 100;
        const matchesDuration = (etf: BondETF): boolean =>
            !selectedDuration || selectedDuration === 'any' || etf.duration === selectedDuration;

        const munis: ETFWithYield[] = TAX_EXEMPT_MUNI_ETFS.filter(matchesDuration)
            .map((etf) => ({
                ...etf,
                currentYield: etf.yield,
                afterTaxYield: etf.yield, // Tax-exempt
                taxEquivalentYield: etf.yield / (1 - taxRateDecimal),
            }))
            .sort((a, b) => b.afterTaxYield - a.afterTaxYield);

        const treasuries: ETFWithYield[] = TAXABLE_TREASURY_ETFS.filter(matchesDuration)
            .map((etf) => ({
                ...etf,
                currentYield: etf.yield,
                afterTaxYield: etf.yield * (1 - taxRateDecimal),
                taxEquivalentYield: etf.yield,
            }))
            .sort((a, b) => b.afterTaxYield - a.afterTaxYield);

        return { munis, treasuries };
    }, [effectiveTaxRate, selectedDuration]);

    // Get selected or best ETFs for comparison
    const comparison = useMemo(() => {
        const bestMuni = processedData.munis[0];
        const bestTreasury = processedData.treasuries[0];

        const selectedMuni = selectedMuniTicker
            ? processedData.munis.find((e) => e.ticker === selectedMuniTicker) || bestMuni
            : bestMuni;

        const selectedTreasury = selectedTreasuryTicker
            ? processedData.treasuries.find((e) => e.ticker === selectedTreasuryTicker) || bestTreasury
            : bestTreasury;

        if (!selectedMuni || !selectedTreasury) {
            return null;
        }

        const yieldDifference = selectedMuni.afterTaxYield - selectedTreasury.afterTaxYield;
        const muniWins = yieldDifference > 0;

        // Calculate breakeven tax rate: rate where after-tax yields are equal
        // Muni yield = Treasury yield * (1 - breakeven rate)
        // breakeven rate = 1 - (Muni yield / Treasury yield)
        const breakevenRate =
            selectedTreasury.currentYield > 0
                ? (1 - selectedMuni.currentYield / selectedTreasury.currentYield) * 100
                : 0;

        return {
            muni: selectedMuni,
            treasury: selectedTreasury,
            yieldDifference,
            muniWins,
            breakevenRate,
        };
    }, [processedData, selectedMuniTicker, selectedTreasuryTicker]);

    // Event handlers
    const handleTaxRateChange = useCallback((rate: number) => setCustomTaxRate(rate), []);
    const handleIncomeChange = useCallback((newIncome: string) => setIncome(newIncome), []);
    const handleDurationChange = useCallback((duration: Duration) => {
        setSelectedDuration(duration);
        setSelectedMuniTicker('');
        setSelectedTreasuryTicker('');
    }, []);

    return (
        <div className="container mx-auto px-6 py-6">
            <div className="mx-auto max-w-7xl space-y-6">
                {/* Header */}
                <header className="flex items-center gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                        <Calculator className="h-6 w-6" />
                    </span>
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                            Municipal vs Treasury Bonds
                        </h1>
                        <p className="mt-1 text-muted-foreground">Which is better for your tax situation?</p>
                    </div>
                </header>

                <main className="space-y-6">
                    {/* Configuration Panel */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Your Tax Scenario</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                {/* Option 1: Calculate from Income (Optional) */}
                                <div className="rounded-lg border p-4">
                                    <div className="mb-3 font-semibold">Calculate from my income (optional)</div>

                                    {/* Filing Status Toggle */}
                                    <div className="mb-3 flex gap-2">
                                        <Button
                                            type="button"
                                            variant={filingStatus === 'single' ? 'default' : 'secondary'}
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => setFilingStatus('single')}
                                        >
                                            Single
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={filingStatus === 'married' ? 'default' : 'secondary'}
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => setFilingStatus('married')}
                                        >
                                            Married
                                        </Button>
                                    </div>

                                    <div className="relative">
                                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                            $
                                        </span>
                                        <Input
                                            type="number"
                                            value={income}
                                            onChange={(e) => handleIncomeChange(e.target.value)}
                                            className="pl-7"
                                            placeholder="200,000"
                                            aria-label="Annual taxable income"
                                        />
                                    </div>
                                    <div className="mt-1.5 text-xs text-muted-foreground">
                                        Annual taxable income (
                                        {filingStatus === 'married' ? 'married filing jointly' : 'single filer'})
                                    </div>
                                </div>

                                {/* Option 2: Your Tax Rate */}
                                <div className="rounded-lg border p-4">
                                    <div className="mb-3 font-semibold">
                                        Your tax rate
                                        {income && calculatedTaxRate !== null && (
                                            <Badge variant="secondary" className="ml-2 font-normal">
                                                auto-filled
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            value={customTaxRate}
                                            onChange={(e) => handleTaxRateChange(parseFloat(e.target.value) || 0)}
                                            min="0"
                                            max="100"
                                            step="1"
                                            className="pr-10"
                                            placeholder="24"
                                            aria-label="Federal marginal tax rate"
                                        />
                                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                            %
                                        </span>
                                    </div>
                                    <div className="mt-1.5 text-xs text-muted-foreground">
                                        Federal marginal tax rate
                                    </div>
                                </div>
                            </div>

                            {/* Duration Filter */}
                            <div>
                                <Label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Filter by Duration
                                </Label>
                                <div className="flex flex-wrap gap-2">
                                    {(Object.keys(DURATION_LABELS) as Duration[]).map((duration) => (
                                        <Button
                                            key={duration}
                                            variant={selectedDuration === duration ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => handleDurationChange(duration)}
                                        >
                                            {DURATION_LABELS[duration]}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* All ETFs Table - Expandable */}
                    <Card className="overflow-hidden py-0">
                        <Button
                            variant="ghost"
                            onClick={() => setShowAllETFs(!showAllETFs)}
                            className="h-auto w-full justify-between rounded-none px-6 py-4"
                        >
                            <span className="flex items-center gap-3">
                                <BarChart3 className="h-5 w-5 text-muted-foreground" />
                                <span className="text-base font-semibold">Matching ETFs</span>
                                <span className="text-sm font-normal text-muted-foreground">
                                    ({processedData.munis.length + processedData.treasuries.length} ETFs)
                                </span>
                            </span>
                            {showAllETFs ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </Button>

                        {showAllETFs && (
                            <div className="border-t">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Ticker</TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Duration</TableHead>
                                            <TableHead className="text-right">Current Yield</TableHead>
                                            <TableHead className="text-right">After-Tax Yield</TableHead>
                                            <TableHead className="text-right">Expense</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {[...processedData.munis, ...processedData.treasuries]
                                            .sort((a, b) => b.afterTaxYield - a.afterTaxYield)
                                            .map((etf, idx) => {
                                                const isMuni = processedData.munis.includes(etf);
                                                return (
                                                    <TableRow
                                                        key={etf.ticker}
                                                        className={idx === 0 ? 'bg-primary/5' : undefined}
                                                    >
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                {isMuni ? (
                                                                    <Building className="h-4 w-4 text-muted-foreground" />
                                                                ) : (
                                                                    <Landmark className="h-4 w-4 text-muted-foreground" />
                                                                )}
                                                                <span>{isMuni ? 'Muni' : 'Treasury'}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono font-semibold">
                                                                    {etf.ticker}
                                                                </span>
                                                                {idx === 0 && <Badge>BEST</Badge>}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground">
                                                            {etf.name}
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground">
                                                            {DURATION_LABELS[etf.duration]}
                                                        </TableCell>
                                                        <TableCell className="text-right font-semibold">
                                                            {etf.currentYield.toFixed(2)}%
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold">
                                                            {etf.afterTaxYield.toFixed(2)}%
                                                        </TableCell>
                                                        <TableCell className="text-right text-muted-foreground">
                                                            {etf.expenseRatio.toFixed(2)}%
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </Card>

                    {comparison && (
                        <>
                            {/* Recommendation Hero */}
                            <Card className="border-primary/40 bg-primary/5">
                                <CardContent className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                                            <Trophy className="h-6 w-6" />
                                        </span>
                                        <div>
                                            <h2 className="text-xl font-semibold tracking-tight">
                                                Recommendation for Your Tax Bracket
                                            </h2>
                                            <p className="mt-1 text-muted-foreground">
                                                At a {effectiveTaxRate}% tax rate,{' '}
                                                <Badge className="mx-1 align-middle uppercase">
                                                    {comparison.muniWins ? 'municipal' : 'treasury'} bonds
                                                </Badge>{' '}
                                                are the better choice
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="rounded-xl border bg-card p-5">
                                            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                                                {comparison.muniWins ? (
                                                    <Trophy className="h-5 w-5 text-primary" />
                                                ) : (
                                                    <Building className="h-5 w-5" />
                                                )}
                                                <span className="font-medium">Municipal Bond ETF</span>
                                            </div>
                                            <div
                                                className={`text-3xl font-bold ${comparison.muniWins ? 'text-primary' : ''}`}
                                            >
                                                {comparison.muni.afterTaxYield.toFixed(2)}%
                                            </div>
                                            <div className="mt-1 text-sm text-muted-foreground">
                                                {comparison.muni.ticker} - {comparison.muni.name}
                                            </div>
                                        </div>

                                        <div className="rounded-xl border bg-card p-5">
                                            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                                                {!comparison.muniWins ? (
                                                    <Trophy className="h-5 w-5 text-primary" />
                                                ) : (
                                                    <Landmark className="h-5 w-5" />
                                                )}
                                                <span className="font-medium">Treasury Bond ETF</span>
                                            </div>
                                            <div
                                                className={`text-3xl font-bold ${!comparison.muniWins ? 'text-primary' : ''}`}
                                            >
                                                {comparison.treasury.afterTaxYield.toFixed(2)}%
                                            </div>
                                            <div className="mt-1 text-sm text-muted-foreground">
                                                {comparison.treasury.ticker} - {comparison.treasury.name}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-6">
                                        <div>
                                            <div className="mb-1 text-sm text-muted-foreground">Yield Advantage</div>
                                            <div className="text-2xl font-bold">
                                                {Math.abs(comparison.yieldDifference).toFixed(2)}%{' '}
                                                {comparison.muniWins ? 'higher' : 'lower'}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="mb-1 text-sm text-muted-foreground">Breakeven Tax Rate</div>
                                            <div className="text-2xl font-bold">
                                                {comparison.breakevenRate.toFixed(1)}%
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Detailed Comparison Cards */}
                            <div className="grid gap-6 lg:grid-cols-2">
                                {/* Municipal Bond Card */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-3">
                                            <Building className="h-6 w-6 text-muted-foreground" />
                                            Municipal Bond
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {/* ETF Selector */}
                                        <Select
                                            value={selectedMuniTicker || processedData.munis[0]?.ticker || ''}
                                            onValueChange={setSelectedMuniTicker}
                                        >
                                            <SelectTrigger aria-label="Select municipal bond ETF">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {processedData.munis.map((etf) => (
                                                    <SelectItem key={etf.ticker} value={etf.ticker}>
                                                        {etf.ticker} - {etf.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        {/* ETF Details Badges */}
                                        <div className="flex flex-wrap gap-2 border-b pb-4">
                                            <Badge variant="secondary">
                                                {DURATION_LABELS[comparison.muni.duration]}
                                            </Badge>
                                            <Badge variant="secondary" className="capitalize">
                                                {comparison.muni.managementStyle}
                                            </Badge>
                                            <Badge variant="secondary">
                                                {comparison.muni.expenseRatio.toFixed(2)}% Fee
                                            </Badge>
                                        </div>

                                        {/* Metrics */}
                                        <div className="space-y-4">
                                            <div className="rounded-lg bg-muted/50 p-4">
                                                <div className="mb-1 text-sm text-muted-foreground">
                                                    Current Yield (Tax-Free)
                                                </div>
                                                <div className="text-2xl font-bold">
                                                    {comparison.muni.currentYield.toFixed(2)}%
                                                </div>
                                            </div>

                                            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                                                <div className="mb-1 text-sm text-muted-foreground">
                                                    After-Tax Yield
                                                </div>
                                                <div className="text-3xl font-bold text-primary">
                                                    {comparison.muni.afterTaxYield.toFixed(2)}%
                                                </div>
                                                <div className="mt-1 text-xs text-muted-foreground">
                                                    Same as current (tax-exempt)
                                                </div>
                                            </div>

                                            <div className="rounded-lg bg-muted/50 p-4">
                                                <div className="mb-1 flex items-center gap-1 text-sm text-muted-foreground">
                                                    Tax Equivalent Yield
                                                    <Info className="h-3 w-3" />
                                                </div>
                                                <div className="text-2xl font-bold">
                                                    {comparison.muni.taxEquivalentYield.toFixed(2)}%
                                                </div>
                                                <div className="mt-1 text-xs text-muted-foreground">
                                                    What a taxable bond would need to yield
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Treasury Bond Card */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-3">
                                            <Landmark className="h-6 w-6 text-muted-foreground" />
                                            Treasury Bond
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {/* ETF Selector */}
                                        <Select
                                            value={selectedTreasuryTicker || processedData.treasuries[0]?.ticker || ''}
                                            onValueChange={setSelectedTreasuryTicker}
                                        >
                                            <SelectTrigger aria-label="Select treasury bond ETF">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {processedData.treasuries.map((etf) => (
                                                    <SelectItem key={etf.ticker} value={etf.ticker}>
                                                        {etf.ticker} - {etf.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        {/* ETF Details Badges */}
                                        <div className="flex flex-wrap gap-2 border-b pb-4">
                                            <Badge variant="secondary">
                                                {DURATION_LABELS[comparison.treasury.duration]}
                                            </Badge>
                                            <Badge variant="secondary" className="capitalize">
                                                {comparison.treasury.managementStyle}
                                            </Badge>
                                            <Badge variant="secondary">
                                                {comparison.treasury.expenseRatio.toFixed(2)}% Fee
                                            </Badge>
                                        </div>

                                        {/* Metrics */}
                                        <div className="space-y-4">
                                            <div className="rounded-lg bg-muted/50 p-4">
                                                <div className="mb-1 text-sm text-muted-foreground">
                                                    Current Yield (Taxable)
                                                </div>
                                                <div className="text-2xl font-bold">
                                                    {comparison.treasury.currentYield.toFixed(2)}%
                                                </div>
                                            </div>

                                            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                                                <div className="mb-1 text-sm text-muted-foreground">
                                                    After-Tax Yield
                                                </div>
                                                <div className="text-3xl font-bold text-primary">
                                                    {comparison.treasury.afterTaxYield.toFixed(2)}%
                                                </div>
                                                <div className="mt-1 text-xs text-muted-foreground">
                                                    At {effectiveTaxRate}% federal tax rate
                                                </div>
                                            </div>

                                            <div className="rounded-lg bg-muted/50 p-4">
                                                <div className="mb-1 text-sm text-muted-foreground">Tax Impact</div>
                                                <div className="text-2xl font-bold text-destructive">
                                                    -
                                                    {(
                                                        comparison.treasury.currentYield -
                                                        comparison.treasury.afterTaxYield
                                                    ).toFixed(2)}
                                                    %
                                                </div>
                                                <div className="mt-1 text-xs text-muted-foreground">
                                                    Federal taxes reduce yield
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Breakeven Analysis */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-3">
                                        <Target className="h-5 w-5 text-muted-foreground" />
                                        Tax Bracket Analysis
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="rounded-xl bg-muted/50 p-6">
                                        <p className="mb-4 text-foreground">
                                            The <strong>breakeven tax rate</strong> is{' '}
                                            <strong>{comparison.breakevenRate.toFixed(1)}%</strong>. This is the federal
                                            tax rate where both bonds provide equal after-tax yields.
                                        </p>

                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="rounded-lg border bg-card p-4">
                                                <div className="mb-2 flex items-center gap-2">
                                                    <Building className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-sm font-medium">Municipal Bonds Win</span>
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    When your tax rate is{' '}
                                                    <strong>above {comparison.breakevenRate.toFixed(1)}%</strong>
                                                </p>
                                            </div>

                                            <div className="rounded-lg border bg-card p-4">
                                                <div className="mb-2 flex items-center gap-2">
                                                    <Landmark className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-sm font-medium">Treasury Bonds Win</span>
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    When your tax rate is{' '}
                                                    <strong>below {comparison.breakevenRate.toFixed(1)}%</strong>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-4 flex items-start gap-2 rounded-lg border bg-card p-4">
                                            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                            <p className="text-sm text-foreground">
                                                <strong>Your current rate: {effectiveTaxRate}%</strong> - You are{' '}
                                                {effectiveTaxRate > comparison.breakevenRate
                                                    ? `${(effectiveTaxRate - comparison.breakevenRate).toFixed(1)}% above`
                                                    : `${(comparison.breakevenRate - effectiveTaxRate).toFixed(1)}% below`}{' '}
                                                the breakeven point, making{' '}
                                                {comparison.muniWins ? 'municipal' : 'treasury'} bonds more
                                                advantageous.
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}

                    {/* Disclaimer */}
                    <Disclaimer />
                </main>
            </div>
        </div>
    );
};

export default ETFTaxYieldCalculator;
