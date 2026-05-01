const { useState, useEffect } = React;

// ─── Formatting helpers ─────────────────────────────────────────────────────
const fmtMoney = (n) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n)}`;
};

const fmtMoneyFull = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const fmtPct = (n) => `${(n * 100).toFixed(1)}%`;

// ─── Slider Component ───────────────────────────────────────────────────────
function Slider({ label, value, min, max, step, onChange, format, sublabel }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="slider-row">
      <div className="slider-header">
        <div>
          <div className="slider-label">{label}</div>
          {sublabel && <div className="slider-sub">{sublabel}</div>}
        </div>
        <div className="slider-value">{format(value)}</div>
      </div>
      <div className="slider-track-wrap">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ "--pct": `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
function RetirementSimulator() {
  const [balance, setBalance] = useState(4_000_000);
  const [withdrawal, setWithdrawal] = useState(152_000);
  const [withdrawalFrequency, setWithdrawalFrequency] = useState('annual');
  const [upfrontYears, setUpfrontYears] = useState(1);
  const [inflationAdjustBucket, setInflationAdjustBucket] = useState(false);
  const [bucketEarnsTBills, setBucketEarnsTBills] = useState(false);
  const [cagr, setCagr] = useState(0.098);
  const [volatility, setVolatility] = useState(0.175);
  const [inflation, setInflation] = useState(0.03);
  const [years, setYears] = useState(40);

  const [hover, setHover] = useState(null);

  const [sim, setSim] = useState(null);
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(true);
  const [solving, setSolving] = useState(false);
  const [solveProgress, setSolveProgress] = useState(0);
  const [targetSuccessRate, setTargetSuccessRate] = useState(95);

  // The bucket-* flags are no-ops when upfrontYears === 1 (no lump sum is
  // taken). Depending on the *effective* values here keeps a checkbox toggle
  // from triggering a fresh Monte Carlo run with new random samples, which
  // would otherwise jiggle the success rate as pure simulation noise.
  const effectiveInflationAdjustBucket = inflationAdjustBucket && upfrontYears > 1;
  const effectiveBucketEarnsTBills = bucketEarnsTBills && upfrontYears > 1;

  useEffect(() => {
    setRunning(true);
    setProgress(0);
    let worker = null;
    const t = setTimeout(() => {
      worker = new Worker(MONTE_CARLO_WORKER_URL);
      worker.onmessage = (e) => {
        if (e.data.type === 'progress') {
          setProgress(e.data.pct);
        } else if (e.data.type === 'done') {
          setSim(e.data.result);
          setRunning(false);
          setProgress(1);
        }
      };
      worker.postMessage({
        type: 'run',
        params: { balance, withdrawal, returnRate: cagrToArithmetic(cagr, volatility), volatility, inflation, years, runs: SIM_RUNS, upfrontYears, inflationAdjustBucket: effectiveInflationAdjustBucket, bucketEarnsTBills: effectiveBucketEarnsTBills, tBillRealPremium: T_BILL_REAL_PREMIUM, monthly: withdrawalFrequency === 'monthly' },
      });
    }, 150);
    return () => {
      clearTimeout(t);
      if (worker) worker.terminate();
    };
  }, [balance, withdrawal, cagr, volatility, inflation, years, upfrontYears, effectiveInflationAdjustBucket, effectiveBucketEarnsTBills, withdrawalFrequency]);

  // Binary-search the worker for the withdrawal that yields the chosen
  // target success rate. Success is monotonic in withdrawal (more spent →
  // lower success), so we probe endpoints first to detect the unreachable
  // cases, then halve the interval keeping the invariant rate(lo) ≥ target
  // > rate(hi). Each probe runs a reduced-runs simulation (100K vs 1M) for
  // speed; the final value is applied to the slider, which triggers the
  // normal full-resolution rerun.
  const solveForTarget = async () => {
    if (solving || running) return;
    const TARGET = targetSuccessRate / 100;
    const SOLVE_RUNS = 100_000;
    const STEP = 1_000;
    const MIN_WD = 10_000;
    const MAX_WD = 300_000;
    const MAX_ITER = 10;

    setSolving(true);
    setSolveProgress(0);

    const baseParams = {
      balance, returnRate: cagrToArithmetic(cagr, volatility), volatility, inflation, years,
      runs: SOLVE_RUNS, upfrontYears,
      inflationAdjustBucket: effectiveInflationAdjustBucket,
      bucketEarnsTBills: effectiveBucketEarnsTBills,
      tBillRealPremium: T_BILL_REAL_PREMIUM,
      monthly: withdrawalFrequency === 'monthly',
    };

    const probe = (wd) => new Promise((resolve) => {
      const w = new Worker(MONTE_CARLO_WORKER_URL);
      w.onmessage = (e) => {
        if (e.data.type === 'done') {
          w.terminate();
          resolve(e.data.result.successRate);
        }
      };
      w.postMessage({ type: 'run', params: { ...baseParams, withdrawal: wd } });
    });

    const totalSteps = MAX_ITER + 2;
    let step = 0;
    const tick = () => { step++; setSolveProgress(step / totalSteps); };

    const loRate = await probe(MIN_WD);
    tick();
    if (loRate < TARGET) {
      setWithdrawal(MIN_WD);
      setSolving(false);
      setSolveProgress(0);
      return;
    }
    const hiRate = await probe(MAX_WD);
    tick();
    if (hiRate >= TARGET) {
      setWithdrawal(MAX_WD);
      setSolving(false);
      setSolveProgress(0);
      return;
    }

    let lo = MIN_WD;
    let hi = MAX_WD;
    for (let i = 0; i < MAX_ITER; i++) {
      const mid = Math.round((lo + hi) / 2 / STEP) * STEP;
      if (mid <= lo || mid >= hi) break;
      const rate = await probe(mid);
      if (rate >= TARGET) lo = mid;
      else hi = mid;
      tick();
    }

    setWithdrawal(lo);
    setSolving(false);
    setSolveProgress(0);
  };

  // Chart geometry
  const W = 760;
  const H = 380;
  const padL = 64;
  const padR = 64;
  const padT = 28;
  const padB = 44;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const maxVal = sim ? Math.max(...sim.percentiles.map(p => p.p90), balance) * 1.05 : balance * 1.05;
  // Render against the sim we have, not the input slider. A slider change
  // updates `years` synchronously but the worker takes a tick to return new
  // percentiles — using `years` as the loop bound during that gap reads past
  // the end of `sim.percentiles` and crashes with `undefined.p50`.
  const simYears = sim ? sim.percentiles.length - 1 : years;
  const x = (y) => padL + (y / simYears) * innerW;
  const yScale = (v) => padT + innerH - (v / maxVal) * innerH;

  // Withdrawal scale (left axis)
  const maxW = sim ? Math.max(...sim.percentiles.map(p => p.withdrawal)) * 1.15 : 1;
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

  // Derived stats
  const successColor = sim && sim.successRate >= 0.9 ? "#3a7d44" : sim && sim.successRate >= 0.7 ? "#c89a3a" : "#a83232";

  // First year the median (p50) path hits $0. The withdrawal at that year is
  // the inflation-adjusted intended draw — i.e. the spend that broke the
  // median portfolio.
  const medianDepletion = (() => {
    if (!sim) return null;
    for (let i = 1; i <= simYears; i++) {
      if (sim.percentiles[i].p50 <= 0) {
        return { year: i, withdrawal: sim.percentiles[i].withdrawal };
      }
    }
    return null;
  })();

  // Bounds-check against the sim's actual length, not `years`: a slider change
  // can move `years` past the worker's current output, leaving a stale hover
  // index that points off the end of the percentiles array.
  const hoverData = hover !== null && sim && hover <= simYears
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
    <div className="sim-root">
      <div className="sim-inner">
        {/* MASTHEAD */}
        <header className="masthead">
          <h1 className="masthead-title">
            The Retirement <span className="reg">Ledger</span>
          </h1>
          <div className="masthead-meta">
            <div className="vol">VOL. I · MONTE CARLO EDITION</div>
            <div>{SIM_RUNS.toLocaleString()} SIMULATIONS · {years}-YEAR HORIZON</div>
          </div>
        </header>

        <div className="layout">
          {/* SIDEBAR */}
          <aside className="sidebar">
            <div className="panel-heading">Portfolio Settings</div>

            <Slider
              label="Starting Balance"
              sublabel="Portfolio at retirement"
              value={balance}
              min={100_000}
              max={5_000_000}
              step={50_000}
              onChange={setBalance}
              format={fmtMoney}
            />

            <Slider
              label="Annual Withdrawal"
              sublabel="Amount before inflation adjustment"
              value={withdrawal}
              min={10_000}
              max={300_000}
              step={1_000}
              onChange={setWithdrawal}
              format={(v) => `${fmtMoney(v)} (${(v / balance * 100).toFixed(1)}%)`}
            />

            <Slider
              label="Starting Cash Bucket"
              sublabel="Lump-sum first withdrawal"
              value={upfrontYears}
              min={1}
              max={10}
              step={1}
              onChange={setUpfrontYears}
              format={(v) => {
                const wGrow = inflationAdjustBucket ? inflation : 0;
                const disc = bucketEarnsTBills && v > 1 ? inflation + T_BILL_REAL_PREMIUM : 0;
                const bucket = bucketSize(withdrawal, v, wGrow, disc);
                return `${v} ${v === 1 ? "yr" : "yrs"} (${fmtMoney(bucket)})`;
              }}
            />

            <Slider
              label="Retirement Duration"
              sublabel="Years to model"
              value={years}
              min={5}
              max={50}
              step={1}
              onChange={setYears}
              format={(v) => `${v} yrs`}
            />

            <div className="panel-heading">Market Assumptions</div>

            <Slider
              label="CAGR"
              sublabel="Portfolio's Compound annual growth rate"
              value={cagr}
              min={0.01}
              max={0.12}
              step={0.005}
              onChange={setCagr}
              format={fmtPct}
            />

            <Slider
              label="Annual Volatility"
              sublabel="Portfolio's Standard deviation"
              value={volatility}
              min={0.02}
              max={0.30}
              step={0.01}
              onChange={setVolatility}
              format={fmtPct}
            />

            <Slider
              label="Inflation Rate"
              sublabel="Cost-of-living growth"
              value={inflation}
              min={0}
              max={0.08}
              step={0.0025}
              onChange={setInflation}
              format={fmtPct}
            />

            <details className="advanced">
              <summary>Advanced</summary>
              <div className="advanced-body">
                <div className="adv-freq" style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 14 }}>
                  <span aria-hidden="true" style={{ width: 12, flexShrink: 0, textAlign: 'center', lineHeight: '14px', color: 'var(--accent)', fontWeight: 700 }}>•</span>
                  <div style={{ flex: 1 }}>
                    <div className="toggle-label">Withdrawal frequency</div>
                    <div className="toggle-sub" style={{ marginBottom: 8 }}>When draws are taken from the portfolio.</div>
                    <div className="freq-toggle">
                      <button
                        type="button"
                        className={`freq-btn${withdrawalFrequency === 'annual' ? ' active' : ''}`}
                        onClick={() => setWithdrawalFrequency('annual')}
                      >
                        Annual
                      </button>
                      <button
                        type="button"
                        className={`freq-btn${withdrawalFrequency === 'monthly' ? ' active' : ''}`}
                        onClick={() => setWithdrawalFrequency('monthly')}
                      >
                        Monthly
                      </button>
                    </div>
                  </div>
                </div>
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={inflationAdjustBucket}
                    onChange={(e) => setInflationAdjustBucket(e.target.checked)}
                  />
                  <div>
                    <div className="toggle-label">Starting Cash Bucket is inflation-adjusted</div>
                    <div className="toggle-sub">Increase cash bucket by inflation for years > 1.</div>
                  </div>
                </label>
                <label className="toggle-row" style={{ marginTop: 12 }}>
                  <input
                    type="checkbox"
                    checked={bucketEarnsTBills}
                    onChange={(e) => setBucketEarnsTBills(e.target.checked)}
                  />
                  <div>
                    <div className="toggle-label">Starting Cash Bucket earns T-Bills</div>
                    <div className="toggle-sub">
                      Hold cash beyond 1 year in T-Bills earning {fmtPct(inflation + T_BILL_REAL_PREMIUM)} (inflation + 0.5% historical real return).
                    </div>
                  </div>
                </label>
              </div>
            </details>
          </aside>

          {/* MAIN AREA */}
          <main className="main-area">
            {!sim && (
              <div className="initial-loading">
                <div className="progress-track">
                  <div className="progress-bar" style={{ width: `${progress * 100}%` }}></div>
                </div>
                <div className="initial-loading-label">Running {SIM_RUNS.toLocaleString()} simulations…</div>
              </div>
            )}
            {sim && <>
            {/* STATS */}
            <div className="stats-row fade">
              <div className="stat-cell">
                <div className="stat-label">Success Rate</div>
                <div className="stat-value success" style={{ color: successColor }}>
                  {`${(sim.successRate * 100).toFixed(2)}%`}
                </div>
              </div>
              <div className="stat-cell">
                <div className="stat-label">Median Ending</div>
                <div className="stat-value">{fmtMoney(sim.medianEnding)}</div>
              </div>
              <div className="stat-cell">
                <div className="stat-label">Total Drawn</div>
                <div className="stat-value">
                  {fmtMoney(sim.percentiles.reduce((a, b) => a + b.withdrawal, 0))}
                </div>
              </div>
              <div className="stat-cell">
                <div className="stat-label">Final Withdrawal</div>
                <div className="stat-value">
                  {fmtMoney(sim.percentiles[simYears].withdrawal)}
                </div>
              </div>
              <div className="stat-cell">
                <div className="stat-label">Median Depletion</div>
                <div className="stat-value">
                  {medianDepletion ? `Year ${medianDepletion.year}` : "None"}
                </div>
                {medianDepletion && (
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.05em', color: 'var(--ink-2)', marginTop: 4, textTransform: 'uppercase', fontVariantNumeric: 'tabular-nums' }}>
                    {fmtMoney(medianDepletion.withdrawal)} draw
                  </div>
                )}
              </div>
            </div>

            {/* SOLVER */}
            <div className="solver-row fade">
              <div className="solver-label">Target Success Rate</div>
              <div className="solver-slider">
                <input
                  type="range"
                  min={50}
                  max={99}
                  step={1}
                  value={targetSuccessRate}
                  onChange={(e) => setTargetSuccessRate(parseInt(e.target.value, 10))}
                  style={{ "--pct": `${((targetSuccessRate - 50) / 49) * 100}%` }}
                  disabled={solving}
                />
              </div>
              <div className="solver-value">{targetSuccessRate}%</div>
              <button
                type="button"
                className="solve-btn"
                onClick={solveForTarget}
                disabled={solving || running}
              >
                <span className="solve-btn-ghost" aria-hidden="true">
                  Solve for 99% Success
                </span>
                <span className="solve-btn-label">
                  {solving
                    ? `Solving · ${Math.round(solveProgress * 100)}%`
                    : `Solve for ${targetSuccessRate}% Success`}
                </span>
              </button>
            </div>

            {/* CHART */}
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
                  Annual withdrawal (left axis)
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

            <p className="footer-note">
              {withdrawalFrequency === 'monthly'
                ? "Returns are sampled monthly, with the annual mean and volatility rescaled so twelve compounded months match the annual factor's mean and variance. "
                : "Returns are sampled annually from a normal distribution; the input CAGR is converted to the per-year arithmetic mean by adding back the variance drag (≈ σ²/2), so the long-run geometric mean of paths tracks the chosen CAGR. "}
              Past performance does not guarantee future results; this model is illustrative, not advisory.
            </p>
            </>}
          </main>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<RetirementSimulator />);