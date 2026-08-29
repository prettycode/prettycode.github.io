import { useState } from "react";
import type { AssetClass, AssetClassGroup } from "../types";
import { ASSET_CLASS_COLORS, ASSET_CLASS_ORDER } from "../data/colors";
import { formatCurrencyShort, formatPercent } from "../utils/format";
import {
  labelFor,
  labelForAssetClassGroup,
  labelForAssetClassNode,
} from "../utils/labels";
import {
  aggregateAssetClassSubgroups,
  aggregateTopLevelAssetClasses,
  ASSET_CLASS_SUBGROUP_ORDER,
  ASSET_CLASS_GROUP_COLORS,
  type AssetClassNode,
  TOP_LEVEL_ASSET_CLASS_ORDER,
} from "../utils/assetClassHierarchy";
import { StackedBar, type BarSegment } from "./StackedBar";

type AllocationGrouping = "top-level" | "subgroups" | "detailed";

const GROUPING_OPTIONS: { value: AllocationGrouping; label: string }[] = [
  { value: "top-level", label: "Top Level" },
  { value: "subgroups", label: "Subgroups" },
  { value: "detailed", label: "Detailed" },
];

interface Row {
  label: string;
  color: string;
  value: number;
}

function isAssetClassGroup(node: AssetClassNode): node is AssetClassGroup {
  return (
    node === "Equity" ||
    node === "U.S. Treasuries" ||
    node === "Alternatives" ||
    node === "Managed Futures" ||
    node === "Crypto"
  );
}

function colorForNode(node: AssetClassNode): string {
  return isAssetClassGroup(node)
    ? ASSET_CLASS_GROUP_COLORS[node]
    : ASSET_CLASS_COLORS[node];
}

function buildRows(
  byAssetClass: Map<AssetClass, number>,
  grouping: AllocationGrouping,
): Row[] {
  if (grouping === "detailed") {
    return ASSET_CLASS_ORDER.map((ac) => ({
      label: labelFor(ac),
      color: ASSET_CLASS_COLORS[ac],
      value: byAssetClass.get(ac) ?? 0,
    })).filter((r) => r.value > 0);
  }

  if (grouping === "subgroups") {
    const subgroups = aggregateAssetClassSubgroups(byAssetClass);
    return ASSET_CLASS_SUBGROUP_ORDER.map((node) => ({
      label: labelForAssetClassNode(node),
      color: colorForNode(node),
      value: subgroups.get(node) ?? 0,
    })).filter((r) => r.value > 0);
  }

  const topLevel = aggregateTopLevelAssetClasses(byAssetClass);
  return TOP_LEVEL_ASSET_CLASS_ORDER.map((group) => ({
    label: labelForAssetClassGroup(group),
    color: ASSET_CLASS_GROUP_COLORS[group],
    value: topLevel.get(group) ?? 0,
  })).filter((r) => r.value > 0);
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
  const [grouping, setGrouping] = useState<AllocationGrouping>("top-level");
  const rows = buildRows(byAssetClass, grouping).sort(
    (a, b) => b.value - a.value,
  );
  const segments: BarSegment[] = rows;
  return (
    <>
      <div className="flex items-baseline justify-between mb-5">
        <p className="text-[10px] font-medium tracking-[0.2em] text-neutral-400 uppercase">
          Asset Class Allocation
        </p>
        <div className="flex items-baseline gap-3 text-[10px] font-medium tracking-[0.15em] uppercase">
          {GROUPING_OPTIONS.map((option, index) => (
            <span
              key={option.value}
              className="inline-flex items-baseline gap-3"
            >
              {index > 0 && <span className="text-neutral-300">/</span>}
              <button
                type="button"
                onClick={() => setGrouping(option.value)}
                className={`transition-colors ${grouping === option.value ? "text-neutral-900" : "text-neutral-400 hover:text-neutral-900"}`}
              >
                {option.label}
              </button>
            </span>
          ))}
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
