import { createPortfolio } from './etfData';

export const examplePortfolios = [
    /*createPortfolio('4/3/2/1', [
        { ticker: 'RSST', percentage: 60 }, // Stacked leverage: Equity + Managed Futures
        { ticker: 'GDE', percentage: 25 }, // Stacked leverage: Equity + Gold
        { ticker: 'TMF', percentage: 15 }, // 3x Leveraged Treasuries
    ]),
    createPortfolio('Return Stacked® 4/3/2/1', [
        { ticker: 'RSST', percentage: 57 },
        { ticker: 'ZROZ', percentage: 25 },
        { ticker: 'RSSX', percentage: 18 },
    ]),*/
    createPortfolio('SSO/ZROZ/GLD', [
        { ticker: 'SSO', percentage: 50 }, // 2x Leveraged S&P 500
        { ticker: 'ZROZ', percentage: 30 }, // Extended Duration Treasuries
        { ticker: 'GLDM', percentage: 20 }, // Gold exposure
    ]),
    createPortfolio('SSO/ZROZ/GLD+', [
        { ticker: 'SSO', percentage: 20 }, // 2x Leveraged S&P 500
        { ticker: 'ZROZ', percentage: 20 }, // Extended Duration Treasuries
        { ticker: 'RSSX', percentage: 15 }, // Gold exposure
        { ticker: 'RSST', percentage: 15 }, // Gold exposure
        { ticker: 'AVDS', percentage: 15 }, // Gold exposure
        { ticker: 'AVEE', percentage: 15 }, // Gold exposure
    ]),
    createPortfolio('HFEA', [
        { ticker: 'UPRO', percentage: 55 }, // 3x Leveraged S&P 500
        { ticker: 'TMF', percentage: 45 }, // 3x Leveraged Treasuries
    ]),
    createPortfolio('HFEA+', [
        { ticker: 'SSO', percentage: 50 }, // 3x Leveraged S&P 500
        { ticker: 'ZROZ', percentage: 30 }, // 3x Leveraged Treasuries
        { ticker: 'KMLM', percentage: 5 }, // 3x Leveraged Treasuries
        { ticker: 'CTA', percentage: 5 }, // 3x Leveraged Treasuries
        { ticker: 'BTGD', percentage: 10 }, // 3x Leveraged Treasuries
    ]),
    createPortfolio('Value Barbell', [
        { ticker: 'RSST', percentage: 25 }, // Stacked leverage: Equity + Managed Futures
        { ticker: 'RSSB', percentage: 25 }, // Stacked leverage: Global Equity + Treasuries
        { ticker: 'AVDV', percentage: 15 }, // International Developed Small Cap Value
        { ticker: 'DGS', percentage: 15 }, // Emerging Markets Small Cap Value
        { ticker: 'AVUV', percentage: 20 }, // U.S. Small Cap Value
    ]),
    createPortfolio('Return Stacked® Max+', [
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

examplePortfolios.forEach((portfolio) => {
    const total = Array.from(portfolio.holdings.values()).reduce((sum, val) => sum + val, 0);

    if (Math.abs(total - 100) > 0.01) {
        throw new Error(`Portfolio "${portfolio.name}" allocations must add up to 100%. Current total: ${total}%`);
    }
});
