import { useState, useCallback, useRef } from 'react';
import type { PortfolioData } from './types';
import { parsePortfolioCSV } from './utils/parsePortfolio';

const C_BTC = '#b45309';
const C_ETH = '#3f3f46';
const C_OTHER = '#d4d4d8';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCurrencyShort(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(part: number, total: number, digits = 2): string {
  if (total === 0) return '—';
  return ((part / total) * 100).toFixed(digits) + '%';
}

function AllocationBar({
  btc, eth, other, total, height = 6,
}: {
  btc: number; eth: number; other: number; total: number; height?: number;
}) {
  if (total <= 0) {
    return <div className="w-full bg-neutral-100" style={{ height }} />;
  }
  const segments = [
    { value: btc, color: C_BTC },
    { value: eth, color: C_ETH },
    { value: other, color: C_OTHER },
  ];
  return (
    <div className="flex w-full overflow-hidden bg-neutral-100" style={{ height }}>
      {segments.map((s, i) => (
        s.value > 0 && (
          <div
            key={i}
            style={{
              width: `${(s.value / total) * 100}%`,
              backgroundColor: s.color,
            }}
          />
        )
      ))}
    </div>
  );
}

function LegendItem({
  label, color, value, total,
}: {
  label: string; color: string; value: number; total: number;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="inline-block w-1.5 flex-shrink-0 mt-1.5"
        style={{ backgroundColor: color, height: 10 }}
      />
      <div className="min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[10px] font-medium tracking-[0.15em] text-neutral-500 uppercase">
            {label}
          </span>
          <span className="text-sm font-medium text-neutral-900 tabular-nums">
            {formatPercent(value, total)}
          </span>
        </div>
        <div className="text-xs text-neutral-400 tabular-nums mt-0.5">
          {formatCurrencyShort(value)}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [portfolios, setPortfolios] = useState<PortfolioData[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const totals = portfolios.reduce(
    (acc, p) => ({
      totalValue: acc.totalValue + p.totalValue,
      btcExposure: acc.btcExposure + p.btcExposure,
      ethExposure: acc.ethExposure + p.ethExposure,
      otherExposure: acc.otherExposure + p.otherExposure,
    }),
    { totalValue: 0, btcExposure: 0, ethExposure: 0, otherExposure: 0 }
  );

  const hasData = portfolios.length > 0;

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
            <div className="max-w-sm">
              <p className="text-[10px] font-medium tracking-[0.2em] text-neutral-400 uppercase mb-3">
                Begin
              </p>
              <p className="font-serif text-2xl text-neutral-900 leading-snug mb-4">
                Drop your Fidelity position exports here.
              </p>
              <p className="text-sm text-neutral-500 leading-relaxed">
                CSV files only. Symbols{' '}
                <span className="font-mono text-[12px] text-neutral-700">FBTC</span> and{' '}
                <span className="font-mono text-[12px] text-neutral-700">IBIT</span> count toward BTC exposure;{' '}
                <span className="font-mono text-[12px] text-neutral-700">ETHA</span> toward ETH.
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
                  {formatCurrencyShort(totals.totalValue)}
                </span>
                <span className="text-sm text-neutral-400">
                  across {portfolios.length} account{portfolios.length !== 1 ? 's' : ''}
                </span>
              </div>
            </section>

            {/* Allocation */}
            <section className="pt-10 pb-12 border-b border-neutral-200">
              <p className="text-[10px] font-medium tracking-[0.2em] text-neutral-400 uppercase mb-5">
                Asset Allocation
              </p>
              <AllocationBar
                btc={totals.btcExposure}
                eth={totals.ethExposure}
                other={totals.otherExposure}
                total={totals.totalValue}
                height={20}
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6">
                <LegendItem label="BTC" color={C_BTC} value={totals.btcExposure} total={totals.totalValue} />
                <LegendItem label="ETH" color={C_ETH} value={totals.ethExposure} total={totals.totalValue} />
                <LegendItem label="Other" color={C_OTHER} value={totals.otherExposure} total={totals.totalValue} />
              </div>
            </section>

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
                      <th className="text-left pb-3 px-4 text-[10px] font-medium text-neutral-400 uppercase tracking-[0.15em] w-2/5 min-w-[120px]">Allocation</th>
                      <th className="text-right pb-3 px-4 text-[10px] font-medium text-neutral-400 uppercase tracking-[0.15em]">BTC</th>
                      <th className="text-right pb-3 pl-4 text-[10px] font-medium text-neutral-400 uppercase tracking-[0.15em]">ETH</th>
                      <th className="w-8 pb-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolios.map((p, i) => (
                      <tr key={i} className="border-b border-neutral-100 group">
                        <td className="py-4 pr-4">
                          <div className="font-medium text-neutral-900 leading-tight">
                            {p.accountName || p.fileName}
                          </div>
                          {p.accountNumber && (
                            <div className="font-mono text-[11px] text-neutral-400 mt-1 tracking-wide">
                              {p.accountNumber}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right text-neutral-700 tabular-nums">
                          {formatCurrency(p.totalValue)}
                        </td>
                        <td className="py-4 px-4">
                          <AllocationBar
                            btc={p.btcExposure}
                            eth={p.ethExposure}
                            other={p.otherExposure}
                            total={p.totalValue}
                            height={5}
                          />
                        </td>
                        <td
                          className="py-4 px-4 text-right tabular-nums"
                          style={{ color: p.btcExposure > 0 ? C_BTC : '#a3a3a3' }}
                        >
                          {formatPercent(p.btcExposure, p.totalValue)}
                        </td>
                        <td
                          className="py-4 pl-4 text-right tabular-nums"
                          style={{ color: p.ethExposure > 0 ? C_ETH : '#a3a3a3' }}
                        >
                          {formatPercent(p.ethExposure, p.totalValue)}
                        </td>
                        <td className="py-4 pl-2 text-right">
                          <button
                            onClick={() => removePortfolio(i)}
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
                    ))}
                  </tbody>
                  {portfolios.length > 1 && (
                    <tfoot>
                      <tr>
                        <td className="pt-5 pr-4 text-[10px] font-medium text-neutral-500 uppercase tracking-[0.15em]">Combined</td>
                        <td className="pt-5 px-4 text-right font-medium text-neutral-900 tabular-nums">
                          {formatCurrency(totals.totalValue)}
                        </td>
                        <td className="pt-5 px-4">
                          <AllocationBar
                            btc={totals.btcExposure}
                            eth={totals.ethExposure}
                            other={totals.otherExposure}
                            total={totals.totalValue}
                            height={5}
                          />
                        </td>
                        <td className="pt-5 px-4 text-right font-medium tabular-nums" style={{ color: C_BTC }}>
                          {formatPercent(totals.btcExposure, totals.totalValue)}
                        </td>
                        <td className="pt-5 pl-4 text-right font-medium tabular-nums" style={{ color: C_ETH }}>
                          {formatPercent(totals.ethExposure, totals.totalValue)}
                        </td>
                        <td className="pt-5"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
