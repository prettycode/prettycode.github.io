import { Fragment, useState, useCallback, useRef, useMemo } from 'react';
import type {
  AssetClass,
  FactorStyle,
  MarketRegion,
  PortfolioData,
  SizeFactor,
} from './types';
import { parsePortfolioCSV } from './utils/parsePortfolio';
import { ASSET_CLASS_COLORS, ASSET_CLASS_ORDER } from './data/colors';
import { formatCurrency, formatCurrencyShort, formatPercent } from './utils/format';
import { labelFor } from './utils/labels';
import { assetClassSegments } from './utils/assetClassSegments';
import { StackedBar } from './components/StackedBar';
import { AssetClassAllocation } from './components/AssetClassAllocation';
import { AssetClassBreakdown } from './components/AssetClassBreakdown';
import { EquityBreakdown } from './components/EquityBreakdown';

interface Aggregated {
  byAssetClass: Map<AssetClass, number>;
  byMarketRegion: Map<MarketRegion, number>;
  byFactorStyle: Map<FactorStyle, number>;
  bySizeFactor: Map<SizeFactor, number>;
  totalEquity: number;
  totalExposure: number;
  totalValue: number;
  unknownValue: number;
}

function aggregate(portfolios: PortfolioData[]): Aggregated {
  const byAssetClass = new Map<AssetClass, number>();
  const byMarketRegion = new Map<MarketRegion, number>();
  const byFactorStyle = new Map<FactorStyle, number>();
  const bySizeFactor = new Map<SizeFactor, number>();
  let totalEquity = 0;
  let totalExposure = 0;
  let totalValue = 0;
  let unknownValue = 0;

  for (const p of portfolios) {
    totalValue += p.totalValue;
    totalEquity += p.totalEquity;
    totalExposure += p.totalExposure;
    unknownValue += p.unknownValue;
    for (const [k, v] of p.byAssetClass) byAssetClass.set(k, (byAssetClass.get(k) ?? 0) + v);
    for (const [k, v] of p.byMarketRegion) byMarketRegion.set(k, (byMarketRegion.get(k) ?? 0) + v);
    for (const [k, v] of p.byFactorStyle) byFactorStyle.set(k, (byFactorStyle.get(k) ?? 0) + v);
    for (const [k, v] of p.bySizeFactor) bySizeFactor.set(k, (bySizeFactor.get(k) ?? 0) + v);
  }

  return {
    byAssetClass, byMarketRegion, byFactorStyle, bySizeFactor,
    totalEquity, totalExposure, totalValue, unknownValue,
  };
}

