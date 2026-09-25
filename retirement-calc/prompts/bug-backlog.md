# Bug Backlog

Findings from a review of the retirement simulator. Each item stands alone so separate agents can take different items at the same time.

The review was run with this prompt:

> Find bugs--conceptual, logical, or programmatic--in this app.

## Priority

| Level | Meaning |
| --- | --- |
| **P1** | Crashes the app, loses the user's input, or gives a wrong answer the user would act on. Fix first. |
| **P2** | Misleading or inconsistent results, or a feature that doesn't work for some users. |
| **P3** | Cosmetic, wording, or edge cases unlikely to affect a decision. |

Suggested order, highest first. Within a level, earlier items matter more.

| # | Item | Priority | Status |
| --- | --- | --- | --- |
| 8 | The worker uses too much memory | P1 | open |
| 6 | Adjusted inputs overwrite the user's saved settings | P1 | open |
| 1 | Cash-bucket years don't keep up with inflation | P1 | done (behind flag) |
| 3 | The solver compares noisy runs | P2 | open |
| 5 | "Last Annual Withdrawal" can show the lump sum | P2 | open |
| 2 | "Worst 30-Yr" preset isn't a real 30-year window | P2 | open |
| 13 | Sidebar recalculates values the worker already calculates | P2 | open |
| 11 | The main chart doesn't respond to touch | P2 | open |
| 4 | "Total Drawn … today" overstates real spending with a bucket | P3 | open |
| 7 | Success color ignores the user's target | P3 | open |
| 10 | `fmtMoney` can show "$1000K" | P3 | open |
| 9 | `formatSuccessChance` shows "0 in 1" and "1 in 1" | P3 | open |
| 12 | Small text problems | P3 | open |

Item 13 went up in priority once item 1 landed: the sidebar now repeats the worker's inflation-adjusted bucket sizing, so there are two copies of that logic that can drift apart.

When you change an item's status, update it both in this table and in the item itself.

## How to work an item

