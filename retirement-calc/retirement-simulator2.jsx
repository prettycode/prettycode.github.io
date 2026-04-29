const { useState, useEffect } = React;

// ─── Monte Carlo Engine (runs in a Web Worker) ──────────────────────────────
// Float32Array per-year balance storage keeps 1M-run memory near 124MB
// (vs ~500MB for an array-of-arrays approach) and lets us use the much faster
// typed-array .sort() for percentile extraction.
const WORKER_SOURCE = `
function gaussian() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function runSimulation({ balance, withdrawal, returnRate, volatility, inflation, years, runs }) {
  const yearBalances = new Array(years + 1);
  for (let y = 0; y <= years; y++) yearBalances[y] = new Float32Array(runs);
  yearBalances[0].fill(balance);

  const inflationPow = new Float64Array(years + 1);
  for (let y = 0; y <= years; y++) inflationPow[y] = Math.pow(1 + inflation, y);

  const withdrawalSum = new Float64Array(years + 1);
  const depletionYears = new Uint16Array(runs);
  let depletionCount = 0;
  let survived = 0;
  const reportEvery = Math.max(1, Math.floor(runs / 100));

  for (let r = 0; r < runs; r++) {
    let bal = balance;
    let depleted = false;

    for (let y = 1; y <= years; y++) {
      const currentWithdrawal = withdrawal * inflationPow[y - 1];
      withdrawalSum[y] += currentWithdrawal;

      if (depleted) {
        yearBalances[y][r] = 0;
        continue;
      }

      bal -= currentWithdrawal;
      if (bal <= 0) {
        bal = 0;
        depleted = true;
        depletionYears[depletionCount++] = y;
        yearBalances[y][r] = 0;
        continue;
      }

      const annualReturn = returnRate + volatility * gaussian();
      bal = bal * (1 + annualReturn);
      if (bal < 0) bal = 0;
      yearBalances[y][r] = bal;
    }

    if (bal > 0) survived++;

    if (r % reportEvery === 0) {
      self.postMessage({ type: 'progress', pct: r / runs });
    }
  }

  const percentiles = [];
  for (let y = 0; y <= years; y++) {
    const yearVals = yearBalances[y];
    yearVals.sort();
    percentiles.push({
      year: y,
      p10: yearVals[Math.floor(runs * 0.1)],
      p25: yearVals[Math.floor(runs * 0.25)],
      p50: yearVals[Math.floor(runs * 0.5)],
      p75: yearVals[Math.floor(runs * 0.75)],
      p90: yearVals[Math.floor(runs * 0.9)],
      withdrawal: withdrawalSum[y] / runs,
    });
  }

  const successRate = survived / runs;
  // yearBalances[years] was sorted in the loop above
  const medianEnding = yearBalances[years][Math.floor(runs * 0.5)];

  let medianDepletionYear = null;
  if (depletionCount > 0) {
    const sortedDepletions = depletionYears.slice(0, depletionCount);
    sortedDepletions.sort();
    medianDepletionYear = sortedDepletions[Math.floor(depletionCount / 2)];
  }

  return { percentiles, successRate, medianEnding, medianDepletionYear, runs };
}

self.onmessage = function(e) {
  if (e.data.type === 'run') {
    const result = runSimulation(e.data.params);
    self.postMessage({ type: 'done', result: result });
  }
};
`;

const WORKER_BLOB_URL = URL.createObjectURL(
  new Blob([WORKER_SOURCE], { type: 'application/javascript' })
);

