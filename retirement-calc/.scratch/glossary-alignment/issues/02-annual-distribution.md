# 02: Annual Distribution

**What to build:** The yearly amount the user chooses is called the Annual Distribution everywhere, from the slider the user sees down to the saved setting and the simulation input. Today it is "Annual Spending" in the UI and `withdrawal` in the code, and its hint asks "Withdraw how much each year?".

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The slider label reads "Annual Distribution". Its hint and description use Distribution wording, with no "withdraw" or "spending".
- [ ] The description's reference to "Invested Portfolio Today" says "Liquid Assets" instead.
- [ ] The "solve for" option for this amount, its amount limits, the saved setting key and the simulation input all use Annual Distribution naming. No `withdrawal` identifier remains for this concept.
- [ ] Solver prompts and explanatory text that mention this amount use "Annual Distribution".
- [ ] Old saved settings under the previous key are simply dropped (the app is unreleased, so no migration).
- [ ] The existing tests pass under the new names.
