import type { AssetClass, CryptoAssetClass } from "../types";
import { CRYPTO_ORDER } from "./assetClassHierarchy";

export interface CryptoSlice {
  assetClass: CryptoAssetClass;
  value: number;
  // Share of total crypto, 0-100.
  pct: number;
  // Whole-number share of total crypto; the parts sum to exactly 100.
  ratioPart: number;
}

export interface CryptoSplit {
  total: number;
  slices: CryptoSlice[];
}

export const CRYPTO_SHORT_LABEL: Record<CryptoAssetClass, string> = {
  Bitcoin: "BTC",
  Ethereum: "ETH",
  Altcoins: "ALT",
};

// Rounds shares to whole numbers that still add up to 100 (largest remainder).
function wholeParts(values: number[], total: number): number[] {
  if (total <= 0) return values.map(() => 0);
  const exact = values.map((v) => (v / total) * 100);
  const floors = exact.map(Math.floor);
  let remaining = 100 - floors.reduce((sum, f) => sum + f, 0);
  const order = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder);
  const parts = [...floors];
  for (const { index } of order) {
    if (remaining <= 0) break;
    parts[index] += 1;
    remaining -= 1;
  }
  return parts;
}

export function cryptoSplit(
  byAssetClass: Map<AssetClass, number>,
): CryptoSplit {
  const values = CRYPTO_ORDER.map((ac) => byAssetClass.get(ac) ?? 0);
  const total = values.reduce((sum, v) => sum + v, 0);
  const parts = wholeParts(values, total);
  return {
    total,
    slices: CRYPTO_ORDER.map((assetClass, i) => ({
      assetClass,
      value: values[i],
      pct: total > 0 ? (values[i] / total) * 100 : 0,
      ratioPart: parts[i],
    })),
  };
}

// "58 : 30 : 12", covering only the sleeves that are actually held.
export function cryptoRatioText(split: CryptoSplit): string {
  return split.slices
    .filter((s) => s.value > 0)
    .map((s) => s.ratioPart)
    .join(" : ");
}
