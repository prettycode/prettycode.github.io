import { useState } from 'react';
import type { AssetClass } from '../types';
import { ASSET_CLASS_ORDER } from '../data/colors';
import { formatCurrencyShort } from '../utils/format';
import { labelFor } from '../utils/labels';
import { Breakdown } from './Breakdown';

export function AssetClassBreakdown({
  byAssetClass, totalValue, level = 'section', collapsible = false,
}: {
  byAssetClass: Map<AssetClass, number>;
  totalValue: number;
  level?: 'section' | 'nested';
  collapsible?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const tracking = level === 'section' ? 'tracking-[0.2em]' : 'tracking-[0.15em]';
  const meta = (
    <span className="text-[10px] text-neutral-400 normal-case tracking-normal ml-2">
      {formatCurrencyShort(totalValue)} total · % of NAV
    </span>
  );
  const body = (
    <Breakdown
      title="Asset Class"
      total={totalValue}
      items={ASSET_CLASS_ORDER.map(ac => ({
        label: labelFor(ac),
        value: byAssetClass.get(ac) ?? 0,
      }))}
    />
  );

  if (!collapsible) {
    return (
      <>
        <p className={`text-[10px] font-medium ${tracking} text-neutral-400 uppercase mb-5`}>
          Asset Class Breakdown
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
        Asset Class Breakdown
        {meta}
      </button>
      {expanded && body}
    </>
  );
}
