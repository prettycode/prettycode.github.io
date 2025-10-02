import { createPortfolio } from './etfData';

/*
Analyze the ETFs in @etfData.js and formulate a portfolio that:

* Has the highest possible total leverage
* Without using and 3x daily reset ETFs
* Has 55 - 70% U.S., 15 - 20% EM, 15 - 20% International Developed
* Has 90 - 100% total exposure to equities
* Has exposure to alts like gold, bonds, trend/managed futures, yield/carry, and Bitcoin, in an approximately risk-parity weighting.
* None of the rules in @WarningsCard.jsx should be violated.
* No EM or International Developed 2x daily reset ETFs should be used.

Put five such portfolios as new templates in @templates.js .
*/

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
    createPortfolio('SSO/ZROZ/GLD+ A', [
        { ticker: 'SSO', percentage: 20 }, // 2x Leveraged S&P 500
        { ticker: 'ZROZ', percentage: 20 }, // Extended Duration Treasuries
        { ticker: 'RSSX', percentage: 15 }, // Gold exposure
        { ticker: 'RSST', percentage: 15 }, // Gold exposure
        { ticker: 'AVDS', percentage: 15 }, // Gold exposure
        { ticker: 'AVEE', percentage: 15 }, // Gold exposure
    ]),
    createPortfolio('SSO/ZROZ/GLD+ B', [
        { ticker: 'SSO', percentage: 25 },
        { ticker: 'RSSX', percentage: 10 },
        { ticker: 'RSSY', percentage: 10 },
        { ticker: 'AVEE', percentage: 15 },
        { ticker: 'AVDV', percentage: 15 },
        { ticker: 'ZROZ', percentage: 10 },
        { ticker: 'KMLM', percentage: 7.5 },
        { ticker: 'CTA', percentage: 7.5 },
    ]),
    createPortfolio('HFEA', [
        { ticker: 'UPRO', percentage: 55 }, // 3x Leveraged S&P 500
        { ticker: 'TMF', percentage: 45 }, // 3x Leveraged Treasuries
    ]),
    createPortfolio('HFEA+', [
        { ticker: 'SSO', percentage: 50 }, // 3x Leveraged S&P 500
        { ticker: 'ZROZ', percentage: 50 / 3 }, // 3x Leveraged Treasuries
        { ticker: 'KMLM', percentage: 50 / 6 }, // 3x Leveraged Treasuries
        { ticker: 'CTA', percentage: 50 / 6 }, // 3x Leveraged Treasuries
        { ticker: 'BTGD', percentage: 50 / 3 }, // 3x Leveraged Treasuries
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
