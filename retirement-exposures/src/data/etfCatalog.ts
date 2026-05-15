import type { ETF, ExposureAmount, LeverageType } from '../types';

function mk(
  ticker: string,
  exposures: ExposureAmount[],
  leverageType: LeverageType = 'None'
): ETF {
  return { ticker, exposures, leverageType };
}

const usLargeBlend: ExposureAmount = {
  exposure: { assetClass: 'Equity', marketRegion: 'U.S.', factorStyle: 'Blend', sizeFactor: 'Large Cap' },
  amount: 1,
};
const usLargeGrowth: ExposureAmount = {
  exposure: { assetClass: 'Equity', marketRegion: 'U.S.', factorStyle: 'Growth', sizeFactor: 'Large Cap' },
  amount: 1,
};
const usLargeValue: ExposureAmount = {
  exposure: { assetClass: 'Equity', marketRegion: 'U.S.', factorStyle: 'Value', sizeFactor: 'Large Cap' },
  amount: 1,
};
const usSmallBlend: ExposureAmount = {
  exposure: { assetClass: 'Equity', marketRegion: 'U.S.', factorStyle: 'Blend', sizeFactor: 'Small Cap' },
  amount: 1,
};
const usSmallValue: ExposureAmount = {
  exposure: { assetClass: 'Equity', marketRegion: 'U.S.', factorStyle: 'Value', sizeFactor: 'Small Cap' },
  amount: 1,
};
const intlLargeBlend: ExposureAmount = {
  exposure: { assetClass: 'Equity', marketRegion: 'International Developed', factorStyle: 'Blend', sizeFactor: 'Large Cap' },
  amount: 1,
};
const emLargeBlend: ExposureAmount = {
  exposure: { assetClass: 'Equity', marketRegion: 'Emerging', factorStyle: 'Blend', sizeFactor: 'Large Cap' },
  amount: 1,
};

