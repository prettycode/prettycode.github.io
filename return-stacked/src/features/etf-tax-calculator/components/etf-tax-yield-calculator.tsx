/**
 * ETF Tax Yield Calculator - Redesigned Comparison View
 * Helps investors visualize whether municipal bonds or treasury bonds are better given their tax scenario
 */
import React, { useState, useCallback, useMemo } from 'react';
import { Calculator, Building, Landmark, ChevronDown, ChevronUp, Info, Trophy, Target, BarChart3 } from 'lucide-react';
import { TAX_EXEMPT_MUNI_ETFS, TAXABLE_TREASURY_ETFS, DURATION_LABELS, type BondETF } from '../constants/etf-data';
import { findTaxBracket } from '../constants/tax-brackets';
import { useETFData } from '../hooks/useETFData';
import type { Duration } from '../types/etf-calculator';
import { LoadingState, ErrorAlert, Disclaimer } from './index';

interface ETFWithYield extends BondETF {
    name: string;
    expenseRatio: number;
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

    // Fetch ETF data
    const { etfDataMap, loading, error } = useETFData();

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

        const munis: ETFWithYield[] = TAX_EXEMPT_MUNI_ETFS.filter((etf) => {
            if (!etfDataMap[etf.ticker]) {
                return false;
            }
            if (selectedDuration && selectedDuration !== 'any' && etf.duration !== selectedDuration) {
                return false;
            }
            return true;
        })
            .map((etf) => {
                const apiData = etfDataMap[etf.ticker]!;
                const currentYield = apiData.yield ?? 0;
                return {
                    ...etf,
                    name: apiData.name ?? 'Unknown',
                    expenseRatio: apiData.expenseRatio ?? 0,
                    currentYield,
                    afterTaxYield: currentYield, // Tax-exempt
                    taxEquivalentYield: currentYield / (1 - taxRateDecimal),
                };
            })
            .sort((a, b) => b.afterTaxYield - a.afterTaxYield);

        const treasuries: ETFWithYield[] = TAXABLE_TREASURY_ETFS.filter((etf) => {
            if (!etfDataMap[etf.ticker]) {
                return false;
            }
            if (selectedDuration && selectedDuration !== 'any' && etf.duration !== selectedDuration) {
                return false;
            }
            return true;
        })
            .map((etf) => {
                const apiData = etfDataMap[etf.ticker]!;
                const currentYield = apiData.yield ?? 0;
                return {
                    ...etf,
                    name: apiData.name ?? 'Unknown',
                    expenseRatio: apiData.expenseRatio ?? 0,
                    currentYield,
                    afterTaxYield: currentYield * (1 - taxRateDecimal),
                    taxEquivalentYield: currentYield,
                };
            })
            .sort((a, b) => b.afterTaxYield - a.afterTaxYield);

