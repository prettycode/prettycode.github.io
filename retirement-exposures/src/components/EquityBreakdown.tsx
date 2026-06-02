import { useState } from 'react';
import type { FactorStyle, MarketRegion, SizeFactor } from '../types';
import { formatCurrencyShort } from '../utils/format';
import { REGION_LABEL, REGION_ORDER, SIZE_LABEL, SIZE_ORDER, STYLE_ORDER } from '../utils/labels';
import { Breakdown } from './Breakdown';

export function EquityBreakdown({
  byMarketRegion, byFactorStyle, bySizeFactor, totalEquity, level = 'section', collapsible = false,
}: {
  byMarketRegion: Map<MarketRegion, number>;
  byFactorStyle: Map<FactorStyle, number>;
  bySizeFactor: Map<SizeFactor, number>;
  totalEquity: number;
  level?: 'section' | 'nested';
  collapsible?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  if (totalEquity <= 0) return null;
  const tracking = level === 'section' ? 'tracking-[0.2em]' : 'tracking-[0.15em]';
  const meta = (
    <span className="text-[10px] text-neutral-400 normal-case tracking-normal ml-2">
      {formatCurrencyShort(totalEquity)} total · % of equity
    </span>
  );
  const body = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
      <Breakdown
        title="Region"
        total={totalEquity}
        items={REGION_ORDER.map(r => ({
          label: REGION_LABEL[r],
          value: byMarketRegion.get(r) ?? 0,
        }))}
      />
      <Breakdown
        title="Factor Style"
        total={totalEquity}
        items={STYLE_ORDER.map(s => ({
          label: s,
          value: byFactorStyle.get(s) ?? 0,
        }))}
      />
      <Breakdown
        title="Size"
        total={totalEquity}
        items={SIZE_ORDER.map(s => ({
          label: SIZE_LABEL[s],
          value: bySizeFactor.get(s) ?? 0,
        }))}
      />
    </div>
  );

  if (!collapsible) {
    return (
      <>
        <p className={`text-[10px] font-medium ${tracking} text-neutral-400 uppercase mb-5`}>
          Equity Breakdown
          {meta}
        </p>
        {body}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className={`w-full flex items-baseline text-left text-[10px] font-medium ${tracking} text-neutral-400 uppercase ${expanded ? 'mb-5' : ''} hover:text-neutral-900 transition-colors group`}
        aria-expanded={expanded}
      >
        <svg
          width="8"
          height="8"
          viewBox="0 0 8 8"
          className={`mr-2 flex-shrink-0 text-neutral-400 group-hover:text-neutral-900 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 1l4 3-4 3" />
        </svg>
        Equity Breakdown
        {meta}
      </button>
      {expanded && body}
    </>
  );
}
