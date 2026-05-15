import type { AssetClass } from '../types';

export const ASSET_CLASS_COLORS: Record<AssetClass, string> = {
  'Equity': '#2563eb',
  'U.S. Treasuries': '#10b981',
  'Managed Futures': '#7070f8',
  'Futures Yield': '#a855f7',
  'Gold': '#eab308',
  'Bitcoin': '#b45309',
  'Ethereum': '#3f3f46',
  'Cash': '#a3a3a3',
  'Unknown': '#d4d4d8',
};

// Ordered for consistent rendering across portfolios.
export const ASSET_CLASS_ORDER: AssetClass[] = [
  'Equity',
  'U.S. Treasuries',
  'Managed Futures',
  'Futures Yield',
  'Gold',
  'Bitcoin',
  'Ethereum',
  'Cash',
  'Unknown',
];
