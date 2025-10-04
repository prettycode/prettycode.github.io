# Portfolio Warning Rules

## Overview

The `WarningsCard` component displays portfolio analysis warnings using an extensible rule-based system. Each warning rule is defined as an object with an `id` and a `check` function.

## Current Warning Rules

1. **No EM Exposure**: Warns when portfolio has no Emerging Markets exposure
2. **U.S. Underweight**: Warns when U.S. equity exposure is more than 25% below VT's allocation (dynamically computed from VT ETF)
3. **U.S. Overweight**: Warns when U.S. equity exposure is more than 25% above VT's allocation (dynamically computed from VT ETF)
4. **No Small Cap**: Warns when portfolio has no Small Cap exposure
5. **High Daily Reset Leverage**: Warns when portfolio contains daily reset ETFs with leverage >2x (e.g., TMF, UPRO, TQQQ)
6. **Single ETF Concentration**: Warns when any single ETF represents >25% of the portfolio

**Note**: VT's U.S. vs Ex-U.S. ratios are computed dynamically from the VT ETF definition in the catalog, not hardcoded. This ensures warnings stay accurate if VT's allocations are updated in the data.

## Adding New Warning Rules

To add a new warning rule, add an object to the `warningRules` array in `WarningsCard.jsx`:

```javascript
{
    id: 'unique-rule-id',
    check: (portfolio) => {
        // Your logic here
        const { exposures } = analyzePortfolio(portfolio);

        // If warning condition is met, return:
        if (shouldWarn) {
            return {
                message: 'Brief warning message',
                description: 'More detailed explanation or suggestion',
            };
        }

        // If no warning, return null
        return null;
    },
}
```

## Example: Adding a Leverage Warning

```javascript
{
    id: 'high-leverage',
    check: (portfolio) => {
        const { totalLeverage } = analyzePortfolio(portfolio);

        if (totalLeverage > 2.0) {
            return {
                message: `High leverage detected (${totalLeverage.toFixed(1)}x)`,
                description: 'Consider reducing leverage for lower risk',
            };
        }
        return null;
    },
}
```

## Helper Functions

The `getPortfolioExposures` helper function extracts common exposure metrics:

- `usEquity`: Total U.S. equity exposure
- `exUsEquity`: Total Ex-U.S. equity exposure (International + Emerging)
- `emEquity`: Total Emerging Markets exposure
- `smallCap`: Total Small Cap exposure

You can add more helper functions or extend this one as needed.