        return { munis, treasuries };
    }, [etfDataMap, effectiveTaxRate, selectedDuration]);

    // Get selected or best ETFs for comparison
    const comparison = useMemo(() => {
        const bestMuni = processedData.munis[0];
        const bestTreasury = processedData.treasuries[0];

        const selectedMuni = selectedMuniTicker ? processedData.munis.find((e) => e.ticker === selectedMuniTicker) || bestMuni : bestMuni;

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
        const breakevenRate = selectedTreasury.currentYield > 0 ? (1 - selectedMuni.currentYield / selectedTreasury.currentYield) * 100 : 0;

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

    if (loading) {
        return <LoadingState />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <header className="mb-6">
                    <div className="flex items-center gap-4 mb-3">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                            <Calculator className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                                Municipal vs Treasury Bonds
                            </h1>
                            <p className="text-slate-600 mt-1">Which is better for your tax situation?</p>
                        </div>
                    </div>
                </header>

                <main className="space-y-6">
                    {error && <ErrorAlert message={error} />}

                    {/* Configuration Panel - Redesigned */}
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                        {/* Tax Configuration Section */}
                        <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-6 border-b border-slate-200">
                            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <span className="text-blue-600">💸</span>
                                Your Tax Scenario
                            </h2>

                            <div className="grid md:grid-cols-2 gap-4">
                                {/* Option 1: Calculate from Income (Optional) */}
                                <div className="border-2 rounded-lg p-4 bg-white border-slate-200">
                                    <div className="font-semibold text-slate-900 mb-3">Calculate from my income (optional)</div>

                                    {/* Filing Status Toggle */}
                                    <div className="flex gap-2 mb-3">
                                        <button
                                            type="button"
                                            onClick={() => setFilingStatus('single')}
                                            className={`flex-1 px-3 py-1.5 rounded text-sm font-medium transition-all ${
                                                filingStatus === 'single'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                            }`}
                                        >
                                            Single
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFilingStatus('married')}
                                            className={`flex-1 px-3 py-1.5 rounded text-sm font-medium transition-all ${
                                                filingStatus === 'married'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                            }`}
                                        >
                                            Married
                                        </button>
                                    </div>

                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
                                        <input
                                            type="number"
                                            value={income}
                                            onChange={(e) => handleIncomeChange(e.target.value)}
                                            className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold"
                                            placeholder="200,000"
                                        />
                                    </div>
                                    <div className="text-xs text-slate-600 mt-1.5">
                                        Annual taxable income ({filingStatus === 'married' ? 'married filing jointly' : 'single filer'})
                                    </div>
                                </div>

                                {/* Option 2: Your Tax Rate */}
                                <div className="border-2 rounded-lg p-4 bg-white border-slate-200">
                                    <div className="font-semibold text-slate-900 mb-3">
                                        Your tax rate
                                        {income && calculatedTaxRate !== null && (
                                            <span className="ml-2 text-sm font-normal text-green-600">(auto-filled)</span>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={customTaxRate}
                                            onChange={(e) => handleTaxRateChange(parseFloat(e.target.value) || 0)}
                                            min="0"
                                            max="100"
                                            step="1"
                                            className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold"
                                            placeholder="24"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">%</span>
                                    </div>
                                    <div className="text-xs text-slate-600 mt-1.5">Federal marginal tax rate</div>
                                </div>
                            </div>
                        </div>

                        {/* Duration Filter Section */}
                        <div className="p-6">
                            <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Filter by Duration</h3>
                            <div className="flex flex-wrap gap-2">
                                {(Object.keys(DURATION_LABELS) as Duration[]).map((duration) => (
                                    <button
                                        key={duration}
                                        onClick={() => handleDurationChange(duration)}
                                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                                            selectedDuration === duration
                                                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                                        }`}
                                    >
                                        {DURATION_LABELS[duration]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    {/* All ETFs Table - Expandable */}
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                        <button
                            onClick={() => setShowAllETFs(!showAllETFs)}
                            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <BarChart3 className="w-5 h-5 text-slate-600" />
                                <h3 className="text-lg font-bold text-slate-800">Matching ETFs</h3>
                                <span className="text-sm text-slate-500">
                                    ({processedData.munis.length + processedData.treasuries.length} ETFs)
                                </span>
                            </div>
                            {showAllETFs ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>

                        {showAllETFs && (
                            <div className="border-t border-slate-200">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Type</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                                                    Ticker
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Name</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                                                    Duration
                                                </th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">
                                                    Current Yield
                                                </th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">
                                                    After-Tax Yield
                                                </th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">
                                                    Expense
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {[...processedData.munis, ...processedData.treasuries]
                                                .sort((a, b) => b.afterTaxYield - a.afterTaxYield)
                                                .map((etf, idx) => {
                                                    const isMuni = processedData.munis.includes(etf);
                                                    return (
                                                        <tr key={etf.ticker} className={idx === 0 ? 'bg-emerald-50' : 'hover:bg-slate-50'}>
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-2">
                                                                    {isMuni ? (
                                                                        <Building className="w-4 h-4 text-blue-600" />
                                                                    ) : (
                                                                        <Landmark className="w-4 h-4 text-emerald-600" />
                                                                    )}
                                                                    <span className="text-sm">{isMuni ? 'Muni' : 'Treasury'}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-mono font-semibold text-sm">{etf.ticker}</span>
                                                                    {idx === 0 && (
                                                                        <span className="px-1.5 py-0.5 bg-emerald-500 text-white text-xs font-bold rounded">
                                                                            BEST
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-slate-700">{etf.name}</td>
                                                            <td className="px-4 py-3 text-sm text-slate-600">
                                                                {DURATION_LABELS[etf.duration]}
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-semibold text-sm">
                                                                {etf.currentYield.toFixed(2)}%
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-bold text-sm">
                                                                {etf.afterTaxYield.toFixed(2)}%
                                                            </td>
                                                            <td className="px-4 py-3 text-right text-sm text-slate-600">
                                                                {etf.expenseRatio.toFixed(2)}%
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>

                    {comparison && (
                        <>
                            {/* Recommendation Hero */}
                            <div
                                className={`bg-gradient-to-br ${comparison.muniWins ? 'from-blue-500 to-indigo-600' : 'from-emerald-500 to-teal-600'} rounded-2xl shadow-2xl p-8 text-white`}
                            >
                                <div className="flex items-start gap-4 mb-6">
                                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                        <Trophy className="w-8 h-8" />
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="text-2xl font-bold mb-2">Recommendation for Your Tax Bracket</h2>
                                        <p className="text-white/90 text-lg">
                                            At a {effectiveTaxRate}% tax rate,{' '}
                                            <strong className="px-3 py-1 border-2 border-white/40 rounded-lg bg-white/10 inline-block text-white font-bold tracking-wide uppercase">
                                                {comparison.muniWins ? 'municipal' : 'treasury'} bonds
                                            </strong>{' '}
                                            are the better choice
                                        </p>
                                    </div>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20">
                                        <div className="flex items-center gap-2 mb-2">
                                            {comparison.muniWins ? (
                                                <Trophy className="w-5 h-5 text-yellow-300" />
                                            ) : (
                                                <Building className="w-5 h-5" />
                                            )}
                                            <span className="text-sm font-medium opacity-90">Municipal Bond ETF</span>
                                        </div>
                                        <div className="text-3xl font-bold mb-1">{comparison.muni.afterTaxYield.toFixed(2)}%</div>
                                        <div className="text-sm opacity-80">
                                            {comparison.muni.ticker} - {comparison.muni.name}
                                        </div>
                                    </div>

                                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20">
                                        <div className="flex items-center gap-2 mb-2">
                                            {!comparison.muniWins ? (
                                                <Trophy className="w-5 h-5 text-yellow-300" />
                                            ) : (
                                                <Landmark className="w-5 h-5" />
                                            )}
                                            <span className="text-sm font-medium opacity-90">Treasury Bond ETF</span>
                                        </div>
                                        <div className="text-3xl font-bold mb-1">{comparison.treasury.afterTaxYield.toFixed(2)}%</div>
                                        <div className="text-sm opacity-80">
                                            {comparison.treasury.ticker} - {comparison.treasury.name}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 pt-6 border-t border-white/20">
                                    <div className="flex items-center justify-between flex-wrap gap-4">
                                        <div>
                                            <div className="text-sm opacity-80 mb-1">Yield Advantage</div>
                                            <div className="text-2xl font-bold">
                                                {Math.abs(comparison.yieldDifference).toFixed(2)}%{' '}
                                                {comparison.muniWins ? 'higher' : 'lower'}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-sm opacity-80 mb-1">Breakeven Tax Rate</div>
                                            <div className="text-2xl font-bold">{comparison.breakevenRate.toFixed(1)}%</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Detailed Comparison Cards */}
                            <div className="grid lg:grid-cols-2 gap-6">
                                {/* Municipal Bond Card */}
                                <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-200 overflow-hidden">
                                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
                                        <div className="flex items-center gap-3 text-white">
                                            <Building className="w-6 h-6" />
                                            <h3 className="text-xl font-bold">Municipal Bond</h3>
                                        </div>
                                    </div>

                                    <div className="p-6">
                                        {/* ETF Selector */}
                                        <div className="mb-3">
                                            <select
                                                value={selectedMuniTicker || processedData.munis[0]?.ticker || ''}
                                                onChange={(e) => setSelectedMuniTicker(e.target.value)}
                                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            >
                                                {processedData.munis.map((etf) => (
                                                    <option key={etf.ticker} value={etf.ticker}>
                                                        {etf.ticker} - {etf.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* ETF Details Badges */}
                                        <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-slate-200">
                                            <span className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                                {DURATION_LABELS[comparison.muni.duration]}
                                            </span>
                                            <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-sm font-medium capitalize">
                                                {comparison.muni.managementStyle}
                                            </span>
                                            <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-sm font-medium">
                                                {comparison.muni.expenseRatio.toFixed(2)}% Fee
                                            </span>
                                        </div>

                                        {/* Metrics */}
                                        <div className="space-y-4">
                                            <div className="bg-slate-50 rounded-lg p-4">
                                                <div className="text-sm text-slate-600 mb-1">Current Yield (Tax-Free)</div>
                                                <div className="text-2xl font-bold text-slate-800">
                                                    {comparison.muni.currentYield.toFixed(2)}%
                                                </div>
                                            </div>

                                            <div className="bg-blue-50 rounded-lg p-4">
                                                <div className="text-sm text-slate-600 mb-1">After-Tax Yield</div>
                                                <div className="text-3xl font-bold text-blue-600">
                                                    {comparison.muni.afterTaxYield.toFixed(2)}%
                                                </div>
                                                <div className="text-xs text-slate-500 mt-1">Same as current (tax-exempt)</div>
                                            </div>

                                            <div className="bg-slate-50 rounded-lg p-4">
                                                <div className="text-sm text-slate-600 mb-1 flex items-center gap-1">
                                                    Tax Equivalent Yield
                                                    <Info className="w-3 h-3 text-slate-400" />
                                                </div>
                                                <div className="text-2xl font-bold text-slate-800">
                                                    {comparison.muni.taxEquivalentYield.toFixed(2)}%
                                                </div>
                                                <div className="text-xs text-slate-500 mt-1">What a taxable bond would need to yield</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Treasury Bond Card */}
                                <div className="bg-white rounded-2xl shadow-lg border-2 border-emerald-200 overflow-hidden">
                                    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-4">
                                        <div className="flex items-center gap-3 text-white">
                                            <Landmark className="w-6 h-6" />
                                            <h3 className="text-xl font-bold">Treasury Bond</h3>
                                        </div>
                                    </div>

                                    <div className="p-6">
                                        {/* ETF Selector */}
                                        <div className="mb-3">
                                            <select
                                                value={selectedTreasuryTicker || processedData.treasuries[0]?.ticker || ''}
                                                onChange={(e) => setSelectedTreasuryTicker(e.target.value)}
                                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                            >
                                                {processedData.treasuries.map((etf) => (
                                                    <option key={etf.ticker} value={etf.ticker}>
                                                        {etf.ticker} - {etf.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* ETF Details Badges */}
                                        <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-slate-200">
                                            <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium">
                                                {DURATION_LABELS[comparison.treasury.duration]}
                                            </span>
                                            <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-sm font-medium capitalize">
                                                {comparison.treasury.managementStyle}
                                            </span>
                                            <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-sm font-medium">
                                                {comparison.treasury.expenseRatio.toFixed(2)}% Fee
                                            </span>
                                        </div>

                                        {/* Metrics */}
                                        <div className="space-y-4">
                                            <div className="bg-slate-50 rounded-lg p-4">
                                                <div className="text-sm text-slate-600 mb-1">Current Yield (Taxable)</div>
                                                <div className="text-2xl font-bold text-slate-800">
                                                    {comparison.treasury.currentYield.toFixed(2)}%
                                                </div>
                                            </div>

                                            <div className="bg-emerald-50 rounded-lg p-4">
                                                <div className="text-sm text-slate-600 mb-1">After-Tax Yield</div>
                                                <div className="text-3xl font-bold text-emerald-600">
                                                    {comparison.treasury.afterTaxYield.toFixed(2)}%
                                                </div>
                                                <div className="text-xs text-slate-500 mt-1">At {effectiveTaxRate}% federal tax rate</div>
                                            </div>

                                            <div className="bg-slate-50 rounded-lg p-4">
                                                <div className="text-sm text-slate-600 mb-1">Tax Impact</div>
                                                <div className="text-2xl font-bold text-red-600">
                                                    -{(comparison.treasury.currentYield - comparison.treasury.afterTaxYield).toFixed(2)}%
                                                </div>
                                                <div className="text-xs text-slate-500 mt-1">Federal taxes reduce yield</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Breakeven Analysis */}
                            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-purple-100 rounded-lg">
                                        <Target className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800">Tax Bracket Analysis</h3>
                                </div>

                                <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6">
                                    <p className="text-slate-700 mb-4">
                                        The <strong>breakeven tax rate</strong> is <strong>{comparison.breakevenRate.toFixed(1)}%</strong>.
                                        This is the federal tax rate where both bonds provide equal after-tax yields.
                                    </p>

                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="bg-white rounded-lg p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Building className="w-4 h-4 text-blue-600" />
                                                <span className="text-sm font-medium text-slate-700">Municipal Bonds Win</span>
                                            </div>
                                            <p className="text-sm text-slate-600">
                                                When your tax rate is <strong>above {comparison.breakevenRate.toFixed(1)}%</strong>
                                            </p>
                                        </div>

                                        <div className="bg-white rounded-lg p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Landmark className="w-4 h-4 text-emerald-600" />
                                                <span className="text-sm font-medium text-slate-700">Treasury Bonds Win</span>
                                            </div>
                                            <p className="text-sm text-slate-600">
                                                When your tax rate is <strong>below {comparison.breakevenRate.toFixed(1)}%</strong>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4 p-4 bg-white/60 rounded-lg border border-slate-200">
                                        <div className="flex items-start gap-2">
                                            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                            <p className="text-sm text-slate-700">
                                                <strong>Your current rate: {effectiveTaxRate}%</strong> - You are{' '}
                                                {effectiveTaxRate > comparison.breakevenRate
                                                    ? `${(effectiveTaxRate - comparison.breakevenRate).toFixed(1)}% above`
                                                    : `${(comparison.breakevenRate - effectiveTaxRate).toFixed(1)}% below`}{' '}
                                                the breakeven point, making {comparison.muniWins ? 'municipal' : 'treasury'} bonds more
                                                advantageous.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
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
