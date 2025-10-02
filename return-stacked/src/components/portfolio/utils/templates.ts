import { createPortfolio } from './etfData';
import type { Portfolio } from '../types';

export const examplePortfolios: Portfolio[] = [
    createPortfolio('SSO/ZROZ/GLD', [
        { ticker: 'SSO', percentage: 50 },
        { ticker: 'ZROZ', percentage: 30 },
        { ticker: 'GLDM', percentage: 20 },
    ]),
    createPortfolio('SSO/ZROZ/GLD+ A', [
        { ticker: 'SSO', percentage: 20 },
        { ticker: 'ZROZ', percentage: 20 },
        { ticker: 'RSSX', percentage: 15 },
        { ticker: 'RSST', percentage: 15 },
        { ticker: 'AVDS', percentage: 15 },
        { ticker: 'AVEE', percentage: 15 },
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
        { ticker: 'UPRO', percentage: 55 },
        { ticker: 'TMF', percentage: 45 },
    ]),
    createPortfolio('HFEA+', [
        { ticker: 'SSO', percentage: 50 },
        { ticker: 'ZROZ', percentage: 50 / 3 },
        { ticker: 'KMLM', percentage: 50 / 6 },
        { ticker: 'CTA', percentage: 50 / 6 },
        { ticker: 'BTGD', percentage: 50 / 3 },
    ]),
    createPortfolio('Value Barbell', [
        { ticker: 'RSST', percentage: 25 },
        { ticker: 'RSSB', percentage: 25 },
        { ticker: 'AVDV', percentage: 15 },
        { ticker: 'DGS', percentage: 15 },
        { ticker: 'AVUV', percentage: 20 },
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
        { ticker: 'RSSB', percentage: 25 },
        { ticker: 'RSST', percentage: 25 },
        { ticker: 'RSSY', percentage: 25 },
        { ticker: 'RSSX', percentage: 25 },
    ]),
];

examplePortfolios.forEach((portfolio) => {
    const total = Array.from(portfolio.holdings.values()).reduce((sum, percentage) => sum + percentage, 0);

    if (Math.abs(total - 100) > 0.01) {
        throw new Error(`Portfolio "${portfolio.name}" allocations must add up to 100%. Current total: ${total}%`);
    }
});
