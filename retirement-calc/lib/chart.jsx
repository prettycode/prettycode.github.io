const Y_AXIS_TICK_FRACTIONS = [0, 0.25, 0.5, 0.75, 1];
const OUTER_BAND_OPACITY = 0.12;
const INNER_BAND_OPACITY = 0.22;
const WITHDRAWAL_MARKER_OPACITY = 0.55;
const WITHDRAWAL_MARKER_RADIUS = 2.5;

/* exported PortfolioChart */

// ─── Portfolio Trajectory Chart ─────────────────────────────────────────────
// Renders the percentile-band SVG, hover tooltip, legend, and footnote.
// Hover state is local; everything else is driven by props.
//
// All financial values come from the worker's canonical yearData and summary.
// Portfolio geometry uses invested balances; risk uses total-money depletion.
//
// Year/tick convention used everywhere below:
//   • Tick t is X-axis position t, t = 0..simYears.
//   • Tick 0 is retirement (balance = retirementBalance, no withdrawal yet).
//   • Tick y (1..simYears) is the END of year y (after year y's growth).
//   • Year y's withdrawal is taken at the START of year y, so its lollipop
//     sits at x(y-1) — between tick y-1 and tick y on the time axis.
//   • Stat-cells label depletion as `Year y` using the same y; the chart's
//     hover tooltip names the upcoming year so the labels match.

