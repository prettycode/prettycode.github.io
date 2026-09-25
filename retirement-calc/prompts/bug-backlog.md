# Bug Backlog

Findings from a review of the retirement simulator. Each item stands alone so separate agents can take different items at the same time.

The review was run with this prompt:

> Find bugs--conceptual, logical, or programmatic--in this app.

## Priority

| Level  | Meaning                                                                                            |
| ------ | -------------------------------------------------------------------------------------------------- |
| **P1** | Crashes the app, loses the user's input, or gives a wrong answer the user would act on. Fix first. |
| **P2** | Misleading or inconsistent results, or a feature that doesn't work for some users.                 |
| **P3** | Cosmetic, wording, or edge cases unlikely to affect a decision.                                    |

Suggested order, highest first. Within a level, earlier items matter more.

| #   | Item                                                         | Priority | Why                                                                                       | Status |
| --- | ------------------------------------------------------------ | -------- | ----------------------------------------------------------------------------------------- | ------ |
| 6   | Adjusted inputs overwrite the user's saved settings          | P1       | Silently loses input, and an applied solve can run a different plan than the one checked. | open   |
| 2   | "Worst 30-Yr" preset isn't a real 30-year window             | P2       | Presents a combined stress case as history, so users may over-save or under-spend.        | open   |
| 7   | Success color ignores the user's target                      | P2       | The at-a-glance color says "fine" (green) when the result misses the user's own target.   | open   |
| 13  | Sidebar recalculates values the worker already calculates    | P2       | Two copies of the bucket sizing can drift; violates the single-source-of-truth rule.      | open   |
| 11  | The main chart doesn't respond to touch                      | P2       | The main chart's tooltip is unusable on phones and tablets.                               | open   |
| 5   | "Last Annual Withdrawal" can show the lump sum               | P3       | Wrong number, but only when the bucket covers the whole plan.                             | open   |
| 4   | "Total Drawn … today" overstates real spending with a bucket | P3       | Secondary summary stat; small error, bucket plans only.                                   | open   |
| 12  | Small text problems                                          | P3       | One visible typo plus comment and labeling consistency.                                   | open   |

When you change an item's status, update it both in this table and in the item itself.

## How to work an item

