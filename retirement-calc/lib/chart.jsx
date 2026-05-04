// ─── Portfolio Trajectory Chart ─────────────────────────────────────────────
// Renders the percentile-band SVG, hover tooltip, legend, and footnote.
// Hover state is local; everything else is driven by props.

function PortfolioChart({
  sim,
  running,
  progress,
  balance,
  inflation,
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

  const maxVal = Math.max(...sim.percentiles.map(p => p.p90), balance) * 1.05;
  const x = (y) => padL + (y / simYears) * innerW;
  const yScale = (v) => padT + innerH - (v / maxVal) * innerH;

  // Withdrawal scale (left axis)
  const maxW = Math.max(...sim.percentiles.map(p => p.withdrawal)) * 1.15;
  const yScaleW = (v) => padT + innerH - (v / maxW) * innerH;

  // Each year y, the withdrawal at percentiles[y].withdrawal is taken at the
  // start of year y — i.e. immediately after tick Y(y-1). Render that as a
  // vertical step-down at x(y-1), then the year's growth as a diagonal to
  // (x(y), p[y]). Clamp post-withdrawal values at 0 so depletion years don't
  // dip below the axis.
  const stepDown = (key, i) =>
    Math.max(0, sim.percentiles[i-1][key] - sim.percentiles[i].withdrawal);

  const buildArea = (kHigh, kLow) => {
    let top = `M ${x(0)} ${yScale(sim.percentiles[0][kHigh])}`;
    for (let i = 1; i <= simYears; i++) {
      top += ` L ${x(i-1)} ${yScale(stepDown(kHigh, i))}`;
      top += ` L ${x(i)} ${yScale(sim.percentiles[i][kHigh])}`;
    }
    let bot = ` L ${x(simYears)} ${yScale(sim.percentiles[simYears][kLow])}`;
    for (let i = simYears; i >= 1; i--) {
      bot += ` L ${x(i-1)} ${yScale(stepDown(kLow, i))}`;
      bot += ` L ${x(i-1)} ${yScale(sim.percentiles[i-1][kLow])}`;
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
    const yearIdx = Math.round(((px - padL) / innerW) * simYears);
    if (yearIdx >= 0 && yearIdx <= simYears) {
      setHover(yearIdx);
    }
  };

  // Bounds-check against the sim's actual length, not `years`: a slider change
  // can move `years` past the worker's current output, leaving a stale hover
  // index that points off the end of the percentiles array.
  const hoverData = hover !== null && hover <= simYears
    ? sim.percentiles[hover]
    : null;
  // Withdrawal at hover tick h is the draw taken at the start of year h+1.
  // At the final tick we've run out of simulated years, so project one more
  // year of inflation onto the last withdrawal — assumes retirement continues
  // for as long as the portfolio sustains it.
  const hoverWithdrawal = hoverData
    ? (hover < simYears
        ? sim.percentiles[hover + 1].withdrawal
        : Math.floor(sim.percentiles[simYears].withdrawal * (1 + inflation)))
    : null;

  return (
    <div className="chart-section fade">
      <div className="chart-title-row">
        <h2 className="chart-title">Portfolio Trajectory</h2>
      </div>
      <p className="chart-subtitle">
        Shaded bands show the spread of {SIM_RUNS.toLocaleString()} Monte Carlo paths. Outer band, 10th–90th percentile;
        inner band, 25th–75th. The stepped line marks median annual withdrawal, scaled to the left axis.
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

          {/* X ticks */}
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
                Y{t}
              </text>
            </g>
          ))}

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

          {/* Median portfolio line — truncated at depletion year so
              the line clearly terminates at $0 instead of vanishing
              along the bottom axis frame. */}
          <path
            d={(() => {
              const lastYear = medianDepletion ? medianDepletion.year : simYears;
              let d = `M ${x(0)} ${yScale(sim.percentiles[0].p50)}`;
              for (let i = 1; i <= lastYear; i++) {
                d += ` L ${x(i-1)} ${yScale(stepDown("p50", i))}`;
                d += ` L ${x(i)} ${yScale(sim.percentiles[i].p50)}`;
              }
              return d;
            })()}
            fill="none"
            stroke="var(--ink)"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Withdrawal step-line (solid, on left axis). Shifted one
              tick left of the balance series: withdrawal[y] is the draw
              taken at the start of year y, so each step starts at
              x(y-1) — the moment the money leaves — and runs flat for
              that year's duration before stepping to the next year. */}
          <path
            d={(() => {
              const pts = sim.percentiles.slice(1);
              const lastYear = medianDepletion ? medianDepletion.year : pts.length;
              let d = `M ${x(0)} ${yScaleW(pts[0].withdrawal)}`;
              for (let i = 1; i < lastYear; i++) {
                d += ` L ${x(i)} ${yScaleW(pts[i-1].withdrawal)}`;
                d += ` L ${x(i)} ${yScaleW(pts[i].withdrawal)}`;
              }
              d += ` L ${x(lastYear)} ${yScaleW(pts[lastYear-1].withdrawal)}`;
              if (medianDepletion) {
                // Drop to $0 at the depletion year and terminate —
                // matches the median portfolio line.
                d += ` L ${x(lastYear)} ${yScaleW(0)}`;
              }
              return d;
            })()}
            fill="none"
            stroke="var(--withdrawal)"
            strokeWidth="1.5"
            strokeLinejoin="miter"
          />

          {/* Hover guide */}
          {hoverData && (
            <>
              <line
                x1={x(hover)} x2={x(hover)}
                y1={padT} y2={padT + innerH}
                stroke="var(--ink)"
                strokeWidth="0.75"
                strokeDasharray="2 2"
                opacity="0.5"
              />
              <circle cx={x(hover)} cy={yScale(hoverData.p50)} r="4" fill="var(--ink)"/>
              <circle cx={x(hover)} cy={yScale(hoverData.p50)} r="2" fill="var(--cream)"/>
              <circle cx={x(hover)} cy={yScaleW(hoverWithdrawal)} r="3" fill="var(--withdrawal)"/>
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

        {hoverData && (
          <div
            className="tooltip"
            style={{
              left: `${(x(hover) / W) * 100}%`,
              top: `${(yScale(hoverData.p50) / H) * 100}%`,
            }}
          >
            <div className="tooltip-year">YEAR {hover}</div>
            {(() => {
              const post = (v) => Math.max(0, v - hoverWithdrawal);
              if (hover === 0) {
                return (
                  <>
                    <div className="tooltip-section">BEFORE WITHDRAWAL</div>
                    <div className="tooltip-row">
                      <span>Balance</span><span>{fmtMoneyFull(hoverData.p50)}</span>
                    </div>
                    <div className="tooltip-row median">
                      <span>Withdrawal</span><span>{fmtMoneyFull(hoverWithdrawal)}</span>
                    </div>
                    <div className="tooltip-section divided">AFTER WITHDRAWAL</div>
                    <div className="tooltip-row">
                      <span>Balance</span><span>{fmtMoneyFull(post(hoverData.p50))}</span>
                    </div>
                  </>
                );
              }
              return (
                <>
                  <div className="tooltip-section">BEFORE WITHDRAWAL</div>
                  <div className="tooltip-row">
                    <span>90th</span><span>{fmtMoneyFull(hoverData.p90)}</span>
                  </div>
                  <div className="tooltip-row">
                    <span>75th</span><span>{fmtMoneyFull(hoverData.p75)}</span>
                  </div>
                  <div className="tooltip-row">
                    <span>Median</span><span>{fmtMoneyFull(hoverData.p50)}</span>
                  </div>
                  <div className="tooltip-row">
                    <span>25th</span><span>{fmtMoneyFull(hoverData.p25)}</span>
                  </div>
                  <div className="tooltip-row">
                    <span>10th</span><span>{fmtMoneyFull(hoverData.p10)}</span>
                  </div>
                  <div className="tooltip-row median">
                    <span>Withdrawal</span><span>{fmtMoneyFull(hoverWithdrawal)}</span>
                  </div>
                  <div className="tooltip-section divided">AFTER WITHDRAWAL</div>
                  <div className="tooltip-row">
                    <span>90th</span><span>{fmtMoneyFull(post(hoverData.p90))}</span>
                  </div>
                  <div className="tooltip-row">
                    <span>75th</span><span>{fmtMoneyFull(post(hoverData.p75))}</span>
                  </div>
                  <div className="tooltip-row">
                    <span>Median</span><span>{fmtMoneyFull(post(hoverData.p50))}</span>
                  </div>
                  <div className="tooltip-row">
                    <span>25th</span><span>{fmtMoneyFull(post(hoverData.p25))}</span>
                  </div>
                  <div className="tooltip-row">
                    <span>10th</span><span>{fmtMoneyFull(post(hoverData.p10))}</span>
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
          <span className="legend-swatch" style={{
            background: "transparent",
            borderTop: "2px solid var(--withdrawal)",
            borderBottom: "none",
            borderLeft: "none",
            borderRight: "none",
            height: "0",
            marginTop: "5px"
          }}></span>
          Annual withdrawal
        </div>
      </div>

      <p className="chart-footnote">
        {withdrawalFrequency === 'monthly'
          ? "Withdrawals are taken in twelve equal monthly draws; each step on the chart aggregates them into the year's total, beginning one tick left of the balance series — the step at Y0 covers year 1's draws, Y1 covers year 2's, and so on. "
          : "Withdrawals are taken at the start of the year they fund, so each step begins one tick left of the balance series: the step starting at Y0 is the draw that funds year 1, Y1 the draw that funds year 2, and so on. "}
        With a multi-year cash bucket, Y0's step is the lump-sum drawn from the portfolio at retirement; the bucket-funded
        years that follow show zero portfolio withdrawal. The hover value at the final tick projects one more year of
        inflation onto the last simulated withdrawal — assuming retirement continues for as long as the portfolio sustains it.
      </p>
    </div>
  );
}