const SIM_RUNS = 1_000_000;

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
  const [returnRate, setReturnRate] = useState(0.098);
  const [volatility, setVolatility] = useState(0.195);
  const [inflation, setInflation] = useState(0.03);
  const [years, setYears] = useState(40);

  const [hover, setHover] = useState(null);

  const [sim, setSim] = useState(null);
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    setRunning(true);
    setProgress(0);
    let worker = null;
    const t = setTimeout(() => {
      worker = new Worker(WORKER_BLOB_URL);
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
        params: { balance, withdrawal, returnRate, volatility, inflation, years, runs: SIM_RUNS },
      });
    }, 150);
    return () => {
      clearTimeout(t);
      if (worker) worker.terminate();
    };
  }, [balance, withdrawal, returnRate, volatility, inflation, years]);

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
  const x = (y) => padL + (y / years) * innerW;
  const yScale = (v) => padT + innerH - (v / maxVal) * innerH;

  // Withdrawal scale (right axis)
  const maxW = sim ? Math.max(...sim.percentiles.map(p => p.withdrawal)) * 1.15 : 1;
  const yScaleW = (v) => padT + innerH - (v / maxW) * innerH;

  const buildPath = (key) =>
    sim.percentiles.map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.year)} ${yScale(p[key])}`).join(" ");

  const buildArea = (kHigh, kLow) => {
    const top = sim.percentiles.map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.year)} ${yScale(p[kHigh])}`).join(" ");
    const bot = sim.percentiles.slice().reverse().map(p => `L ${x(p.year)} ${yScale(p[kLow])}`).join(" ");
    return `${top} ${bot} Z`;
  };

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => t * maxVal);
  const xTicks = years <= 15
    ? Array.from({ length: years + 1 }, (_, i) => i).filter(i => i % Math.ceil((years + 1) / 8) === 0 || i === years)
    : Array.from({ length: Math.floor(years / 5) + 1 }, (_, i) => i * 5).filter(v => v <= years);

  // Hover handler
  const onMove = (e) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const yearIdx = Math.round(((px - padL) / innerW) * years);
    if (yearIdx >= 0 && yearIdx <= years) {
      setHover(yearIdx);
    }
  };

  // Derived stats
  const successColor = sim && sim.successRate >= 0.9 ? "#3a7d44" : sim && sim.successRate >= 0.7 ? "#c89a3a" : "#a83232";

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,700;9..144,900&family=JetBrains+Mono:wght@400;500;700&family=Inter+Tight:wght@400;500;600&display=swap');

    .sim-root {
      --cream: #f4ede0;
      --cream-2: #ede4d3;
      --ink: #1a1612;
      --ink-2: #4a423a;
      --rule: #c9bfa9;
      --accent: #b8401f;
      --accent-2: #2c4a3e;
      --gold: #a87f2a;
      --green: #3a7d44;
      --withdrawal: #8b3a1f;

      font-family: 'Inter Tight', sans-serif;
      background: var(--cream);
      color: var(--ink);
      min-height: 100vh;
      padding: 28px 32px 48px;
      letter-spacing: -0.005em;
    }

    .sim-root * { box-sizing: border-box; }

    /* Subtle paper grain */
    .sim-root::before {
      content: '';
      position: fixed; inset: 0;
      background-image:
        radial-gradient(circle at 25% 30%, rgba(168, 127, 42, 0.04) 0%, transparent 50%),
        radial-gradient(circle at 75% 70%, rgba(184, 64, 31, 0.03) 0%, transparent 50%);
      pointer-events: none;
      z-index: 0;
    }

    .sim-inner {
      max-width: 1240px;
      margin: 0 auto;
      position: relative;
      z-index: 1;
    }

    .masthead {
      border-bottom: 2px solid var(--ink);
      padding-bottom: 18px;
      margin-bottom: 28px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }

    .masthead-title {
      font-family: 'Fraunces', serif;
      font-weight: 900;
      font-size: 44px;
      line-height: 0.95;
      letter-spacing: -0.03em;
      font-style: italic;
    }

    .masthead-title .reg { font-style: normal; font-weight: 400; }

    .masthead-meta {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--ink-2);
      text-align: right;
      line-height: 1.5;
    }

    .masthead-meta .vol { font-weight: 700; color: var(--ink); }

    .layout {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 36px;
    }

    @media (max-width: 920px) {
      .layout { grid-template-columns: 1fr; }
    }

    /* ─── Sidebar (Sliders) ─── */
    .sidebar {
      border-right: 1px solid var(--rule);
      padding-right: 32px;
    }

    @media (max-width: 920px) {
      .sidebar { border-right: none; border-bottom: 1px solid var(--rule); padding-right: 0; padding-bottom: 24px; }
    }

    .panel-heading {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--ink-2);
      margin-bottom: 18px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--rule);
    }

    .slider-row {
      margin-bottom: 22px;
    }

    .slider-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 10px;
    }

    .slider-label {
      font-family: 'Fraunces', serif;
      font-size: 16px;
      font-weight: 500;
      color: var(--ink);
    }

    .slider-sub {
      font-size: 10px;
      letter-spacing: 0.05em;
      color: var(--ink-2);
      text-transform: uppercase;
      margin-top: 2px;
    }

    .slider-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      font-weight: 700;
      color: var(--accent);
      font-variant-numeric: tabular-nums;
    }

    .slider-track-wrap {
      position: relative;
      height: 20px;
      display: flex;
      align-items: center;
    }

    input[type="range"] {
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 2px;
      background: linear-gradient(to right, var(--ink) 0%, var(--ink) var(--pct), var(--rule) var(--pct), var(--rule) 100%);
      outline: none;
      cursor: pointer;
    }

    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 14px;
      height: 14px;
      background: var(--cream);
      border: 2px solid var(--ink);
      border-radius: 50%;
      cursor: pointer;
      transition: transform 0.15s ease, background 0.15s ease;
    }

    input[type="range"]::-webkit-slider-thumb:hover {
      transform: scale(1.2);
      background: var(--accent);
      border-color: var(--accent);
    }

    input[type="range"]::-moz-range-thumb {
      width: 14px;
      height: 14px;
      background: var(--cream);
      border: 2px solid var(--ink);
      border-radius: 50%;
      cursor: pointer;
    }

    /* ─── Main Area ─── */
    .main-area {
      display: flex;
      flex-direction: column;
      gap: 28px;
    }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 0;
      border-top: 1px solid var(--ink);
      border-bottom: 1px solid var(--ink);
    }

    @media (max-width: 720px) {
      .stats-row { grid-template-columns: repeat(2, 1fr); }
    }

    .stat-cell {
      padding: 14px 18px;
      border-right: 1px solid var(--rule);
    }

    .stat-cell:last-child { border-right: none; }

    @media (max-width: 720px) {
      .stat-cell:nth-child(2),
      .stat-cell:nth-child(4) { border-right: none; }
      .stat-cell:nth-child(1),
      .stat-cell:nth-child(2),
      .stat-cell:nth-child(3),
      .stat-cell:nth-child(4) { border-bottom: 1px solid var(--rule); }
      .stat-cell:nth-child(5) { grid-column: span 2; }
    }

    .stat-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--ink-2);
      margin-bottom: 6px;
    }

    .stat-value {
      font-family: 'Fraunces', serif;
      font-size: 26px;
      font-weight: 700;
      letter-spacing: -0.02em;
      font-variant-numeric: tabular-nums;
    }

    .stat-value.success { font-style: italic; }

    /* ─── Chart Section ─── */
    .chart-section {
      position: relative;
    }

    .chart-title-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 4px;
    }

    .chart-title {
      font-family: 'Fraunces', serif;
      font-size: 22px;
      font-weight: 500;
      font-style: italic;
      letter-spacing: -0.01em;
    }

    .chart-subtitle {
      font-size: 12px;
      color: var(--ink-2);
      margin-bottom: 16px;
      max-width: 540px;
      line-height: 1.5;
    }

    .chart-wrap {
      position: relative;
      width: 100%;
      background: var(--cream-2);
      border: 1px solid var(--rule);
      padding: 8px;
    }

    svg.chart {
      width: 100%;
      height: auto;
      display: block;
      cursor: crosshair;
    }

    .legend {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
      margin-top: 14px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--ink-2);
    }

    .legend-item { display: flex; align-items: center; gap: 8px; }

    .legend-swatch {
      width: 16px;
      height: 10px;
      border: 1px solid var(--ink);
    }

    .tooltip {
      position: absolute;
      background: var(--ink);
      color: var(--cream);
      padding: 10px 12px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      pointer-events: none;
      min-width: 180px;
      transform: translate(-50%, -110%);
      z-index: 10;
    }

    .tooltip-year {
      font-size: 9px;
      letter-spacing: 0.2em;
      opacity: 0.6;
      margin-bottom: 6px;
    }

    .tooltip-row {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      padding: 2px 0;
      font-variant-numeric: tabular-nums;
    }

    .tooltip-row.median {
      border-top: 1px solid rgba(244,237,224,0.2);
      margin-top: 4px;
      padding-top: 6px;
      font-weight: 700;
    }

    /* ─── Footer note ─── */
    .footer-note {
      font-size: 11px;
      color: var(--ink-2);
      font-style: italic;
      line-height: 1.6;
      border-top: 1px solid var(--rule);
      padding-top: 14px;
      margin-top: 8px;
    }

    .footer-note::before { content: '§ '; font-weight: 700; color: var(--accent); }

    /* Gentle entrance */
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .fade { animation: fadeUp 0.5s ease both; }

    /* Subtle progress bar — sits at top of chart-wrap and the initial loading view */
    .progress-bar {
      position: absolute;
      top: 0; left: 0;
      height: 1.5px;
      background: var(--accent);
      z-index: 5;
      pointer-events: none;
      transition: width 0.18s ease, opacity 0.5s ease 0.3s;
    }
    .progress-bar.done { opacity: 0; }

    .initial-loading {
      padding: 100px 0 80px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 18px;
    }

    .initial-loading .progress-track {
      position: relative;
      width: 220px;
      height: 1.5px;
      background: var(--rule);
    }

    .initial-loading-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--ink-2);
    }
  `;

  const hoverData = hover !== null && sim ? sim.percentiles[hover] : null;

  return (
    <div className="sim-root">
      <style>{styles}</style>
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
            <div className="panel-heading">Inputs · Adjust to Model</div>

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
              sublabel="Year-one drawdown"
              value={withdrawal}
              min={10_000}
              max={300_000}
              step={1_000}
              onChange={setWithdrawal}
              format={(v) => `${fmtMoney(v)} (${(v / balance * 100).toFixed(1)}%)`}
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

            <Slider
              label="Expected Return"
              sublabel="Average annual"
              value={returnRate}
              min={0.01}
              max={0.12}
              step={0.005}
              onChange={setReturnRate}
              format={fmtPct}
            />

            <Slider
              label="Annual Volatility"
              sublabel="Standard deviation"
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
                  {fmtPct(sim.successRate)}
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
                  {fmtMoney(sim.percentiles[years].withdrawal)}
                </div>
              </div>
              <div className="stat-cell">
                <div className="stat-label">Median Depletion</div>
                <div className="stat-value">
                  {sim.medianDepletionYear ? `Year ${sim.medianDepletionYear}` : "None"}
                </div>
              </div>
            </div>

            {/* CHART */}
            <div className="chart-section fade">
              <div className="chart-title-row">
                <h2 className="chart-title">Portfolio Trajectory</h2>
              </div>
              <p className="chart-subtitle">
                Shaded bands show the spread of {SIM_RUNS.toLocaleString()} Monte Carlo paths. Outer band, 10th–90th percentile;
                inner band, 25th–75th. The dashed line marks median annual withdrawal, scaled to the right axis.
              </p>

              <div className="chart-wrap">
                <div
                  className={`progress-bar${running ? "" : " done"}`}
                  style={{ width: `${progress * 100}%` }}
                ></div>
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

                  {/* Y gridlines */}
                  {yTicks.map((t, i) => (
                    <g key={i}>
                      <line
                        x1={padL} x2={W - padR}
                        y1={yScale(t)} y2={yScale(t)}
                        stroke="var(--rule)" strokeWidth="0.5"
                        strokeDasharray={i === 0 ? "0" : "2 3"}
                      />
                      <text
                        x={padL - 8} y={yScale(t) + 4}
                        textAnchor="end"
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

                  {/* Right axis (withdrawal) — own ticks + frame */}
                  <line
                    x1={W - padR} x2={W - padR}
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
                          x1={W - padR} x2={W - padR + 4}
                          y1={yScaleW(v)} y2={yScaleW(v)}
                          stroke="var(--withdrawal)"
                          strokeWidth="0.75"
                          opacity="0.6"
                        />
                        <text
                          x={W - padR + 7} y={yScaleW(v) + 3}
                          textAnchor="start"
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

                  {/* Median portfolio line */}
                  <path
                    d={buildPath("p50")}
                    fill="none"
                    stroke="var(--ink)"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />

                  {/* Withdrawal line (dashed, on right axis) */}
                  <path
                    d={sim.percentiles.map((p, i) =>
                      `${i === 0 ? "M" : "L"} ${x(p.year)} ${yScaleW(p.withdrawal)}`
                    ).join(" ")}
                    fill="none"
                    stroke="var(--withdrawal)"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                  />

                  {/* Hover guide */}
                  {hover !== null && (
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
                      <circle cx={x(hover)} cy={yScaleW(hoverData.withdrawal)} r="3" fill="var(--withdrawal)"/>
                    </>
                  )}

                  {/* Axis frame */}
                  <line x1={padL} x2={padL} y1={padT} y2={padT + innerH} stroke="var(--ink)" strokeWidth="1"/>
                  <line x1={padL} x2={W - padR} y1={padT + innerH} y2={padT + innerH} stroke="var(--ink)" strokeWidth="1"/>

                  {/* Axis labels */}
                  <text
                    x={padL} y={padT - 12}
                    fontFamily="JetBrains Mono"
                    fontSize="9"
                    letterSpacing="0.15em"
                    fill="var(--ink-2)"
                  >
                    PORTFOLIO VALUE ($)
                  </text>
                  <text
                    x={W - padR} y={padT - 12}
                    textAnchor="end"
                    fontFamily="JetBrains Mono"
                    fontSize="9"
                    letterSpacing="0.15em"
                    fill="var(--withdrawal)"
                  >
                    WITHDRAWAL ($)
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
                    <div className="tooltip-row">
                      <span>90th</span><span>{fmtMoneyFull(hoverData.p90)}</span>
                    </div>
                    <div className="tooltip-row">
                      <span>75th</span><span>{fmtMoneyFull(hoverData.p75)}</span>
                    </div>
                    <div className="tooltip-row median">
                      <span>Median</span><span>{fmtMoneyFull(hoverData.p50)}</span>
                    </div>
                    <div className="tooltip-row">
                      <span>25th</span><span>{fmtMoneyFull(hoverData.p25)}</span>
                    </div>
                    <div className="tooltip-row">
                      <span>10th</span><span>{fmtMoneyFull(hoverData.p10)}</span>
                    </div>
                    <div className="tooltip-row median">
                      <span>Withdrawal</span><span>{fmtMoneyFull(hoverData.withdrawal)}</span>
                    </div>
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
                    borderTop: "2px dashed var(--withdrawal)",
                    borderBottom: "none",
                    borderLeft: "none",
                    borderRight: "none",
                    height: "0",
                    marginTop: "5px"
                  }}></span>
                  Annual withdrawal (right axis)
                </div>
              </div>
            </div>

            <p className="footer-note">
              Returns are sampled annually from a normal distribution centered on the expected return,
              with the chosen volatility as standard deviation. Past performance does not guarantee future results;
              this model is illustrative, not advisory.
            </p>
            </>}
          </main>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<RetirementSimulator />);