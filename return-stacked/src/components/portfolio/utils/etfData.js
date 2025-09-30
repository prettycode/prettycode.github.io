// Function to create a key for the exposure map
export const createExposureKey = (exposure) => {
    const marketRegion = exposure.marketRegion || '';
    const factorStyle = exposure.factorStyle || '';
    const sizeFactor = exposure.sizeFactor || '';

    return `${exposure.assetClass}|${marketRegion}|${factorStyle}|${sizeFactor}`;
};

// Function to create an ETF with its exposures
export const createETF = (ticker, exposureData, leverageType = 'None') => {
    const exposures = new Map();

    for (const { exposure, amount } of exposureData) {
        const key = createExposureKey(exposure);
        exposures.set(key, amount);
    }

    return { ticker, exposures, leverageType };
};

// Parse exposure key back into components
export const parseExposureKey = (key) => {
    const [assetClass, marketRegion, factorStyle, sizeFactor] = key.split('|');
    return {
        assetClass,
        marketRegion: marketRegion || undefined,
        factorStyle: factorStyle || undefined,
        sizeFactor: sizeFactor || undefined,
    };
};

// Colors for asset classes and regions
export const assetClassColors = {
    Equity: 'oklch(.623 .175 259.815)',
    'U.S. Treasuries': 'rgb(50, 210, 150)',
    'Managed Futures': '#7070f8',
    'Futures Yield': '#a64ff2',
    Gold: 'rgb(255, 187, 0)',
    Bitcoin: 'oklch(.705 .213 47.604)',
};

export const regionColors = {
    'U.S.': '#32d296',
    'International Developed': '#32d296',
    Emerging: '#32d296',
};

