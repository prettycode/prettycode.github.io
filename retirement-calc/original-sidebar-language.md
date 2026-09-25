# Original Sidebar Language

These are the sidebar labels and text as of `c6bdf10^`, the commit just before "Improved labels" (`c6bdf10`, 2026-09-25) changed them. They come from `lib/index.jsx` and `lib/labels.js` at that commit.

## Your Retirement Plan

| Setting | Sublabel |
|---|---|
| **Current Age** | "What is your age today?" |
| **Retirement Start Age** | "At what age will you start withdrawing from your portfolio?" |
| **Retirement End Age** | `` `${retirementDelay} years until retirement; ${years} years in retirement` `` |
| **Savings Portfolio** | "Portfolio value today" |
| **Annual Withdrawal** | If `retirementDelay > 0`: `` `Today's dollars; starts at ${fmtMoney(retirementWithdrawal)} at retirement, then increases with inflation` ``<br>Otherwise: "Today's dollars; increased by rate of inflation each year" |
| **Starting Cash Bucket** | If `inflationAdjustedBucket`: "Lump-sum first withdrawal; covers each year's inflation-adjusted spending"<br>Otherwise: "Lump-sum first withdrawal, in retirement-year dollars" |

## Market Assumptions

| Setting | Sublabel |
|---|---|
| **CAGR** | "Portfolio's Compound annual growth rate" |
| **Annual Volatility** | "Portfolio's Standard deviation" |
| **Inflation Rate** | "Cost-of-living growth" |
| **Historical Presets** | "Apply CAGR, Annual Volatility, and Inflation Rate from historical data. ↗" |

The Historical Presets buttons were **U.S.** / **World** and **Historical** / **Apocalypse**.

## Advanced

| Setting | Description |
|---|---|
| **Inflation-Adjusted Cash Bucket** (checkbox) | "Each starting cash bucket year pays that year's inflation-adjusted spending, instead of the same retirement-year amount every year." |

## Saved Settings

- Description: "Sidebar values are remembered in your browser between visits."
- The **Reset to Defaults** button's confirm prompt: "Reset all sidebar settings to defaults? This will reload the page."

## Starting Cash Bucket sublabel history

- **`d6336b1`**: changed from `"Lump-sum first withdrawal"` to `"Lump-sum first withdrawal, in retirement-year dollars"`.
- **`c0dc287`** ("Bugs"): made the sublabel depend on `inflationAdjustedBucket`, as shown above.
- **`c6bdf10`** ("Improved labels"): removed the lump-sum wording.
