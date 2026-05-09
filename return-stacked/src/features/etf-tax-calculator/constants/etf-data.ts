// Static ETF data used across the application.
// Values are illustrative — not live quotes.

export type ManagementStyle = 'active' | 'passive';

export type Duration = 'any' | 'cash' | 'ultra-short' | 'short' | 'intermediate' | 'long' | 'extended' | 'total-market';

export interface BondETF {
    ticker: string;
    name: string;
    duration: Duration;
    managementStyle: ManagementStyle;
    yield: number;
    expenseRatio: number;
}

export const DURATION_LABELS: Record<Duration, string> = {
    any: 'Any Duration',
    cash: 'Cash',
    'ultra-short': 'Ultra-Short',
    short: 'Short',
    intermediate: 'Intermediate',
    long: 'Long',
    extended: 'Extended',
    'total-market': 'Total',
};

export const TAX_EXEMPT_MUNI_ETFS: BondETF[] = [
    { ticker: 'SUB', name: 'iShares Short-Term National Muni Bond ETF', duration: 'short', managementStyle: 'passive', yield: 2.5, expenseRatio: 0.07 },
    { ticker: 'VTES', name: 'Vanguard Short-Term Tax-Exempt Bond ETF', duration: 'short', managementStyle: 'passive', yield: 2.47, expenseRatio: 0.05 },
    { ticker: 'VTEI', name: 'Vanguard Intermediate-Term Tax-Exempt Bond ETF', duration: 'intermediate', managementStyle: 'passive', yield: 3.03, expenseRatio: 0.08 },
    { ticker: 'VWIUX', name: 'Vanguard Intermediate-Term Tax-Exempt Fund Admiral Shares', duration: 'intermediate', managementStyle: 'passive', yield: 3.05, expenseRatio: 0.09 },
    { ticker: 'VTEL', name: 'Vanguard Long-Term Tax-Exempt Bond ETF', duration: 'long', managementStyle: 'passive', yield: 4.0, expenseRatio: 0.09 },
    { ticker: 'VTEB', name: 'Vanguard Tax-Exempt Bond Index Fund ETF', duration: 'total-market', managementStyle: 'passive', yield: 3.51, expenseRatio: 0.03 },
    { ticker: 'VCRM', name: 'Vanguard Core Tax-Exempt Bond ETF', duration: 'total-market', managementStyle: 'active', yield: 3.18, expenseRatio: 0.12 },
    { ticker: 'MUB', name: 'iShares National Muni Bond ETF', duration: 'total-market', managementStyle: 'passive', yield: 3.36, expenseRatio: 0.05 },
    { ticker: 'AVMU', name: 'Avantis Core Municipal Fixed Income ETF', duration: 'total-market', managementStyle: 'active', yield: 3.5, expenseRatio: 0.15 },
    { ticker: 'DFNM', name: 'Dimensional National Municipal Bond ETF', duration: 'total-market', managementStyle: 'passive', yield: 2.97, expenseRatio: 0.17 },
];

export const TAXABLE_TREASURY_ETFS: BondETF[] = [
    { ticker: 'SGOV', name: 'iShares 0-3 Month Treasury Bond ETF', duration: 'cash', managementStyle: 'passive', yield: 3.54, expenseRatio: 0.09 },
    { ticker: 'VBIL', name: 'Vanguard 0-3 Month Treasury Bill ETF', duration: 'cash', managementStyle: 'passive', yield: 3.56, expenseRatio: 0.06 },
    { ticker: 'VGUS', name: 'Vanguard Ultra-Short Treasury ETF', duration: 'ultra-short', managementStyle: 'passive', yield: 3.61, expenseRatio: 0.07 },
    { ticker: 'GOVT', name: 'iShares U.S. Treasury Bond ETF', duration: 'total-market', managementStyle: 'passive', yield: 4.06, expenseRatio: 0.05 },
    { ticker: 'VTG', name: 'Vanguard Total Treasury ETF', duration: 'total-market', managementStyle: 'passive', yield: 3.89, expenseRatio: 0.03 },
    { ticker: 'ZROZ', name: 'PIMCO 25+ Year Zero Coupon U.S. Treasury Index ETF', duration: 'extended', managementStyle: 'passive', yield: 4.99, expenseRatio: 0.15 },
    { ticker: 'VGSH', name: 'Vanguard Short-Term Treasury Index Fund ETF', duration: 'short', managementStyle: 'passive', yield: 3.76, expenseRatio: 0.03 },
    { ticker: 'VGIT', name: 'Vanguard Intermediate-Term Treasury Index Fund ETF', duration: 'intermediate', managementStyle: 'passive', yield: 3.95, expenseRatio: 0.03 },
    { ticker: 'VGLT', name: 'Vanguard Long-Term Treasury Index Fund ETF', duration: 'long', managementStyle: 'passive', yield: 4.9, expenseRatio: 0.03 },
    { ticker: 'EDV', name: 'Vanguard Extended Duration Treasury Index Fund ETF', duration: 'extended', managementStyle: 'passive', yield: 5.19, expenseRatio: 0.05 },
    { ticker: 'GOVZ', name: 'iShares 25+ Year Treasury STRIPS Bond ETF', duration: 'extended', managementStyle: 'passive', yield: 5.01, expenseRatio: 0.1 },
];