function PortfolioChart({
  simulation,
  running,
  progress,
  showCalendarYears = false,
  onShowCalendarYearsChange,
}) {
  const {
    yearData,
    summary,
    portfolioDepletion,
    years: simYears,
    retirementDelay,
    currentAge,
  } = simulation;
  const retirementBalance = yearData[0].endBalance;
  const balance = retirementBalance.p50;
  const [hover, setHover] = React.useState(null);
  const [riskYear, setRiskYear] = React.useState(null);
  const useAges = currentAge !== undefined;
  const calendarStartYear = new Date().getFullYear();

  // Chart geometry
  const W = 760;
  const H = 380;

  // Per-tick balance lookup: tick 0 = retirement, tick y = end of year y.
  const balanceAt = (t) =>
    t === 0 ? retirementBalance : yearData[t].endBalance;

  const allBalances = [
    retirementBalance,
    ...yearData.slice(1).map((d) => d.endBalance),
  ];
  const allWithdrawals = yearData.slice(1).map((d) => d.intended);
  const riskAt = (t) => yearData[t].depletionRate;
  const riskLabel = (t) =>
    showCalendarYears
      ? `${calendarStartYear + t}`
      : useAges
        ? `age ${yearData[t].endAge}`
        : t < retirementDelay
          ? `year ${t} before retirement`
          : `retirement year ${t - retirementDelay}`;
  // Keep rare, nonzero risk visible without rounding it to 0% (or 100%).
  const riskPct = (p) =>
    p > 0 && p < 0.001 ? "<0.1%" : p < 1 && p > 0.999 ? ">99.9%" : fmtPct(p);
  const selectedRiskYear = Math.min(hover ?? riskYear ?? simYears, simYears);

  const maxVal = Math.max(...allBalances.map((p) => p.p90), balance) * 1.05;
  // Withdrawal scale (left axis)
  const maxW = (allWithdrawals.length ? Math.max(...allWithdrawals) : 0) * 1.15;

  // Both charts share a time axis. Reserve room for the depletion chart's
  // "100%" label (24px), its 8px tick gap, and 40px of container clearance.
  // This also keeps the labels clear of the panel border on narrow screens.
  const tickLabelWidth = (max, fontSize) =>
    Math.ceil(
      Math.max(...Y_AXIS_TICK_FRACTIONS.map((f) => fmtMoney(f * max).length)) *
        fontSize *
        0.6,
    );
  const padL = Math.max(72, tickLabelWidth(maxW, 9) + 7 + 2);
  const padR = tickLabelWidth(maxVal, 10) + 8 + 2;
  const padT = 24; // Heading baseline 12px above plot, plus 9px text and clearance.
  const padB = 40; // Time-axis title baseline 36px below plot, plus descenders.
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const x = (t) => padL + (t / simYears) * innerW;
  const yScale = (v) => padT + innerH - (v / maxVal) * innerH;
  const yScaleW = (v) =>
    maxW > 0 ? padT + innerH - (v / maxW) * innerH : padT + innerH;

  // Year y's draw is taken at start of year y (between tick y-1 and tick y),
  // so we render a vertical step-down at x(y-1), then a diagonal to (x(y),
  // endBalance). Clamp at 0 for the depleting year so the line stays above
  // the axis. Step-down uses the *intended* draw; clamping handles the
  // "intended exceeds prior balance" case automatically.
  const stepDown = (key, y) => yearData[y].afterWithdrawal[key];

  const buildArea = (kHigh, kLow) => {
    let top = `M ${x(0)} ${yScale(retirementBalance[kHigh])}`;
    for (let y = 1; y <= simYears; y++) {
      top += ` L ${x(y - 1)} ${yScale(stepDown(kHigh, y))}`;
      top += ` L ${x(y)} ${yScale(yearData[y].endBalance[kHigh])}`;
    }
    let bot = ` L ${x(simYears)} ${yScale(yearData[simYears].endBalance[kLow])}`;
    for (let y = simYears; y >= 1; y--) {
      bot += ` L ${x(y - 1)} ${yScale(stepDown(kLow, y))}`;
      bot += ` L ${x(y - 1)} ${yScale(balanceAt(y - 1)[kLow])}`;
    }
    return `${top} ${bot} Z`;
  };

  // Y-axis ticks
  const yTicks = Y_AXIS_TICK_FRACTIONS.map((t) => t * maxVal);
  const xTicks = (() => {
    const pxPerYear = innerW / Math.max(simYears, 1);
    const minPx = showCalendarYears || retirementDelay > 0 ? 40 : 24;
    const step = [1, 2, 5, 10, 20].find((s) => pxPerYear * s >= minPx) ?? 25;
    const ticks = [];
    for (let i = 0; i <= simYears; i += step) {
      ticks.push(i);
    }
    if (ticks[ticks.length - 1] !== simYears) {
      if (
        (showCalendarYears || retirementDelay > 0) &&
        (simYears - ticks[ticks.length - 1]) * pxPerYear < minPx
      ) {
        ticks.pop();
      }
      ticks.push(simYears);
    }
    return ticks;
  })();

  // Hover handler
  const onMove = (e) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const tickIdx = Math.round(((px - padL) / innerW) * simYears);
    if (tickIdx >= 0 && tickIdx <= simYears) {
      setHover(tickIdx);
      setRiskYear(tickIdx);
    }
  };

  // The tooltip describes the moment AT tick `hover`: the balance there, and
  // the upcoming withdrawal (year hover+1's draw). At the last tick there is
  // no upcoming year — the simulation has ended, so no withdrawal is shown.
  // Past depletion, no further withdrawals are taken.
  const hoverBalance =
    hover !== null && hover <= simYears ? balanceAt(hover) : null;
  const upcomingYear =
    hover !== null && hover < simYears ? yearData[hover + 1] : null;
  const beyondDepletion =
    portfolioDepletion &&
    upcomingYear &&
    upcomingYear.year > portfolioDepletion.year;
  const hoverWithdrawal =
    upcomingYear && !beyondDepletion ? upcomingYear.actual : 0;

  const riskReadout = `${riskPct(riskAt(selectedRiskYear))} run out of money by ${riskLabel(selectedRiskYear)}`;

  return (
    <>
      <section
        className="chart-section depletion-panel fade"
        aria-labelledby="depletion-title"
      >
        <div className="depletion-heading">
          <h3 id="depletion-title">Will I run out of money?</h3>
          <span>Cumulative simulation outcomes</span>
        </div>
        <p className="depletion-summary">
          <strong>{riskPct(riskAt(simYears))}</strong>
          <span>of simulations ran out of money by {riskLabel(simYears)}.</span>
        </p>
        <div className="depletion-milestones">
          {[
            [0.1, "1 in 10"],
            [0.25, "1 in 4"],
            [0.5, "1 in 2"],
            [0.75, "3 in 4"],
            [0.9, "9 in 10"],
          ].map(([threshold, label]) => {
            const first = summary.depletionYears[threshold];
            return (
              <div
                key={threshold}
                className={
                  first === null ? "depletion-milestone-inactive" : undefined
                }
              >
                <strong>{label} chance</strong>
                <span>
                  {first === null
                    ? `Not by ${riskLabel(simYears)}`
                    : `by ${riskLabel(first)}`}
                </span>
              </div>
            );
          })}
        </div>
        <div className="depletion-readout-track">
          <p
            className="depletion-readout"
            style={{ "--risk-x": `${(x(selectedRiskYear) / W) * 100}cqw` }}
          >
            <strong className="depletion-readout-value">
              {riskPct(riskAt(selectedRiskYear))}
            </strong>
            <span>
              run out of money <strong>by {riskLabel(selectedRiskYear)}</strong>
            </span>
          </p>
        </div>
        <svg
          className="chart depletion-chart"
          viewBox={`0 0 ${W} 160`}
          role="img"
          aria-label={`${riskReadout}. Use arrow keys to inspect other years.`}
          tabIndex="0"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          onKeyDown={(e) => {
            const year =
              e.key === "ArrowLeft"
                ? selectedRiskYear - 1
                : e.key === "ArrowRight"
                  ? selectedRiskYear + 1
                  : e.key === "Home"
                    ? 0
                    : e.key === "End"
                      ? simYears
                      : null;
            if (year !== null) {
              e.preventDefault();
              setHover(null);
              setRiskYear(Math.max(0, Math.min(simYears, year)));
            }
          }}
        >
          <g>
            {[0, 0.5, 1].map((p) => (
              <g key={p}>
                <line
                  x1={padL}
                  x2={W - padR}
                  y1={116 - p * 100}
                  y2={116 - p * 100}
                  stroke="var(--rule)"
                  strokeDasharray="2 3"
                />
                <text x={padL - 8} y={120 - p * 100} textAnchor="end">
                  {fmtPct(p, 0)}
                </text>
              </g>
            ))}
            <path
              d={`M ${x(0)} 116 ${yearData.map((p, t) => `L ${x(t)} ${116 - p.depletionRate * 100}`).join(" ")} L ${x(simYears)} 116 Z`}
              fill="var(--accent)"
              opacity="0.12"
            />
            <path
              d={yearData
                .map(
                  (p, t) =>
                    `${t === 0 ? "M" : "L"} ${x(t)} ${116 - p.depletionRate * 100}`,
                )
                .join(" ")}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
            />
            <line
              x1={x(selectedRiskYear)}
              x2={x(selectedRiskYear)}
              y1="16"
              y2="116"
              stroke="var(--accent)"
              strokeDasharray="3 3"
            />
            <circle
              cx={x(selectedRiskYear)}
              cy={116 - riskAt(selectedRiskYear) * 100}
              r="4"
              fill="var(--accent)"
            />
            {xTicks.map((t) => (
              <text key={t} x={x(t)} y="136" textAnchor="middle">
                {showCalendarYears
                  ? calendarStartYear + t
                  : useAges
                    ? currentAge + t
                    : t - retirementDelay}
              </text>
            ))}
            <text x={padL + innerW / 2} y="156" textAnchor="middle">
              {showCalendarYears
                ? "CALENDAR YEAR"
                : useAges
                  ? "AGE"
                  : "YEARS SINCE RETIREMENT"}
            </text>
          </g>
        </svg>
        <p className="chart-footnote">
          Each point counts simulations whose invested portfolio and upfront
          cash bucket were both exhausted by that year-end, including earlier
          exhaustion. A fully funded bucket covers spending through its final
          year; if no investments remain, money runs out at that year-end. These
          are modeled frequencies, not guarantees; 0% means no simulation ran
          out of money by that point.
        </p>
      </section>

      <section className="chart-section fade" aria-labelledby="chart-title">
        <div className="chart-title-row">
          <h2 className="chart-title" id="chart-title">
            How might my investment portfolio do?
          </h2>
          <label className="chart-calendar-toggle">
            <input
              type="checkbox"
              checked={showCalendarYears}
              onChange={(e) => onShowCalendarYearsChange(e.target.checked)}
            />
            Show calendar years
          </label>
        </div>
        <p className="chart-subtitle">
          Shaded bands show the spread of {SIM_RUNS.toLocaleString()} Monte Carlo
          paths. Outer band, 10th–90th percentile; inner band, 25th–75th. Vertical
          marks show each year's median withdrawal, scaled to the left axis.
        </p>

        <div className="chart-wrap">
          {running && (
            <div className="chart-progress-overlay" aria-hidden="true">
              <span>Recalculating</span>
              <div className="mini-track">
                <div
                  className="mini-bar"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <span className="pct">{Math.round(progress * 100)}%</span>
            </div>
          )}
          <svg
            className="chart"
            viewBox={`0 0 ${W} ${H}`}
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
          >
            <defs>
              <pattern
                id="grain"
                width="3"
                height="3"
                patternUnits="userSpaceOnUse"
              >
                <rect width="3" height="3" fill="transparent" />
                <circle cx="1" cy="1" r="0.3" fill="rgba(26,22,18,0.04)" />
              </pattern>
            </defs>

            {/* Plot bg */}
            <rect
              x={padL}
              y={padT}
              width={innerW}
              height={innerH}
              fill="var(--cream)"
            />
            <rect
              x={padL}
              y={padT}
              width={innerW}
              height={innerH}
              fill="url(#grain)"
            />

            {/* Y gridlines + portfolio-value labels (right axis) */}
            {yTicks.map((t, i) => (
              <g key={i}>
                <line
                  x1={padL}
                  x2={W - padR}
                  y1={yScale(t)}
                  y2={yScale(t)}
                  stroke="var(--rule)"
                  strokeWidth="0.5"
                  strokeDasharray={i === 0 ? "0" : "2 3"}
                />
                <text
                  x={W - padR + 8}
                  y={yScale(t) + 4}
                  textAnchor="start"
                  fontFamily="JetBrains Mono"
                  fontSize="10"
                  fill="var(--ink-2)"
                >
                  {fmtMoney(t)}
                </text>
              </g>
            ))}

            {/* Tick 0 is today; retirement begins at tick retirementDelay. */}
            {xTicks.map((t) => (
              <g key={t}>
                <line
                  x1={x(t)}
                  x2={x(t)}
                  y1={padT + innerH}
                  y2={padT + innerH + 4}
                  stroke="var(--ink)"
                  strokeWidth="0.5"
                />
                <text
                  x={x(t)}
                  y={padT + innerH + 18}
                  textAnchor="middle"
                  fontFamily="JetBrains Mono"
                  fontSize="10"
                  fill="var(--ink-2)"
                >
                  {showCalendarYears
                    ? calendarStartYear + t
                    : useAges
                      ? currentAge + t
                      : t - retirementDelay}
                </text>
              </g>
            ))}
            <text
              x={padL + innerW / 2}
              y={padT + innerH + 36}
              textAnchor="middle"
              fontFamily="JetBrains Mono"
              fontSize="9"
              letterSpacing="0.15em"
              fill="var(--ink-2)"
            >
              {showCalendarYears
                ? "CALENDAR YEAR"
                : useAges
                  ? "AGE"
                  : "YEARS SINCE RETIREMENT"}
            </text>

            {/* Left axis (withdrawal) — own ticks + frame */}
            <line
              x1={padL}
              x2={padL}
              y1={padT}
              y2={padT + innerH}
              stroke="var(--withdrawal)"
              strokeWidth="0.75"
              opacity="0.5"
            />
            {Y_AXIS_TICK_FRACTIONS.map((f, i) => {
              const v = f * maxW;
              return (
                <g key={i}>
                  <line
                    x1={padL - 4}
                    x2={padL}
                    y1={yScaleW(v)}
                    y2={yScaleW(v)}
                    stroke="var(--withdrawal)"
                    strokeWidth="0.75"
                    opacity="0.6"
                  />
                  <text
                    x={padL - 7}
                    y={yScaleW(v) + 3}
                    textAnchor="end"
                    fontFamily="JetBrains Mono"
                    fontSize="9"
                    fill="var(--withdrawal)"
                  >
                    {fmtMoney(v)}
                  </text>
                </g>
              );
            })}

            {/* Percentile bands */}
            <path
              d={buildArea("p90", "p10")}
              fill="var(--accent-2)"
              opacity={OUTER_BAND_OPACITY}
            />
            <path
              d={buildArea("p75", "p25")}
              fill="var(--accent-2)"
              opacity={INNER_BAND_OPACITY}
            />

            {retirementDelay > 0 && (
              <g>
                <line
                  x1={x(retirementDelay)}
                  x2={x(retirementDelay)}
                  y1={padT}
                  y2={padT + innerH}
                  stroke="var(--ink-2)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={x(retirementDelay) + 6}
                  y={padT + 12}
                  fontFamily="JetBrains Mono"
                  fontSize="10"
                  fill="var(--ink-2)"
                >
                  {useAges
                    ? `Retire at age ${currentAge + retirementDelay}`
                    : "Retirement starts"}
                </text>
              </g>
            )}

            {/* Median portfolio line — truncated at the depletion year so the
                path clearly terminates at $0 instead of vanishing along the
                axis. When the depletion-year withdrawal alone exhausts the
                portfolio (yearData[y].startDepleted), the path ends at the
                moment of withdrawal — x(y-1) — rather than running flat to
                x(y). The growth-shock case (startBalance survives the draw
                but a market shock takes the median to $0 by year-end) ends
                with a diagonal to x(y). */}
            <path
              d={(() => {
                const lastYear = portfolioDepletion
                  ? portfolioDepletion.year
                  : simYears;
                const endsAtWithdrawal =
                  portfolioDepletion && portfolioDepletion.startDepleted;
                const fullYears = endsAtWithdrawal ? lastYear - 1 : lastYear;
                let d = `M ${x(0)} ${yScale(retirementBalance.p50)}`;
                for (let y = 1; y <= fullYears; y++) {
                  d += ` L ${x(y - 1)} ${yScale(stepDown("p50", y))}`;
                  d += ` L ${x(y)} ${yScale(yearData[y].endBalance.p50)}`;
                }
                if (endsAtWithdrawal) {
                  d += ` L ${x(fullYears)} ${yScale(0)}`;
                }
                return d;
              })()}
              fill="none"
              stroke="var(--ink)"
              strokeWidth="2"
              strokeLinejoin="round"
            />

            {/* Withdrawal lollipops. Year y's draw is a discrete event at the
                start of year y, so its mark sits at x(y-1) — the moment the
                money leaves. Bucket-funded years naturally show no mark
                (actual = 0); years past depletion are skipped. The depleting
                year uses yearData[y].actual, which is already capped at the
                prior median balance, so the mark height matches what could
                actually be drawn rather than the still-inflating intended. */}
            {(() => {
              const lastYear = portfolioDepletion
                ? portfolioDepletion.year
                : simYears;
              const marks = [];
              for (let y = 1; y <= lastYear; y++) {
                const w = yearData[y].actual;
                if (w <= 0) {
                  continue;
                }
                const cx = x(y - 1);
                const cy = yScaleW(w);
                marks.push(
                  <g key={y}>
                    <line
                      x1={cx}
                      x2={cx}
                      y1={yScaleW(0)}
                      y2={cy}
                      stroke="var(--withdrawal)"
                      strokeWidth="1"
                      opacity={WITHDRAWAL_MARKER_OPACITY}
                    />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={WITHDRAWAL_MARKER_RADIUS}
                      fill="var(--withdrawal)"
                    />
                  </g>,
                );
              }
              return marks;
            })()}

            {/* Hover guide */}
            {hoverBalance && (
              <>
                <line
                  x1={x(hover)}
                  x2={x(hover)}
                  y1={padT}
                  y2={padT + innerH}
                  stroke="var(--ink)"
                  strokeWidth="0.75"
                  strokeDasharray="2 2"
                  opacity="0.5"
                />
                <circle
                  cx={x(hover)}
                  cy={yScale(hoverBalance.p50)}
                  r="4"
                  fill="var(--ink)"
                />
                <circle
                  cx={x(hover)}
                  cy={yScale(hoverBalance.p50)}
                  r="2"
                  fill="var(--cream)"
                />
                {hoverWithdrawal > 0 && (
                  <circle
                    cx={x(hover)}
                    cy={yScaleW(hoverWithdrawal)}
                    r="3"
                    fill="var(--withdrawal)"
                  />
                )}
              </>
            )}

            {/* Axis frame */}
            <line
              x1={W - padR}
              x2={W - padR}
              y1={padT}
              y2={padT + innerH}
              stroke="var(--ink)"
              strokeWidth="1"
            />
            <line
              x1={padL}
              x2={W - padR}
              y1={padT + innerH}
              y2={padT + innerH}
              stroke="var(--ink)"
              strokeWidth="1"
            />

            {/* Axis labels */}
            <text
              x={padL}
              y={padT - 12}
              fontFamily="JetBrains Mono"
              fontSize="9"
              letterSpacing="0.15em"
              fill="var(--withdrawal)"
            >
              WITHDRAWAL ($)
            </text>
            <text
              x={W - padR}
              y={padT - 12}
              textAnchor="end"
              fontFamily="JetBrains Mono"
              fontSize="9"
              letterSpacing="0.15em"
              fill="var(--ink-2)"
            >
              PORTFOLIO VALUE ($)
            </text>
          </svg>

          {hoverBalance && hoverBalance.p90 > 0 && (
            <div
              className="tooltip"
              style={{
                left: `${(x(hover) / W) * 100}%`,
                top: `${(yScale(hoverBalance.p50) / H) * 100}%`,
              }}
            >
              <div className="tooltip-year">
                {useAges && `AGE ${currentAge + hover} | `}
                {hover < retirementDelay
                  ? `${calendarStartYear + hover} · ${retirementDelay - hover} YEARS UNTIL RETIREMENT`
                  : hover === simYears
                    ? `RETIREMENT YEAR ${simYears - retirementDelay} END`
                    : `RETIREMENT YEAR ${upcomingYear.year - retirementDelay} START`}
              </div>
              {(() => {
                const post = (key) => upcomingYear.afterWithdrawal[key];
                if (hover === 0 && retirementDelay === 0) {
                  // Tick 0: only the median balance is meaningful (all paths
                  // start with the same retirement balance), and year 1's
                  // first draw comes next.
                  return (
                    <>
                      <div className="tooltip-row">
                        <span>Withdrawal</span>
                        <span>{fmtMoneyFull(hoverWithdrawal)}</span>
                      </div>
                      <div className="tooltip-section divided">
                        BEFORE WITHDRAWAL
                      </div>
                      <div className="tooltip-row">
                        <span>Balance</span>
                        <span>{fmtMoneyFull(hoverBalance.p50)}</span>
                      </div>
                      <div className="tooltip-section divided">
                        AFTER WITHDRAWAL
                      </div>
                      <div className="tooltip-row">
                        <span>Balance</span>
                        <span>{fmtMoneyFull(post("p50"))}</span>
                      </div>
                    </>
                  );
                }
                if (hover === simYears || hover < retirementDelay) {
                  // Final tick: the simulation has ended. Show year-end balance
                  // percentiles only — no upcoming withdrawal exists, so we don't
                  // project (the stat-cells don't either, and projecting here is
                  // what made "Last Annual Withdrawal" appear off-by-one).
                  return (
                    <>
                      <div className="tooltip-section">PORTFOLIO BALANCE</div>
                      <div className="tooltip-row">
                        <span>90th</span>
                        <span>{fmtMoneyFull(hoverBalance.p90)}</span>
                      </div>
                      <div className="tooltip-row">
                        <span>75th</span>
                        <span>{fmtMoneyFull(hoverBalance.p75)}</span>
                      </div>
                      <div className="tooltip-row">
                        <span>Median</span>
                        <span>{fmtMoneyFull(hoverBalance.p50)}</span>
                      </div>
                      <div className="tooltip-row">
                        <span>25th</span>
                        <span>{fmtMoneyFull(hoverBalance.p25)}</span>
                      </div>
                      <div className="tooltip-row">
                        <span>10th</span>
                        <span>{fmtMoneyFull(hoverBalance.p10)}</span>
                      </div>
                    </>
                  );
                }
                return (
                  <>
                    <div className="tooltip-row">
                      <span>Withdrawal</span>
                      <span>{fmtMoneyFull(hoverWithdrawal)}</span>
                    </div>
                    <div className="tooltip-section divided">
                      BEFORE WITHDRAWAL
                    </div>
                    <div className="tooltip-row">
                      <span>90th</span>
                      <span>{fmtMoneyFull(hoverBalance.p90)}</span>
                    </div>
                    <div className="tooltip-row">
                      <span>75th</span>
                      <span>{fmtMoneyFull(hoverBalance.p75)}</span>
                    </div>
                    <div className="tooltip-row">
                      <span>Median</span>
                      <span>{fmtMoneyFull(hoverBalance.p50)}</span>
                    </div>
                    <div className="tooltip-row">
                      <span>25th</span>
                      <span>{fmtMoneyFull(hoverBalance.p25)}</span>
                    </div>
                    <div className="tooltip-row">
                      <span>10th</span>
                      <span>{fmtMoneyFull(hoverBalance.p10)}</span>
                    </div>
                    <div className="tooltip-section divided">
                      AFTER WITHDRAWAL
                    </div>
                    <div className="tooltip-row">
                      <span>90th</span>
                      <span>{fmtMoneyFull(post("p90"))}</span>
                    </div>
                    <div className="tooltip-row">
                      <span>75th</span>
                      <span>{fmtMoneyFull(post("p75"))}</span>
                    </div>
                    <div className="tooltip-row">
                      <span>Median</span>
                      <span>{fmtMoneyFull(post("p50"))}</span>
                    </div>
                    <div className="tooltip-row">
                      <span>25th</span>
                      <span>{fmtMoneyFull(post("p25"))}</span>
                    </div>
                    <div className="tooltip-row">
                      <span>10th</span>
                      <span>{fmtMoneyFull(post("p10"))}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        <div className="legend">
          <div className="legend-item">
            <span
              className="legend-swatch"
              style={{
                background: "var(--accent-2)",
                opacity: INNER_BAND_OPACITY,
              }}
            ></span>
            25th–75th percentile
          </div>
          <div className="legend-item">
            <span
              className="legend-swatch"
              style={{
                background: "var(--accent-2)",
                opacity: OUTER_BAND_OPACITY,
              }}
            ></span>
            10th–90th percentile
          </div>
          <div className="legend-item">
            <span
              className="legend-swatch legend-swatch-line"
              style={{ background: "var(--ink)" }}
            ></span>
            Median path
          </div>
          <div className="legend-item">
            <svg width="16" height="12" style={{ overflow: "visible" }}>
              <line
                x1="8"
                x2="8"
                y1="11"
                y2="3"
                stroke="var(--withdrawal)"
                strokeWidth="1"
                opacity={WITHDRAWAL_MARKER_OPACITY}
              />
              <circle
                cx="8"
                cy="3"
                r={WITHDRAWAL_MARKER_RADIUS}
                fill="var(--withdrawal)"
              />
            </svg>
            {SETTING_LABELS.withdrawal}
          </div>
        </div>

        <p className="chart-footnote">
          {retirementDelay > 0 &&
            `The portfolio grows for ${retirementDelay} years before retirement, with no withdrawals or contributions. `}
          Withdrawals are taken at the start of each retirement year. With a
          multi-year cash bucket, the first withdrawal is the lump sum drawn at
          retirement; the bucket-funded years that follow show no mark.
        </p>
      </section>
    </>
  );
}
