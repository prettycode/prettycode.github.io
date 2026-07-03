import { useState } from 'react';
import type { AssetClass } from '../types';
import { ASSET_CLASS_ORDER } from '../data/colors';
import { formatCurrencyShort } from '../utils/format';
import { labelFor, labelForAssetClassGroup, labelForAssetClassNode } from '../utils/labels';
import {
  aggregateAssetClassSubgroups,
  aggregateTopLevelAssetClasses,
  ASSET_CLASS_SUBGROUP_ORDER,
  TOP_LEVEL_ASSET_CLASS_ORDER,
} from '../utils/assetClassHierarchy';
import { Breakdown } from './Breakdown';

type BreakdownGrouping = 'top-level' | 'subgroups' | 'detailed';

const GROUPING_OPTIONS: { value: BreakdownGrouping; label: string }[] = [
  { value: 'top-level', label: 'Top Level' },
  { value: 'subgroups', label: 'Subgroups' },
  { value: 'detailed', label: 'Detailed' },
];

export function AssetClassBreakdown({
  byAssetClass, totalValue, level = 'section', collapsible = false,
}: {
  byAssetClass: Map<AssetClass, number>;
  totalValue: number;
  level?: 'section' | 'nested';
  collapsible?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [grouping, setGrouping] = useState<BreakdownGrouping>('subgroups');
  const tracking = level === 'section' ? 'tracking-[0.2em]' : 'tracking-[0.15em]';
  const meta = (
    <span className="text-[10px] text-neutral-400 normal-case tracking-normal ml-2">
      {formatCurrencyShort(totalValue)} total · % of NAV
    </span>
  );
  const topLevel = aggregateTopLevelAssetClasses(byAssetClass);
  const subgroups = aggregateAssetClassSubgroups(byAssetClass);
  const breakdownConfig = {
    'top-level': {
      title: 'Asset Class Groups',
      items: TOP_LEVEL_ASSET_CLASS_ORDER.map(group => ({
        label: labelForAssetClassGroup(group),
        value: topLevel.get(group) ?? 0,
      })),
    },
    subgroups: {
      title: 'Asset Class Subgroups',
      items: ASSET_CLASS_SUBGROUP_ORDER.map(node => ({
        label: labelForAssetClassNode(node),
        value: subgroups.get(node) ?? 0,
      })),
    },
    detailed: {
      title: 'Detailed Asset Class',
      items: ASSET_CLASS_ORDER.map(ac => ({
        label: labelFor(ac),
        value: byAssetClass.get(ac) ?? 0,
      })),
    },
  }[grouping];
  const selector = (
    <div className="flex items-center gap-3 mb-5 text-[10px] font-medium tracking-[0.15em] uppercase">
      {GROUPING_OPTIONS.map((option, index) => (
        <span key={option.value} className="inline-flex items-center gap-3">
          {index > 0 && <span className="text-neutral-300">/</span>}
          <button
            type="button"
            onClick={() => setGrouping(option.value)}
            className={`transition-colors ${grouping === option.value ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-900'}`}
          >
            {option.label}
          </button>
        </span>
      ))}
    </div>
  );
  const body = (
    <Breakdown
      title={breakdownConfig.title}
      total={totalValue}
      sortable
      items={breakdownConfig.items}
    />
  );

  if (!collapsible) {
    return (
      <>
        <p className={`text-[10px] font-medium ${tracking} text-neutral-400 uppercase mb-5`}>
          Asset Class Breakdown
          {meta}
        </p>
        {selector}
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
      {expanded && (
        <>
          {selector}
          {body}
        </>
      )}
    </>
  );
}
