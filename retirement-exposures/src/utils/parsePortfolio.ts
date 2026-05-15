import type { PortfolioData } from '../types';

const BTC_SYMBOLS = new Set(['FBTC', 'IBIT']);
const ETH_SYMBOLS = new Set(['ETHA']);

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

export function parsePortfolioCSV(text: string, fileName: string): PortfolioData | null {
  const lines = text.split('\n');

  const headerLine = lines[0];
  if (!headerLine) return null;

  const headers = parseCSVLine(headerLine);

  const symbolIdx = headers.findIndex(h => h === 'Symbol');
  const currentValueIdx = headers.findIndex(h => h === 'Current Value');
  const accountNumberIdx = headers.findIndex(h => h === 'Account Number');
  const accountNameIdx = headers.findIndex(h => h === 'Account Name');

  if (symbolIdx === -1 || currentValueIdx === -1) return null;

  let accountNumber = '';
  let accountName = '';
  let totalValue = 0;
  let btcExposure = 0;
  let ethExposure = 0;

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

    totalValue += value;

    const symbol = cols[symbolIdx];
    if (BTC_SYMBOLS.has(symbol)) {
      btcExposure += value;
    } else if (ETH_SYMBOLS.has(symbol)) {
      ethExposure += value;
    }
  }

  if (totalValue === 0) return null;

  return {
    accountNumber,
    accountName,
    fileName,
    totalValue,
    btcExposure,
    ethExposure,
    otherExposure: totalValue - btcExposure - ethExposure,
  };
}
