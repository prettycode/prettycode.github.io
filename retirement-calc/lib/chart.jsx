// ─── Portfolio Trajectory Chart ─────────────────────────────────────────────
// Renders the percentile-band SVG, hover tooltip, legend, and footnote.
// Hover state is local; everything else is driven by props.
//
// Source-of-truth contract: this component never reads sim.percentiles. All
// numeric data comes from `yearData` (the canonical per-year dataset built in
// index.jsx) plus `retirementBalance` (tick 0, before any year). The same
// records back the stat-cells, so what the user sees in the chart and what
// the stat-cells report can't drift apart.
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
  yearData,
  retirementBalance,
  running,
  progress,
  balance,
  withdrawalFrequency,
  medianDepletion,
  simYears,
}) {
  const [hover, setHover] = React.useState(null);

  // Chart geometry
  const W = 760;
  const H = 380;
  const padL = 64;
  const padR = 64;
  const padT = 28;
  const padB = 44;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  // Per-tick balance lookup: tick 0 = retirement, tick y = end of year y.
  const balanceAt = (t) => t === 0 ? retirementBalance : yearData[t].endBalance;

  const allBalances = [retirementBalance, ...yearData.slice(1).map(d => d.endBalance)];
  const allWithdrawals = yearData.slice(1).map(d => d.intended);

  const maxVal = Math.max(...allBalances.map(p => p.p90), balance) * 1.05;
  const x = (t) => padL + (t / simYears) * innerW;
  const yScale = (v) => padT + innerH - (v / maxVal) * innerH;

  // Withdrawal scale (left axis)
  const maxW = (allWithdrawals.length ? Math.max(...allWithdrawals) : 0) * 1.15;
  const yScaleW = (v) => maxW > 0 ? padT + innerH - (v / maxW) * innerH : padT + innerH;

  // Year y's draw is taken at start of year y (between tick y-1 and tick y),
  // so we render a vertical step-down at x(y-1), then a diagonal to (x(y),
  // endBalance). Clamp at 0 for the depleting year so the line stays above
  // the axis. Step-down uses the *intended* draw; clamping handles the
  // "intended exceeds prior balance" case automatically.
  const stepDown = (key, y) =>
    Math.max(0, yearData[y].startBalance[key] - yearData[y].intended);

  const buildArea = (kHigh, kLow) => {
    let top = `M ${x(0)} ${yScale(retirementBalance[kHigh])}`;
    for (let y = 1; y <= simYears; y++) {
      top += ` L ${x(y-1)} ${yScale(stepDown(kHigh, y))}`;
      top += ` L ${x(y)} ${yScale(yearData[y].endBalance[kHigh])}`;
    }
    let bot = ` L ${x(simYears)} ${yScale(yearData[simYears].endBalance[kLow])}`;
    for (let y = simYears; y >= 1; y--) {
      bot += ` L ${x(y-1)} ${yScale(stepDown(kLow, y))}`;
      bot += ` L ${x(y-1)} ${yScale(balanceAt(y-1)[kLow])}`;
    }
    return `${top} ${bot} Z`;
  };

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => t * maxVal);
  const xTicks = (() => {
    const pxPerYear = innerW / Math.max(simYears, 1);
    const minPx = 24;
    const step = [1, 2, 5, 10, 20].find(s => pxPerYear * s >= minPx) ?? 25;
    const ticks = [];
    for (let i = 0; i <= simYears; i += step) ticks.push(i);
    if (ticks[ticks.length - 1] !== simYears) ticks.push(simYears);
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
    }
  };

  // The tooltip describes the moment AT tick `hover`: the balance there, and
  // the upcoming withdrawal (year hover+1's draw). At the last tick there is
  // no upcoming year — the simulation has ended, so no withdrawal is shown.
  // Past depletion, no further withdrawals are taken.
  const hoverBalance = hover !== null && hover <= simYears ? balanceAt(hover) : null;
  const upcomingYear = hover !== null && hover < simYears ? yearData[hover + 1] : null;
  const beyondDepletion = medianDepletion && upcomingYear && upcomingYear.year > medianDepletion.year;
  const hoverWithdrawal = upcomingYear && !beyondDepletion ? upcomingYear.actual : 0;

  return (
    <div className="chart-section fade">
      <div className="chart-title-row">
        <h2 className="chart-title">Portfolio Trajectory</h2>
      </div>
      <p className="chart-subtitle">
        Shaded bands show the spread of {SIM_RUNS.toLocaleString()} Monte Carlo paths. Outer band, 10th–90th percentile;
        inner band, 25th–75th. Vertical marks show each year's median withdrawal, scaled to the left axis.
      </p>

      <div className={`chart-wrap${running ? " running" : ""}`}>
        {running && (
          <div className="chart-progress-overlay">
            <span>Recalculating</span>
            <div className="mini-track">
              <div className="mini-bar" style={{ width: `${progress * 100}%` }}></div>
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
            <pattern id="grain" width="3" height="3" patternUnits="userSpaceOnUse">
              <rect width="3" height="3" fill="transparent"/>
              <circle cx="1" cy="1" r="0.3" fill="rgba(26,22,18,0.04)"/>
            </pattern>
          </defs>

          {/* Plot bg */}
          <rect x={padL} y={padT} width={innerW} height={innerH} fill="var(--cream)"/>
          <rect x={padL} y={padT} width={innerW} height={innerH} fill="url(#grain)"/>

          {/* Y gridlines + portfolio-value labels (right axis) */}
          {yTicks.map((t, i) => (
            <g key={i}>
              <line
                x1={padL} x2={W - padR}
                y1={yScale(t)} y2={yScale(t)}
                stroke="var(--rule)" strokeWidth="0.5"
                strokeDasharray={i === 0 ? "0" : "2 3"}
              />
              <text
                x={W - padR + 8} y={yScale(t) + 4}
                textAnchor="start"
                fontFamily="JetBrains Mono"
                fontSize="10"
                fill="var(--ink-2)"
              >
                {fmtMoney(t)}
              </text>
            </g>
          ))}

          {/* X ticks — numeric (years since retirement). Year-naming lives in
              the tooltip so the X-axis stays unambiguous: "5" means "5 years
              after retirement", not "year 5". */}
          {xTicks.map((t) => (
            <g key={t}>
              <line
                x1={x(t)} x2={x(t)}
                y1={padT + innerH} y2={padT + innerH + 4}
                stroke="var(--ink)" strokeWidth="0.5"
              />
              <text
                x={x(t)} y={padT + innerH + 18}
                textAnchor="middle"
                fontFamily="JetBrains Mono"
                fontSize="10"
                fill="var(--ink-2)"
              >
                {t}
              </text>
            </g>
          ))}
          <text
            x={padL + innerW / 2} y={padT + innerH + 36}
            textAnchor="middle"
            fontFamily="JetBrains Mono"
            fontSize="9"
            letterSpacing="0.15em"
            fill="var(--ink-2)"
          >
            YEARS SINCE RETIREMENT
          </text>

          {/* Left axis (withdrawal) — own ticks + frame */}
          <line
            x1={padL} x2={padL}
            y1={padT} y2={padT + innerH}
            stroke="var(--withdrawal)"
            strokeWidth="0.75"
            opacity="0.5"
          />
          {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
            const v = f * maxW;
            return (
              <g key={i}>
                <line
                  x1={padL - 4} x2={padL}
                  y1={yScaleW(v)} y2={yScaleW(v)}
                  stroke="var(--withdrawal)"
                  strokeWidth="0.75"
                  opacity="0.6"
                />
                <text
                  x={padL - 7} y={yScaleW(v) + 3}
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
          <path d={buildArea("p90", "p10")} fill="var(--accent-2)" opacity="0.12"/>
          <path d={buildArea("p75", "p25")} fill="var(--accent-2)" opacity="0.22"/>

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
              const lastYear = medianDepletion ? medianDepletion.year : simYears;
              const endsAtWithdrawal = medianDepletion && medianDepletion.startDepleted;
              const fullYears = endsAtWithdrawal ? lastYear - 1 : lastYear;
              let d = `M ${x(0)} ${yScale(retirementBalance.p50)}`;
              for (let y = 1; y <= fullYears; y++) {
                d += ` L ${x(y-1)} ${yScale(stepDown("p50", y))}`;
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
            const lastYear = medianDepletion ? medianDepletion.year : simYears;
            const marks = [];
            for (let y = 1; y <= lastYear; y++) {
              const w = yearData[y].actual;
              if (w <= 0) continue;
              const cx = x(y - 1);
              const cy = yScaleW(w);
              marks.push(
                <g key={y}>
                  <line
                    x1={cx} x2={cx}
                    y1={yScaleW(0)} y2={cy}
                    stroke="var(--withdrawal)"
                    strokeWidth="1"
                    opacity="0.55"
                  />
                  <circle
                    cx={cx} cy={cy} r="2.5"
                    fill="var(--withdrawal)"
                  />
                </g>
              );
            }
            return marks;
          })()}

          {/* Hover guide */}
          {hoverBalance && (
            <>
              <line
                x1={x(hover)} x2={x(hover)}
                y1={padT} y2={padT + innerH}
                stroke="var(--ink)"
                strokeWidth="0.75"
                strokeDasharray="2 2"
                opacity="0.5"
              />
              <circle cx={x(hover)} cy={yScale(hoverBalance.p50)} r="4" fill="var(--ink)"/>
              <circle cx={x(hover)} cy={yScale(hoverBalance.p50)} r="2" fill="var(--cream)"/>
              {hoverWithdrawal > 0 && (
                <circle cx={x(hover)} cy={yScaleW(hoverWithdrawal)} r="3" fill="var(--withdrawal)"/>
              )}
            </>
          )}

          {/* Axis frame */}
          <line x1={W - padR} x2={W - padR} y1={padT} y2={padT + innerH} stroke="var(--ink)" strokeWidth="1"/>
          <line x1={padL} x2={W - padR} y1={padT + innerH} y2={padT + innerH} stroke="var(--ink)" strokeWidth="1"/>

          {/* Axis labels */}
          <text
            x={padL} y={padT - 12}
            fontFamily="JetBrains Mono"
            fontSize="9"
            letterSpacing="0.15em"
            fill="var(--withdrawal)"
          >
            WITHDRAWAL ($)
          </text>
          <text
            x={W - padR} y={padT - 12}
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
              {hover === simYears
                  ? `RETIREMENT YEAR ${simYears} END`
                  : `RETIREMENT YEAR ${upcomingYear.year} START`}
            </div>
            {(() => {
              const post = (v) => Math.max(0, v - hoverWithdrawal);
              if (hover === 0) {
                // Tick 0: only the median balance is meaningful (all paths
                // start with the same retirement balance), and year 1's
                // first draw comes next.
                return (
                  <>
                    <div className="tooltip-row">
                      <span>Withdrawal</span>
                      <span>{fmtMoneyFull(hoverWithdrawal)}</span>
                    </div>
                    <div className="tooltip-section divided">BEFORE WITHDRAWAL</div>
                    <div className="tooltip-row">
                      <span>Balance</span><span>{fmtMoneyFull(hoverBalance.p50)}</span>
                    </div>
                    <div className="tooltip-section divided">AFTER WITHDRAWAL</div>
                    <div className="tooltip-row">
                      <span>Balance</span><span>{fmtMoneyFull(post(hoverBalance.p50))}</span>
                    </div>
                  </>
                );
              }
              if (hover === simYears) {
                // Final tick: the simulation has ended. Show year-end balance
                // percentiles only — no upcoming withdrawal exists, so we don't
                // project (the stat-cells don't either, and projecting here is
                // what made "Last Annual Withdrawal" appear off-by-one).
                return (
                  <>
                    <div className="tooltip-section">PORTFOLIO BALANCE</div>
                    <div className="tooltip-row"><span>90th</span><span>{fmtMoneyFull(hoverBalance.p90)}</span></div>
                    <div className="tooltip-row"><span>75th</span><span>{fmtMoneyFull(hoverBalance.p75)}</span></div>
                    <div className="tooltip-row"><span>Median</span><span>{fmtMoneyFull(hoverBalance.p50)}</span></div>
                    <div className="tooltip-row"><span>25th</span><span>{fmtMoneyFull(hoverBalance.p25)}</span></div>
                    <div className="tooltip-row"><span>10th</span><span>{fmtMoneyFull(hoverBalance.p10)}</span></div>
                  </>
                );
              }
              return (
                <>
                  <div className="tooltip-row">
                    <span>Withdrawal</span>
                    <span>{fmtMoneyFull(hoverWithdrawal)}</span>
                  </div>
                  <div className="tooltip-section divided">BEFORE WITHDRAWAL</div>
                  <div className="tooltip-row">
                    <span>90th</span><span>{fmtMoneyFull(hoverBalance.p90)}</span>
                  </div>
                  <div className="tooltip-row">
                    <span>75th</span><span>{fmtMoneyFull(hoverBalance.p75)}</span>
                  </div>
                  <div className="tooltip-row">
                    <span>Median</span><span>{fmtMoneyFull(hoverBalance.p50)}</span>
                  </div>
                  <div className="tooltip-row">
                    <span>25th</span><span>{fmtMoneyFull(hoverBalance.p25)}</span>
                  </div>
                  <div className="tooltip-row">
                    <span>10th</span><span>{fmtMoneyFull(hoverBalance.p10)}</span>
                  </div>
                  <div className="tooltip-section divided">AFTER WITHDRAWAL</div>
                  <div className="tooltip-row">
                    <span>90th</span><span>{fmtMoneyFull(post(hoverBalance.p90))}</span>
                  </div>
                  <div className="tooltip-row">
                    <span>75th</span><span>{fmtMoneyFull(post(hoverBalance.p75))}</span>
                  </div>
                  <div className="tooltip-row">
                    <span>Median</span><span>{fmtMoneyFull(post(hoverBalance.p50))}</span>
                  </div>
                  <div className="tooltip-row">
                    <span>25th</span><span>{fmtMoneyFull(post(hoverBalance.p25))}</span>
                  </div>
                  <div className="tooltip-row">
                    <span>10th</span><span>{fmtMoneyFull(post(hoverBalance.p10))}</span>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>

      <div className="legend">
        <div className="legend-item">
          <span className="legend-swatch" style={{ background: "rgba(44,74,62,0.22)" }}></span>
          25th–75th percentile
        </div>
        <div className="legend-item">
          <span className="legend-swatch" style={{ background: "rgba(44,74,62,0.12)" }}></span>
          10th–90th percentile
        </div>
        <div className="legend-item">
          <span className="legend-swatch" style={{ background: "var(--ink)", border: "none" }}></span>
          Median path
        </div>
        <div className="legend-item">
          <svg width="16" height="12" style={{ overflow: "visible" }}>
            <line x1="8" x2="8" y1="11" y2="3" stroke="var(--withdrawal)" strokeWidth="1" opacity="0.55"/>
            <circle cx="8" cy="3" r="2.5" fill="var(--withdrawal)"/>
          </svg>
          Annual withdrawal
        </div>
      </div>

      <p className="chart-footnote">
        {withdrawalFrequency === 'monthly'
          ? "Withdrawals are taken in twelve equal monthly draws; each mark on the chart aggregates them into the year's total and sits at the start of the year it funds — the mark at tick 0 covers year 1's draws, tick 1 covers year 2's, and so on. "
          : "Withdrawals are taken at the start of the year they fund: the mark at tick 0 is year 1's draw, tick 1 is year 2's, and so on through year " + simYears + " at tick " + (simYears - 1) + ". "}
        With a multi-year cash bucket, the mark at tick 0 is the lump-sum drawn from the portfolio at retirement; the bucket-funded
        years that follow show no mark.
      </p>
    </div>
  );
}
