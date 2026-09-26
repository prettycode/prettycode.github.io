# 03: Timeline terms: Starting Age, Accumulation Period, Distribution Period, Plan Through Age

**What to build:** The plan's timeline uses the glossary's terms throughout. Starting Age is when Distributions begin. The Accumulation Period is the years before it, and the Distribution Period runs from it until Plan Through Age. Today the code says `retirementAge` / `retirementDelay`, the plan table says "Before withdrawals N" / "Withdrawal year N", and the chart and help text say "withdrawals begin". "Retirement" is not a domain word.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Plan table rows read "Accumulation year N" and "Distribution year N".
- [ ] The chart marker and any help text that says "withdrawals begin" or "when withdrawals begin" refer to Starting Age or the start of the Distribution Period instead.
- [ ] The Plan Through Age hint makes clear the plan runs *until you turn* that age, not through the year you are that age. The underlying calculation is unchanged.
- [ ] `retirementAge` and `retirementDelay` are renamed in glossary terms everywhere: settings, simulation inputs and outputs, solver, UI and tests, including the test file named after retirement delay. No "retirement" identifiers remain.
- [ ] Old saved settings under the previous key are simply dropped (no migration).
- [ ] The existing tests pass under the new names.
