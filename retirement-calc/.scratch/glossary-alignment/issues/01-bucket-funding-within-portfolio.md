# 01: Show Bucket Funding as a move within the Portfolio

**What to build:** The glossary says the Portfolio includes the Cash Bucket. So filling the bucket moves money *within* the Portfolio, and only Distributions *leave* it. Today the plan table and chart show the first Bucket Year's Bucket Funding as a large "Portfolio Draw" (for example $450k for a 3-year bucket of $150k/yr), followed by $0 draws during the other Bucket Years. After this ticket, every year of the Distribution Period shows its Distribution: what actually left the Portfolio to pay for your life, whether it came from the Cash Bucket or the Investments. Bucket Funding appears as its own clearly labelled transfer in the first Bucket Year. This ticket goes first because it's the only one that changes what a displayed number *means*. The others are renames.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The plan table has no "Portfolio Draw" column. It shows a Distribution column for every Distribution Period year, including Bucket Years, and shows Bucket Funding separately (its own column or a clearly marked row entry) in the first Bucket Year only.
- [ ] The chart's draw marks show Distributions, not Investment outflows. Bucket Funding is visually distinct from a Distribution, or omitted from the Distribution marks and explained in the legend.
- [ ] "Portfolio Growth / Loss" is relabelled "Investment Growth / Loss". It still measures Investment gains only.
- [ ] The plan table's explanatory note and the chart legend and tooltips are rewritten in glossary terms (Portfolio, Investments, Cash Bucket, Bucket Funding, Distribution) and no longer mention "portfolio draws".
- [ ] The summary's last-year and lifetime-total figures (currently `lastWithdrawal` / `totalDrawn` and their today's-dollar versions) measure Distributions, so Bucket Funding no longer counts as money spent in the year it happens. Rename them in Distribution terms.
- [ ] The per-year simulation records carry the Planned Distribution, the Distribution and the Bucket Funding as canonical fields, replacing `intended` / `actual`. The UI only reads these fields and never re-derives them.
- [ ] Tests cover a multi-Bucket-Year plan: Distributions in Bucket Years equal the bucket payments, Bucket Funding appears once, and the summary totals exclude Bucket Funding. Also an underfunded bucket, where Bucket Funding is less than the full bucket amount.