export const etfCatalog: ETF[] = [
  // Return Stacked
  mk('RSST', [usLargeBlend, { exposure: { assetClass: 'Managed Futures' }, amount: 1 }], 'Stacked'),
  mk('RSIT', [intlLargeBlend, { exposure: { assetClass: 'Managed Futures' }, amount: 1 }], 'Stacked'),
  mk('RSSX', [usLargeBlend, { exposure: { assetClass: 'Gold' }, amount: 0.8 }, { exposure: { assetClass: 'Bitcoin' }, amount: 0.2 }], 'Stacked'),
  mk('RSBT', [{ exposure: { assetClass: 'U.S. Treasuries' }, amount: 1 }, { exposure: { assetClass: 'Managed Futures' }, amount: 1 }], 'Stacked'),
  mk('RSSY', [usLargeBlend, { exposure: { assetClass: 'Futures Yield' }, amount: 1 }], 'Stacked'),
  mk('RSBY', [{ exposure: { assetClass: 'U.S. Treasuries' }, amount: 1 }, { exposure: { assetClass: 'Futures Yield' }, amount: 1 }], 'Stacked'),
  mk('RSSB', [
    { exposure: { ...usLargeBlend.exposure }, amount: 0.6 },
    { exposure: { ...intlLargeBlend.exposure }, amount: 0.3 },
    { exposure: { ...emLargeBlend.exposure }, amount: 0.1 },
    { exposure: { assetClass: 'U.S. Treasuries' }, amount: 1 },
  ], 'Stacked'),

  // PIMCO StocksPLUS
  mk('SPLS', [usLargeBlend, { exposure: { assetClass: 'U.S. Treasuries' }, amount: 1 }], 'Stacked'),

  // Leveraged Treasuries
  mk('TMF', [{ exposure: { assetClass: 'U.S. Treasuries' }, amount: 3 }], 'Daily Reset'),
  mk('UBT', [{ exposure: { assetClass: 'U.S. Treasuries' }, amount: 2 }], 'Daily Reset'),
  mk('ZROZ', [{ exposure: { assetClass: 'U.S. Treasuries' }, amount: 1.5 }], 'Extended Duration'),
  mk('EDV', [{ exposure: { assetClass: 'U.S. Treasuries' }, amount: 1.5 }], 'Extended Duration'),
  mk('GOVZ', [{ exposure: { assetClass: 'U.S. Treasuries' }, amount: 1.5 }], 'Extended Duration'),

  // Treasuries / bonds
  mk('TLT', [{ exposure: { assetClass: 'U.S. Treasuries' }, amount: 1 }]),
  mk('IEF', [{ exposure: { assetClass: 'U.S. Treasuries' }, amount: 1 }]),
  mk('SHY', [{ exposure: { assetClass: 'U.S. Treasuries' }, amount: 1 }]),
  mk('GOVT', [{ exposure: { assetClass: 'U.S. Treasuries' }, amount: 1 }]),
  mk('BND', [{ exposure: { assetClass: 'U.S. Treasuries' }, amount: 1 }]),
  mk('AGG', [{ exposure: { assetClass: 'U.S. Treasuries' }, amount: 1 }]),
  mk('BNDX', [{ exposure: { assetClass: 'U.S. Treasuries' }, amount: 1 }]),
  mk('FXNAX', [{ exposure: { assetClass: 'U.S. Treasuries' }, amount: 1 }]),
  mk('FBND', [{ exposure: { assetClass: 'U.S. Treasuries' }, amount: 1 }]),

  // Gold
  mk('UGL', [{ exposure: { assetClass: 'Gold' }, amount: 2 }], 'Daily Reset'),
  mk('GLDM', [{ exposure: { assetClass: 'Gold' }, amount: 1 }]),
  mk('GLD', [{ exposure: { assetClass: 'Gold' }, amount: 1 }]),
  mk('IAU', [{ exposure: { assetClass: 'Gold' }, amount: 1 }]),
  mk('IAUM', [{ exposure: { assetClass: 'Gold' }, amount: 1 }]),
  mk('SGOL', [{ exposure: { assetClass: 'Gold' }, amount: 1 }]),
  mk('FGDL', [{ exposure: { assetClass: 'Gold' }, amount: 1 }]),

  // Stacked Gold + Equity / Crypto
  mk('GDE', [{ exposure: usLargeBlend.exposure, amount: 0.9 }, { exposure: { assetClass: 'Gold' }, amount: 0.9 }], 'Stacked'),
  mk('BTGD', [{ exposure: { assetClass: 'Bitcoin' }, amount: 1 }, { exposure: { assetClass: 'Gold' }, amount: 1 }], 'Stacked'),

  // NTSx
  mk('NTSX', [{ exposure: usLargeBlend.exposure, amount: 0.9 }, { exposure: { assetClass: 'U.S. Treasuries' }, amount: 0.6 }], 'Stacked'),
  mk('NTSI', [{ exposure: intlLargeBlend.exposure, amount: 0.9 }, { exposure: { assetClass: 'U.S. Treasuries' }, amount: 0.6 }], 'Stacked'),
  mk('NTSE', [{ exposure: emLargeBlend.exposure, amount: 0.9 }, { exposure: { assetClass: 'U.S. Treasuries' }, amount: 0.6 }], 'Stacked'),
  mk('NTSD', [{ exposure: usLargeBlend.exposure, amount: 0.9 }, { exposure: intlLargeBlend.exposure, amount: 0.6 }], 'Stacked'),

  // Bitcoin
  mk('IBIT', [{ exposure: { assetClass: 'Bitcoin' }, amount: 1 }]),
  mk('FBTC', [{ exposure: { assetClass: 'Bitcoin' }, amount: 1 }]),
  mk('GBTC', [{ exposure: { assetClass: 'Bitcoin' }, amount: 1 }]),
  mk('BITB', [{ exposure: { assetClass: 'Bitcoin' }, amount: 1 }]),
  mk('ARKB', [{ exposure: { assetClass: 'Bitcoin' }, amount: 1 }]),
  mk('HODL', [{ exposure: { assetClass: 'Bitcoin' }, amount: 1 }]),
  mk('BRRR', [{ exposure: { assetClass: 'Bitcoin' }, amount: 1 }]),
  mk('EZBC', [{ exposure: { assetClass: 'Bitcoin' }, amount: 1 }]),
  mk('BTCO', [{ exposure: { assetClass: 'Bitcoin' }, amount: 1 }]),

  // Ethereum
  mk('ETHA', [{ exposure: { assetClass: 'Ethereum' }, amount: 1 }]),
  mk('ETHE', [{ exposure: { assetClass: 'Ethereum' }, amount: 1 }]),
  mk('FETH', [{ exposure: { assetClass: 'Ethereum' }, amount: 1 }]),
  mk('ETHW', [{ exposure: { assetClass: 'Ethereum' }, amount: 1 }]),
  mk('ETHV', [{ exposure: { assetClass: 'Ethereum' }, amount: 1 }]),
  mk('CETH', [{ exposure: { assetClass: 'Ethereum' }, amount: 1 }]),
  mk('EZET', [{ exposure: { assetClass: 'Ethereum' }, amount: 1 }]),
  mk('QETH', [{ exposure: { assetClass: 'Ethereum' }, amount: 1 }]),

  // Leveraged equity
  mk('UPRO', [{ exposure: usLargeBlend.exposure, amount: 3 }], 'Daily Reset'),
  mk('SSO', [{ exposure: usLargeBlend.exposure, amount: 2 }], 'Daily Reset'),
  mk('SPXL', [{ exposure: usLargeBlend.exposure, amount: 3 }], 'Daily Reset'),
  mk('QLD', [{ exposure: usLargeGrowth.exposure, amount: 2 }], 'Daily Reset'),
  mk('TQQQ', [{ exposure: usLargeGrowth.exposure, amount: 3 }], 'Daily Reset'),
  mk('UDOW', [{ exposure: usLargeValue.exposure, amount: 3 }], 'Daily Reset'),
  mk('DDM', [{ exposure: usLargeValue.exposure, amount: 2 }], 'Daily Reset'),
  mk('EDC', [{ exposure: emLargeBlend.exposure, amount: 3 }], 'Daily Reset'),
  mk('EET', [{ exposure: emLargeBlend.exposure, amount: 2 }], 'Daily Reset'),

  // Broad market funds
  mk('VT', [
    { exposure: usLargeBlend.exposure, amount: 0.6 },
    { exposure: intlLargeBlend.exposure, amount: 0.3 },
    { exposure: emLargeBlend.exposure, amount: 0.1 },
  ]),
  mk('AVGV', [
    { exposure: usLargeValue.exposure, amount: 0.6 },
    { exposure: { assetClass: 'Equity', marketRegion: 'International Developed', factorStyle: 'Value', sizeFactor: 'Large Cap' }, amount: 0.3 },
    { exposure: { assetClass: 'Equity', marketRegion: 'Emerging', factorStyle: 'Value', sizeFactor: 'Large Cap' }, amount: 0.1 },
  ]),
  mk('VXUS', [
    { exposure: intlLargeBlend.exposure, amount: 0.66 },
    { exposure: emLargeBlend.exposure, amount: 0.34 },
  ]),
  mk('IXUS', [
    { exposure: intlLargeBlend.exposure, amount: 0.7 },
    { exposure: emLargeBlend.exposure, amount: 0.3 },
  ]),
  mk('FTIHX', [
    { exposure: intlLargeBlend.exposure, amount: 0.7 },
    { exposure: emLargeBlend.exposure, amount: 0.3 },
  ]),
  mk('FZILX', [
    { exposure: intlLargeBlend.exposure, amount: 0.7 },
    { exposure: emLargeBlend.exposure, amount: 0.3 },
  ]),

  // US large blend
  mk('VOO', [usLargeBlend]),
  mk('SPY', [usLargeBlend]),
  mk('IVV', [usLargeBlend]),
  mk('SPLG', [usLargeBlend]),
  mk('VTI', [usLargeBlend]),
  mk('ITOT', [usLargeBlend]),
  mk('SCHB', [usLargeBlend]),
  mk('FXAIX', [usLargeBlend]),
  mk('FNILX', [usLargeBlend]),
  mk('FSKAX', [usLargeBlend]),
  mk('FZROX', [usLargeBlend]),
  mk('FXROX', [usLargeBlend]),
  mk('84679P835', [usLargeBlend]),

  // US large growth
  mk('QQQM', [usLargeGrowth]),
  mk('QQQ', [usLargeGrowth]),
  mk('VUG', [usLargeGrowth]),
  mk('IWF', [usLargeGrowth]),
  mk('SCHG', [usLargeGrowth]),
  mk('FBGRX', [usLargeGrowth]),
  mk('FCNTX', [usLargeGrowth]),

  // US large value
  mk('VTV', [usLargeValue]),
  mk('IWD', [usLargeValue]),
  mk('SCHV', [usLargeValue]),
  mk('AVLV', [usLargeValue]),

  // US small
  mk('VB', [usSmallBlend]),
  mk('IJR', [usSmallBlend]),
  mk('IWM', [usSmallBlend]),
  mk('VBR', [usSmallValue]),
  mk('AVUV', [usSmallValue]),

  // International developed
  mk('VEA', [{ exposure: intlLargeBlend.exposure, amount: 1 }]),
  mk('IEFA', [{ exposure: intlLargeBlend.exposure, amount: 1 }]),
  mk('SCHF', [{ exposure: intlLargeBlend.exposure, amount: 1 }]),
  mk('AVDV', [{ exposure: { assetClass: 'Equity', marketRegion: 'International Developed', factorStyle: 'Value', sizeFactor: 'Small Cap' }, amount: 1 }]),
  mk('AVDS', [{ exposure: { assetClass: 'Equity', marketRegion: 'International Developed', factorStyle: 'Blend', sizeFactor: 'Small Cap' }, amount: 1 }]),

  // Emerging markets
  mk('VWO', [{ exposure: emLargeBlend.exposure, amount: 1 }]),
  mk('IEMG', [{ exposure: emLargeBlend.exposure, amount: 1 }]),
  mk('SCHE', [{ exposure: emLargeBlend.exposure, amount: 1 }]),
  mk('AVES', [{ exposure: emLargeBlend.exposure, amount: 1 }]),
  mk('AVEE', [{ exposure: { assetClass: 'Equity', marketRegion: 'Emerging', factorStyle: 'Blend', sizeFactor: 'Small Cap' }, amount: 1 }]),
  mk('DGS', [{ exposure: { assetClass: 'Equity', marketRegion: 'Emerging', factorStyle: 'Value', sizeFactor: 'Small Cap' }, amount: 1 }]),

  // Managed Futures / Trend
  mk('KMLM', [{ exposure: { assetClass: 'Managed Futures' }, amount: 1 }]),
  mk('CTA', [{ exposure: { assetClass: 'Managed Futures' }, amount: 1 }]),
  mk('DBMF', [{ exposure: { assetClass: 'Managed Futures' }, amount: 1 }]),

  // Cash / money market
  mk('SPAXX', [{ exposure: { assetClass: 'Cash' }, amount: 1 }]),
  mk('FZFXX', [{ exposure: { assetClass: 'Cash' }, amount: 1 }]),
  mk('FDRXX', [{ exposure: { assetClass: 'Cash' }, amount: 1 }]),
  mk('FDLXX', [{ exposure: { assetClass: 'Cash' }, amount: 1 }]),
  mk('VMFXX', [{ exposure: { assetClass: 'Cash' }, amount: 1 }]),
  mk('VUSXX', [{ exposure: { assetClass: 'Cash' }, amount: 1 }]),
  mk('SGOV', [{ exposure: { assetClass: 'Cash' }, amount: 1 }]),
  mk('BIL', [{ exposure: { assetClass: 'Cash' }, amount: 1 }]),
];

const byTicker = new Map(etfCatalog.map(e => [e.ticker, e]));

export function getETFByTicker(ticker: string): ETF | undefined {
  return byTicker.get(ticker.toUpperCase());
}
