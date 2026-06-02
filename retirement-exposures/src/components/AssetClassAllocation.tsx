import { useState } from "react";
import type { AssetClass } from "../types";
import { ASSET_CLASS_COLORS, ASSET_CLASS_ORDER } from "../data/colors";
import { formatCurrencyShort, formatPercent } from "../utils/format";
import { labelFor } from "../utils/labels";
import { StackedBar, type BarSegment } from "./StackedBar";

const ALTERNATIVES_COLOR = "#7c3aed";

interface Row {
  label: string;
  color: string;
  value: number;
}

function buildRows(
  byAssetClass: Map<AssetClass, number>,
  grouped: boolean,
): Row[] {
  if (!grouped) {
    return ASSET_CLASS_ORDER.map((ac) => ({
      label: labelFor(ac),
      color: ASSET_CLASS_COLORS[ac],
      value: byAssetClass.get(ac) ?? 0,
    })).filter((r) => r.value > 0);
  }

  let alternatives = 0;
  for (const [ac, v] of byAssetClass) {
    if (ac !== "Equity" && ac !== "U.S. Treasuries") alternatives += v;
  }
  return [
    {
      label: "Equity",
      color: ASSET_CLASS_COLORS["Equity"],
      value: byAssetClass.get("Equity") ?? 0,
    },
    {
      label: "Treasuries",
      color: ASSET_CLASS_COLORS["U.S. Treasuries"],
      value: byAssetClass.get("U.S. Treasuries") ?? 0,
    },
    { label: "Alternatives", color: ALTERNATIVES_COLOR, value: alternatives },
  ].filter((r) => r.value > 0);
}

function LegendItem({
  label,
  color,
  value,
  total,
  denominatorLabel,
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
  byAssetClass,
  totalExposure,
  totalValue,
}: {
  byAssetClass: Map<AssetClass, number>;
  totalExposure: number;
  totalValue: number;
}) {
  const [grouped, setGrouped] = useState(true);
  const rows = buildRows(byAssetClass, grouped).sort((a, b) => b.value - a.value);
  const segments: BarSegment[] = rows;
  return (
    <>
      <div className="flex items-baseline justify-between mb-5">
        <p className="text-[10px] font-medium tracking-[0.2em] text-neutral-400 uppercase">
          Asset Class Allocation
        </p>
        <div className="flex items-baseline gap-3 text-[10px] font-medium tracking-[0.15em] uppercase">
          <button
            onClick={() => setGrouped(true)}
            className={`transition-colors ${grouped ? "text-neutral-900" : "text-neutral-400 hover:text-neutral-900"}`}
          >
            Grouped
          </button>
          <span className="text-neutral-300">/</span>
          <button
            onClick={() => setGrouped(false)}
            className={`transition-colors ${grouped ? "text-neutral-400 hover:text-neutral-900" : "text-neutral-900"}`}
          >
            Detailed
          </button>
        </div>
      </div>
      <StackedBar segments={segments} total={totalExposure} height={20} />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-5 mt-6">
        {rows.map((r) => (
          <LegendItem
            key={r.label}
            label={r.label}
            color={r.color}
            value={r.value}
            total={totalValue}
            denominatorLabel="of NAV"
          />
        ))}
      </div>
    </>
  );
}