// Create the ETF catalog
export const etfCatalog = [
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

// Function to create a portfolio
export const createPortfolio = (name, allocations) => {
    const holdings = new Map();

    for (const { ticker, percentage } of allocations) {
        holdings.set(ticker, percentage);
    }

    return { name, holdings };
};

// Define example portfolios
export const examplePortfolios = [
    createPortfolio('4/3/2/1', [
        { ticker: 'RSST', percentage: 60 }, // Stacked leverage: Equity + Managed Futures
        { ticker: 'GDE', percentage: 25 }, // Stacked leverage: Equity + Gold
        { ticker: 'TMF', percentage: 15 }, // 3x Leveraged Treasuries
    ]),
    createPortfolio('Return Stacked® 4/3/2/1', [
        { ticker: 'RSST', percentage: 57 },
        { ticker: 'ZROZ', percentage: 25 },
        { ticker: 'RSSX', percentage: 18 },
    ]),
    createPortfolio('SSO/ZROZ/GLD', [
        { ticker: 'SSO', percentage: 50 }, // 2x Leveraged S&P 500
        { ticker: 'ZROZ', percentage: 30 }, // Extended Duration Treasuries
        { ticker: 'GLDM', percentage: 20 }, // Gold exposure
    ]),
    createPortfolio('SSO/ZROZ/DBMF', [
        { ticker: 'SSO', percentage: 50 }, // 2x Leveraged S&P 500
        { ticker: 'ZROZ', percentage: 30 }, // Extended Duration Treasuries
        { ticker: 'DBMF', percentage: 20 }, // Managed Futures for trend following
    ]),
    createPortfolio('SSO/ZROZ/GLD/DBMF', [
        { ticker: 'SSO', percentage: 50 }, // 2x Leveraged S&P 500
        { ticker: 'ZROZ', percentage: 15 }, // Extended Duration Treasuries
        { ticker: 'UGL', percentage: 7.5 }, // Gold exposure
        { ticker: 'GLDM', percentage: 7.5 }, // Gold exposure
        { ticker: 'DBMF', percentage: 20 }, // Managed Futures for trend following
    ]),
    createPortfolio('YOLO', [
        { ticker: 'UPRO', percentage: 45 }, // 3x Leveraged S&P 500
        { ticker: 'TMF', percentage: 25 }, // 3x Leveraged Treasuries
        { ticker: 'DBMF', percentage: 30 }, // Managed Futures for trend following
    ]),
    createPortfolio('Value Barbell', [
        { ticker: 'RSST', percentage: 25 }, // Stacked leverage: Equity + Managed Futures
        { ticker: 'RSSB', percentage: 25 }, // Stacked leverage: Global Equity + Treasuries
        { ticker: 'AVDV', percentage: 15 }, // International Developed Small Cap Value
        { ticker: 'DGS', percentage: 15 }, // Emerging Markets Small Cap Value
        { ticker: 'AVUV', percentage: 20 }, // U.S. Small Cap Value
    ]),
    createPortfolio('Return Stacked® Global', [
        { ticker: 'RSSB', percentage: 17.5 },
        { ticker: 'RSST', percentage: 17.5 },
        { ticker: 'RSSY', percentage: 17.5 },
        { ticker: 'RSSX', percentage: 17.5 },
        { ticker: 'AVDS', percentage: 15 },
        { ticker: 'AVEE', percentage: 15 },
    ]),
    createPortfolio('Return Stacked® Max', [
        { ticker: 'RSSB', percentage: 25 }, // Stacked leverage: Global Equity + Treasuries
        { ticker: 'RSST', percentage: 25 }, // Stacked leverage: Equity + Managed Futures
        { ticker: 'RSSY', percentage: 25 }, // Stacked leverage: Equity + Yield
        { ticker: 'RSSX', percentage: 25 }, // Stacked leverage: Equity + Gold + Bitcoin
    ]),
];

// Function to analyze a portfolio's total exposure
export const analyzePortfolio = (portfolio) => {
    const exposures = new Map();
    const assetClasses = new Map();
    let totalExposure = 0;

    // Calculate exposures for each ETF in the portfolio
    for (const [ticker, holdingData] of portfolio.holdings) {
        // Handle both object format (for custom portfolios) and number format (for example portfolios)
        const percentage = typeof holdingData === 'object' ? holdingData.percentage : holdingData;
        const isDisabled = typeof holdingData === 'object' && holdingData.disabled;

        // Skip disabled holdings
        if (isDisabled) continue;

        const etf = etfCatalog.find((e) => e.ticker === ticker);
        if (!etf) {
            console.error(`ETF with ticker ${ticker} not found in catalog`);
            continue;
        }

        const weight = percentage / 100; // Convert percentage to decimal

        for (const [key, amount] of etf.exposures) {
            const weightedAmount = amount * weight;
            const currentAmount = exposures.get(key) || 0;
            exposures.set(key, currentAmount + weightedAmount);

            // Also track by asset class for the chart
            const [assetClass] = key.split('|');
            const currentAssetClassAmount = assetClasses.get(assetClass) || 0;
            assetClasses.set(assetClass, currentAssetClassAmount + weightedAmount);

            totalExposure += weightedAmount;
        }
    }

    // Prepare data for console logging with decimal points
    const assetAllocationTable = {};
    for (const [assetClass, amount] of assetClasses) {
        assetAllocationTable[assetClass] = {
            'Absolute Exposure': (amount * 100).toFixed(2) + '%',
            'Relative Exposure': ((amount / totalExposure) * 100).toFixed(2) + '%',
            'Raw Value': amount.toFixed(4),
        };
    }

    // Log the asset allocation analysis to console
    if (Object.keys(assetAllocationTable).length > 0) {
        console.table(assetAllocationTable);
    }

    return {
        exposures,
        assetClasses,
        totalLeverage: totalExposure,
        isLevered: totalExposure > 1,
    };
};

// Function to get detailed template information for display
export const getTemplateDetails = (portfolio) => {
    const analysis = analyzePortfolio(portfolio);
    const etfDetails = [];
    const assetClassSummary = new Map();
    const leverageTypesWithAmounts = new Map();

    // Collect ETF details and categorize by asset class
    for (const [ticker, percentage] of portfolio.holdings) {
        const etf = etfCatalog.find((e) => e.ticker === ticker);
        if (!etf) continue;

        // Calculate the leverage amount for this ETF
        let leverageAmount = 0;
        for (const [, amount] of etf.exposures) {
            leverageAmount = Math.max(leverageAmount, amount);
        }

        // Store leverage type with amount
        if (etf.leverageType !== 'None') {
            const key = etf.leverageType;
            const existingAmount = leverageTypesWithAmounts.get(key) || 0;
            leverageTypesWithAmounts.set(key, Math.max(existingAmount, leverageAmount));
        }

        // Get primary asset classes for this ETF
        const primaryAssetClasses = [];
        for (const [exposureKey] of etf.exposures) {
            const parsed = parseExposureKey(exposureKey);
            if (!primaryAssetClasses.includes(parsed.assetClass)) {
                primaryAssetClasses.push(parsed.assetClass);
            }
        }

        etfDetails.push({
            ticker,
            percentage,
            leverageType: etf.leverageType,
            leverageAmount,
            assetClasses: primaryAssetClasses,
        });

        // Add to asset class summary
        primaryAssetClasses.forEach((assetClass) => {
            const current = assetClassSummary.get(assetClass) || 0;
            assetClassSummary.set(assetClass, current + percentage);
        });
    }

    // Get dominant asset classes (sorted by exposure)
    const dominantAssetClasses = Array.from(analysis.assetClasses.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([assetClass]) => assetClass);

    // Calculate US vs Ex-US equity breakdown
    let usEquityExposure = 0;
    let exUsEquityExposure = 0;

    for (const [ticker, percentage] of portfolio.holdings) {
        const etf = etfCatalog.find((e) => e.ticker === ticker);
        if (!etf) continue;

        const weight = percentage / 100;

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
