import type { AssetClass } from "../types";

export const ASSET_CLASS_COLORS: Record<AssetClass, string> = {
  Equity: "#2563eb",
  "U.S. Treasuries": "#10b981",
  Trend: "#7070f8",
  Carry: "#a855f7",
  Gold: "#eab308",
  Bitcoin: "#b45309",
  Ethereum: "#3f3f46",
  Altcoins: "#e11d48",
  Cash: "#a3a3a3",
  Unknown: "#d4d4d8",
};

// Ordered for consistent rendering across portfolios.
export const ASSET_CLASS_ORDER: AssetClass[] = [
  "Equity",
  "U.S. Treasuries",
  "Trend",
  "Carry",
  "Gold",
  "Bitcoin",
  "Ethereum",
  "Altcoins",
  "Cash",
  "Unknown",
];
