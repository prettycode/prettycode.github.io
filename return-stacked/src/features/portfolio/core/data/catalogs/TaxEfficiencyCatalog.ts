/**
 * Tax efficiency lookup table indexed by ticker.
 *
 * Score: 1 (least tax-efficient) to 10 (most tax-efficient).
 * Considers distribution character (qualified dividends, ordinary income,
 * Section 1256 60/40, OID/phantom income, collectibles), ability to use
 * in-kind creation/redemption, and structural drag from daily reset / swaps.
 * Expense ratios are explicitly excluded.
 */

export interface TaxEfficiencyEntry {
    score: number;
    rationale: string;
}

export const taxEfficiencyByTicker: Record<string, TaxEfficiencyEntry> = {
    // --- Spot Bitcoin (most efficient: no distributions, cap gains only) ---
    IBIT: { score: 10, rationale: 'Spot BTC trust, no distributions; tax only on sale at LT/ST cap gains rates.' },

    // --- Plain-vanilla broad-market equity index (in-kind redemption, qualified divs) ---
    VOO: { score: 10, rationale: 'S&P 500 index, very low turnover, in-kind redemption, fully qualified dividends.' },
    QQQM: {
        score: 10,
        rationale: 'Nasdaq-100 index, low turnover, in-kind redemption, qualified dividends, low yield.',
    },
    VT: { score: 9, rationale: 'Global cap-weighted index, in-kind redemption; minor foreign withholding drag.' },
    VEA: {
        score: 8,
        rationale: 'Developed ex-US index; qualified divs via treaty countries, but unrecoverable foreign withholding.',
    },
    VXUS: {
        score: 8,
        rationale: 'Total ex-US index; mostly qualified divs, foreign withholding drag, slightly higher yield.',
    },
    VWO: {
        score: 7,
        rationale: 'Emerging markets index; lower qualified-div ratio, higher yield, foreign withholding.',
    },

    // --- Avantis active factor funds (tax-aware but higher turnover than index) ---
    AVUV: {
        score: 7,
        rationale: 'Active US small value; tax-aware management but higher turnover than passive index.',
    },
    AVDV: { score: 7, rationale: 'Active intl small value; tax-aware, foreign withholding, higher yield than blend.' },
    AVDS: { score: 7, rationale: 'Active intl small blend; tax-aware management, foreign withholding.' },
    AVEE: { score: 7, rationale: 'Active EM small blend; tax-aware but higher yield and foreign withholding.' },
    AVGV: { score: 7, rationale: 'Active global value; tax-aware, value tilt yields more dividends than blend.' },
    DGS: {
        score: 6,
        rationale: 'EM small-cap dividend focus; high yield distributed as partly non-qualified ordinary income.',
    },

    // --- Physical gold grantor trust ---
    GLDM: {
        score: 7,
        rationale: 'Grantor trust, no annual distributions; sales taxed at 28% collectibles rate (worse than LTCG).',
    },

    // --- WisdomTree Efficient Core (equity + small Treasury futures overlay) ---
    NTSX: {
        score: 7,
        rationale: '90% US equity (qualified divs) + 60% Treasury futures overlay (Section 1256 mark-to-market).',
    },
    NTSD: { score: 8, rationale: '90% US + 60% intl equity, no bonds; mostly qualified divs, no Section 1256 drag.' },
    NTSI: {
        score: 6,
        rationale: '90% intl equity + Treasury futures (Section 1256); lower qualified-div ratio, foreign withholding.',
    },
    NTSE: {
        score: 6,
        rationale: '90% EM equity + Treasury futures (Section 1256); EM divs less qualified, foreign withholding.',
    },

    // --- Stacked equity + futures overlay (Section 1256 on overlay) ---
    RSST: {
        score: 6,
        rationale: 'US equity (qualified divs) + managed futures overlay (Section 1256 60/40 mark-to-market).',
    },
    RSIT: {
        score: 5,
        rationale: 'Intl equity (less qualified, foreign withholding) + managed futures (Section 1256).',
    },
    RSSX: {
        score: 6,
        rationale: 'US equity + gold/BTC futures overlay (Section 1256); equity portion fully qualified.',
    },
    RSSY: {
        score: 5,
        rationale: 'US equity + futures-yield strategy; futures distributions (Section 1256) plus ~3.5% yield.',
    },
    RSSB: {
        score: 5,
        rationale:
            'Global equity + Treasury futures; Treasury interest ordinary, equity divs qualified, 1256 on overlay.',
    },
    GDE: {
        score: 6,
        rationale: '90% US equity (qualified divs) + 90% gold futures overlay (Section 1256 mark-to-market).',
    },
    BTGD: {
        score: 5,
        rationale: 'Bitcoin + gold exposure via derivatives; Section 1256 events on the futures sleeve.',
    },

    // --- Stacked bonds + futures (ordinary interest + 1256 overlay) ---
    RSBT: {
        score: 4,
        rationale: 'Treasury interest (federal ordinary, state-exempt) + managed futures overlay (Section 1256).',
    },
    RSBY: {
        score: 3,
        rationale: 'Treasuries + futures yield with high ~6% distribution; mostly ordinary income / 1256.',
    },

    // --- PIMCO active stacked ---
    SPLS: {
        score: 4,
        rationale:
            'Equity + active bond sleeve; bond interest ordinary income, active turnover increases distributions.',
    },

    // --- Standard long Treasuries (ordinary income, state-tax exempt) ---
    TLT: { score: 4, rationale: 'Long Treasuries; coupon income taxed as ordinary at federal level (state-exempt).' },

    // --- Treasury STRIPS / extended duration (phantom OID — worst Treasury treatment) ---
    ZROZ: {
        score: 3,
        rationale: 'Treasury STRIPS; phantom OID accrued annually as ordinary income with no cash distribution.',
    },
    EDV: { score: 3, rationale: 'Treasury STRIPS (extended duration); phantom OID taxed annually as ordinary income.' },
    GOVZ: { score: 3, rationale: '25+ year Treasury STRIPS; phantom OID accrual annually as ordinary income.' },

    // --- Leveraged daily-reset (swaps/futures, frequent capital gains distributions) ---
    UPRO: {
        score: 4,
        rationale: 'Daily-reset 3x via swaps; cannot use in-kind redemption, often distributes capital gains.',
    },
    SSO: { score: 4, rationale: 'Daily-reset 2x via swaps; capital gains distributions and Section 1256 drag.' },
    QLD: { score: 4, rationale: 'Daily-reset 2x Nasdaq via swaps; capital gains distributions.' },
    TQQQ: {
        score: 4,
        rationale: 'Daily-reset 3x Nasdaq via swaps; capital gains distributions, no in-kind redemption.',
    },
    UDOW: { score: 4, rationale: 'Daily-reset 3x Dow via swaps; capital gains distributions.' },
    DDM: { score: 4, rationale: 'Daily-reset 2x Dow via swaps; capital gains distributions.' },
    EDC: {
        score: 4,
        rationale: 'Daily-reset 3x EM via swaps; capital gains distributions, foreign withholding pass-through.',
    },
    EET: { score: 4, rationale: 'Daily-reset 2x EM via swaps; capital gains distributions.' },
    UGL: {
        score: 3,
        rationale: 'Daily-reset 2x gold via futures/swaps; Section 1256 mark-to-market plus distributions.',
    },
    TMF: {
        score: 3,
        rationale: 'Daily-reset 3x Treasuries via swaps; ordinary interest plus capital gains distributions.',
    },
    UBT: {
        score: 3,
        rationale: 'Daily-reset 2x Treasuries via swaps; ordinary interest plus capital gains distributions.',
    },

    // --- Standalone managed futures (Section 1256, 60/40 mark-to-market, 1099 not K-1) ---
    KMLM: { score: 5, rationale: 'Section 1256 60/40 blended treatment, annual mark-to-market; 1099 (not K-1).' },
    CTA: { score: 5, rationale: 'Section 1256 60/40 blended treatment, annual mark-to-market; 1099 (not K-1).' },
    DBMF: { score: 5, rationale: 'Section 1256 60/40 blended treatment, annual mark-to-market; 1099 (not K-1).' },
};
