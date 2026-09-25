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

| #   | Item                                                | Priority | Why                                                                                       | Status |
| --- | --------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------- | ------ |
| 6   | Adjusted inputs overwrite the user's saved settings | P1       | Silently loses input, and an applied solve can run a different plan than the one checked. | open   |
| 11  | The main chart doesn't respond to touch             | P2       | The main chart's tooltip is unusable on phones and tablets.                               | open   |

When you change an item's status, update it both in this table and in the item itself.

## How to work an item

1. Claim it: change its **Status** from `open` to `in progress (<agent/branch>)` before you start.
2. Check **Touches** against the other in-progress items. Coordinate overlapping file edits before starting.
3. Fix it, add or update a test in `tests/`, and run `npm test`. All tests must pass.
4. Remove the item from this file (table and section) once it's done.

Project rules that apply to every item:

- **Single source of truth.** Every value is calculated once, in the worker's `yearData`/`summary`. UI code reads those values; it doesn't recalculate them.
- **The app is unreleased.** Don't add migrations or backward compatibility for saved settings. Just delete keys that are no longer used.

---

## 6. Adjusted inputs overwrite the user's saved settings

- **Type:** Logic
- **Priority:** P1
- **Status:** open
- **Touches:** `lib/index.jsx` (clamping near L60–80, balance slider `onChange`, `applySolverResult`)

The code keeps inputs valid by adjusting them, then writes the adjusted value back to saved state, so the user's original value is lost:

- Raise Current Age 43 → 50 → 43: Retirement Age stays at 50, adding a 7-year delay the user never set.
- Drag the balance down and back up: the bucket years and the withdrawal stay at their reduced values.
- Apply a balance solve that lowers the balance: the bucket is quietly shortened, so the plan now running differs from the one the solver checked.

**Fix direction:** Keep the saved value as the user's intent and clamp only when deriving the value to use. Remove the `useEffect` write-backs and the `setWithdrawal` clamp in the balance `onChange`. For Retirement Age, decide whether the saved value should be a delay (years from now) instead of an age, so "retire now" survives changes to Current Age.

**Done when:** Moving any slider away and back restores every other slider's earlier value. A test covers this.

## 11. The main chart doesn't respond to touch

- **Type:** Programmatic
- **Priority:** P2
- **Status:** open
- **Touches:** `lib/chart.jsx` (~L367)

The portfolio chart uses `onMouseMove`/`onMouseLeave`, while the depletion chart uses pointer events. On touch screens the hover tooltip barely works.

**Fix direction:** Switch to `onPointerMove`/`onPointerLeave`, matching the depletion chart.

**Done when:** Dragging a finger across the chart moves the tooltip.
