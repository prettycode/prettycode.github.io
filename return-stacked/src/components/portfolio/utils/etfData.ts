import type {
    AssetClass,
    AssetClassColors,
    ETF,
    Exposure,
    ExposureData,
    LeverageType,
    Portfolio,
    PortfolioAnalysis,
    RegionColors,
    TemplateDetails,
} from '../types';

export const createExposureKey = (exposure: Exposure): string => {
    const marketRegion = exposure.marketRegion || '';
    const factorStyle = exposure.factorStyle || '';
    const sizeFactor = exposure.sizeFactor || '';

    return `${exposure.assetClass}|${marketRegion}|${factorStyle}|${sizeFactor}`;
};

export const createETF = (ticker: string, exposureData: ExposureData[], leverageType: LeverageType = 'None'): ETF => {
    const exposures = new Map<string, number>();

    for (const { exposure, amount } of exposureData) {
        const key = createExposureKey(exposure);
        exposures.set(key, amount);
    }

    return { ticker, exposures, leverageType };
};

export const parseExposureKey = (key: string): Exposure => {
    const [assetClass, marketRegion, factorStyle, sizeFactor] = key.split('|');
    return {
        assetClass: assetClass as AssetClass,
        marketRegion: (marketRegion || undefined) as Exposure['marketRegion'],
        factorStyle: (factorStyle || undefined) as Exposure['factorStyle'],
        sizeFactor: (sizeFactor || undefined) as Exposure['sizeFactor'],
    };
};

export const assetClassColors: AssetClassColors = {
    Equity: 'oklch(.623 .175 259.815)',
    'U.S. Treasuries': 'rgb(50, 210, 150)',
    'Managed Futures': '#7070f8',
    'Futures Yield': '#a64ff2',
    Gold: 'rgb(255, 187, 0)',
    Bitcoin: 'oklch(.705 .213 47.604)',
};

export const regionColors: RegionColors = {
    'U.S.': '#32d296',
    'International Developed': '#32d296',
    Emerging: '#32d296',
};

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

export const createPortfolio = (name: string, allocations: { ticker: string; percentage: number }[]): Portfolio => {
    const holdings = new Map<string, number>();

    for (const { ticker, percentage } of allocations) {
        holdings.set(ticker, percentage);
    }

    return { name, holdings };
};

export const convertCustomPortfolioToPortfolio = (customPortfolio: import('../types').CustomPortfolio): Portfolio => {
    const holdings = new Map<string, number>();

    for (const [ticker, holding] of customPortfolio.holdings) {
        if (!holding.disabled) {
            holdings.set(ticker, holding.percentage);
        }
    }

    return {
        name: customPortfolio.name,
        description: customPortfolio.description,
        holdings,
    };
};

export const analyzePortfolio = (portfolio: Portfolio): PortfolioAnalysis => {
    const exposures = new Map<string, number>();
    const assetClasses = new Map<string, number>();
    let totalExposure = 0;

    for (const [ticker, percentage] of portfolio.holdings) {
        const etf = etfCatalog.find((e) => e.ticker === ticker);
        if (!etf) {
            throw new Error(`ETF with ticker ${ticker} not found in catalog`);
        }

        const weight = percentage / 100;

        for (const [key, amount] of etf.exposures) {
            const weightedAmount = amount * weight;
            const currentAmount = exposures.get(key) || 0;
            exposures.set(key, currentAmount + weightedAmount);

            const [assetClass] = key.split('|');
            const currentAssetClassAmount = assetClasses.get(assetClass) || 0;
            assetClasses.set(assetClass, currentAssetClassAmount + weightedAmount);

            totalExposure += weightedAmount;
        }
    }

    return {
        exposures,
        assetClasses,
        totalLeverage: totalExposure,
        isLevered: totalExposure > 1,
    };
};

export const getTemplateDetails = (portfolio: Portfolio): TemplateDetails => {
    const analysis = analyzePortfolio(portfolio);
    const etfDetails = [];
    const assetClassSummary = new Map<string, number>();
    const leverageTypesWithAmounts = new Map<LeverageType, number>();

    for (const [ticker, numericPercentage] of portfolio.holdings) {
        const etf = etfCatalog.find((e) => e.ticker === ticker);
        if (!etf) {
            continue;
        }

        let leverageAmount = 0;
        for (const [, amount] of etf.exposures) {
            leverageAmount = Math.max(leverageAmount, amount);
        }

        if (etf.leverageType !== 'None') {
            const key = etf.leverageType;
            const existingAmount = leverageTypesWithAmounts.get(key) || 0;
            leverageTypesWithAmounts.set(key, Math.max(existingAmount, leverageAmount));
        }

        const primaryAssetClasses: AssetClass[] = [];
        for (const [exposureKey] of etf.exposures) {
            const parsed = parseExposureKey(exposureKey);
            if (!primaryAssetClasses.includes(parsed.assetClass)) {
                primaryAssetClasses.push(parsed.assetClass);
            }
        }

        etfDetails.push({
            ticker,
            percentage: numericPercentage,
            leverageType: etf.leverageType,
            leverageAmount,
            assetClasses: primaryAssetClasses,
        });

        primaryAssetClasses.forEach((assetClass) => {
            const current = assetClassSummary.get(assetClass) || 0;
            assetClassSummary.set(assetClass, current + numericPercentage);
        });
    }

    const dominantAssetClasses = Array.from(analysis.assetClasses.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([assetClass]) => assetClass as AssetClass);

    let usEquityExposure = 0;
    let exUsEquityExposure = 0;

    for (const [ticker, numericPercentage] of portfolio.holdings) {
        const etf = etfCatalog.find((e) => e.ticker === ticker);
        if (!etf) {
            continue;
        }

        const weight = numericPercentage / 100;

        for (const [exposureKey, amount] of etf.exposures) {
            const parsed = parseExposureKey(exposureKey);
            if (parsed.assetClass === 'Equity') {
                const weightedAmount = amount * weight;

                if (parsed.marketRegion === 'U.S.') {
                    usEquityExposure += weightedAmount;
                } else if (parsed.marketRegion === 'International Developed' || parsed.marketRegion === 'Emerging') {
                    exUsEquityExposure += weightedAmount;
                }
            }
        }
    }

    const totalEquityExposure = usEquityExposure + exUsEquityExposure;
    const equityBreakdown =
        totalEquityExposure > 0
            ? {
                  us: (usEquityExposure / totalEquityExposure) * 100,
                  exUs: (exUsEquityExposure / totalEquityExposure) * 100,
                  totalEquity: totalEquityExposure,
              }
            : null;

    return {
        name: portfolio.name,
        etfCount: portfolio.holdings.size,
        totalLeverage: analysis.totalLeverage,
        isLevered: analysis.isLevered,
        dominantAssetClasses,
        leverageTypesWithAmounts,
        etfDetails,
        analysis,
        equityBreakdown,
    };
};
