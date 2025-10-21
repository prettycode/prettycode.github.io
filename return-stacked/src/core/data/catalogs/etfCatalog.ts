/**
 * ETF catalog - All available ETF definitions with their exposures
 */

import type { ETF } from '../../domain/ETF';
import { createETF } from '../factories/etfFactory';

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
        'Stacked'
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
        'Stacked'
    ),

    createETF(
        'RSBT',
        [
            { exposure: { assetClass: 'U.S. Treasuries' }, amount: 1.0 },
            { exposure: { assetClass: 'Managed Futures' }, amount: 1.0 },
        ],
        'Stacked'
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
        'Stacked'
    ),

    createETF(
        'RSBY',
        [
            { exposure: { assetClass: 'U.S. Treasuries' }, amount: 1.0 },
            { exposure: { assetClass: 'Futures Yield' }, amount: 1.0 },
        ],
        'Stacked'
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
        'Stacked'
    ),

    createETF('TMF', [{ exposure: { assetClass: 'U.S. Treasuries' }, amount: 3.0 }], 'Daily Reset'),
    createETF('UBT', [{ exposure: { assetClass: 'U.S. Treasuries' }, amount: 2.0 }], 'Daily Reset'),
    createETF('ZROZ', [{ exposure: { assetClass: 'U.S. Treasuries' }, amount: 1.5 }], 'Extended Duration'),
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
        'Stacked'
    ),

    createETF(
        'BTGD',
        [
            { exposure: { assetClass: 'Bitcoin' }, amount: 1.0 },
            { exposure: { assetClass: 'Gold' }, amount: 1.0 },
        ],
        'Stacked'
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