1. Claim it: change its **Status** from `open` to `in progress (<agent/branch>)` before you start.
2. Check **Touches** against the other in-progress items. If files overlap, see [Conflict groups](#conflict-groups) before starting.
3. Fix it, add or update a test in `tests/`, and run `npm test`. All tests must pass.
4. Set **Status** to `done` and add a one-line note on what changed.

Project rules that apply to every item:

- **Single source of truth.** Every value is calculated once, in the worker's `yearData`/`summary`. UI code reads those values; it doesn't recalculate them.
- **The app is unreleased.** Don't add migrations or backward compatibility for saved settings. Just delete keys that are no longer used.

## Conflict groups

Items in the same group edit the same code. Run them one after another, not in parallel.

| Group | Items | Shared code |
| --- | --- | --- |
| A — worker bucket logic | 1, 4, 5 | `lib/monte-carlo-worker.js` withdrawal loop and `summary` |
| B — sidebar state | 6, 13 | `lib/index.jsx` lines ~30–70 |
| C — worker memory layout | 8 | `lib/monte-carlo-worker.js` storage and quantile pass. Rebase onto group A if both are in flight. |

Everything else can run in parallel.

---

## 1. Cash-bucket years don't keep up with inflation

- **Type:** Conceptual
- **Priority:** P1
- **Status:** done behind feature flag `inflationAdjustedBucket` (off by default; saved setting under the sidebar's Advanced section). The worker sizes and pays each bucket year from `bucketYearCents`/`bucketPaidCents`; the sidebar mirrors the sizing. To ship, delete the flag and its flat branch.
- **Touches:** `lib/monte-carlo-worker.js` (L186–198, L226–241), `lib/index.jsx` (L56–59, bucket slider sublabel ~L474), possibly `lib/chart.jsx` footnote

The Annual Withdrawal sublabel says spending is "increased by rate of inflation each year." In a cash-bucket plan, every bucket year pays the same retirement-year amount (`lumpSumCents = retirementWdCents * upfrontYears`). Spending then jumps back to the inflated amount in year N+1. A bucket plan therefore spends less in real terms than the same plan without a bucket, and part of the success-rate gain from adding a bucket is just lower spending.

**Fix direction:** Size the bucket so each year it covers is inflation-adjusted: the sum of `wd × inflPow[delay + i]` for i = 0..N−1. Draw each year's amount from the cash. Update `cashAt`, `cashBalance`, `spending`, and `bucketExhaustionYears` (partial funding) to use the same per-year amounts. Update the bucket sublabel text.

**Done when:** A bucket plan's `spending` for every retirement year equals the no-bucket plan's `intended` for that year, as long as the bucket is fully funded. A test covers this.

## 2. "Worst 30-Yr" preset isn't a real 30-year window

- **Type:** Conceptual
- **Priority:** P2
- **Status:** open
- **Touches:** `lib/monte-carlo.js` (`MARKET_PRESETS`), `lib/index.jsx` (`HistoricalDataModal`), `lib/labels.js` (`PRESET_LABELS.worst`)

The preset combines the worst CAGR (1903–1932), the worst volatility (~1925–1955), and the worst inflation (~1950–1980), three different periods. For the U.S. that's a 4.7% nominal return with 4.6% inflation (about 0.1% real) and 28% volatility. That's much harsher than any single historical period, but the label presents it as history.

**Fix direction:** Either take all three values from one real 30-year window, or rename the preset and table column to make clear it's a combined stress case (for example "Stress Case") and explain that in the modal.

**Done when:** The preset's label and the modal's explanation match what the numbers actually are.

## 3. The solver compares noisy runs

- **Type:** Conceptual
- **Priority:** P2
- **Status:** open
- **Touches:** `lib/monte-carlo-worker.js` (RNG seeding, L17–28), `lib/monte-carlo.js` (`startSimulation` params), `lib/solver.js`

Each solver trial starts a new worker seeded from `Date.now()`, so each trial draws different random returns. The success rate then isn't smooth across the amounts being searched, so the binary search can land on the wrong step. The 1M-run check after Apply uses yet another seed, which is why applied results can come in just under the target. Reloading the page also changes every number.

**Fix direction:** Accept an optional `seed` in the worker params. The solver passes one fixed seed to every trial. Decide whether the main simulation should also use a fixed seed so results repeat across reloads.

**Done when:** Solver trials with the same inputs and seed return identical success rates, and the success rate changes in one direction only as the searched amount changes. A test covers this.

## 4. "Total Drawn … today" overstates real spending when there's a bucket

- **Type:** Conceptual
- **Priority:** P3
- **Status:** open (conflict group A)
- **Touches:** `lib/monte-carlo-worker.js` (L246–253, summary)

The whole lump sum is converted to today's dollars at retirement year 1 (`drawnToday = drawn × MICRO / inflPow[y − 1]`), even though that cash is spent over the following years.

**Fix direction:** Count bucket spending in the year it's actually spent, converting each year's amount to today's dollars with that year's inflation factor. It's easiest to do this together with item 1.

**Done when:** `totalDrawnToday` for a bucket plan equals the sum of each year's spending converted to today's dollars. A test covers this.

## 5. "Last Annual Withdrawal" can show the lump sum

- **Type:** Logic
- **Priority:** P2
- **Status:** open (conflict group A)
- **Touches:** `lib/monte-carlo-worker.js` (`lastDraw`, `lastDrawToday`, summary L486–487)

`maxUpfrontYears = Math.min(10, years)`, so the bucket can be as long as the whole plan (for example, ages 43→50 with a 7-year bucket). The only draw is then the lump sum, and `median(lastDraw)` reports 7 × the annual withdrawal as the "Last Annual Withdrawal."

**Fix direction:** Record the last *annual spending* amount, meaning the last bucket year's payment if the bucket covers the final year, not the lump-sum transfer.

**Done when:** When the bucket covers the whole horizon, `lastWithdrawal` equals one year's spending. A test covers this.

## 6. Adjusted inputs overwrite the user's saved settings

- **Type:** Logic
- **Priority:** P1
- **Status:** open (conflict group B)
- **Touches:** `lib/index.jsx` (L45–67, balance slider `onChange` L448–451, `applySolverResult`)

The code keeps inputs valid by adjusting them, then writes the adjusted value back to saved state, so the user's original value is lost:

- Raise Current Age 43 → 50 → 43: Retirement Age stays at 50, adding a 7-year delay the user never set.
- Drag the balance down and back up: the bucket years and the withdrawal stay at their reduced values.
- Apply a balance solve that lowers the balance: the bucket is quietly shortened, so the plan now running differs from the one the solver checked.

**Fix direction:** Keep the saved value as the user's intent and clamp only when deriving the value to use. Remove the `useEffect` write-backs and the `setWithdrawal` clamp in the balance `onChange`. For Retirement Age, decide whether the saved value should be a delay (years from now) instead of an age, so "retire now" survives changes to Current Age.

**Done when:** Moving any slider away and back restores every other slider's earlier value. A test covers this.

## 7. Success color ignores the user's target

- **Type:** Logic
- **Priority:** P3
- **Status:** open
- **Touches:** `lib/index.jsx` (L372–377)

The success color is hard-coded to green at ≥90% and amber at ≥70%. A 92% result shows green even when the target is 95%.

**Fix direction:** Base the color on `targetSuccessRate`: green when at or above the target, amber within some margin below it, red otherwise.

**Done when:** The color changes when the target slider crosses the current success rate.

## 8. The worker uses too much memory

- **Type:** Programmatic
- **Priority:** P1
- **Status:** open (conflict group C)
- **Touches:** `lib/monte-carlo-worker.js` (L200–204, the per-year quantile pass L355–474)

The worker keeps one `Float64Array(runs)` per year: 8 MB per year for 1M runs. The defaults (47 years) allocate about 384 MB. Age 18 through 120 (102 years) needs about 830 MB, which will likely crash the tab on mobile and some desktops.

**Fix direction:** The quantile pass for year y needs only year y's and year y−1's balances, plus per-run totals. Options:

- Loop years on the outside and runs on the inside, keeping per-run state (`bal`, `depleted`) in arrays, so only two year-arrays are alive at a time.
- Store balances in a smaller type.

Keep the integer-cents precision the file's header comment promises.

**Done when:** Peak memory no longer grows with the number of years, and all existing tests pass with the same results.

## 9. `formatSuccessChance` shows "0 in 1" and "1 in 1"

- **Type:** Programmatic
- **Priority:** P3
- **Status:** open
- **Touches:** `lib/index.jsx` (L5–12)

A rate of exactly 0 or 1 skips the early return and falls into the divisor search, producing "≈ 0 in 1 chance" or "≈ 1 in 1 chance."

**Fix direction:** Handle 0 and 1 explicitly (for example "0 in 10" / "10 in 10", or "none" / "all").

**Done when:** Rates of 0 and 1 display sensibly. A test covers this.

## 10. `fmtMoney` can show "$1000K"

- **Type:** Programmatic
- **Priority:** P3
- **Status:** open
- **Touches:** `lib/format.js` (L5–13), `tests/format.test.cjs`

Values from 999,500 to 999,999 round to "1000" in the K branch instead of switching to the M format. This can appear on chart axis labels and in results.

**Fix direction:** Choose the unit from the rounded value, or switch to M at 999,500.

**Done when:** `fmtMoney(999_600)` returns "$1.00M". A test covers this.

## 11. The main chart doesn't respond to touch

- **Type:** Programmatic
- **Priority:** P2
- **Status:** open
- **Touches:** `lib/chart.jsx` (L364–369)

The portfolio chart uses `onMouseMove`/`onMouseLeave`, while the depletion chart uses pointer events. On touch screens the hover tooltip barely works.

**Fix direction:** Switch to `onPointerMove`/`onPointerLeave`, matching the depletion chart.

**Done when:** Dragging a finger across the chart moves the tooltip.

## 12. Small text problems

- **Type:** Copy
- **Priority:** P3
- **Status:** open
- **Touches:** `lib/index.jsx` (L723), `lib/chart.jsx` (L16–23), `lib/plan-schedule.jsx` (L118)

- Typo: "You may need to withdrawal less" should be "withdraw less" (`index.jsx` L723).
- The chart's header comment is out of date: it says "Tick 0 is retirement" and mentions "Year y" stat cells. Tick 0 is today, and the stat cells use ages.
- For the same depletion year, the chart labels the year by its end ("by 2027") and the schedule labels it by its start ("2026"). Pick one convention, or make the difference explicit in the labels.

**Done when:** All three are resolved.

## 13. Sidebar recalculates values the worker already calculates

- **Type:** Single-source-of-truth violation
- **Priority:** P2
- **Status:** open (conflict group B)
- **Touches:** `lib/index.jsx` (L56–64), `lib/monte-carlo-worker.js` (`lumpSum`)

`index.jsx` recalculates the inflated retirement withdrawal and the bucket size with floating-point math (`withdrawal * Math.pow(1 + inflation, retirementDelay)`), while the worker calculates the same values in integer cents and returns `lumpSum`. The sidebar needs these values before any simulation has run, so this may be deliberate, but the two can drift apart, especially after item 1 changes how the bucket is sized.

**Fix direction:** Move the bucket-size and inflation math into one shared module that both the worker (via `importScripts`) and the UI load, so there is only one implementation.

**Done when:** One function calculates the bucket size, and both the sidebar and the worker call it.
