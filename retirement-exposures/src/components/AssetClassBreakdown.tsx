import type { AssetClass } from '../types';
import { ASSET_CLASS_ORDER } from '../data/colors';
import { formatCurrencyShort } from '../utils/format';
import { labelFor } from '../utils/labels';
import { Breakdown } from './Breakdown';

export function AssetClassBreakdown({
  byAssetClass, totalValue, level = 'section',
}: {
  byAssetClass: Map<AssetClass, number>;
  totalValue: number;
  level?: 'section' | 'nested';
}) {
  const tracking = level === 'section' ? 'tracking-[0.2em]' : 'tracking-[0.15em]';
  return (
    <>
      <p className={`text-[10px] font-medium ${tracking} text-neutral-400 uppercase mb-5`}>
        Asset Class Breakdown
        <span className="text-[10px] text-neutral-400 normal-case tracking-normal ml-2">
          {formatCurrencyShort(totalValue)} total · % of NAV
        </span>
      </p>
      <Breakdown
        title="Asset Class"
        total={totalValue}
        items={ASSET_CLASS_ORDER.map(ac => ({
          label: labelFor(ac),
          value: byAssetClass.get(ac) ?? 0,
        }))}
      />
    </>
  );
}
