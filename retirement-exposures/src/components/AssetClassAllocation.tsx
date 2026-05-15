import type { AssetClass } from '../types';
import { ASSET_CLASS_COLORS, ASSET_CLASS_ORDER } from '../data/colors';
import { assetClassSegments } from '../utils/assetClassSegments';
import { formatCurrencyShort, formatPercent } from '../utils/format';
import { labelFor } from '../utils/labels';
import { StackedBar } from './StackedBar';

function LegendItem({
  label, color, value, total, denominatorLabel,
}: {
  label: string;
  color: string;
  value: number;
  total: number;
  denominatorLabel?: string;
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
          {denominatorLabel && (
            <span className="text-[9px] tracking-[0.1em] text-neutral-400 uppercase">
              {denominatorLabel}
            </span>
          )}
        </div>
        <div className="text-xs text-neutral-400 tabular-nums mt-0.5">
          {formatCurrencyShort(value)}
        </div>
      </div>
    </div>
  );
}

export function AssetClassAllocation({
  byAssetClass, totalExposure, totalValue,
}: {
  byAssetClass: Map<AssetClass, number>;
  totalExposure: number;
  totalValue: number;
}) {
  const segments = assetClassSegments(byAssetClass);
  return (
    <>
      <p className="text-[10px] font-medium tracking-[0.2em] text-neutral-400 uppercase mb-5">
        Asset Class Allocation
      </p>
      <StackedBar segments={segments} total={totalExposure} height={20} />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-5 mt-6">
        {ASSET_CLASS_ORDER.map(ac => {
          const value = byAssetClass.get(ac) ?? 0;
          if (value <= 0) return null;
          return (
            <LegendItem
              key={ac}
              label={labelFor(ac)}
              color={ASSET_CLASS_COLORS[ac]}
              value={value}
              total={totalValue}
              denominatorLabel="of NAV"
            />
          );
        })}
      </div>
    </>
  );
}
