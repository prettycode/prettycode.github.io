import type {
  AssetClass,
  FactorStyle,
  Holding,
  MarketRegion,
  PortfolioData,
  SizeFactor,
} from '../types';
import { getETFByTicker } from '../data/etfCatalog';

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseDollarValue(str: string): number | null {
  if (!str || str === '--') return null;
  const cleaned = str.replace(/[$,]/g, '');
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

function looksLikeCash(symbol: string, description: string): boolean {
  if (!symbol) return false;
  const s = symbol.toUpperCase();
  if (s === 'CORE**' || s === 'CORE*' || s.startsWith('CORE')) return true;
  const d = description.toUpperCase();
  return d.includes('MONEY MARKET') || d.includes('CASH') || d.includes('SWEEP');
}

export function parsePortfolioCSV(text: string, fileName: string): PortfolioData | null {
  const lines = text.split('\n');
  const headerLine = lines[0];
  if (!headerLine) return null;

  const headers = parseCSVLine(headerLine);
  const symbolIdx = headers.findIndex(h => h === 'Symbol');
  const currentValueIdx = headers.findIndex(h => h === 'Current Value');
  const accountNumberIdx = headers.findIndex(h => h === 'Account Number');
  const accountNameIdx = headers.findIndex(h => h === 'Account Name');
  const descriptionIdx = headers.findIndex(h => h === 'Description');

  if (symbolIdx === -1 || currentValueIdx === -1) return null;

  const holdings: Holding[] = [];
  const byAssetClass = new Map<AssetClass, number>();
  const byMarketRegion = new Map<MarketRegion, number>();
  const byFactorStyle = new Map<FactorStyle, number>();
  const bySizeFactor = new Map<SizeFactor, number>();

  let accountNumber = '';
  let accountName = '';
  let totalValue = 0;
  let totalExposure = 0;
  let totalEquity = 0;
  let unknownValue = 0;

  const addAssetClass = (ac: AssetClass, dollars: number) => {
    byAssetClass.set(ac, (byAssetClass.get(ac) ?? 0) + dollars);
  };
  const addMarketRegion = (mr: MarketRegion, dollars: number) => {
    byMarketRegion.set(mr, (byMarketRegion.get(mr) ?? 0) + dollars);
  };
  const addFactorStyle = (fs: FactorStyle, dollars: number) => {
    byFactorStyle.set(fs, (byFactorStyle.get(fs) ?? 0) + dollars);
  };
  const addSizeFactor = (sf: SizeFactor, dollars: number) => {
    bySizeFactor.set(sf, (bySizeFactor.get(sf) ?? 0) + dollars);
  };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('"')) continue;

    const cols = parseCSVLine(line);
    if (cols.length <= Math.max(symbolIdx, currentValueIdx)) continue;

    const value = parseDollarValue(cols[currentValueIdx]);
    if (value === null) continue;

    if (!accountNumber && accountNumberIdx >= 0 && cols[accountNumberIdx]) {
      accountNumber = cols[accountNumberIdx];
    }
    if (!accountName && accountNameIdx >= 0 && cols[accountNameIdx]) {
      accountName = cols[accountNameIdx];
    }

    const symbolRaw = (cols[symbolIdx] ?? '').trim();
    const symbol = symbolRaw.toUpperCase();
    const description = descriptionIdx >= 0 ? (cols[descriptionIdx] ?? '') : '';

    totalValue += value;

    const etf = getETFByTicker(symbol);
    let inCatalog = false;

    if (etf) {
      inCatalog = true;
      for (const { exposure, amount } of etf.exposures) {
        const dollars = value * amount;
        addAssetClass(exposure.assetClass, dollars);
        totalExposure += dollars;
        if (exposure.assetClass === 'Equity') {
          totalEquity += dollars;
          if (exposure.marketRegion) addMarketRegion(exposure.marketRegion, dollars);
          if (exposure.factorStyle) addFactorStyle(exposure.factorStyle, dollars);
          if (exposure.sizeFactor) addSizeFactor(exposure.sizeFactor, dollars);
        }
      }
    } else if (looksLikeCash(symbol, description)) {
      inCatalog = true;
      addAssetClass('Cash', value);
      totalExposure += value;
    } else {
      addAssetClass('Unknown', value);
      totalExposure += value;
      unknownValue += value;
    }

    holdings.push({
      symbol: symbolRaw || '(cash)',
      description,
      value,
      inCatalog,
    });
  }

  if (totalValue === 0) return null;

  return {
    accountNumber,
    accountName,
    fileName,
    totalValue,
    holdings,
    byAssetClass,
    byMarketRegion,
    byFactorStyle,
    bySizeFactor,
    totalEquity,
    totalExposure,
    unknownValue,
  };
}