1. Claim it: change its **Status** from `open` to `in progress (<agent/branch>)` before you start.
2. Check **Touches** against the other in-progress items. If files overlap, see [Conflict groups](#conflict-groups) before starting.
3. Fix it, add or update a test in `tests/`, and run `npm test`. All tests must pass.
4. Remove the item from this file (table and section) once it's done.

Project rules that apply to every item:

- **Single source of truth.** Every value is calculated once, in the worker's `yearData`/`summary`. UI code reads those values; it doesn't recalculate them.
- **The app is unreleased.** Don't add migrations or backward compatibility for saved settings. Just delete keys that are no longer used.

## Conflict groups

Items in the same group edit the same code. Run them one after another, not in parallel.

| Group                   | Items | Shared code                                               |
| ----------------------- | ----- | --------------------------------------------------------- |
| A — worker bucket logic | 4, 5  | `lib/monte-carlo-worker.js` withdrawal loop and `summary` |
| B — sidebar state       | 6, 13 | `lib/index.jsx` lines ~40–80                              |

Everything else can run in parallel.

---

## 2. "Worst 30-Yr" preset isn't a real 30-year window

- **Type:** Conceptual
- **Priority:** P2
- **Status:** open
- **Touches:** `lib/monte-carlo.js` (`MARKET_PRESETS`), `lib/index.jsx` (`HistoricalDataModal`), `lib/labels.js` (`PRESET_LABELS.worst`)

The preset combines the worst CAGR (1903–1932), the worst volatility (~1925–1955), and the worst inflation (~1950–1980), three different periods. For the U.S. that's a 4.7% nominal return with 4.6% inflation (about 0.1% real) and 28% volatility. That's much harsher than any single historical period, but the label presents it as history.

**Fix direction:** Either take all three values from one real 30-year window, or rename the preset and table column to make clear it's a combined stress case (for example "Stress Case") and explain that in the modal.

**Done when:** The preset's label and the modal's explanation match what the numbers actually are.

## 4. "Total Drawn … today" overstates real spending when there's a bucket

- **Type:** Conceptual
- **Priority:** P3
- **Status:** open (conflict group A)
- **Touches:** `lib/monte-carlo-worker.js` (withdrawal loop, summary)

The whole lump sum is converted to today's dollars at retirement year 1 (`drawnToday = drawn × MICRO / inflPow[y − 1]`), even though that cash is spent over the following years.

**Fix direction:** Count bucket spending in the year it's actually spent, converting each year's amount to today's dollars with that year's inflation factor. The per-year amounts are already in `bucketYearCents`.

**Done when:** `totalDrawnToday` for a bucket plan equals the sum of each year's spending converted to today's dollars. A test covers this.

## 5. "Last Annual Withdrawal" can show the lump sum

- **Type:** Logic
- **Priority:** P3
- **Status:** open (conflict group A)
- **Touches:** `lib/monte-carlo-worker.js` (`lastDraw`, `lastDrawToday`, summary)

`maxUpfrontYears = Math.min(10, years)`, so the bucket can be as long as the whole plan (for example, ages 43→50 with a 7-year bucket). The only draw is then the lump sum, and `median(lastDraw)` reports 7 × the annual withdrawal as the "Last Annual Withdrawal."

**Fix direction:** Record the last _annual spending_ amount, meaning the last bucket year's payment if the bucket covers the final year, not the lump-sum transfer.

**Done when:** When the bucket covers the whole horizon, `lastWithdrawal` equals one year's spending. A test covers this.

## 6. Adjusted inputs overwrite the user's saved settings

- **Type:** Logic
- **Priority:** P1
- **Status:** open (conflict group B)
- **Touches:** `lib/index.jsx` (clamping near L60–80, balance slider `onChange`, `applySolverResult`)

The code keeps inputs valid by adjusting them, then writes the adjusted value back to saved state, so the user's original value is lost:

- Raise Current Age 43 → 50 → 43: Retirement Age stays at 50, adding a 7-year delay the user never set.
- Drag the balance down and back up: the bucket years and the withdrawal stay at their reduced values.
- Apply a balance solve that lowers the balance: the bucket is quietly shortened, so the plan now running differs from the one the solver checked.

**Fix direction:** Keep the saved value as the user's intent and clamp only when deriving the value to use. Remove the `useEffect` write-backs and the `setWithdrawal` clamp in the balance `onChange`. For Retirement Age, decide whether the saved value should be a delay (years from now) instead of an age, so "retire now" survives changes to Current Age.

**Done when:** Moving any slider away and back restores every other slider's earlier value. A test covers this.

## 7. Success color ignores the user's target

- **Type:** Logic
- **Priority:** P2
- **Status:** open
- **Touches:** `lib/index.jsx` (success color)

The success color is hard-coded to green at ≥90% and amber at ≥70%. A 92% result shows green even when the target is 95%.

**Fix direction:** Base the color on `targetSuccessRate`: green when at or above the target, amber within some margin below it, red otherwise.

**Done when:** The color changes when the target slider crosses the current success rate.

## 11. The main chart doesn't respond to touch

- **Type:** Programmatic
- **Priority:** P2
- **Status:** open
- **Touches:** `lib/chart.jsx` (~L367)

The portfolio chart uses `onMouseMove`/`onMouseLeave`, while the depletion chart uses pointer events. On touch screens the hover tooltip barely works.

**Fix direction:** Switch to `onPointerMove`/`onPointerLeave`, matching the depletion chart.

**Done when:** Dragging a finger across the chart moves the tooltip.

## 12. Small text problems

- **Type:** Copy
- **Priority:** P3
- **Status:** open
- **Touches:** `lib/index.jsx` (~L776), `lib/chart.jsx` (header comment), `lib/plan-schedule.jsx` (~L118)

- Typo: "You may need to withdrawal less" should be "withdraw less" (`index.jsx` ~L776).
- The chart's header comment is out of date: it says "Tick 0 is retirement" and mentions "Year y" stat cells. Tick 0 is today, and the stat cells use ages.
- For the same depletion year, the chart labels the year by its end ("by 2027") and the schedule labels it by its start ("2026"). Pick one convention, or make the difference explicit in the labels.

**Done when:** All three are resolved.

## 13. Sidebar recalculates values the worker already calculates

- **Type:** Single-source-of-truth violation
- **Priority:** P2
- **Status:** open (conflict group B)
- **Touches:** `lib/index.jsx` (`startingBucketSize`, ~L55–80), `lib/monte-carlo-worker.js` (`bucketYearCents`, `lumpSum`)

`index.jsx` recalculates the inflated retirement withdrawal and the bucket size with floating-point math (`withdrawal * Math.pow(1 + inflation, retirementDelay)`), including a second copy of the `inflationAdjustedBucket` sizing, while the worker calculates the same values in integer cents and returns `lumpSum`. The sidebar needs these values before any simulation has run, so this may be deliberate, but the two copies can drift apart.

**Fix direction:** Move the bucket-size and inflation math into one shared module that both the worker (via `importScripts`) and the UI load, so there is only one implementation.

**Done when:** One function calculates the bucket size, and both the sidebar and the worker call it.
