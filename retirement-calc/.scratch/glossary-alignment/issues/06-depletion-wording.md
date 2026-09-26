# 06: Depletion wording

**What to build:** Outside the "Will I run out of money?" risk panel, the app says Depletion for the moment the whole Portfolio (Investments and Cash Bucket) is empty in a Simulation. The risk panel is the deliberate exception: its headline, summary sentence, readout and chart note keep their plain-language "run out of money" copy and must not be changed.

**Blocked by:** 05 (Portfolio and Investments). 05 separates "Investments empty" from Depletion, which this ticket builds on.

**Status:** ready-for-agent

- [ ] The "Will I run out of money?" section is unchanged: headline, "of simulations ran out of money by…", readout and chart note.
- [ ] The Outcome Odds section's rungs and notes ("had run out by…") use Depletion wording.
- [ ] Stats and plan table labels ("Depletion Age (Median)", "Median depleted at…") are checked and made consistent with the glossary definition: Depletion includes the Cash Bucket.
- [ ] Where Depletion-related code identifiers outside the risk panel say "run out", they use Depletion naming.
- [ ] The existing tests pass, and any test that asserts on Outcome Odds copy is updated.
