import type {
  AssetClass,
  AssetClassGroup,
  FactorStyle,
  MarketRegion,
  SizeFactor,
} from "../types";

export const REGION_ORDER: MarketRegion[] = [
  "U.S.",
  "International Developed",
  "Emerging",
];
export const REGION_LABEL: Record<MarketRegion, string> = {
  "U.S.": "US",
  "International Developed": "Int'l",
  Emerging: "EM",
};

export const STYLE_ORDER: FactorStyle[] = ["Blend", "Value", "Growth"];

export const SIZE_ORDER: SizeFactor[] = ["Large Cap", "Mid Cap", "Small Cap"];
export const SIZE_LABEL: Record<SizeFactor, string> = {
  "Large Cap": "Large",
  "Mid Cap": "Mid",
  "Small Cap": "Small",
};

const ASSET_CLASS_LABEL: Partial<Record<AssetClass, string>> = {
  "U.S. Treasuries": "Treasuries",
};

export function labelFor(ac: AssetClass): string {
  return ASSET_CLASS_LABEL[ac] ?? ac;
}

const ASSET_CLASS_GROUP_LABEL: Partial<Record<AssetClassGroup, string>> = {
  "U.S. Treasuries": "Treasuries",
};

export function labelForAssetClassGroup(group: AssetClassGroup): string {
  return ASSET_CLASS_GROUP_LABEL[group] ?? group;
}

export function labelForAssetClassNode(
  node: AssetClass | AssetClassGroup,
): string {
  if (
    node === "Equity" ||
    node === "U.S. Treasuries" ||
    node === "Alternatives" ||
    node === "Managed Futures" ||
    node === "Crypto"
  ) {
    return labelForAssetClassGroup(node);
  }
  return labelFor(node);
}
