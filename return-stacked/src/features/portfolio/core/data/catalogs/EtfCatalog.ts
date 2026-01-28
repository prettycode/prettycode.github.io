/**
 * ETF catalog - All available ETF definitions with their exposures
 */

import type { ETF } from '../../domain/ETF';
import { createETF } from '../factories/EtfFactory';

/**
 * ETF catalog with all available instruments
 */
export const etfCatalog: ETF[] = [
    createETF(
        'RSST',
        [
            {
                exposure: {
                    assetClass: 'Equity',
                    marketRegion: 'U.S.',
                    factorStyle: 'Blend',
                    sizeFactor: 'Large Cap',
                },
                amount: 1.0,
            },
            { exposure: { assetClass: 'Managed Futures' }, amount: 1.0 },
        ],
        'Stacked',
        {
            name: 'Return Stacked® U.S. Stocks & Managed Futures ETF',
            inceptionDate: '2023-09-06',
            expenseRatio: 0.95,
            netAssets: '$150M',
            yield: 0,
        }
    ),

    createETF(
        'RSSX',
        [
            {
                exposure: {
                    assetClass: 'Equity',
                    marketRegion: 'U.S.',
                    factorStyle: 'Blend',
                    sizeFactor: 'Large Cap',
                },
                amount: 1.0,
            },
            { exposure: { assetClass: 'Gold' }, amount: 0.8 },
            { exposure: { assetClass: 'Bitcoin' }, amount: 0.2 },
        ],
        'Stacked',
        {
            name: 'Return Stacked® U.S. Stocks & Gold/Bitcoin ETF',
            inceptionDate: '2025-05-30',
            expenseRatio: 0.95,
            netAssets: '$10M',
            yield: 0,
        }
    ),

    createETF(
        'RSBT',
        [
            { exposure: { assetClass: 'U.S. Treasuries' }, amount: 1.0 },
            { exposure: { assetClass: 'Managed Futures' }, amount: 1.0 },
        ],
        'Stacked',
        {
            name: 'Return Stacked® Bonds & Managed Futures ETF',
            inceptionDate: '2023-02-08',
            expenseRatio: 0.95,
            netAssets: '$250M',
            yield: 4.5,
        }
    ),

    createETF(
        'RSSY',
        [
            {
                exposure: {
                    assetClass: 'Equity',
                    marketRegion: 'U.S.',
                    factorStyle: 'Blend',
                    sizeFactor: 'Large Cap',
                },
                amount: 1.0,
            },
            { exposure: { assetClass: 'Futures Yield' }, amount: 1.0 },
        ],
        'Stacked',
        {
            name: 'Return Stacked® U.S. Stocks & Futures Yield ETF',
            inceptionDate: '2024-05-29',
            expenseRatio: 0.95,
            netAssets: '$50M',
            yield: 3.5,
        }
    ),

    createETF(
        'RSBY',
        [
            { exposure: { assetClass: 'U.S. Treasuries' }, amount: 1.0 },
            { exposure: { assetClass: 'Futures Yield' }, amount: 1.0 },
        ],
        'Stacked',
        {
            name: 'Return Stacked® Bonds & Futures Yield ETF',
            inceptionDate: '2024-08-21',
            expenseRatio: 0.95,
            netAssets: '$30M',
            yield: 6.0,
        }
    ),

    createETF(
        'RSSB',
        [
            {
                exposure: {
                    assetClass: 'Equity',
                    marketRegion: 'U.S.',
                    factorStyle: 'Blend',
                    sizeFactor: 'Large Cap',
                },
                amount: 0.6,
            },
            {
                exposure: {
                    assetClass: 'Equity',
                    marketRegion: 'International Developed',
                    factorStyle: 'Blend',
                    sizeFactor: 'Large Cap',
                },
                amount: 0.3,
            },
            {
                exposure: {
                    assetClass: 'Equity',
                    marketRegion: 'Emerging',
                    factorStyle: 'Blend',
                    sizeFactor: 'Large Cap',
                },
                amount: 0.1,
            },
            { exposure: { assetClass: 'U.S. Treasuries' }, amount: 1.0 },
        ],
        'Stacked',
        {
            name: 'Return Stacked Global Stocks & Bonds ETF',
            inceptionDate: '2023-12-05',
            expenseRatio: 0.95,
            netAssets: '$100M',
            yield: 2.5,
        }
    ),

    createETF('TMF', [{ exposure: { assetClass: 'U.S. Treasuries' }, amount: 3.0 }], 'Daily Reset'),
    createETF('UBT', [{ exposure: { assetClass: 'U.S. Treasuries' }, amount: 2.0 }], 'Daily Reset'),
    createETF('ZROZ', [{ exposure: { assetClass: 'U.S. Treasuries' }, amount: 1.5 }], 'Extended Duration'),
    createETF(
        'EDV',
        [{ exposure: { assetClass: 'U.S. Treasuries' }, amount: 1.5 }],
        'Extended Duration',
        {
            name: 'Vanguard Extended Duration Treasury ETF',
            inceptionDate: '2007-12-06',
            expenseRatio: 0.05,
            netAssets: '$4.57B',
            yield: 4.2,
        }
    ),
    createETF(
        'GOVZ',
        [{ exposure: { assetClass: 'U.S. Treasuries' }, amount: 1.5 }],
        'Extended Duration',
        {
            name: 'iShares 25+ Year Treasury STRIPS Bond ETF',
            inceptionDate: '2020-09-22',
            expenseRatio: 0.1,
            netAssets: '$122M',
            yield: 4.5,
        }
    ),
    createETF('TLT', [{ exposure: { assetClass: 'U.S. Treasuries' }, amount: 1.0 }]),
    createETF('UGL', [{ exposure: { assetClass: 'Gold' }, amount: 2.0 }], 'Daily Reset'),
    createETF('GLDM', [{ exposure: { assetClass: 'Gold' }, amount: 1.0 }]),

    createETF(
        'GDE',
        [
            {
                exposure: {
                    assetClass: 'Equity',
                    marketRegion: 'U.S.',
                    factorStyle: 'Blend',
                    sizeFactor: 'Large Cap',
                },
                amount: 0.9,
            },
            { exposure: { assetClass: 'Gold' }, amount: 0.9 },
        ],
        'Stacked',
        {
            name: 'WisdomTree Efficient Gold Plus Equity Strategy Fund',
            inceptionDate: '2022-03-17',
            expenseRatio: 0.2,
            netAssets: '$500M',
            yield: 1.2,
        }
    ),

    createETF(
        'BTGD',
        [
            { exposure: { assetClass: 'Bitcoin' }, amount: 1.0 },
            { exposure: { assetClass: 'Gold' }, amount: 1.0 },
        ],
        'Stacked',
        {
            name: 'STKD 100% Bitcoin & 100% Gold ETF',
            inceptionDate: '2024-10-16',
            expenseRatio: 0.95,
            netAssets: '$20M',
            yield: 0,
        }
    ),

    createETF(
        'NTSX',
        [
            {
                exposure: {
                    assetClass: 'Equity',
                    marketRegion: 'U.S.',
                    factorStyle: 'Blend',
                    sizeFactor: 'Large Cap',
                },
                amount: 0.9,
            },
            { exposure: { assetClass: 'U.S. Treasuries' }, amount: 0.6 },
        ],
        'Stacked',
        {
            name: 'WisdomTree U.S. Efficient Core Fund',
            inceptionDate: '2018-08-02',
            expenseRatio: 0.2,
            netAssets: '$1.28B',
            yield: 2.8,
        }
    ),

    createETF(
        'NTSI',
        [
            {
                exposure: {
                    assetClass: 'Equity',
                    marketRegion: 'International Developed',
                    factorStyle: 'Blend',
                    sizeFactor: 'Large Cap',
                },
                amount: 0.9,
            },
            { exposure: { assetClass: 'U.S. Treasuries' }, amount: 0.6 },
        ],
        'Stacked',
        {
            name: 'WisdomTree International Efficient Core Fund',
            inceptionDate: '2021-05-20',
            expenseRatio: 0.26,
            netAssets: '$435M',
            yield: 2.5,
        }
    ),

    createETF(
        'NTSE',
        [
            {
                exposure: {
                    assetClass: 'Equity',
                    marketRegion: 'Emerging',
                    factorStyle: 'Blend',
                    sizeFactor: 'Large Cap',
                },
                amount: 0.9,
            },
            { exposure: { assetClass: 'U.S. Treasuries' }, amount: 0.6 },
        ],
        'Stacked',
        {
            name: 'WisdomTree Emerging Markets Efficient Core Fund',
            inceptionDate: '2021-05-20',
            expenseRatio: 0.32,
            netAssets: '$35M',
            yield: 3.1,
        }
    ),

    createETF('IBIT', [{ exposure: { assetClass: 'Bitcoin' }, amount: 1.0 }]),
    createETF(
        'UPRO',
        [
            {
                exposure: {
                    assetClass: 'Equity',
                    marketRegion: 'U.S.',
                    factorStyle: 'Blend',
                    sizeFactor: 'Large Cap',
                },
                amount: 3.0,
            },
        ],
        'Daily Reset'
    ),
    createETF(
        'SSO',
        [
            {
                exposure: {
                    assetClass: 'Equity',
                    marketRegion: 'U.S.',
                    factorStyle: 'Blend',
                    sizeFactor: 'Large Cap',
                },
                amount: 2.0,
            },
        ],
        'Daily Reset'
    ),
    createETF(
        'QLD',
        [
            {
                exposure: {
                    assetClass: 'Equity',
                    marketRegion: 'U.S.',
                    factorStyle: 'Growth',
                    sizeFactor: 'Large Cap',
                },
                amount: 2.0,
            },
        ],
        'Daily Reset'
    ),
    createETF(
        'TQQQ',
        [
            {
                exposure: {
                    assetClass: 'Equity',
                    marketRegion: 'U.S.',
                    factorStyle: 'Growth',
                    sizeFactor: 'Large Cap',
                },
                amount: 3.0,
            },
        ],
        'Daily Reset'
    ),
    createETF(
        'UDOW',
        [
            {
                exposure: {
                    assetClass: 'Equity',
                    marketRegion: 'U.S.',
                    factorStyle: 'Value',
                    sizeFactor: 'Large Cap',
                },
                amount: 3.0,
            },
        ],
        'Daily Reset'
    ),
    createETF(
        'DDM',
        [
            {
                exposure: {
                    assetClass: 'Equity',
                    marketRegion: 'U.S.',
                    factorStyle: 'Value',
                    sizeFactor: 'Large Cap',
                },
                amount: 2.0,
            },
        ],
        'Daily Reset'
    ),
    createETF('VT', [
        {
            exposure: {
                assetClass: 'Equity',
                marketRegion: 'U.S.',
                factorStyle: 'Blend',
                sizeFactor: 'Large Cap',
            },
            amount: 0.6,
        },
        {
            exposure: {
                assetClass: 'Equity',
                marketRegion: 'International Developed',
                factorStyle: 'Blend',
                sizeFactor: 'Large Cap',
            },
            amount: 0.3,
        },
        {
            exposure: {
                assetClass: 'Equity',
                marketRegion: 'Emerging',
                factorStyle: 'Blend',
                sizeFactor: 'Large Cap',
            },
            amount: 0.1,
        },
    ]),
    createETF('AVGV', [
        {
            exposure: {
                assetClass: 'Equity',
                marketRegion: 'U.S.',
                factorStyle: 'Value',
                sizeFactor: 'Large Cap',
            },
            amount: 0.6,
        },
        {
            exposure: {
                assetClass: 'Equity',
                marketRegion: 'International Developed',
                factorStyle: 'Value',
                sizeFactor: 'Large Cap',
            },
            amount: 0.3,
        },
        {
            exposure: {
                assetClass: 'Equity',
                marketRegion: 'Emerging',
                factorStyle: 'Value',
                sizeFactor: 'Large Cap',
            },
            amount: 0.1,
        },
    ]),
    createETF('VXUS', [
        {
            exposure: {
                assetClass: 'Equity',
                marketRegion: 'International Developed',
                factorStyle: 'Blend',
                sizeFactor: 'Large Cap',
            },
            amount: 0.66,
        },
        {
            exposure: {
                assetClass: 'Equity',
                marketRegion: 'Emerging',
                factorStyle: 'Blend',
                sizeFactor: 'Large Cap',
            },
            amount: 0.34,
        },
    ]),
    createETF('VOO', [
        {
            exposure: {
                assetClass: 'Equity',
                marketRegion: 'U.S.',
                factorStyle: 'Blend',
                sizeFactor: 'Large Cap',
            },
            amount: 1.0,
        },
    ]),
    createETF('QQQM', [
        {
            exposure: {
                assetClass: 'Equity',
                marketRegion: 'U.S.',
                factorStyle: 'Growth',
                sizeFactor: 'Large Cap',
            },
            amount: 1.0,
        },
    ]),
    createETF('VEA', [
        {
            exposure: {
                assetClass: 'Equity',
                marketRegion: 'International Developed',
                factorStyle: 'Blend',
                sizeFactor: 'Large Cap',
            },
            amount: 1.0,
        },
    ]),
    createETF('AVDV', [
        {
            exposure: {
                assetClass: 'Equity',
                marketRegion: 'International Developed',
                factorStyle: 'Value',
                sizeFactor: 'Small Cap',
            },
            amount: 1.0,
        },
    ]),
    createETF('VWO', [
        {
            exposure: {
                assetClass: 'Equity',
                marketRegion: 'Emerging',
                factorStyle: 'Blend',
                sizeFactor: 'Large Cap',
            },
            amount: 1.0,
        },
    ]),
    createETF('AVEE', [
        {
            exposure: {
                assetClass: 'Equity',
                marketRegion: 'Emerging',
                factorStyle: 'Blend',
                sizeFactor: 'Small Cap',
            },
            amount: 1.0,
        },
    ]),
    createETF('DGS', [
        {
            exposure: {
                assetClass: 'Equity',
                marketRegion: 'Emerging',
                factorStyle: 'Value',
                sizeFactor: 'Small Cap',
            },
            amount: 1.0,
        },
    ]),
    createETF(
        'EDC',
        [
            {
                exposure: {
                    assetClass: 'Equity',
                    marketRegion: 'Emerging',
                    factorStyle: 'Blend',
                    sizeFactor: 'Large Cap',
                },
                amount: 3.0,
            },
        ],
        'Daily Reset'
    ),
    createETF(
        'EET',
        [
            {
                exposure: {
                    assetClass: 'Equity',
                    marketRegion: 'Emerging',
                    factorStyle: 'Blend',
                    sizeFactor: 'Large Cap',
                },
                amount: 2.0,
            },
        ],
        'Daily Reset'
    ),
    createETF('KMLM', [{ exposure: { assetClass: 'Managed Futures' }, amount: 1.0 }]),
    createETF('AVUV', [
        {
            exposure: {
                assetClass: 'Equity',
                marketRegion: 'U.S.',
                factorStyle: 'Value',
                sizeFactor: 'Small Cap',
            },
            amount: 1.0,
        },
    ]),
    createETF('CTA', [{ exposure: { assetClass: 'Managed Futures' }, amount: 1.0 }]),
    createETF('DBMF', [{ exposure: { assetClass: 'Managed Futures' }, amount: 1.0 }]),
    createETF('AVDS', [
        {
            exposure: {
                assetClass: 'Equity',
                marketRegion: 'International Developed',
                factorStyle: 'Blend',
                sizeFactor: 'Small Cap',
            },
            amount: 1.0,
        },
    ]),
];

/**
 * Looks up an ETF by ticker symbol
 */
export const getETFByTicker = (ticker: string): ETF | undefined => {
    return etfCatalog.find((etf) => etf.ticker === ticker);
};
