const TARGET_SUCCESS_LIMITS = { min: 50, max: 99 };
const RATE_STEP = 0.001;
const MAX_PERSON_AGE = 120;

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
  const [withdrawal, setWithdrawal] = usePersistedState("withdrawal", () =>
    Math.min(UserSettings.get("withdrawal"), balance),
  );
  const [savedUpfrontYears, setUpfrontYears] =
    usePersistedState("upfrontYears");
  const [cagr, setCagr] = usePersistedState("cagr");
  const [volatility, setVolatility] = usePersistedState("volatility");
  const [inflation, setInflation] = usePersistedState("inflation");
  const [currentAge, setCurrentAge] = usePersistedState("currentAge");
  const [savedRetirementAge, setRetirementAge] =
    usePersistedState("retirementAge");
  const [savedPlanThroughAge, setPlanThroughAge] =
    usePersistedState("planThroughAge");
  // Keep the timeline valid immediately, including when restoring saved ages.
  const retirementAge = Math.max(savedRetirementAge, currentAge);
  const planThroughAge = Math.max(savedPlanThroughAge, retirementAge + 1);
  useEffect(() => {
    setRetirementAge(retirementAge);
  }, [retirementAge]);
  useEffect(() => {
    setPlanThroughAge(planThroughAge);
  }, [planThroughAge]);
  const years = planThroughAge - retirementAge;
  const retirementDelay = retirementAge - currentAge;
  const retirementWithdrawal =
    withdrawal * Math.pow(1 + inflation, retirementDelay);
  const startingBucketSize = (bucketYears) =>
    retirementWithdrawal * Math.min(bucketYears, years);
  let maxUpfrontYears = Math.min(10, years);
  while (maxUpfrontYears > 1 && startingBucketSize(maxUpfrontYears) > balance) {
    maxUpfrontYears--;
  }
  const upfrontYears = Math.min(savedUpfrontYears, maxUpfrontYears);
  useEffect(() => {
    setUpfrontYears(upfrontYears);
  }, [upfrontYears]);
  const [marketAssumptionsOpen, setMarketAssumptionsOpen] = usePersistedState(
    "marketAssumptionsOpen",
  );
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
  const mainAreaRef = React.useRef(null);
  useEffect(() => {
    if (!running || !mainAreaRef.current) {
      return;
    }
    const centerProgress = () => {
      const main = mainAreaRef.current;
      if (!main) {
        return;
      }
      const bounds = main.getBoundingClientRect();
      const visibleTop = Math.max(0, bounds.top);
      const visibleBottom = Math.min(window.innerHeight, bounds.bottom);
      main.style.setProperty(
        "--progress-center",
        `${Math.max(0, (visibleTop + visibleBottom) / 2 - bounds.top)}px`,
      );
    };
    centerProgress();
    window.addEventListener("scroll", centerProgress, { passive: true });
    window.addEventListener("resize", centerProgress);
    return () => {
      window.removeEventListener("scroll", centerProgress);
      window.removeEventListener("resize", centerProgress);
    };
  }, [running]);
  const [solving, setSolving] = useState(false);
  const [solveProgress, setSolveProgress] = useState(0);
  const [solveFor, setSolveFor] = useState("withdrawal");
  const solvingBalance = solveFor === "balance";
  const solvingDelay = solveFor === "retirementDelay";
  const maxSolverDelay = planThroughAge - currentAge - 1;
  const [targetSuccessRate, setTargetSuccessRate] =
    usePersistedState("targetSuccessRate");

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
    currentAge,
    targetSuccessRate,
  ]);
  const currentSolverResult =
    solverResult?.settingsKey === solverSettingsKey ? solverResult : null;
  const canApplySolverResult =
    currentSolverResult?.found &&
    (currentSolverResult.balance !== balance ||
      currentSolverResult.withdrawal !== withdrawal ||
      currentSolverResult.retirementDelay !== retirementDelay);

  // The previous sidebar values stay restorable while the applied values do.
  const [appliedSolution, setAppliedSolution] = useState(null);
  const canUndoSolution =
    appliedSolution?.applied.balance === balance &&
    appliedSolution.applied.withdrawal === withdrawal &&
    appliedSolution.applied.retirementAge === retirementAge;

  const applySolverResult = () => {
    const applied = {
      balance: currentSolverResult.balance,
      withdrawal: Math.min(
        currentSolverResult.withdrawal,
        currentSolverResult.balance,
      ),
      retirementAge: currentAge + currentSolverResult.retirementDelay,
    };
    setAppliedSolution({
      previous: { balance, withdrawal, retirementAge, upfrontYears },
      applied,
    });
    setBalance(applied.balance);
    setWithdrawal(applied.withdrawal);
    setRetirementAge(applied.retirementAge);
  };

  const undoSolverResult = () => {
    const { previous } = appliedSolution;
    setBalance(previous.balance);
    setWithdrawal(previous.withdrawal);
    setRetirementAge(previous.retirementAge);
    setUpfrontYears(previous.upfrontYears);
    setAppliedSolution(null);
  };

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
      currentAge,
      retirementAge,
      planThroughAge,
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
          currentAge,
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
    currentAge,
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
    setAppliedSolution(null);
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
      planThroughYears: solvingDelay ? planThroughAge - currentAge : undefined,
      retirementDelay,
      balance,
      withdrawal,
      returnRate: cagrToArithmetic(cagr, volatility),
      volatility,
      inflation,
      years,
      upfrontYears,
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

  // Completed results own every displayed calculation, including the ages,
  // inflation adjustments, and cash-aware depletion milestones.
  const summary = sim?.summary;
  const successColor =
    summary?.successRate >= 0.9
      ? "#3a7d44"
      : summary?.successRate >= 0.7
        ? "#c89a3a"
        : "#a83232";

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
              {`| AGES ${currentAge}-${planThroughAge}`}
            </div>
          </div>
        </header>

        <div className="layout">
          {/* SIDEBAR */}
          <aside className="sidebar">
            <div className="panel-heading">Your Retirement Plan</div>
            <Slider
              label={SETTING_LABELS.currentAge}
              sublabel="What is your age today?"
              value={currentAge}
              min={18}
              max={MAX_PERSON_AGE - 1}
              step={1}
              onChange={setCurrentAge}
              format={(v) => `${v}`}
              disabled={solving}
            />
            <Slider
              label={SETTING_LABELS.retirementAge}
              sublabel="At what age will you start withdrawing from your portfolio?"
              value={retirementAge}
              min={currentAge}
              max={MAX_PERSON_AGE}
              step={1}
              onChange={setRetirementAge}
              format={(v) =>
                v === currentAge
                  ? `${v} (no delay)`
                  : `${v} (in ${v - currentAge} ${v - currentAge === 1 ? "yr" : "yrs"})`
              }
              disabled={solving}
            />
            <Slider
              label={SETTING_LABELS.planThroughAge}
              sublabel={`${retirementDelay} years until retirement; ${years} years in retirement`}
              value={planThroughAge}
              min={retirementAge + 1}
              max={Math.max(MAX_PERSON_AGE, planThroughAge)}
              step={1}
              onChange={setPlanThroughAge}
              format={(v) => `${v}`}
              disabled={solving}
            />

            <Slider
              label={SETTING_LABELS.balance}
              sublabel="Portfolio value today"
              value={balance}
              min={AMOUNT_LIMITS.balance.min}
              max={AMOUNT_LIMITS.balance.max}
              step={AMOUNT_LIMITS.balance.step}
              onChange={(value) => {
                setBalance(value);
                setWithdrawal((amount) => Math.min(amount, value));
              }}
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
              max={balance}
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
              max={maxUpfrontYears}
              step={1}
              onChange={setUpfrontYears}
              format={(v) => {
                const bucket = startingBucketSize(v);
                return `${v} ${v === 1 ? "yr" : "yrs"} (${fmtMoney(bucket)})`;
              }}
            />

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

            <div className="settings-mgmt">
              <div className="settings-mgmt-heading">Saved Settings</div>
              <div className="settings-mgmt-sub">
                Sidebar values are remembered in your browser between visits.
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
          </aside>

          {/* MAIN AREA */}
          <main
            ref={mainAreaRef}
            className={`main-area${running ? " running" : ""}`}
          >
            {sim && running && (
              <div className="results-progress-overlay" role="status">
                <span>Running simulations</span>
                <div className="mini-track" aria-hidden="true">
                  <div
                    className="mini-bar"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
                <span className="pct" aria-hidden="true">
                  {Math.round(progress * 100)}%
                </span>
              </div>
            )}
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
              <div
                className="results-content"
                aria-busy={running}
                inert={running ? "" : undefined}
              >
                {/* STATS */}
                <div className="stats-row fade">
                  <div className="stat-cell">
                    <div className="stat-label">
                      {`Success through age ${summary.endingAge}`}
                    </div>
                    <div
                      className="stat-value success"
                      style={{ color: successColor }}
                    >
                      {`${(summary.successRate * 100).toFixed(2)}%`}
                    </div>
                    <div className="stat-sub">
                      ≈ {formatSuccessChance(summary.successRate)} chance
                    </div>
                  </div>
                  <div className="stat-cell">
                    <div className="stat-label">
                      {`Balance at age ${summary.endingAge} (Median)`}
                    </div>
                    <div className="stat-value">
                      {fmtMoney(summary.medianEnding)}
                    </div>
                    <div className="stat-sub">
                      ≈ {fmtMoney(summary.medianEndingToday)} today
                    </div>
                  </div>
                  <div className="stat-cell">
                    <div className="stat-label">
                      Last {SETTING_LABELS.withdrawal} (Median)
                    </div>
                    <div className="stat-value">
                      {fmtMoney(summary.lastWithdrawal)}
                    </div>
                    <div className="stat-sub">
                      ≈ {fmtMoney(summary.lastWithdrawalToday)} today
                    </div>
                  </div>
                  <div className="stat-cell">
                    <div className="stat-label">Depletion Age (Median)</div>
                    <div className="stat-value">
                      {summary.medianDepletionAge !== null
                        ? `Age ${summary.medianDepletionAge}`
                        : "None"}
                    </div>
                  </div>
                  <div className="stat-cell">
                    <div className="stat-label">Total Drawn (Median)</div>
                    <div className="stat-value">
                      {fmtMoney(summary.totalDrawn)}
                    </div>
                    <div className="stat-sub">
                      ≈ {fmtMoney(summary.totalDrawnToday)} today
                    </div>
                  </div>
                </div>

                {/* CHART */}
                <PortfolioChart
                  simulation={sim}
                  running={running}
                  progress={progress}
                  showCalendarYears={showCalendarYears}
                  onShowCalendarYearsChange={setShowCalendarYears}
                />

                {/* SOLVER */}
                <section
                  className="solver-panel fade"
                  aria-labelledby="solver-title"
                >
                  <div className="solver-intro">
                    <h2 id="solver-title">What plan will work for me?</h2>
                    <p id="solver-description">
                      You may need to withdrawal less, save more, retire later,
                      or accept more uncertainty.
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
                          description: `Find the highest annual withdrawal with a ${targetSuccessRate}% success rate.`,
                          fixed: `Starting with ${fmtMoneyFull(balance)} ${retirementDelay > 0 ? "today" : "at retirement"}`,
                        },
                        {
                          value: "balance",
                          question: "How much do I need saved?",
                          description: `Find the lowest portfolio value today with a ${targetSuccessRate}% success rate.`,
                          fixed: `Withdrawing ${fmtMoneyFull(withdrawal)} / year in today's dollars`,
                        },
                        {
                          value: "retirementDelay",
                          question: "When can I retire?",
                          description: `Find the fewest years from today to retirement with a ${targetSuccessRate}% success rate.`,
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
                          <strong>Target success rate</strong> of money lasting{" "}
                          {solvingDelay
                            ? `through age ${planThroughAge}`
                            : `from age ${retirementAge} through age ${planThroughAge}`}
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
                    Results are shown here and only change your plan when
                    applied.{" "}
                    {solvingDelay
                      ? `Checks 0 to ${maxSolverDelay} years from today in one-year increments to estimate ${SETTING_LABELS.retirementAge}. While you wait, your portfolio can grow or shrink based on your selected market assumptions. No savings are added or withdrawals taken before retirement. ${SETTING_LABELS.planThroughAge} stays at ${planThroughAge}. Withdrawals account for inflation while you wait.`
                      : solvingBalance
                        ? `Estimates ${SETTING_LABELS.balance} ${retirementDelay > 0 ? "today" : "at retirement"} in ${fmtMoneyFull(AMOUNT_LIMITS.balance.step)} increments (${fmtMoneyFull(AMOUNT_LIMITS.balance.min)}–${fmtMoneyFull(AMOUNT_LIMITS.balance.max)}). ${SETTING_LABELS.withdrawal} stays fixed.`
                        : `Estimates ${SETTING_LABELS.withdrawal} in ${fmtMoneyFull(AMOUNT_LIMITS.withdrawal.step)} increments (${fmtMoneyFull(AMOUNT_LIMITS.withdrawal.min)}–${fmtMoneyFull(AMOUNT_LIMITS.withdrawal.max)}). ${SETTING_LABELS.balance} stays fixed.`}
                  </p>
                  {(solving ||
                    currentSolverResult ||
                    canUndoSolution ||
                    running) && (
                    <div className="solver-feedback">
                      <div
                        className="solver-status"
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
                                    : `Retire in ${currentSolverResult.retirementDelay} ${currentSolverResult.retirementDelay === 1 ? "year" : "years"}, at age ${currentAge + currentSolverResult.retirementDelay}`
                                : solvingBalance
                                  ? `${fmtMoneyFull(currentSolverResult.balance)} ${SETTING_LABELS.balance.toLowerCase()}`
                                  : `${fmtMoneyFull(currentSolverResult.withdrawal)} / year`}
                              {!solvingDelay && (
                                <>
                                  {" "}
                                  <span className="solver-result-context">
                                    {solvingBalance
                                      ? `(~${Math.round(currentSolverResult.balance / currentSolverResult.withdrawal)}x annual withdrawal)`
                                      : `(~1/${Math.round(currentSolverResult.balance / currentSolverResult.withdrawal)} of starting balance)`}
                                  </span>
                                </>
                              )}
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
                        ) : canUndoSolution ? (
                          <span>
                            Applied to your plan.
                            {running && " Updating your results..."}
                          </span>
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
                      {!solving &&
                        (canApplySolverResult || canUndoSolution) && (
                          <button
                            type="button"
                            className="solver-action-btn"
                            onClick={
                              canApplySolverResult
                                ? applySolverResult
                                : undoSolverResult
                            }
                          >
                            {canApplySolverResult ? "Apply" : "Undo"}
                          </button>
                        )}
                    </div>
                  )}
                  {solverError && (
                    <p className="solver-error" role="alert">
                      {solverError}
                    </p>
                  )}
                </section>

                <OutcomeOdds simulation={sim} />

                <PlanSchedule simulation={sim} />

                <div className="footer-note">
                  <p>
                    Returns are sampled annually from a normal distribution; the
                    input CAGR is converted to the per-year arithmetic mean by
                    adding back the variance drag (≈ σ²/2), so the long-run
                    geometric mean of paths tracks the chosen CAGR.
                  </p>
                  <p>
                    Past performance does not guarantee future results; this
                    model is illustrative, not advisory.
                  </p>
                </div>
              </div>
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
