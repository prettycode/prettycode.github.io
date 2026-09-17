/* exported OutcomeOdds */

// ─── Outcome Odds — plain-language reading of the distribution ──────────────
// The chart shows percentile bands; this section says what they mean in odds.
// It exists to answer the two questions the bands invite and never answer:
// is the median the *likely* outcome (no — it is the middle one), and how
// wide is the realistic range around it.
//
// Source-of-truth contract, same as PortfolioChart: every figure here is read
// from `yearData`, so this section cannot drift from the chart it interprets.
// That extends to failure timing, which needs no separate tally — a balance
// floored at $0 means a run has failed, so the year a percentile band first
// touches the axis *is* the year that share of futures had run out. The ladder
// below reads those crossings off the same rows the chart draws. Only the
// success rate comes from elsewhere, and it comes from the same run.

function OutcomeOdds({
  yearData,
  simYears,
  successRate,
  totalRuns,
  retirementDelay,
  currentAge,
  inflation,
}) {
  const useAges = currentAge !== undefined;
  const ending = yearData[simYears].endBalance;
  const failureRate = 1 - successRate;
  const realFactor = Math.pow(1 + inflation, simYears);
  const today = (v) => fmtMoney(v / realFactor);

  const horizon = useAges
    ? `age ${currentAge + simYears}`
    : `the end of year ${simYears - retirementDelay}`;

  // Whole-number odds read better in prose than two-decimal percentages.
  // Rates inside 1–99% round to hundredths; anything rarer needs thousandths
  // so a small-but-real risk never prints as "about 0 in 100".
  const inN = (p) => {
    if (p < 0.01 || p > 0.99) {
      return `about ${Math.max(1, Math.round(p * 1000))} in 1,000`;
    }
    return `about ${Math.round(p * 100)} in 100`;
  };

  // Tick y is the END of year y, so a band that is $0 there means that share
  // of futures had run out by then — "by" being the operative word, which is
  // why the label takes the age at the end of the year (currentAge + y) and
  // not the age it started at. Same convention as the chart's x-axis.
  const byLabel = (y) =>
    useAges
      ? `age ${currentAge + y}`
      : y > retirementDelay
        ? `year ${y - retirementDelay} of retirement`
        : `year ${y}, before retirement began`;

  // The year the `key` band first touches $0 — the year by which that share
  // of futures had run out. Returns null when the band never reaches the axis,
  // i.e. the plan does not fail that often, so no such year exists. Balances
  // are floored at $0 and a depleted run never recovers, so the first crossing
  // is the only crossing.
  const ranOutBy = (key) => {
    for (let y = 1; y <= simYears; y++) {
      if (yearData[y].endBalance[key] <= 0) {
        return y;
      }
    }
    return null;
  };

  // Where a plan's own median already fails, a ladder of ending balances
  // degenerates into a column of $0 and states nothing true — a 90th
  // percentile of $0 does not mean "1 in 10 ends above $0". The honest
  // question for such a plan is *when* the money goes, so the rungs switch
  // from balances to depletion dates.
  const medianSurvives = ending.p50 > 0;

  // Each rung states an exceedance probability, which is what a percentile
  // actually is — the 90th percentile is the 1-in-10 line, and the median is
  // just the 1-in-2 rung rather than a favoured value. A lower rung sitting
  // at $0 means at least that share of futures ended with nothing, so it gets
  // the plain statement instead of "below $0".
  const balanceLadder = [
    { odds: "1 in 10", dir: "above", value: ending.p90 },
    { odds: "1 in 4", dir: "above", value: ending.p75 },
    { odds: "1 in 2", dir: "above", value: ending.p50, median: true },
    { odds: "1 in 4", dir: "below", value: ending.p25 },
    { odds: "1 in 10", dir: "below", value: ending.p10 },
  ].map((r) =>
    r.dir === "below" && r.value <= 0
      ? { odds: r.odds, primary: "ends with nothing left", median: r.median }
      : {
          odds: r.odds,
          lead: `ends ${r.dir}`,
          primary: fmtMoney(r.value),
          secondary: `${today(r.value)} today`,
          median: r.median,
        },
  );

  // Cumulative shares rather than exceedances: each rung reads as a running
  // total of futures that have run dry by that date. The share and the band
  // are the same thing — the p25 band reaching $0 *is* a quarter of futures
  // having run out — so the rung is keyed by the band the reader can see.
  const lifespanLadder = [
    { odds: "1 in 10", key: "p10" },
    { odds: "1 in 4", key: "p25" },
    { odds: "1 in 2", key: "p50", median: true },
    { odds: "3 in 4", key: "p75" },
    { odds: "9 in 10", key: "p90" },
  ].map((r) => {
    const y = ranOutBy(r.key);
    return y === null
      ? {
          odds: r.odds,
          primary: `still had money at ${horizon}`,
          median: r.median,
        }
      : {
          odds: r.odds,
          lead: "had run out by",
          primary: byLabel(y),
          median: r.median,
        };
  });

  // Quoted in the lead when it exists. Unconditional — "1 in 10 futures had
  // run out by X" — rather than conditioned on failure, which would need a
  // quantile the percentile set does not carry.
  const firstTenthGone = ranOutBy("p10");

  const ladder = medianSurvives ? balanceLadder : lifespanLadder;
  const upsideRatio = medianSurvives ? ending.p90 / ending.p50 : null;

  return (
    <section className="odds-section fade" aria-labelledby="odds-title">
      <h2 className="chart-title" id="odds-title">
        Reading the Odds
      </h2>
      <p className="chart-subtitle">
        What the bands above do — and don't — say about how this plan is likely
        to turn out.
      </p>

      <p className="odds-lead">
        {successRate >= 1
          ? `All ${totalRuns.toLocaleString()} simulated futures still had money at ${horizon}.`
          : successRate <= 0
            ? `None of the ${totalRuns.toLocaleString()} simulated futures reached ${horizon} with money left.`
            : `Of ${totalRuns.toLocaleString()} simulated futures, ${inN(successRate)} still had money at ${horizon}; ${inN(failureRate)} ran out before then.`}
        {firstTenthGone !== null &&
          ` 1 in 10 had run out by ${byLabel(firstTenthGone)} — the year the outer band above first touches the axis.`}
      </p>

      <dl className="odds-ladder">
        {ladder.map((rung, i) => (
          <div className={`odds-rung${rung.median ? " median" : ""}`} key={i}>
            <dt>{rung.odds}</dt>
            <dd>
              {rung.lead && <span className="odds-rung-text">{rung.lead}</span>}
              <span className="odds-rung-value">{rung.primary}</span>
              {rung.secondary && (
                <span className="odds-rung-real">{rung.secondary}</span>
              )}
              {rung.median && <span className="odds-rung-tag">median</span>}
            </dd>
          </div>
        ))}
      </dl>

      {medianSurvives ? (
        <p className="odds-ladder-note">
          Read a rung as the chance of clearing that figure — 1 in 4 futures
          finish above {fmtMoney(ending.p75)}. Taken in pairs, the rungs give a
          1-in-2 chance of finishing between {fmtMoney(ending.p25)} and{" "}
          {fmtMoney(ending.p75)}, and a 4-in-5 chance of finishing{" "}
          {ending.p10 > 0
            ? `between ${fmtMoney(ending.p10)} and ${fmtMoney(ending.p90)}`
            : `below ${fmtMoney(ending.p90)}, with the bottom tenth running out entirely`}
          .
        </p>
      ) : (
        <p className="odds-ladder-note">
          Read a rung as a running total: by {byLabel(ranOutBy("p25"))}, a
          quarter of all futures had run dry. More than half run dry before{" "}
          {horizon}, which is why the median ending balance is $0 — each rung is
          the year the matching band above meets the axis.
        </p>
      )}

      <p className="odds-caveat">
        So the median is the middle outcome, not the most likely one — it is
        simply the line with half the futures above it and half below.
        {medianSurvives
          ? ` No single dollar figure carries meaningful odds on its own.${upsideRatio >= 1.5 ? ` The spread is lopsided, too: the best tenth of futures finish above ${fmtMoney(ending.p90)}, roughly ${upsideRatio.toFixed(1)}× the median, while the worst tenth ${ending.p10 > 0 ? `finish below ${fmtMoney(ending.p10)}` : "run out of money altogether"}. That long upside tail drags the average well above the typical result, which is why every headline figure here is a median rather than an average.` : ""}`
          : ` A median of $0 does not mean every future ends that way — ${inN(successRate)} still finish with money, some of it substantial. It means the middle of the range has fallen through the floor.`}
      </p>
    </section>
  );
}
