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

// Fidelity varies header capitalization between exports ("Current Value" in a
// single-account download, "Current value" in an all-accounts one), and prefixes
// the file with a BOM.
function normalizeHeader(header: string): string {
  return header.replace(/^\uFEFF/, '').trim().toLowerCase();
}

function findColumn(headers: string[], name: string): number {
  return headers.findIndex(h => h === name);
}

function parseDollarValue(str: string): number | null {
  if (!str || str === '--') return null;
  const cleaned = str.replace(/[$,]/g, '');
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

// Fidelity footnotes money market and cash symbols with trailing asterisks
// (SPAXX**, FDRXX**, USD***), which would otherwise miss the catalog.
function stripSymbolFootnote(symbol: string): string {
  return symbol.replace(/\*+$/, '');
}

function looksLikeCash(symbol: string, description: string): boolean {
  const s = symbol.toUpperCase();
  if (!s) return false;
  // Aggregated external accounts report their cash balance with an asterisk-only
  // symbol and no description; Fidelity reports uninvested settlement dollars as
  // a "Pending activity" row.
  if (/^\*+$/.test(s)) return true;
  if (s === 'PENDING ACTIVITY') return true;
  if (s === 'USD' || s === 'CASH') return true;
  if (s.startsWith('CORE')) return true;
  const d = description.toUpperCase();
  return (
    d.includes('MONEY MARKET') ||
    d.includes('CASH') ||
    d.includes('SWEEP') ||
    d.includes('US DOLLARS')
  );
}

interface AccountAccumulator {
  accountNumber: string;
  accountName: string;
  holdings: Holding[];
  byAssetClass: Map<AssetClass, number>;
  byMarketRegion: Map<MarketRegion, number>;
  byFactorStyle: Map<FactorStyle, number>;
  bySizeFactor: Map<SizeFactor, number>;
  totalValue: number;
  totalExposure: number;
  totalEquity: number;
  unknownValue: number;
}

function newAccount(accountNumber: string, accountName: string): AccountAccumulator {
  return {
    accountNumber,
    accountName,
    holdings: [],
    byAssetClass: new Map(),
    byMarketRegion: new Map(),
    byFactorStyle: new Map(),
    bySizeFactor: new Map(),
    totalValue: 0,
    totalExposure: 0,
    totalEquity: 0,
    unknownValue: 0,
  };
}

function addTo<K>(map: Map<K, number>, key: K, dollars: number) {
  map.set(key, (map.get(key) ?? 0) + dollars);
}

/**
 * Parses a Fidelity positions export. A single-account download yields one
 * portfolio; an all-accounts download yields one per account in the file.
 */
export function parsePortfolioCSV(text: string, fileName: string): PortfolioData[] {
  const lines = text.split('\n');
  const headerLine = lines[0];
  if (!headerLine) return [];

  const headers = parseCSVLine(headerLine).map(normalizeHeader);
  const symbolIdx = findColumn(headers, 'symbol');
  const currentValueIdx = findColumn(headers, 'current value');
  const accountNumberIdx = findColumn(headers, 'account number');
  const accountNameIdx = findColumn(headers, 'account name');
  const descriptionIdx = findColumn(headers, 'description');

  if (symbolIdx === -1 || currentValueIdx === -1) return [];

  // Keyed by account so blocks for the same account need not be contiguous.
  const accounts = new Map<string, AccountAccumulator>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('"')) continue;

    const cols = parseCSVLine(line);
    if (cols.length <= Math.max(symbolIdx, currentValueIdx)) continue;

    const value = parseDollarValue(cols[currentValueIdx]);
    if (value === null) continue;

    const accountNumber = accountNumberIdx >= 0 ? (cols[accountNumberIdx] ?? '') : '';
    const accountName = accountNameIdx >= 0 ? (cols[accountNameIdx] ?? '') : '';
    const key = accountNumber || accountName || fileName;

    let account = accounts.get(key);
    if (!account) {
      account = newAccount(accountNumber, accountName);
      accounts.set(key, account);
    }
    if (!account.accountName && accountName) account.accountName = accountName;

    const symbolRaw = (cols[symbolIdx] ?? '').trim();
    const symbol = stripSymbolFootnote(symbolRaw).toUpperCase();
    const description = descriptionIdx >= 0 ? (cols[descriptionIdx] ?? '') : '';

    account.totalValue += value;

    const etf = getETFByTicker(symbol);
    let inCatalog = false;

    if (etf) {
      inCatalog = true;
      for (const { exposure, amount } of etf.exposures) {
        const dollars = value * amount;
        addTo(account.byAssetClass, exposure.assetClass, dollars);
        account.totalExposure += dollars;
        if (exposure.assetClass === 'Equity') {
          account.totalEquity += dollars;
          if (exposure.marketRegion) addTo(account.byMarketRegion, exposure.marketRegion, dollars);
          if (exposure.factorStyle) addTo(account.byFactorStyle, exposure.factorStyle, dollars);
          if (exposure.sizeFactor) addTo(account.bySizeFactor, exposure.sizeFactor, dollars);
        }
      }
    } else if (looksLikeCash(symbolRaw, description)) {
      inCatalog = true;
      addTo(account.byAssetClass, 'Cash', value);
      account.totalExposure += value;
    } else {
      addTo(account.byAssetClass, 'Unknown', value);
      account.totalExposure += value;
      account.unknownValue += value;
    }

    account.holdings.push({
      symbol: symbolRaw || '(cash)',
      description,
      value,
      inCatalog,
    });
  }

  const portfolios: PortfolioData[] = [];
  for (const account of accounts.values()) {
    if (account.totalValue === 0) continue;
    portfolios.push({ ...account, fileName });
  }

  return portfolios;
}
