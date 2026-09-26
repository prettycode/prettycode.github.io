# 04: Bucket Years and Bucket Funding

**What to build:** The Cash Bucket's size is stated in Bucket Years, and the one-time move of money into it is Bucket Funding, both in the UI copy and in the code. Today the code says `upfrontYears` and `lumpSum`, and the Starting Cash Bucket help text says "Lump-sum years of annual withdrawals upfront?" and "multi-year bucket".

**Blocked by:** 01 (Show Bucket Funding as a move within the Portfolio). 01 introduces Bucket Funding as a displayed figure, and this ticket renames around it.

**Status:** ready-for-agent

- [ ] The Starting Cash Bucket sublabel, description and hints use Bucket Years, Cash Bucket and Bucket Funding, with no "lump sum", "upfront" or "multi-year bucket".
- [ ] `upfrontYears` and `lumpSum` (and derived names such as the maximum affordable bucket years) are renamed in glossary terms everywhere: settings, spending plan, solver, simulation, UI and tests.
- [ ] Old saved settings under the previous key are simply dropped (no migration).
- [ ] The existing tests pass under the new names.
