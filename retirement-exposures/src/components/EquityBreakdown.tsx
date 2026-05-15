import type { FactorStyle, MarketRegion, SizeFactor } from '../types';
import { formatCurrencyShort } from '../utils/format';
import { REGION_LABEL, REGION_ORDER, SIZE_LABEL, SIZE_ORDER, STYLE_ORDER } from '../utils/labels';
import { Breakdown } from './Breakdown';

export function EquityBreakdown({
  byMarketRegion, byFactorStyle, bySizeFactor, totalEquity, level = 'section',
}: {
  byMarketRegion: Map<MarketRegion, number>;
  byFactorStyle: Map<FactorStyle, number>;
  bySizeFactor: Map<SizeFactor, number>;
  totalEquity: number;
  level?: 'section' | 'nested';
}) {
  if (totalEquity <= 0) return null;
  const tracking = level === 'section' ? 'tracking-[0.2em]' : 'tracking-[0.15em]';
  return (
    <>
      <p className={`text-[10px] font-medium ${tracking} text-neutral-400 uppercase mb-5`}>
        Equity Breakdown
        <span className="text-[10px] text-neutral-400 normal-case tracking-normal ml-2">
          {formatCurrencyShort(totalEquity)} total · % of equity
        </span>
      </p>
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
    </>
  );
}
