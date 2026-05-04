const { useState, useEffect } = React;

// useState wrapper that persists through UserSettings: initial value comes
// from storage (or the default), and every change writes back. Storage is
// pruned to non-default values inside UserSettings.set, so no extra logic
// here.
function usePersistedState(key) {
  const [value, setValue] = useState(() => UserSettings.get(key));
  useEffect(() => { UserSettings.set(key, value); }, [key, value]);
  return [value, setValue];
}

// ─── Main Component ─────────────────────────────────────────────────────────
function RetirementSimulator() {
  const [balance, setBalance] = usePersistedState('balance');
  const [withdrawal, setWithdrawal] = usePersistedState('withdrawal');
  const [withdrawalFrequency, setWithdrawalFrequency] = usePersistedState('withdrawalFrequency');
  const [upfrontYears, setUpfrontYears] = usePersistedState('upfrontYears');
  const [inflationAdjustBucket, setInflationAdjustBucket] = usePersistedState('inflationAdjustBucket');
  const [bucketEarnsTBills, setBucketEarnsTBills] = usePersistedState('bucketEarnsTBills');
  const [cagr, setCagr] = usePersistedState('cagr');
  const [volatility, setVolatility] = usePersistedState('volatility');
  const [inflation, setInflation] = usePersistedState('inflation');
  const [years, setYears] = usePersistedState('years');
  const [advancedOpen, setAdvancedOpen] = usePersistedState('advancedOpen');

  // Reverse-lookup (cagr, volatility, inflation) → preset cell. Used both
  // for the active-toggle highlight and for seeding lastRegion/lastScenario
  // from the persisted market values.
  const matchPreset = (c, v, i) => {
    for (const region of Object.keys(MARKET_PRESETS)) {
      for (const scenario of Object.keys(MARKET_PRESETS[region])) {
        const p = MARKET_PRESETS[region][scenario];
        if (p.cagr === c && p.volatility === v && p.inflation === i) {
          return { region, scenario };
        }
      }
    }
    return null;
  };

  // Last-clicked axis values, used so a single button click can apply a full
  // (region × scenario) combo. The active toggle state below is *derived* from
  // the current slider values, so manual slider drags clear both highlights.
  // Seeded from whatever preset the persisted market values match (if any) so
  // the orthogonal axis composes naturally on the next click after a reload.
  const INITIAL_REGION = 'world';
  const INITIAL_SCENARIO = 'historical';
  const [lastRegion, setLastRegion] = useState(() =>
    matchPreset(UserSettings.get('cagr'), UserSettings.get('volatility'), UserSettings.get('inflation'))?.region ?? INITIAL_REGION
  );
  const [lastScenario, setLastScenario] = useState(() =>
    matchPreset(UserSettings.get('cagr'), UserSettings.get('volatility'), UserSettings.get('inflation'))?.scenario ?? INITIAL_SCENARIO
  );

  const activePreset = matchPreset(cagr, volatility, inflation);

  const applyMarketPreset = (region, scenario) => {
    const p = MARKET_PRESETS[region][scenario];
    setCagr(p.cagr);
    setVolatility(p.volatility);
    setInflation(p.inflation);
  };

  const selectRegion = (r) => {
    setLastRegion(r);
    applyMarketPreset(r, lastScenario);
  };

  const selectScenario = (s) => {
    setLastScenario(s);
    applyMarketPreset(lastRegion, s);
  };

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

  // Render against the sim we have, not the input slider. A slider change
  // updates `years` synchronously but the worker takes a tick to return new
  // percentiles — using `years` as the loop bound during that gap reads past
  // the end of `sim.percentiles` and crashes with `undefined.p50`.
  const simYears = sim ? sim.percentiles.length - 1 : years;

  // Derived stats
  const successColor = sim && sim.successRate >= 0.9 ? "#3a7d44" : sim && sim.successRate >= 0.7 ? "#c89a3a" : "#a83232";

  // ─── Canonical per-year dataset ─────────────────────────────────────────
  // Single source of truth for every UI element — stat-cells, chart lines,
  // lollipops, hover tooltip. Direct sim.percentiles access in renderers is
  // how the chart and stat-cells drifted out of sync (the prior bug had
  // medianDepletion computed one way and the chart's synthetic step-line
  // another). yearData[y] is the year-y record, 1-indexed; year 0 is unused.
  // The chart renders year y's lollipop at x(y-1) and labels that column
  // "Year y" in its tooltip, so any "Year y" we display in a stat-cell
  // points at the same chart column the user is looking at.
  const yearData = (() => {
    if (!sim) return null;
    const data = [null];
    for (let y = 1; y <= simYears; y++) {
      const startBalance = sim.percentiles[y - 1]; // entering year y's draw
      const endBalance   = sim.percentiles[y];     // after year y's growth
      const intended     = sim.percentiles[y].withdrawal;
      // Two ways the synthetic median path hits $0 in year y:
      //   (a) intended draw exceeds the prior median balance — capped;
      //   (b) post-withdrawal balance positive but growth shock takes the
      //       per-year median to $0 by year-end.
      const startDepleted = startBalance.p50 <= intended;
      const endDepleted   = endBalance.p50 <= 0;
      data.push({
        year: y,
        startBalance, endBalance, intended,
        actual: startDepleted ? Math.max(0, startBalance.p50) : intended,
        startDepleted, endDepleted,
        depleted: startDepleted || endDepleted,
      });
    }
    return data;
  })();

  // First year the synthetic median path hits $0 — returns the matching
  // yearData record (or null) so callers stay coupled to the same row.
  const medianDepletion = yearData
    ? yearData.slice(1).find(d => d.depleted) ?? null
    : null;

  return (
    <div className="sim-root">
      <div className="sim-inner">
        {/* MASTHEAD */}
        <header className="masthead">
          <h1 className="masthead-title">
            Retirement Simulator<span className="reg"></span>
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
              step={0.001}
              onChange={setCagr}
              format={fmtPct}
            />

            <Slider
              label="Annual Volatility"
              sublabel="Portfolio's Standard deviation"
              value={volatility}
              min={0.02}
              max={0.30}
              step={0.001}
              onChange={setVolatility}
              format={fmtPct}
            />

            <Slider
              label="Inflation Rate"
              sublabel="Cost-of-living growth"
              value={inflation}
              min={0}
              max={0.08}
              step={0.001}
              onChange={setInflation}
              format={fmtPct}
            />

            <details
              className="advanced"
              open={advancedOpen}
              onToggle={(e) => setAdvancedOpen(e.currentTarget.open)}
            >
              <summary>Advanced</summary>
              <div className="advanced-body">
                <div className="adv-freq" style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 14 }}>
                  <span aria-hidden="true" style={{ width: 12, flexShrink: 0, textAlign: 'center', lineHeight: '14px', color: 'var(--accent)', fontWeight: 700 }}>•</span>
                  <div style={{ flex: 1 }}>
                    <div className="toggle-label">Withdrawal Frequency</div>
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
                <div className="adv-freq" style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 14 }}>
                  <span aria-hidden="true" style={{ width: 12, flexShrink: 0, textAlign: 'center', lineHeight: '14px', color: 'var(--accent)', fontWeight: 700 }}>•</span>
                  <div style={{ flex: 1 }}>
                    <div className="toggle-label">Market Assumptions</div>
                    <div className="toggle-sub" style={{ marginBottom: 8 }}>
                      Apply CAGR, volatility, and inflation from historical data.{' '}
                      <a
                        className="presets-source-inline"
                        href="Historical-Stock-Market-And-Inflation-Data.html"
                        target="_blank"
                        rel="noopener"
                      >
                        ↗
                      </a>
                    </div>
                    <div className="freq-toggle" style={{ marginBottom: 6 }}>
                      <button
                        type="button"
                        className={`freq-btn${activePreset?.region === 'us' ? ' active' : ''}`}
                        onClick={() => selectRegion('us')}
                      >
                        U.S.
                      </button>
                      <button
                        type="button"
                        className={`freq-btn${activePreset?.region === 'world' ? ' active' : ''}`}
                        onClick={() => selectRegion('world')}
                      >
                        World
                      </button>
                    </div>
                    <div className="freq-toggle">
                      <button
                        type="button"
                        className={`freq-btn${activePreset?.scenario === 'historical' ? ' active' : ''}`}
                        onClick={() => selectScenario('historical')}
                      >
                        Historical
                      </button>
                      <button
                        type="button"
                        className={`freq-btn${activePreset?.scenario === 'worst' ? ' active' : ''}`}
                        onClick={() => selectScenario('worst')}
                      >
                        Worst 30-Yr
                      </button>
                    </div>
                  </div>
                </div>
                <div className="settings-mgmt">
                  <div className="settings-mgmt-heading">Saved Settings</div>
                  <div className="settings-mgmt-sub">
                    Sidebar values are remembered in your browser between visits.
                  </div>
                  <button
                    type="button"
                    className="clear-storage-btn"
                    onClick={() => {
                      if (window.confirm('Reset all sidebar settings to defaults? This will reload the page.')) {
                        UserSettings.clear();
                        window.location.reload();
                      }
                    }}
                  >
                    Reset to Defaults
                  </button>
                </div>
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
                <div className="stat-label">Strategy Success Rate</div>
                <div className="stat-value success" style={{ color: successColor }}>
                  {`${(sim.successRate * 100).toFixed(2)}%`}
                </div>
              </div>
              <div className="stat-cell">
                <div className="stat-label">Ending Portfolio Balance (Median)</div>
                <div className="stat-value">{fmtMoney(sim.medianEnding)}</div>
                <div className="stat-sub">
                  ≈ {fmtMoney(sim.medianEnding / Math.pow(1 + inflation, simYears))} today
                </div>
              </div>
              <div className="stat-cell">
                <div className="stat-label">Last Annual Withdrawal (Median)</div>
                <div className="stat-value">
                  {fmtMoney((medianDepletion ?? yearData[simYears]).actual)}
                </div>
              </div>
              <div className="stat-cell">
                <div className="stat-label">Depletion (Median) During</div>
                <div className="stat-value">
                  {medianDepletion ? `Year ${medianDepletion.year}` : "None"}
                </div>
              </div>
              <div className="stat-cell">
                <div className="stat-label">Total Drawn</div>
                <div className="stat-value">
                  {fmtMoney(yearData.slice(1).reduce((sum, d) => sum + d.actual, 0))}
                </div>
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
            <PortfolioChart
              yearData={yearData}
              retirementBalance={sim.percentiles[0]}
              running={running}
              progress={progress}
              balance={balance}
              withdrawalFrequency={withdrawalFrequency}
              medianDepletion={medianDepletion}
              simYears={simYears}
            />

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