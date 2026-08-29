import type { AssetClass, AssetClassGroup, CryptoAssetClass } from "../types";
import { ASSET_CLASS_COLORS } from "../data/colors";

export type AssetClassNode = AssetClass | AssetClassGroup;

export const ASSET_CLASS_GROUP_COLORS: Record<AssetClassGroup, string> = {
  Equity: ASSET_CLASS_COLORS.Equity,
  "U.S. Treasuries": ASSET_CLASS_COLORS["U.S. Treasuries"],
  Alternatives: "#7c3aed",
  "Managed Futures": "#7070f8",
  Crypto: "#b45309",
};

export const TOP_LEVEL_ASSET_CLASS_ORDER: AssetClassGroup[] = [
  "Equity",
  "U.S. Treasuries",
  "Alternatives",
];

export const ALTERNATIVES_ORDER: AssetClassNode[] = [
  "Managed Futures",
  "Crypto",
  "Gold",
  "Cash",
  "Unknown",
];

export const ASSET_CLASS_SUBGROUP_ORDER: AssetClassNode[] = [
  "Equity",
  "U.S. Treasuries",
  ...ALTERNATIVES_ORDER,
];

export const MANAGED_FUTURES_ORDER: AssetClass[] = ["Trend", "Carry"];
export const CRYPTO_ORDER: CryptoAssetClass[] = [
  "Bitcoin",
  "Ethereum",
  "Altcoins",
];

export function topLevelGroupFor(ac: AssetClass): AssetClassGroup {
  if (ac === "Equity" || ac === "U.S. Treasuries") return ac;
  return "Alternatives";
}

export function alternativesGroupFor(ac: AssetClass): AssetClassNode | null {
  if (ac === "Equity" || ac === "U.S. Treasuries") return null;
  if (ac === "Trend" || ac === "Carry") return "Managed Futures";
  if (ac === "Bitcoin" || ac === "Ethereum" || ac === "Altcoins")
    return "Crypto";
  return ac;
}

export function aggregateTopLevelAssetClasses(
  byAssetClass: Map<AssetClass, number>,
): Map<AssetClassGroup, number> {
  const result = new Map<AssetClassGroup, number>();
  for (const [ac, value] of byAssetClass) {
    const group = topLevelGroupFor(ac);
    result.set(group, (result.get(group) ?? 0) + value);
  }
  return result;
}

export function aggregateAlternatives(
  byAssetClass: Map<AssetClass, number>,
): Map<AssetClassNode, number> {
  const result = new Map<AssetClassNode, number>();
  for (const [ac, value] of byAssetClass) {
    const group = alternativesGroupFor(ac);
    if (!group) continue;
    result.set(group, (result.get(group) ?? 0) + value);
  }
  return result;
}

export function aggregateAssetClassSubgroups(
  byAssetClass: Map<AssetClass, number>,
): Map<AssetClassNode, number> {
  const result = new Map<AssetClassNode, number>();
  for (const [ac, value] of byAssetClass) {
    const group = alternativesGroupFor(ac) ?? ac;
    result.set(group, (result.get(group) ?? 0) + value);
  }
  return result;
}
