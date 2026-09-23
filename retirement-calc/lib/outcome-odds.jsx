/* exported OutcomeOdds */

// ─── Outcome Odds — plain-language reading of the distribution ──────────────
// The chart shows percentile bands; this section says what they mean in odds.
// It exists to answer the two questions the bands invite and never answer:
// is the median the *likely* outcome (no — it is the middle one), and how
// wide is the realistic range around it.
//
// Source-of-truth contract, same as PortfolioChart: every figure here is read
// from `yearData`, so this section cannot drift from the chart it interprets.
// Failure timing and survival use depletionRate, just like the depletion
// chart: both the invested portfolio and upfront cash bucket must be empty.
// Dollar percentiles describe only the invested portfolio.

function OutcomeOdds({
  yearData,
  simYears,
  totalRuns,
  retirementDelay,
  currentAge,
  inflation,
}) {
  const useAges = currentAge !== undefined;
  const ending = yearData[simYears].endBalance;
  const failureRate = ending.depletionRate;
  const successRate = 1 - failureRate;
  const realFactor = Math.pow(1 + inflation, simYears);
  const today = (v) => fmtMoney(v / realFactor);

  const horizon = useAges
    ? `age ${currentAge + simYears}`
    : `the end of year ${simYears - retirementDelay}`;

  // Whole-number odds read better in prose than two-decimal percentages.
  // Rates inside 1–99% round to hundredths; anything rarer needs thousandths
  // so a small-but-real risk never prints as "about 0 in 100".
  const inN = (p) => `about ${fmtOdds(p)}`;

  // Depletion is measured at year-end, matching the chart's x-axis.
  const byLabel = (y) =>
    useAges
      ? `age ${currentAge + y}`
      : y > retirementDelay
        ? `year ${y - retirementDelay} of retirement`
        : `year ${y}, before retirement began`;

  // First year the cumulative depletion rate reaches the requested share.
  // An empty portfolio alone does not count while bucket cash remains.
  const ranOutBy = (threshold) => {
    for (let y = 1; y <= simYears; y++) {
      if (yearData[y].endBalance.depletionRate >= threshold) {
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
  const medianSurvives = failureRate < 0.5;

  // Each rung states an exceedance probability, which is what a percentile
  // actually is — the 90th percentile is the 1-in-10 line, and the median is
  // just the 1-in-2 rung rather than a favoured value. A lower rung sitting
  // at $0 is a rounded portfolio balance, not proof of total depletion.
  const balanceLadder = [
    { odds: "1 in 10", dir: "above", value: ending.p90 },
    { odds: "1 in 4", dir: "above", value: ending.p75 },
    { odds: "1 in 2", dir: "above", value: ending.p50, median: true },
    { odds: "1 in 4", dir: "below", value: ending.p25 },
    { odds: "1 in 10", dir: "below", value: ending.p10 },
  ].map((r) =>
    r.dir === "below" && r.value <= 0
      ? {
          odds: r.odds,
          primary: "ends with a portfolio balance of $0 (rounded)",
          median: r.median,
        }
      : {
          odds: r.odds,
          lead: `ends ${r.dir}`,
          primary: fmtMoney(r.value),
          secondary: `${today(r.value)} today`,
          median: r.median,
        },
  );

  // Cumulative shares rather than exceedances: each rung reads as a running
  // total of futures that have exhausted both portfolio and bucket cash.
  const lifespanLadder = [
    { odds: "1 in 10", threshold: 0.1 },
    { odds: "1 in 4", threshold: 0.25 },
    { odds: "1 in 2", threshold: 0.5, median: true },
    { odds: "3 in 4", threshold: 0.75 },
    { odds: "9 in 10", threshold: 0.9 },
  ].map((r) => {
    const y = ranOutBy(r.threshold);
    return y === null
      ? {
          odds: `At most ${r.odds}`,
          lead: "had run out by",
          primary: horizon,
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
  const firstTenthGone = ranOutBy(0.1);

  const ladder = medianSurvives ? balanceLadder : lifespanLadder;
  const upsideRatio =
    medianSurvives && ending.p50 > 0 ? ending.p90 / ending.p50 : null;

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
            : `Of ${totalRuns.toLocaleString()} simulated futures, ${inN(successRate)} still had money at ${horizon}; ${inN(failureRate)} ran out by then.`}
        {firstTenthGone !== null &&
          ` At least 1 in 10 had run out by ${byLabel(firstTenthGone)} — the first year the depletion chart reaches 10%.`}{" "}
        Running out means both the invested portfolio and upfront cash bucket
        are exhausted.
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
            : `below ${fmtMoney(ending.p90)}, with the bottom tenth at a rounded portfolio balance of $0`}
          . Dollar figures describe the invested portfolio and exclude bucket
          cash.
        </p>
      ) : (
        <p className="odds-ladder-note">
          Read a rung as a running total: by {byLabel(ranOutBy(0.25))}, at least
          a quarter of all futures had run dry. At least half run dry by{" "}
          {horizon}. Each dated rung marks the first year the depletion chart
          reaches that share of simulations.
        </p>
      )}

      <p className="odds-caveat">
        So the median is the middle outcome, not the most likely one — it is
        simply the line with half the futures above it and half below.
        {medianSurvives
          ? ` No single dollar figure carries meaningful odds on its own.${upsideRatio >= 1.5 ? ` The spread is lopsided, too: the best tenth of futures finish above ${fmtMoney(ending.p90)}, roughly ${upsideRatio.toFixed(1)}× the median, while the worst tenth ${ending.p10 > 0 ? `finish below ${fmtMoney(ending.p10)}` : "finish with a rounded portfolio balance of $0"}. That long upside tail drags the average well above the typical result, which is why every headline figure here is a median rather than an average.` : ""}`
          : ` A median of $0 does not mean every future ends that way — ${inN(successRate)} still finish with money, some of it substantial. It means the middle of the range has fallen through the floor.`}
      </p>
    </section>
  );
}
