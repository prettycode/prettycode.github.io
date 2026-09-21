const TARGET_SUCCESS_LIMITS = { min: 50, max: 99 };
const RATE_STEP = 0.001;

function formatSuccessChance(rate) {
  if (rate > 0 && rate < 1 && (rate < 0.1 || rate > 0.9)) {
    return fmtOdds(rate);
  }
  const numerator = Math.round(rate * 10);
  const divisor = [10, 5, 2, 1].find((value) => numerator % value === 0);
  return `${numerator / divisor} in ${10 / divisor}`;
}

const { useState, useEffect } = React;

// useState wrapper that persists through UserSettings: initial value comes
// from storage (or the default), and every change writes back. Storage is
// pruned to non-default values inside UserSettings.set, so no extra logic
// here.
function usePersistedState(key, initialize = () => UserSettings.get(key)) {
  const [value, setValue] = useState(initialize);
  useEffect(() => {
    UserSettings.set(key, value);
  }, [key, value]);
  return [value, setValue];
}

// ─── Main Component ─────────────────────────────────────────────────────────
function RetirementSimulator() {
  const [historicalDataOpen, setHistoricalDataOpen] = useState(false);
  const [balance, setBalance] = usePersistedState("balance");
  const [withdrawal, setWithdrawal] = usePersistedState("withdrawal");
  const [withdrawalFrequency, setWithdrawalFrequency] = usePersistedState(
    "withdrawalFrequency",
  );
  const [upfrontYears, setUpfrontYears] = usePersistedState("upfrontYears");
  const [inflationAdjustBucket, setInflationAdjustBucket] = usePersistedState(
    "inflationAdjustBucket",
  );
  const [bucketEarnsTBills, setBucketEarnsTBills] =
    usePersistedState("bucketEarnsTBills");
  const [cagr, setCagr] = usePersistedState("cagr");
  const [volatility, setVolatility] = usePersistedState("volatility");
  const [inflation, setInflation] = usePersistedState("inflation");
  const [currentAge, setCurrentAge] = usePersistedState("currentAge");
  // Reconcile older independent timelines using the saved active mode.
  const [retirementAge, setRetirementAge] = usePersistedState(
    "retirementAge",
    () =>
      UserSettings.get("planningMode") === "ages"
        ? UserSettings.get("retirementAge")
        : currentAge + UserSettings.get("settingsDelay"),
  );
  const [planThroughAge, setPlanThroughAge] = usePersistedState(
    "planThroughAge",
    () => Math.max(UserSettings.get("planThroughAge"), retirementAge + 1),
  );
  const [planningMode, setPlanningMode] = usePersistedState("planningMode");
  const [settingsYears, setSettingsYears] = usePersistedState("settingsYears");
  const settingsDelay = retirementAge - currentAge;
  useEffect(() => {
    UserSettings.set("settingsDelay", settingsDelay);
  }, [settingsDelay]);
  const handleRetirementStartChange = (delay) => {
    const nextRetirementAge = currentAge + delay;
    setRetirementAge(nextRetirementAge);
    setPlanThroughAge((age) => Math.max(age, nextRetirementAge + 1));
  };
  const useAges = planningMode === "ages";
  const years = useAges ? planThroughAge - retirementAge : settingsYears;
  const retirementDelay = settingsDelay;
  const retirementWithdrawal =
    withdrawal * Math.pow(1 + inflation, retirementDelay);
  const [marketAssumptionsOpen, setMarketAssumptionsOpen] = usePersistedState(
    "marketAssumptionsOpen",
  );
  const [advancedOpen, setAdvancedOpen] = usePersistedState("advancedOpen");
  const [showCalendarYears, setShowCalendarYears] =
    usePersistedState("showCalendarYears");

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
  const INITIAL_REGION = "world";
  const INITIAL_SCENARIO = "historical";
  const [lastRegion, setLastRegion] = useState(
    () =>
      matchPreset(
        UserSettings.get("cagr"),
        UserSettings.get("volatility"),
        UserSettings.get("inflation"),
      )?.region ?? INITIAL_REGION,
  );
  const [lastScenario, setLastScenario] = useState(
    () =>
      matchPreset(
        UserSettings.get("cagr"),
        UserSettings.get("volatility"),
        UserSettings.get("inflation"),
      )?.scenario ?? INITIAL_SCENARIO,
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

  const solverRequest = React.useRef(null);
  const [simulationError, setSimulationError] = useState(null);
  const [solverError, setSolverError] = useState(null);
  const [solverResult, setSolverResult] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [sim, setSim] = useState(null);
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(true);
  const [solving, setSolving] = useState(false);
  const [solveProgress, setSolveProgress] = useState(0);
  const [solveFor, setSolveFor] = useState("withdrawal");
  const solvingBalance = solveFor === "balance";
  const solvingDelay = solveFor === "retirementDelay";
  const maxSolverDelay = useAges
    ? planThroughAge - currentAge - 1
    : Math.max(RETIREMENT_DELAY_LIMIT, retirementDelay);
  const [targetSuccessRate, setTargetSuccessRate] =
    usePersistedState("targetSuccessRate");

  // The bucket-* flags are no-ops when only one year is funded (no lump sum is
  // taken). Depending on the *effective* values here keeps a checkbox toggle
  // from triggering a fresh Monte Carlo run with new random samples, which
  // would otherwise jiggle the success rate as pure simulation noise.
  const effectiveInflationAdjustBucket =
    inflationAdjustBucket && Math.min(upfrontYears, years) > 1;
  const effectiveBucketEarnsTBills =
    bucketEarnsTBills && Math.min(upfrontYears, years) > 1;

  // A solver outcome belongs to the assumptions and target it was calculated for.
  const solverSettingsKey = JSON.stringify([
    solveFor,
    balance,
    withdrawal,
    cagr,
    volatility,
    inflation,
    years,
    retirementDelay,
    upfrontYears,
    solvingDelay ? inflationAdjustBucket : effectiveInflationAdjustBucket,
    solvingDelay ? bucketEarnsTBills : effectiveBucketEarnsTBills,
    withdrawalFrequency,
    currentAge,
    planningMode,
    targetSuccessRate,
  ]);
  const currentSolverResult =
    solverResult?.settingsKey === solverSettingsKey ? solverResult : null;

  useEffect(() => () => solverRequest.current?.cancel(), [solverSettingsKey]);

  useEffect(() => {
    setRunning(true);
    setProgress(0);
    setSimulationError(null);
    setSolverError(null);
    let active = true;
    let request;
    const inputs = {
      balance,
      withdrawal,
      cagr,
      volatility,
      inflation,
      years,
      retirementDelay,
      upfrontYears,
      inflationAdjustBucket,
      bucketEarnsTBills,
      withdrawalFrequency,
      currentAge,
      retirementAge,
      planThroughAge,
      planningMode,
    };
    const t = setTimeout(() => {
      request = startSimulation(
        {
          balance,
          withdrawal,
          returnRate: cagrToArithmetic(cagr, volatility),
          volatility,
          inflation,
          years,
          retirementDelay,
          runs: SIM_RUNS,
          upfrontYears,
          inflationAdjustBucket: effectiveInflationAdjustBucket,
          bucketEarnsTBills: effectiveBucketEarnsTBills,
          tBillRealPremium: T_BILL_REAL_PREMIUM,
          monthly: withdrawalFrequency === "monthly",
        },
        (pct) => {
          if (active) {
            setProgress(pct);
          }
        },
      );
      request.promise
        .then((result) => {
          if (!active) {
            return;
          }
          setSim({ ...result, currentAge, inputs });
          setRunning(false);
          setProgress(1);
        })
        .catch((error) => {
          if (!active || error.name === "AbortError") {
            return;
          }
          setSimulationError(
            "The simulation could not finish. Please try again.",
          );
          setRunning(false);
        });
    }, 150);
    return () => {
      clearTimeout(t);
      active = false;
      request?.cancel();
      solverRequest.current?.cancel();
    };
  }, [
    balance,
    withdrawal,
    cagr,
    volatility,
    inflation,
    years,
    retirementDelay,
    upfrontYears,
    effectiveInflationAdjustBucket,
    effectiveBucketEarnsTBills,
    withdrawalFrequency,
    currentAge,
    planningMode,
    retryCount,
  ]);

  // Display the solver estimate without changing the plan inputs.
  const solveForTarget = async () => {
    if (solving || running) {
      return;
    }

    setSolverError(null);
    setSolving(true);
    setSolverResult(null);
    setSolveProgress(0);

    const displayResult = (amount, limit = null) => {
      setSolverResult({
        balance: solvingBalance ? amount : balance,
        withdrawal: solvingBalance || solvingDelay ? withdrawal : amount,
        retirementDelay:
          solvingDelay && amount !== null ? amount : retirementDelay,
        found: amount !== null,
        target: targetSuccessRate,
        settingsKey: solverSettingsKey,
        limit,
      });
    };

    const baseParams = {
      planThroughYears:
        solvingDelay && useAges ? planThroughAge - currentAge : undefined,
      retirementDelay,
      balance,
      withdrawal,
      returnRate: cagrToArithmetic(cagr, volatility),
      volatility,
      inflation,
      years,
      upfrontYears,
      inflationAdjustBucket: solvingDelay
        ? inflationAdjustBucket
        : effectiveInflationAdjustBucket,
      bucketEarnsTBills: solvingDelay
        ? bucketEarnsTBills
        : effectiveBucketEarnsTBills,
      tBillRealPremium: T_BILL_REAL_PREMIUM,
      monthly: withdrawalFrequency === "monthly",
    };

    try {
      const request = startSolver(
        baseParams,
        solveFor,
        targetSuccessRate,
        setSolveProgress,
      );
      solverRequest.current = request;
      const { amount, limit } = await request.promise;
      displayResult(amount, limit);
    } catch (error) {
      if (error.name !== "AbortError") {
        setSolverError("The solver could not finish. Please try again.");
      }
    } finally {
      solverRequest.current = null;
      setSolving(false);
      setSolveProgress(0);
    }
  };

  // Render against the sim we have, not the input slider. A slider change
  // updates `years` synchronously but the worker takes a tick to return new
  // percentiles — using `years` as the loop bound during that gap reads past
  // the end of `sim.percentiles` and crashes with `undefined.p50`.
  const simYears = sim ? sim.percentiles.length - 1 : years;
  const simRetirementDelay = sim ? sim.retirementDelay : retirementDelay;
  const simCurrentAge = sim ? sim.currentAge : currentAge;

  const simInputs = sim
    ? sim.inputs
    : { inflation, balance, withdrawalFrequency, planningMode };
  const simUseAges = simInputs.planningMode === "ages";

  // Derived stats
  const successColor =
    sim && sim.successRate >= 0.9
      ? "#3a7d44"
      : sim && sim.successRate >= 0.7
        ? "#c89a3a"
        : "#a83232";

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
    if (!sim) {
      return null;
    }
    const data = [null];
    for (let y = 1; y <= simYears; y++) {
      const startBalance = sim.percentiles[y - 1]; // entering year y's draw
      const endBalance = sim.percentiles[y]; // after year y's growth
      const intended = sim.percentiles[y].withdrawal;
      // Two ways the synthetic median path hits $0 in year y:
      //   (a) intended draw exceeds the prior median balance — capped;
      //   (b) post-withdrawal balance positive but growth shock takes the
      //       per-year median to $0 by year-end.
      const startDepleted = startBalance.p50 <= intended;
      const endDepleted = endBalance.p50 <= 0;
      data.push({
        year: y,
        startBalance,
        endBalance,
        intended,
        actual: startDepleted ? Math.max(0, startBalance.p50) : intended,
        startDepleted,
        endDepleted,
        depleted: startDepleted || endDepleted,
      });
    }
    return data;
  })();

  // First year the synthetic median path hits $0 — returns the matching
  // yearData record (or null) so callers stay coupled to the same row.
  const medianDepletion = yearData
    ? (yearData.slice(1).find((d) => d.depleted) ?? null)
    : null;

  return (
    <div className="sim-root">
      {historicalDataOpen && (
        <HistoricalDataModal onClose={() => setHistoricalDataOpen(false)} />
      )}
      <div className="sim-inner">
        {/* MASTHEAD */}
        <header className="masthead">
          <h1 className="masthead-title">
            Retirement Simulator<span className="reg"></span>
          </h1>
          <div className="masthead-meta">
            <div className="vol">VOL. I · MONTE CARLO EDITION</div>
            <div>
              {SIM_RUNS.toLocaleString()} SIMULATIONS{" "}
              {useAges
                ? `| AGES ${currentAge}-${planThroughAge}`
                : `| ${years}-YEAR RETIREMENT`}
            </div>
          </div>
        </header>

        <div className="layout">
          {/* SIDEBAR */}
          <aside className="sidebar">
            <div className="panel-heading" style={{ marginBottom: 10 }}>
              {SETTING_LABELS.planningMode}
            </div>
            <div
              className="freq-toggle"
              role="group"
              aria-label={SETTING_LABELS.planningMode}
              style={{ marginBottom: 28 }}
            >
              <button
                type="button"
                className={`freq-btn${useAges ? " active" : ""}`}
                aria-pressed={useAges}
                disabled={solving}
                onClick={() => setPlanningMode("ages")}
              >
                Age
              </button>
              <button
                type="button"
                className={`freq-btn${!useAges ? " active" : ""}`}
                aria-pressed={!useAges}
                disabled={solving}
                onClick={() => setPlanningMode("settings")}
              >
                Duration
              </button>
            </div>
            {useAges && (
              <>
                <div className="panel-heading">Your Retirement Plan</div>
                <Slider
                  label="Current Age"
                  sublabel="Your age today"
                  value={currentAge}
                  min={18}
                  max={retirementAge}
                  step={1}
                  onChange={setCurrentAge}
                  format={(v) => `${v}`}
                  disabled={solving}
                />
                <Slider
                  label="Retirement Age"
                  sublabel="Withdrawals begin at this age"
                  value={retirementAge}
                  min={currentAge}
                  max={planThroughAge - 1}
                  step={1}
                  onChange={setRetirementAge}
                  format={(v) => `${v}`}
                  disabled={solving}
                />
                <Slider
                  label="Plan Through Age"
                  sublabel={`${retirementDelay} years until retirement; ${years} years in retirement`}
                  value={planThroughAge}
                  min={retirementAge + 1}
                  max={Math.max(120, planThroughAge)}
                  step={1}
                  onChange={setPlanThroughAge}
                  format={(v) => `${v}`}
                  disabled={solving}
                />
              </>
            )}
            <div className="panel-heading">Portfolio Settings</div>

            <Slider
              label={SETTING_LABELS.balance}
              sublabel={
                retirementDelay > 0
                  ? "Portfolio value today"
                  : "Portfolio value at retirement"
              }
              value={balance}
              min={AMOUNT_LIMITS.balance.min}
              max={AMOUNT_LIMITS.balance.max}
              step={AMOUNT_LIMITS.balance.step}
              onChange={setBalance}
              format={fmtMoney}
            />

            <Slider
              label={SETTING_LABELS.withdrawal}
              sublabel={
                retirementDelay > 0
                  ? `Today's dollars; starts at ${fmtMoney(retirementWithdrawal)} at retirement, then increases with inflation`
                  : "Today's dollars; increased by rate of inflation each year"
              }
              value={withdrawal}
              min={AMOUNT_LIMITS.withdrawal.min}
              max={AMOUNT_LIMITS.withdrawal.max}
              step={AMOUNT_LIMITS.withdrawal.step}
              onChange={setWithdrawal}
              format={(v) =>
                `${fmtMoney(v)} (${((v / balance) * 100).toFixed(1)}%)`
              }
            />

            <Slider
              label={SETTING_LABELS.upfrontYears}
              sublabel="Lump-sum first withdrawal, in retirement-year dollars"
              value={upfrontYears}
              min={1}
              max={10}
              step={1}
              onChange={setUpfrontYears}
              format={(v) => {
                const wGrow = inflationAdjustBucket ? inflation : 0;
                const disc =
                  bucketEarnsTBills && v > 1
                    ? inflation + T_BILL_REAL_PREMIUM
                    : 0;
                const fundedYears = Math.min(v, years);
                const bucket = bucketSize(
                  retirementWithdrawal,
                  fundedYears,
                  wGrow,
                  disc,
                );
                return `${v} ${v === 1 ? "yr" : "yrs"} (${fmtMoney(bucket)}${v > years ? `; capped to ${fundedYears} ${fundedYears === 1 ? "yr" : "yrs"}` : ""})`;
              }}
            />

            {!useAges && (
              <>
                <Slider
                  label="Retirement Duration"
                  sublabel="Years in retirement, excluding any delay"
                  value={settingsYears}
                  min={1}
                  max={Math.max(50, settingsYears)}
                  step={1}
                  onChange={setSettingsYears}
                  format={(v) => `${v} yrs`}
                  disabled={solving}
                />

                <Slider
                  label="Retirement Start"
                  sublabel="Start now or let the portfolio grow for longer first."
                  value={retirementDelay}
                  min={0}
                  max={Math.max(RETIREMENT_DELAY_LIMIT, settingsDelay)}
                  step={1}
                  onChange={handleRetirementStartChange}
                  disabled={solving}
                  format={(v) =>
                    v === 0
                      ? "Immediately"
                      : `Wait ${v} ${v === 1 ? "year" : "years"}`
                  }
                />
              </>
            )}

            <details
              className="panel-section"
              open={marketAssumptionsOpen}
              onToggle={(e) => setMarketAssumptionsOpen(e.currentTarget.open)}
            >
              <summary className="panel-heading">Market Assumptions</summary>

              <Slider
                label={SETTING_LABELS.cagr}
                sublabel="Portfolio's Compound annual growth rate"
                value={cagr}
                min={0.01}
                max={0.12}
                step={RATE_STEP}
                onChange={setCagr}
                format={fmtPct}
              />

              <Slider
                label={SETTING_LABELS.volatility}
                sublabel="Portfolio's Standard deviation"
                value={volatility}
                min={0.02}
                max={0.3}
                step={RATE_STEP}
                onChange={setVolatility}
                format={fmtPct}
              />

              <Slider
                label={SETTING_LABELS.inflation}
                sublabel="Cost-of-living growth"
                value={inflation}
                min={0}
                max={0.08}
                step={RATE_STEP}
                onChange={setInflation}
                format={fmtPct}
              />

              <div style={{ marginBottom: 22 }}>
                <div className="toggle-label">Historical Presets</div>
                <div className="toggle-sub" style={{ marginBottom: 8 }}>
                  Apply {SETTING_LABELS.cagr}, {SETTING_LABELS.volatility}, and{" "}
                  {SETTING_LABELS.inflation} from historical data.{" "}
                  <button
                    type="button"
                    className="presets-source-inline"
                    aria-haspopup="dialog"
                    aria-label="View historical data"
                    onClick={() => setHistoricalDataOpen(true)}
                  >
                    ↗
                  </button>
                </div>
                <div className="freq-toggle" style={{ marginBottom: 6 }}>
                  <button
                    type="button"
                    className={`freq-btn${activePreset?.region === "us" ? " active" : ""}`}
                    onClick={() => selectRegion("us")}
                  >
                    {PRESET_LABELS.us}
                  </button>
                  <button
                    type="button"
                    className={`freq-btn${activePreset?.region === "world" ? " active" : ""}`}
                    onClick={() => selectRegion("world")}
                  >
                    {PRESET_LABELS.world}
                  </button>
                </div>
                <div className="freq-toggle">
                  <button
                    type="button"
                    className={`freq-btn${activePreset?.scenario === "historical" ? " active" : ""}`}
                    onClick={() => selectScenario("historical")}
                  >
                    {PRESET_LABELS.historical}
                  </button>
                  <button
                    type="button"
                    className={`freq-btn${activePreset?.scenario === "worst" ? " active" : ""}`}
                    onClick={() => selectScenario("worst")}
                  >
                    {PRESET_LABELS.worst}
                  </button>
                </div>
              </div>
            </details>

            <details
              className="panel-section"
              open={advancedOpen}
              onToggle={(e) => setAdvancedOpen(e.currentTarget.open)}
            >
              <summary className="panel-heading">Advanced</summary>
              <div className="advanced-body">
                <div
                  className="adv-freq"
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 9,
                    marginBottom: 14,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 12,
                      flexShrink: 0,
                      textAlign: "center",
                      lineHeight: "14px",
                      color: "var(--accent)",
                      fontWeight: 700,
                    }}
                  >
                    •
                  </span>
                  <div style={{ flex: 1 }}>
                    <div className="toggle-label">Withdrawal Frequency</div>
                    <div className="toggle-sub" style={{ marginBottom: 8 }}>
                      When draws are taken from the portfolio.
                    </div>
                    <div className="freq-toggle">
                      <button
                        type="button"
                        className={`freq-btn${withdrawalFrequency === "annual" ? " active" : ""}`}
                        onClick={() => setWithdrawalFrequency("annual")}
                      >
                        Annual
                      </button>
                      <button
                        type="button"
                        className={`freq-btn${withdrawalFrequency === "monthly" ? " active" : ""}`}
                        onClick={() => setWithdrawalFrequency("monthly")}
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
                    <div className="toggle-label">
                      {SETTING_LABELS.upfrontYears} is inflation-adjusted
                    </div>
                    <div className="toggle-sub">
                      Increase cash bucket by inflation for years &gt; 1.
                    </div>
                  </div>
                </label>
                <label className="toggle-row" style={{ marginTop: 12 }}>
                  <input
                    type="checkbox"
                    checked={bucketEarnsTBills}
                    onChange={(e) => setBucketEarnsTBills(e.target.checked)}
                  />
                  <div>
                    <div className="toggle-label">
                      {SETTING_LABELS.upfrontYears} earns T-Bills
                    </div>
                    <div className="toggle-sub">
                      Hold cash beyond 1 year in T-Bills earning{" "}
                      {fmtPct(inflation + T_BILL_REAL_PREMIUM)} (inflation +{" "}
                      {fmtPct(T_BILL_REAL_PREMIUM)} historical real return).
                    </div>
                  </div>
                </label>
                <div className="settings-mgmt">
                  <div className="settings-mgmt-heading">Saved Settings</div>
                  <div className="settings-mgmt-sub">
                    Sidebar values are remembered in your browser between
                    visits.
                  </div>
                  <button
                    type="button"
                    className="clear-storage-btn"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Reset all sidebar settings to defaults? This will reload the page.",
                        )
                      ) {
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
            {simulationError && (
              <div role="alert">
                <p>{simulationError}</p>
                <button
                  type="button"
                  onClick={() => setRetryCount((count) => count + 1)}
                >
                  Retry simulation
                </button>
              </div>
            )}
            {!sim && running && (
              <div className="initial-loading">
                <div className="progress-track">
                  <div
                    className="progress-bar"
                    style={{ width: `${progress * 100}%` }}
                  ></div>
                </div>
                <div className="initial-loading-label">
                  Running {SIM_RUNS.toLocaleString()} simulations…
                </div>
              </div>
            )}
            {sim && (
              <>
                {/* STATS */}
                <div className="stats-row fade">
                  <div className="stat-cell">
                    <div className="stat-label">
                      {simUseAges
                        ? `Success through age ${simCurrentAge + simYears}`
                        : "Strategy Success Rate"}
                    </div>
                    <div
                      className="stat-value success"
                      style={{ color: successColor }}
                    >
                      {`${(sim.successRate * 100).toFixed(2)}%`}
                    </div>
                    <div className="stat-sub">
                      ≈ {formatSuccessChance(sim.successRate)} chance
                    </div>
                  </div>
                  <div className="stat-cell">
                    <div className="stat-label">
                      {simUseAges
                        ? `Balance at age ${simCurrentAge + simYears} (Median)`
                        : "Ending Portfolio Balance (Median)"}
                    </div>
                    <div className="stat-value">
                      {fmtMoney(sim.medianEnding)}
                    </div>
                    <div className="stat-sub">
                      ≈{" "}
                      {fmtMoney(
                        sim.medianEnding /
                          Math.pow(1 + simInputs.inflation, simYears),
                      )}{" "}
                      today
                    </div>
                  </div>
                  <div className="stat-cell">
                    <div className="stat-label">
                      Last {SETTING_LABELS.withdrawal} (Median)
                    </div>
                    <div className="stat-value">
                      {fmtMoney((medianDepletion ?? yearData[simYears]).actual)}
                    </div>
                    <div className="stat-sub">
                      ≈{" "}
                      {fmtMoney(
                        (medianDepletion ?? yearData[simYears]).actual /
                          Math.pow(
                            1 + simInputs.inflation,
                            (medianDepletion ?? yearData[simYears]).year - 1,
                          ),
                      )}{" "}
                      today
                    </div>
                  </div>
                  <div className="stat-cell">
                    <div className="stat-label">
                      {simUseAges
                        ? "Depletion Age (Median)"
                        : "Depletion Year (Median)"}
                    </div>
                    <div className="stat-value">
                      {medianDepletion
                        ? simUseAges
                          ? `Age ${simCurrentAge + medianDepletion.year - (medianDepletion.startDepleted ? 1 : 0)}`
                          : medianDepletion.year <= simRetirementDelay
                            ? `Before retirement (year ${medianDepletion.year})`
                            : `Year ${medianDepletion.year - simRetirementDelay}`
                        : "None"}
                    </div>
                  </div>
                  <div className="stat-cell">
                    <div className="stat-label">Total Drawn</div>
                    <div className="stat-value">
                      {fmtMoney(
                        yearData.slice(1).reduce((sum, d) => sum + d.actual, 0),
                      )}
                    </div>
                    <div className="stat-sub">
                      ≈{" "}
                      {fmtMoney(
                        yearData
                          .slice(1)
                          .reduce(
                            (sum, d) =>
                              sum +
                              d.actual /
                                Math.pow(1 + simInputs.inflation, d.year - 1),
                            0,
                          ),
                      )}{" "}
                      today
                    </div>
                  </div>
                </div>

                {/* CHART */}
                <PortfolioChart
                  yearData={yearData}
                  retirementBalance={sim.percentiles[0]}
                  running={running}
                  progress={progress}
                  balance={simInputs.balance}
                  withdrawalFrequency={simInputs.withdrawalFrequency}
                  medianDepletion={medianDepletion}
                  simYears={simYears}
                  showCalendarYears={showCalendarYears}
                  onShowCalendarYearsChange={setShowCalendarYears}
                  retirementDelay={simRetirementDelay}
                  currentAge={simUseAges ? simCurrentAge : undefined}
                />

                <OutcomeOdds
                  yearData={yearData}
                  simYears={simYears}
                  successRate={sim.successRate}
                  totalRuns={sim.runs}
                  retirementDelay={simRetirementDelay}
                  currentAge={simUseAges ? simCurrentAge : undefined}
                  inflation={simInputs.inflation}
                />

                {/* SOLVER */}
                <section
                  className="solver-panel fade"
                  aria-labelledby="solver-title"
                >
                  <div className="solver-intro">
                    <h2 id="solver-title">Find Your Numbers</h2>
                    <p id="solver-description">
                      Choose a question, then set the target success rate for
                      your money lasting through retirement.
                    </p>
                  </div>
                  <fieldset
                    className="solver-mode"
                    aria-labelledby="solver-title"
                    disabled={solving}
                  >
                    <div className="solver-options">
                      {[
                        {
                          value: "withdrawal",
                          question: "How much can I withdraw?",
                          description:
                            "Find the highest annual withdrawal for my target success rate.",
                          fixed: `Starting with ${fmtMoneyFull(balance)} ${retirementDelay > 0 ? "today" : "at retirement"}`,
                        },
                        {
                          value: "balance",
                          question: "How much do I need saved?",
                          description: `Find the lowest balance ${retirementDelay > 0 ? "today" : "at retirement"} for my target success rate.`,
                          fixed: `Withdrawing ${fmtMoneyFull(withdrawal)} / year in today's dollars`,
                        },
                        {
                          value: "retirementDelay",
                          question: "When can I retire?",
                          description:
                            "Find the fewest years from today to retirement for my target success rate if I stop saving.",
                          fixed: `Starting with ${fmtMoneyFull(balance)} today; withdrawing ${fmtMoneyFull(withdrawal)} / year in today's dollars at retirement`,
                        },
                      ].map(({ value, question, description, fixed }) => (
                        <label key={value} className="solver-option">
                          <input
                            type="radio"
                            name="solver-goal"
                            value={value}
                            checked={solveFor === value}
                            aria-labelledby={`solver-${value}-question`}
                            aria-describedby={`solver-${value}-description solver-${value}-fixed`}
                            onChange={() => {
                              setSolveFor(value);
                              setSolverError(null);
                              setSolverResult(null);
                            }}
                          />
                          <span className="solver-option-copy">
                            <span
                              className="solver-option-title"
                              id={`solver-${value}-question`}
                            >
                              {question}
                            </span>
                            <span id={`solver-${value}-description`}>
                              {description}
                            </span>
                            <span
                              className="solver-option-fixed"
                              id={`solver-${value}-fixed`}
                            >
                              {fixed}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div className="solver-controls">
                    <div className="solver-target">
                      <div className="solver-target-heading">
                        <label htmlFor="solver-target">
                          <strong>Target success</strong> rate of money lasting{" "}
                          {useAges
                            ? solvingDelay
                              ? `through age ${planThroughAge}`
                              : `from age ${retirementAge} through age ${planThroughAge}`
                            : `for ${years} years in retirement`}
                        </label>
                        <output htmlFor="solver-target">
                          {targetSuccessRate}%
                        </output>
                      </div>
                      <input
                        id="solver-target"
                        type="range"
                        min={TARGET_SUCCESS_LIMITS.min}
                        max={TARGET_SUCCESS_LIMITS.max}
                        step={1}
                        value={targetSuccessRate}
                        aria-valuetext={`${targetSuccessRate}% chance of money lasting`}
                        onChange={(e) => {
                          setTargetSuccessRate(parseInt(e.target.value, 10));
                          setSolverError(null);
                          setSolverResult(null);
                        }}
                        style={{
                          "--pct": `${((targetSuccessRate - TARGET_SUCCESS_LIMITS.min) / (TARGET_SUCCESS_LIMITS.max - TARGET_SUCCESS_LIMITS.min)) * 100}%`,
                        }}
                        disabled={solving}
                      />
                      <div className="solver-range-labels" aria-hidden="true">
                        <span>{TARGET_SUCCESS_LIMITS.min}%</span>
                        <span>{TARGET_SUCCESS_LIMITS.max}%</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="solve-btn"
                      aria-describedby="solver-note"
                      onClick={solveForTarget}
                      disabled={solving || running}
                    >
                      {solving ? "Calculating..." : "Calculate"}
                    </button>
                  </div>
                  <p className="solver-note" id="solver-note">
                    Results are shown here without changing your plan.{" "}
                    {solvingDelay
                      ? `Checks 0 to ${maxSolverDelay} years from today in one-year increments to estimate ${useAges ? "Retirement Age" : "Retirement Start"}. While you wait, your portfolio can grow or shrink based on your selected market assumptions. No savings are added or withdrawals taken before retirement. ${useAges ? `Plan Through Age stays at ${planThroughAge}.` : `Retirement Duration stays at ${years} years.`} Withdrawals account for inflation while you wait.`
                      : solvingBalance
                        ? `Estimates ${SETTING_LABELS.balance} ${retirementDelay > 0 ? "today" : "at retirement"} in ${fmtMoneyFull(AMOUNT_LIMITS.balance.step)} increments (${fmtMoneyFull(AMOUNT_LIMITS.balance.min)}–${fmtMoneyFull(AMOUNT_LIMITS.balance.max)}). ${SETTING_LABELS.withdrawal} stays fixed.`
                        : `Estimates ${SETTING_LABELS.withdrawal} in ${fmtMoneyFull(AMOUNT_LIMITS.withdrawal.step)} increments (${fmtMoneyFull(AMOUNT_LIMITS.withdrawal.min)}–${fmtMoneyFull(AMOUNT_LIMITS.withdrawal.max)}). ${SETTING_LABELS.balance} stays fixed.`}
                  </p>
                  {(solving || currentSolverResult || running) && (
                    <div
                      className="solver-feedback"
                      role="status"
                      aria-live="polite"
                    >
                      {solving ? (
                        <>
                          <span>
                            Finding{" "}
                            {solvingDelay
                              ? "your retirement start"
                              : solvingBalance
                                ? SETTING_LABELS.balance.toLowerCase()
                                : SETTING_LABELS.withdrawal.toLowerCase()}{" "}
                            for your {targetSuccessRate}% target
                          </span>
                          <progress
                            aria-label={
                              solvingDelay
                                ? "Retirement start calculation"
                                : solvingBalance
                                  ? `${SETTING_LABELS.balance} calculation`
                                  : `${SETTING_LABELS.withdrawal} calculation`
                            }
                            value={solveProgress}
                            max={1}
                          />
                        </>
                      ) : currentSolverResult ? (
                        <>
                          <strong>
                            {solvingDelay
                              ? !currentSolverResult.found
                                ? "Target not reached"
                                : currentSolverResult.retirementDelay === 0
                                  ? "You can retire now"
                                  : `Retire in ${currentSolverResult.retirementDelay} ${currentSolverResult.retirementDelay === 1 ? "year" : "years"}${useAges ? `, at age ${currentAge + currentSolverResult.retirementDelay}` : ""}`
                              : solvingBalance
                                ? `${fmtMoneyFull(currentSolverResult.balance)} ${SETTING_LABELS.balance.toLowerCase()}`
                                : `${fmtMoneyFull(currentSolverResult.withdrawal)} / year`}
                          </strong>
                          <span>
                            {solvingDelay
                              ? !currentSolverResult.found
                                ? `No retirement start within 0 to ${maxSolverDelay} years met your ${currentSolverResult.target}% target without further savings. Your retirement start is unchanged.`
                                : `Earliest whole-year retirement start from today meeting your ${currentSolverResult.target}% target without further savings. The simulated success rate may vary slightly.`
                              : solvingBalance
                                ? currentSolverResult.limit === "minimum"
                                  ? `The ${fmtMoneyFull(AMOUNT_LIMITS.balance.min)} search minimum meets your ${currentSolverResult.target}% target. Lower balances have not been checked.`
                                  : currentSolverResult.limit === "maximum"
                                    ? `Your ${currentSolverResult.target}% target could not be reached within the ${fmtMoneyFull(AMOUNT_LIMITS.balance.min)} to ${fmtMoneyFull(AMOUNT_LIMITS.balance.max)} range. The maximum balance is shown.`
                                    : `Calculated for your ${currentSolverResult.target}% target. The simulated success rate may vary slightly.`
                                : currentSolverResult.limit === "minimum"
                                  ? `Your ${currentSolverResult.target}% target could not be reached within the ${fmtMoneyFull(AMOUNT_LIMITS.withdrawal.min)} to ${fmtMoneyFull(AMOUNT_LIMITS.withdrawal.max)} range. The minimum withdrawal is shown.`
                                  : currentSolverResult.limit === "maximum"
                                    ? `The ${fmtMoneyFull(AMOUNT_LIMITS.withdrawal.max)} search limit meets your ${currentSolverResult.target}% target. Higher withdrawals have not been checked.`
                                    : `Calculated for your ${currentSolverResult.target}% target. The simulated success rate may vary slightly.`}
                            {running && " Updating your results..."}
                          </span>
                        </>
                      ) : (
                        running && (
                          <span>
                            Updating your plan before calculating{" "}
                            {solvingDelay
                              ? "your retirement start"
                              : solvingBalance
                                ? `your ${SETTING_LABELS.balance.toLowerCase()}`
                                : `your ${SETTING_LABELS.withdrawal.toLowerCase()}`}
                            ...
                          </span>
                        )
                      )}
                    </div>
                  )}
                  {solverError && (
                    <p className="solver-error" role="alert">
                      {solverError}
                    </p>
                  )}
                </section>

                <PlanSchedule
                  progress={progress}
                  yearData={yearData}
                  medianDepletion={medianDepletion}
                  retirementDelay={simRetirementDelay}
                  currentAge={simUseAges ? simCurrentAge : undefined}
                  running={running}
                />

                <div className="footer-note">
                  <p>
                    {simInputs.withdrawalFrequency === "monthly"
                      ? "Returns are sampled monthly, with the annual mean and volatility rescaled so twelve compounded months match the annual factor's mean and variance."
                      : "Returns are sampled annually from a normal distribution; the input CAGR is converted to the per-year arithmetic mean by adding back the variance drag (≈ σ²/2), so the long-run geometric mean of paths tracks the chosen CAGR."}
                  </p>
                  <p>
                    Past performance does not guarantee future results; this
                    model is illustrative, not advisory.
                  </p>
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function HistoricalDataModal({ onClose }) {
  const dialogRef = React.useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="historical-modal"
      aria-labelledby="historical-data-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target !== event.currentTarget) {
          return;
        }
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        ) {
          onClose();
        }
      }}
    >
      <button
        type="button"
        className="historical-modal-close"
        onClick={onClose}
        autoFocus
        aria-label="Close historical data"
      >
        Close
      </button>
      <h2 id="historical-data-title">
        Historical Stock Market &amp; Inflation Data
      </h2>
      <p className="subtitle">
        Nominal total returns (including dividends). All figures annualized.
      </p>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Metric</th>
              <th scope="col">Time Frame</th>
              <th scope="col">Full-Period Value</th>
              <th scope="col">{PRESET_LABELS.worst} Period</th>
              <th scope="col">{PRESET_LABELS.worst} Value</th>
            </tr>
          </thead>
          <tbody>
            <tr className="section-header">
              <td colSpan="5">Returns</td>
            </tr>
            <tr>
              <td>
                {SETTING_LABELS.cagr} — {PRESET_LABELS.us} Stocks
              </td>
              <td className="period-col">1871–2024</td>
              <td>{fmtPct(MARKET_PRESETS.us.historical.cagr)}</td>
              <td className="period-col">1903–1932</td>
              <td>{fmtPct(MARKET_PRESETS.us.worst.cagr)}</td>
            </tr>
            <tr>
              <td>
                {SETTING_LABELS.cagr} — {PRESET_LABELS.world} Stocks
              </td>
              <td className="period-col">1900–2024</td>
              <td>{fmtPct(MARKET_PRESETS.world.historical.cagr)}</td>
              <td className="period-col">~1914–1944</td>
              <td>~{fmtPct(MARKET_PRESETS.world.worst.cagr)}</td>
            </tr>
            <tr className="section-header">
              <td colSpan="5">Volatility</td>
            </tr>
            <tr>
              <td>
                {SETTING_LABELS.volatility} — {PRESET_LABELS.us} Stocks
              </td>
              <td className="period-col">1926–2024</td>
              <td>{fmtPct(MARKET_PRESETS.us.historical.volatility)}</td>
              <td className="period-col">~1925–1955</td>
              <td>~{fmtPct(MARKET_PRESETS.us.worst.volatility, 0)}</td>
            </tr>
            <tr>
              <td>
                {SETTING_LABELS.volatility} — {PRESET_LABELS.world} Stocks
              </td>
              <td className="period-col">1900–2024</td>
              <td>{fmtPct(MARKET_PRESETS.world.historical.volatility)}</td>
              <td className="period-col">~1914–1944</td>
              <td>~{fmtPct(MARKET_PRESETS.world.worst.volatility, 0)}</td>
            </tr>
            <tr className="section-header">
              <td colSpan="5">Inflation</td>
            </tr>
            <tr>
              <td>
                {PRESET_LABELS.us} CPI {SETTING_LABELS.inflation}
              </td>
              <td className="period-col">1900–2024</td>
              <td>{fmtPct(MARKET_PRESETS.us.historical.inflation)}</td>
              <td className="period-col">~1950–1980</td>
              <td>~{fmtPct(MARKET_PRESETS.us.worst.inflation)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="footnotes">
        <strong>Sources:</strong> UBS Global Investment Returns Yearbook 2025
        (Dimson, Marsh &amp; Staunton); Ibbotson/Morningstar SBBI data; Shiller
        CAPE dataset; NYU Stern historical returns; BLS CPI data.
        <br />
        <br />
        <strong>Notes:</strong> U.S. Stocks = S&amp;P 500 and predecessor
        indices. World Stocks = DMS global equity index (23–35 countries,
        cap-weighted). "~" prefix indicates an approximate figure where precise
        rolling 30-year data for the global index is less granular than for U.S.
        data. Volatility is the annualized standard deviation of nominal
        returns. The world volatility figure of{" "}
        {fmtPct(MARKET_PRESETS.world.historical.volatility)} reflects the
        diversified index, which benefits from cross-country correlation &lt; 1.
      </div>
      <div className="source-tag">Nominal · Total Return · Annualized</div>
    </dialog>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <RetirementSimulator />,
);
