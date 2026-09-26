# 07: Market Outlook

**What to build:** A Market Preset is a Region (U.S. or World) plus a Market Outlook (Historical or Stress Case). The code calls the Market Outlook a `scenario` and the Stress Case `worst`. "Scenario" is too easily confused with a Simulation, so the code uses the glossary terms instead. Visible labels already say "Historical" and "Stress Case" and don't change.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Preset data, preset state and handlers use Market Outlook naming in place of `scenario`, and Stress Case naming in place of `worst`.
- [ ] Visible preset labels are unchanged.
- [ ] Any saved setting affected by the rename is simply dropped (no migration).
- [ ] The existing tests pass under the new names.
