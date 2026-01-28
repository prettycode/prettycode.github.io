// Shared ETF data used across the application
// This contains only the static configuration data that cannot be fetched from APIs
// Dynamic data (name, expenseRatio, yield, netAssets) is fetched via the fetch-bond-yields script

export type ManagementStyle = 'active' | 'passive';

export interface BondETF {
    ticker: string;
    duration: Duration;
    managementStyle: ManagementStyle;
}

export type Duration = 'any' | 'cash' | 'ultra-short' | 'short' | 'intermediate' | 'long' | 'extended' | 'total-market';

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

// Tax-Exempt Municipal Bond ETFs
export const TAX_EXEMPT_MUNI_ETFS: BondETF[] = [
    { ticker: 'SUB', duration: 'short', managementStyle: 'passive' },
    { ticker: 'VTES', duration: 'short', managementStyle: 'passive' },
    { ticker: 'VTEI', duration: 'intermediate', managementStyle: 'passive' },
    { ticker: 'VWIUX', duration: 'intermediate', managementStyle: 'passive' },
    { ticker: 'VTEL', duration: 'long', managementStyle: 'passive' },
    { ticker: 'VTEB', duration: 'total-market', managementStyle: 'passive' },
    { ticker: 'VCRM', duration: 'total-market', managementStyle: 'active' },
    { ticker: 'MUB', duration: 'total-market', managementStyle: 'passive' },
    { ticker: 'AVMU', duration: 'total-market', managementStyle: 'active' },
    { ticker: 'DFNM', duration: 'total-market', managementStyle: 'passive' },
];

// Taxable Treasury Bond ETFs
export const TAXABLE_TREASURY_ETFS: BondETF[] = [
    { ticker: 'SGOV', duration: 'cash', managementStyle: 'passive' },
    { ticker: 'VBIL', duration: 'cash', managementStyle: 'passive' },
    { ticker: 'VGUS', duration: 'ultra-short', managementStyle: 'passive' },
    { ticker: 'GOVT', duration: 'total-market', managementStyle: 'passive' },
    { ticker: 'VTG', duration: 'total-market', managementStyle: 'passive' },
    { ticker: 'ZROZ', duration: 'extended', managementStyle: 'passive' },
    { ticker: 'VGSH', duration: 'short', managementStyle: 'passive' },
    { ticker: 'VGIT', duration: 'intermediate', managementStyle: 'passive' },
    { ticker: 'VGLT', duration: 'long', managementStyle: 'passive' },
    { ticker: 'EDV', duration: 'extended', managementStyle: 'passive' },
    { ticker: 'GOVZ', duration: 'extended', managementStyle: 'passive' },
];

// All ETFs combined (for fetching data)
export const ALL_BOND_ETFS: BondETF[] = [...TAX_EXEMPT_MUNI_ETFS, ...TAXABLE_TREASURY_ETFS];
