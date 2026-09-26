# 05: Portfolio and Investments

**What to build:** Every balance says whether it covers the Investments only or the whole Portfolio (Investments plus the Cash Bucket). Today the per-year simulation records use `endBalance` for Investments and `totalEndBalance` for the Portfolio. The marker for "the median Investments hit zero" is called `portfolioDepletion`, which under the glossary is neither the Portfolio nor Depletion.

**Blocked by:** 01 (Show Bucket Funding as a move within the Portfolio). 01 reworks the same balance and growth figures.

**Status:** ready-for-agent

- [ ] The per-year balance fields (start and end, median and percentiles, today's-dollar versions) are renamed so that Investments-only and whole-Portfolio values are unmistakable.
- [ ] The "median Investments reach zero" marker and its related fields are renamed as the Investments running out, not Portfolio depletion. Chart copy that describes it doesn't call it Depletion.
- [ ] Plan table and chart copy say "Investments + Cash Bucket" or "Portfolio" consistently in place of "Total Balance (Investments + Cash)" and "invested portfolio".
- [ ] The existing tests pass under the new names.