export default function App() {
  const [portfolios, setPortfolios] = useState<PortfolioData[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleExpanded = (index: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newErrors: string[] = [];
    const newPortfolios: PortfolioData[] = [];

    for (const file of fileArray) {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        newErrors.push(`${file.name}: not a CSV file`);
        continue;
      }
      const text = await file.text();
      const portfolio = parsePortfolioCSV(text, file.name);
      if (!portfolio) {
        newErrors.push(`${file.name}: could not parse — ensure it is a Fidelity positions export`);
      } else {
        newPortfolios.push(portfolio);
      }
    }

    setPortfolios(prev => [...prev, ...newPortfolios]);
    setErrors(prev => [...prev, ...newErrors]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
    e.target.value = '';
  };

  const removePortfolio = (index: number) => {
    setPortfolios(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setPortfolios([]);
    setErrors([]);
  };

  const agg = useMemo(() => aggregate(portfolios), [portfolios]);
  const hasData = portfolios.length > 0;

  const leverage = agg.totalValue > 0 ? agg.totalExposure / agg.totalValue : 0;
  const isLevered = leverage > 1.0001;

  const unknownTickers = useMemo(() => {
    const set = new Set<string>();
    for (const p of portfolios) {
      for (const h of p.holdings) {
        if (!h.inCatalog) set.add(h.symbol);
      }
    }
    return Array.from(set).sort();
  }, [portfolios]);

  return (
    <div className="min-h-screen bg-white text-neutral-900 selection:bg-amber-100">
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="max-w-5xl mx-auto px-6 sm:px-10 py-12 sm:py-16">

        {/* Header */}
        <header className="flex items-baseline justify-between gap-6 mb-12">
          <div>
            <p className="text-[10px] font-medium tracking-[0.2em] text-neutral-400 uppercase mb-3">
              Retirement · Exposure Analysis
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl text-neutral-900 leading-none tracking-tight">
              Portfolio Allocation
            </h1>
          </div>
          {hasData && (
            <button
              onClick={() => inputRef.current?.click()}
              className="text-xs text-neutral-500 hover:text-neutral-900 underline underline-offset-4 decoration-neutral-300 hover:decoration-neutral-900 transition-colors whitespace-nowrap"
            >
              Add files
            </button>
          )}
        </header>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="mb-10 border-l border-red-700 pl-4 py-1 space-y-1">
            {errors.map((err, i) => (
              <div key={i} className="text-xs text-red-700">{err}</div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!hasData && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => inputRef.current?.click()}
            className={`border px-8 sm:px-12 py-16 sm:py-20 cursor-pointer transition-colors ${
              isDragging
                ? 'border-neutral-400 bg-neutral-50'
                : 'border-dashed border-neutral-300 hover:border-neutral-400'
            }`}
          >
            <div className="max-w-md">
              <p className="text-[10px] font-medium tracking-[0.2em] text-neutral-400 uppercase mb-3">
                Begin
              </p>
              <p className="font-serif text-2xl text-neutral-900 leading-snug mb-4">
                Drop your Fidelity position exports here.
              </p>
              <p className="text-sm text-neutral-500 leading-relaxed">
                CSV files only. Holdings are mapped to asset class, market region,
                factor style, and size dimensions using a built-in ETF catalog.
              </p>
            </div>
          </div>
        )}

        {/* Data */}
        {hasData && (
          <>
            {/* Hero total */}
            <section className="pb-12 border-b border-neutral-200">
              <p className="text-[10px] font-medium tracking-[0.2em] text-neutral-400 uppercase mb-4">
                Total Net Asset Value
              </p>
              <div className="flex items-baseline gap-5 flex-wrap">
                <span className="font-serif text-5xl sm:text-6xl lg:text-[72px] leading-none text-neutral-900 tabular-nums">
                  {formatCurrencyShort(agg.totalValue)}
                </span>
                <span className="text-sm text-neutral-400">
                  across {portfolios.length} account{portfolios.length !== 1 ? 's' : ''}
                </span>
                {isLevered && (
                  <span
                    className="text-[11px] font-medium tracking-[0.1em] uppercase text-amber-700 border border-amber-700 px-2 py-1"
                    title={`Total exposure ${formatCurrencyShort(agg.totalExposure)} = ${leverage.toFixed(2)}× NAV`}
                  >
                    {leverage.toFixed(2)}× levered
                  </span>
                )}
              </div>
            </section>

            <section className="pt-10 pb-12 border-b border-neutral-200">
              <AssetClassAllocation
                byAssetClass={agg.byAssetClass}
                totalExposure={agg.totalExposure}
                totalValue={agg.totalValue}
              />
            </section>

            <section className="pt-10 pb-12 border-b border-neutral-200">
              <AssetClassBreakdown
                byAssetClass={agg.byAssetClass}
                totalValue={agg.totalValue}
              />
            </section>

            {agg.totalEquity > 0 && (
              <section className="pt-10 pb-12 border-b border-neutral-200">
                <EquityBreakdown
                  byMarketRegion={agg.byMarketRegion}
                  byFactorStyle={agg.byFactorStyle}
                  bySizeFactor={agg.bySizeFactor}
                  totalEquity={agg.totalEquity}
                />
              </section>
            )}

            {/* Accounts */}
            <section className="pt-10">
              <div className="flex items-baseline justify-between mb-5">
                <p className="text-[10px] font-medium tracking-[0.2em] text-neutral-400 uppercase">
                  By Account
                </p>
                <button
                  onClick={clearAll}
                  className="text-xs text-neutral-400 hover:text-neutral-900 transition-colors"
                >
                  Clear all
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="text-left pb-3 pr-4 text-[10px] font-medium text-neutral-400 uppercase tracking-[0.15em]">Account</th>
                      <th className="text-right pb-3 px-4 text-[10px] font-medium text-neutral-400 uppercase tracking-[0.15em]">Value</th>
                      <th className="text-left pb-3 px-4 text-[10px] font-medium text-neutral-400 uppercase tracking-[0.15em] w-1/2 min-w-[180px]">Asset Class Allocation</th>
                      <th className="text-right pb-3 pl-4 text-[10px] font-medium text-neutral-400 uppercase tracking-[0.15em]">Lev.</th>
                      <th className="w-8 pb-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolios
                      .map((p, i) => ({ p, i }))
                      .sort((a, b) => b.p.totalValue - a.p.totalValue)
                      .map(({ p, i }) => {
                      const segments = assetClassSegments(p.byAssetClass);
                      const lev = p.totalValue > 0 ? p.totalExposure / p.totalValue : 0;
                      const isExpanded = expanded.has(i);
                      const hasEquity = p.totalEquity > 0;
                      return (
                        <Fragment key={i}>
                        <tr
                          className={`border-b border-neutral-100 group ${hasEquity ? 'cursor-pointer hover:bg-neutral-50' : ''}`}
                          onClick={hasEquity ? () => toggleExpanded(i) : undefined}
                        >
                          <td className="py-4 pr-4 align-top">
                            <div className="flex items-start gap-2">
                              {hasEquity && (
                                <svg
                                  width="8"
                                  height="8"
                                  viewBox="0 0 8 8"
                                  className={`mt-1.5 flex-shrink-0 text-neutral-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M2 1l4 3-4 3" />
                                </svg>
                              )}
                              <div className={hasEquity ? '' : 'pl-[16px]'}>
                                <div className="font-medium text-neutral-900 leading-tight">
                                  {p.accountName || p.fileName}
                                </div>
                                {p.accountNumber && (
                                  <div className="font-mono text-[11px] text-neutral-400 mt-1 tracking-wide">
                                    {p.accountNumber}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right text-neutral-700 tabular-nums align-top">
                            {formatCurrency(p.totalValue)}
                          </td>
                          <td className="py-4 px-4 align-top">
                            <StackedBar segments={segments} total={p.totalExposure} height={6} />
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                              {ASSET_CLASS_ORDER.map(ac => {
                                const v = p.byAssetClass.get(ac) ?? 0;
                                if (v <= 0) return null;
                                return (
                                  <span key={ac} className="inline-flex items-center gap-1 text-[10px]">
                                    <span
                                      className="inline-block w-1.5 h-1.5"
                                      style={{ backgroundColor: ASSET_CLASS_COLORS[ac] }}
                                    />
                                    <span className="text-neutral-500">{labelFor(ac)}</span>
                                    <span className="tabular-nums text-neutral-700">
                                      {formatPercent(v, p.totalValue, 0)}
                                    </span>
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                          <td
                            className="py-4 pl-4 text-right tabular-nums align-top"
                            style={{ color: lev > 1.0001 ? '#b45309' : '#a3a3a3' }}
                            title={`Total exposure ${formatCurrencyShort(p.totalExposure)}`}
                          >
                            {lev.toFixed(2)}×
                          </td>
                          <td className="py-4 pl-2 text-right align-top">
                            <button
                              onClick={(e) => { e.stopPropagation(); removePortfolio(i); }}
                              className="text-neutral-300 hover:text-neutral-900 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                              title="Remove"
                              aria-label="Remove portfolio"
                            >
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round">
                                <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                        {isExpanded && hasEquity && (
                          <tr key={`${i}-expanded`} className="border-b border-neutral-100 bg-neutral-50/60">
                            <td colSpan={5} className="py-6 px-8">
                              <div className="mb-8">
                                <AssetClassBreakdown
                                  byAssetClass={p.byAssetClass}
                                  totalValue={p.totalValue}
                                  level="nested"
                                />
                              </div>
                              <EquityBreakdown
                                byMarketRegion={p.byMarketRegion}
                                byFactorStyle={p.byFactorStyle}
                                bySizeFactor={p.bySizeFactor}
                                totalEquity={p.totalEquity}
                                level="nested"
                              />
                            </td>
                          </tr>
                        )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                  {portfolios.length > 1 && (
                    <tfoot>
                      <tr>
                        <td className="pt-5 pr-4 text-[10px] font-medium text-neutral-500 uppercase tracking-[0.15em] align-top">Combined</td>
                        <td className="pt-5 px-4 text-right font-medium text-neutral-900 tabular-nums align-top">
                          {formatCurrency(agg.totalValue)}
                        </td>
                        <td className="pt-5 px-4 align-top">
                          <StackedBar segments={assetClassSegments(agg.byAssetClass)} total={agg.totalExposure} height={6} />
                        </td>
                        <td
                          className="pt-5 pl-4 text-right font-medium tabular-nums align-top"
                          style={{ color: leverage > 1.0001 ? '#b45309' : '#a3a3a3' }}
                        >
                          {leverage.toFixed(2)}×
                        </td>
                        <td className="pt-5"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {unknownTickers.length > 0 && (
                <div className="mt-8 border-t border-neutral-100 pt-5">
                  <p className="text-[10px] font-medium tracking-[0.15em] text-neutral-400 uppercase mb-2">
                    Unmapped tickers
                    <span className="text-[10px] text-neutral-400 normal-case tracking-normal ml-2">
                      {formatCurrencyShort(agg.unknownValue)} ·{' '}
                      {formatPercent(agg.unknownValue, agg.totalValue, 1)} of NAV — bucketed as Unknown
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {unknownTickers.map(t => (
                      <span
                        key={t}
                        className="font-mono text-[11px] text-neutral-600 bg-neutral-100 px-1.5 py-0.5"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
