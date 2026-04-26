# Retirement Portfolio Simulator

Single-page web app that projects a retirement portfolio over time given a withdrawal rate, market assumptions, and inflation. Static files only — no build step, no framework.

## File map

- [index.html](index.html) — markup. Every interactive control has an `id` that [app.js](app.js) reads via `getElementById`. **The IDs are a load-bearing contract between the two files**; renaming one without the other breaks the page on load — errors land in the browser console, not the UI.
- [app.js](app.js) — state, math, Chart.js wiring, DOM updates, event listeners. Loaded with `defer`. Top of the file has JSDoc `@typedef`s for the state and data shapes — read those before adding fields.
- [styles.css](styles.css) — mobile-first CSS. Breakpoints at 768px and 1024px, plus a `pointer: coarse` block for touch targets.
- [start.js](start.js), [package.json](package.json) — `npm start` spawns `npx serve` and opens the URL. No bundler, no test runner, no linter.

## Running it

```
npm start
```

Files are served as-is; there is no build output.

## Domain model

- **Period** = one annual or monthly step. `state.isMonthly` toggles between them; `periodsPerYear` is `12` or `1`.
- **Withdrawal schedule** (in `calculatePortfolioPath`):
  - Period 1: lump-sum withdrawal of `firstWithdrawalPeriods × periodWithdrawal` (funds the first N periods upfront). Default state has `firstWithdrawalPeriods = 1`, so this collapses to a normal one-period withdrawal.
  - Periods 2 through `firstWithdrawalPeriods`: **no** withdrawal taken from the portfolio (the lump sum funds them). `periodWithdrawal` still inflates each period whether or not it's taken.
  - From period `firstWithdrawalPeriods + 1` onward: take a single inflation-adjusted `periodWithdrawal` per period.
  - Note that the chart's *displayed* withdrawal value is gated on `period < upfrontPeriods` (strict less-than), while the *actual* math withdrawal is gated on `period <= upfrontPeriods`. This is intentional, not a bug — it makes the chart's stepped line transition at the right x-position with `stepped: 'before'`.
- **Two parallel paths** are computed each period from `initialInvestment`:
  - `median` — drift includes the `−σ²/2` log-normal correction (geometric-mean expectation). This is what the chart and table display.
  - `mean` — drift is the raw log-CAGR (arithmetic-mean expectation). Computed but never surfaced in the UI.
- **Depletion** is two distinct things, easy to confuse:
  - *Truncation* — when end-of-period `median` reaches `0` (start-of-period balance was ≤ withdrawal), that period's `withdrawal` becomes `null`, and **every subsequent period** is fully nulled (`median`, `mean`, `withdrawal` all → `null`). The chart and table render gaps as N/A; the status banner switches to "Depletes Prematurely".
  - *Display clip* — when `0 < median < displayedWithdrawal` (the post-growth balance is positive but smaller than what was withdrawn), the displayed `withdrawal` is clipped down to `median` for that single period. The math has already happened; this is purely a chart/table cosmetic.

## State

`state` (a single module-level object in [app.js](app.js)) is the source of truth. The JSDoc `@typedef SimulationState` documents every field. After mutating `state`, call `updateDisplay()` — it's the single function that re-derives every label, the chart, and the data table from `state`.

## Conventions for AI-assisted edits

- **No build step, no framework.** Don't introduce TypeScript, bundlers, transpilers, or component frameworks unless asked. Modern browser JS is fine — the existing code uses optional chaining (`?.`), template literals, and spread.
- **Element IDs are load-bearing.** When renaming an ID in HTML, grep [app.js](app.js) for the old name; same in reverse. There is no compile-time check that catches a mismatch.
- **Presets live in two places.** `portfolioPresets` in [app.js](app.js) and the `<option>` list in [index.html](index.html). Adding/removing one requires updating both. Rendering the `<option>` list from JS at init would remove this footgun.
- **Chart.js is loaded as a CDN-attached global** (`Chart`). Don't switch to ES-module imports without also wiring up a module loader.
- **State → display flow.** Mutate `state`, then call `updateDisplay()`. Form-control synchronization (e.g. `slider.value = state.x` in `applyPreset`/`updateUpfrontPeriodsMax` to keep the UI in sync after a programmatic state change) is fine alongside it; ad-hoc rendering of derived values that bypasses `updateDisplay` is not.
- **Currency formatting** uses `formatCurrency()` for everything in the body, tooltips, and data table. The chart's axis tick callbacks have their own bespoke `$X.XM` / `$XK` formatters — they're kept separate on purpose (axis ticks need short, scaled labels, not full numbers).

## Verifying changes

There are no automated tests. To verify:
1. `npm start`
2. Exercise the affected sliders/toggles in the browser; watch the browser console for errors.
3. Cross-check that the chart, data table, and status banner stay consistent (e.g. depletion at year 30 should show in all three).
4. Try both Annual and Monthly frequencies — `calculatePortfolioPath` does several periodic-vs-annual unit conversions (`periodsPerYear`, `sqrt(periodsPerYear)`, `Math.pow(... 1/12)`), and unit bugs in that function will only surface in one mode.

For numerical sanity after editing `calculatePortfolioPath`: with the default state (4M initial, 3.8% withdrawal, 50yr horizon, aggressive preset) the median path should comfortably end well above zero. A drastic regression there usually means a periodic-vs-annual scaling mistake.
