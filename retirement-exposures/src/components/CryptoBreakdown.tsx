import { useState } from "react";
import type { AssetClass } from "../types";
import { ASSET_CLASS_COLORS } from "../data/colors";
import { formatCurrencyShort, formatPercent } from "../utils/format";
import { labelFor } from "../utils/labels";
import {
  CRYPTO_SHORT_LABEL,
  cryptoRatioText,
  cryptoSplit,
} from "../utils/crypto";
import { StackedBar, type BarSegment } from "./StackedBar";

export function CryptoBreakdown({
  byAssetClass,
  totalValue,
  collapsible = false,
}: {
  byAssetClass: Map<AssetClass, number>;
  totalValue: number;
  collapsible?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const split = cryptoSplit(byAssetClass);
  if (split.total <= 0) return null;

  const held = split.slices.filter((s) => s.value > 0);
  const heading = "text-xs font-semibold tracking-[0.2em] text-neutral-900";
  const ratio = cryptoRatioText(split);
  const ratioLabels = held
    .map((s) => CRYPTO_SHORT_LABEL[s.assetClass])
    .join(" : ");

  const meta = (
    <span className="text-[10px] font-normal text-neutral-400 normal-case tracking-normal ml-2">
      <span className="tabular-nums text-neutral-600">{ratio}</span>{" "}
      {ratioLabels} · {formatCurrencyShort(split.total)} total
    </span>
  );

  const segments: BarSegment[] = held.map((s) => ({
    label: labelFor(s.assetClass),
    value: s.value,
    color: ASSET_CLASS_COLORS[s.assetClass],
  }));

  const body = (
    <>
      <div className="flex items-baseline gap-3 mb-5">
        <span className="font-serif text-3xl sm:text-4xl leading-none text-neutral-900 tabular-nums">
          {ratio}
        </span>
        <span className="text-[10px] font-medium tracking-[0.15em] text-neutral-400 uppercase">
          {ratioLabels}
        </span>
      </div>
      <StackedBar segments={segments} total={split.total} height={20} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4 mt-6">
        {held.map((s) => (
          <div key={s.assetClass} className="flex items-start gap-3">
            <span
              className="inline-block w-1.5 flex-shrink-0 mt-1.5"
              style={{
                backgroundColor: ASSET_CLASS_COLORS[s.assetClass],
                height: 10,
              }}
            />
            <div className="min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-[10px] font-medium tracking-[0.15em] text-neutral-500 uppercase">
                  {labelFor(s.assetClass)}
                </span>
                <span className="text-sm font-medium text-neutral-900 tabular-nums">
                  {s.pct.toFixed(1)}%
                </span>
                <span className="text-[9px] tracking-[0.1em] text-neutral-400 uppercase">
                  of crypto
                </span>
              </div>
              <div className="text-xs text-neutral-400 tabular-nums mt-0.5">
                {formatCurrencyShort(s.value)} ·{" "}
                {formatPercent(s.value, totalValue, 1)} of NAV
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  if (!collapsible) {
    return (
      <>
        <p className={`${heading} uppercase mb-5`}>
          Crypto Breakdown
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
        onClick={() => setExpanded((e) => !e)}
        className={`w-full flex items-baseline text-left ${heading} uppercase ${expanded ? "mb-5" : ""} hover:text-neutral-900 transition-colors group`}
        aria-expanded={expanded}
      >
        <svg
          width="8"
          height="8"
          viewBox="0 0 8 8"
          className={`mr-2 flex-shrink-0 text-neutral-900 transition-transform ${expanded ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 1l4 3-4 3" />
        </svg>
        Crypto Breakdown
        {meta}
      </button>
      {expanded && body}
    </>
  );
}
