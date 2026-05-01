const { useState, useEffect, useRef } = React;
const { ComposedChart, Area, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } = Recharts;

const FONT = `'Georgia', 'Times New Roman', serif`;
const MONO = `'Courier New', monospace`;

const defaults = {
  startingBalance: 1000000,
  annualWithdrawal: 50000,
  annualReturn: 7,
  volatility: 15,
  inflationRate: 2.5,
  years: 30,
  adjustForInflation: true,
};

const NUM_SIMS = 250_000;

function fmt(v) {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

/* ── Web Worker source (sim count comes from d.numSims) ── */
const workerSrc = `
  function randNormal(mu, sigma) {
    var u1 = Math.random(), u2 = Math.random();
    return mu + sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(6.283185307179586 * u2);
  }
  function pct(sorted, p) {
    var i = (p / 100) * (sorted.length - 1), lo = i | 0, hi = Math.ceil(i);
    return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
  }

  self.onmessage = function(e) {
    var d = e.data;
    var N = d.numSims;
    var mu = d.annualReturn / 100, sigma = d.volatility / 100, infl = d.inflationRate / 100;
    var balances = new Float64Array(N).fill(d.startingBalance);
    var alive = new Uint8Array(N).fill(1);
    var survivedCount = N;
    var depYears = [];
    var chartData = [];

    chartData.push({
      year: 0, p10: d.startingBalance, p25: d.startingBalance,
      p50: d.startingBalance, p75: d.startingBalance, p90: d.startingBalance,
      withdrawal: 0, band_10_25: 0, band_25_75: 0, band_75_90: 0
    });

    for (var y = 1; y <= d.years; y++) {
      var wd = d.annualWithdrawal;
      if (d.adjustForInflation && y > 1) wd = d.annualWithdrawal * Math.pow(1 + infl, y - 1);

      var died = 0;
      for (var s = 0; s < N; s++) {
        if (!alive[s]) continue;
        balances[s] = balances[s] * (1 + randNormal(mu, sigma)) - wd;
        if (balances[s] <= 0) { balances[s] = 0; alive[s] = 0; died++; depYears.push(y); }
      }
      survivedCount -= died;

      var sorted = new Float64Array(balances).sort();
      var v10 = Math.max(0, pct(sorted, 10));
      var v25 = Math.max(0, pct(sorted, 25));
      var v50 = Math.max(0, pct(sorted, 50));
      var v75 = Math.max(0, pct(sorted, 75));
      var v90 = Math.max(0, pct(sorted, 90));

      chartData.push({
        year: y, p10: v10, p25: v25, p50: v50, p75: v75, p90: v90,
        withdrawal: Math.round(wd),
        band_10_25: v25 - v10, band_25_75: v75 - v25, band_75_90: v90 - v75
      });

      if (y % 3 === 0 || y === d.years)
        self.postMessage({ type: "progress", year: y, total: d.years, runId: d.runId });
    }

    var finalSorted = new Float64Array(balances).sort();
    var medianDep = null;
    if (depYears.length > 0) {
      depYears.sort(function(a,b){return a-b;});
      medianDep = depYears[depYears.length >> 1];
    }

    self.postMessage({
      type: "result", runId: d.runId, chartData: chartData,
      survivalRate: (survivedCount / N) * 100,
      survivedCount: survivedCount, numSimulations: N,
      medianFinal: pct(finalSorted, 50),
      p10Final: pct(finalSorted, 10),
      p90Final: pct(finalSorted, 90),
      medianDepletionYear: medianDep
    });
  };
`;

function useMonteCarloWorker(params, seed) {
  const [results, setResults] = useState(null);
  const [progress, setProgress] = useState({ year: 0, total: 30 });
  const workerRef = useRef(null);
  const runIdRef = useRef(0);

  useEffect(() => {
    const blob = new Blob([workerSrc], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    const w = new Worker(url);
    workerRef.current = w;
    w.onmessage = (e) => {
      const { type, runId, ...data } = e.data;
      if (runId !== runIdRef.current) return;
      if (type === "progress") setProgress(data);
      if (type === "result") { setResults(data); setProgress(null); }
    };
    return () => { w.terminate(); URL.revokeObjectURL(url); };
  }, []);

  useEffect(() => {
    if (!workerRef.current) return;
    const id = ++runIdRef.current;
    setProgress({ year: 0, total: params.years });
    workerRef.current.postMessage({ ...params, numSims: NUM_SIMS, runId: id });
  }, [params, seed]);

  return { results, progress };
}

/* ── Slider that only commits on release (avoids re-triggering 1M sims per tick) ── */
function Slider({ label, value, onChange, min, max, step, format, accentColor }) {
  const [local, setLocal] = useState(value);
  const dragging = useRef(false);
  useEffect(() => { if (!dragging.current) setLocal(value); }, [value]);

  const commit = () => { dragging.current = false; onChange(local); };

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontFamily: FONT, fontSize: 13, color: "#8a9bb0", letterSpacing: 0.3 }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 15, color: "#e8f0fe", fontWeight: 700 }}>{format(local)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={local}
        onChange={e => { dragging.current = true; setLocal(Number(e.target.value)); }}
        onMouseUp={commit} onTouchEnd={commit} onKeyUp={commit}
        style={{ width: "100%", accentColor: accentColor || "#4fc3f7", height: 4, cursor: "pointer" }}
      />
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 10, padding: "14px 16px", flex: 1, minWidth: 130,
    }}>
      <div style={{ fontFamily: FONT, fontSize: 11, color: "#6b7f96", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
      <div style={{ fontFamily: MONO, fontSize: 20, color: color || "#e8f0fe", fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ fontFamily: FONT, fontSize: 11, color: "#556677", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={{
      background: "#1a2332", border: "1px solid rgba(79,195,247,0.25)", borderRadius: 8,
      padding: "12px 16px", fontFamily: MONO, fontSize: 12, color: "#c8d8e8",
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)", maxWidth: 220,
    }}>
      <div style={{ fontFamily: FONT, fontSize: 13, color: "#4fc3f7", marginBottom: 8, fontWeight: 600 }}>Year {d.year}</div>
      <div style={{ display: "grid", gridTemplateColumns: "auto auto", gap: "3px 12px" }}>
        <span style={{ color: "#6b7f96" }}>90th %ile</span><span style={{ color: "#3a7a5a" }}>{fmt(d.p90)}</span>
        <span style={{ color: "#6b7f96" }}>75th %ile</span><span style={{ color: "#5a9a6a" }}>{fmt(d.p75)}</span>
        <span style={{ color: "#6b7f96" }}>Median</span><span style={{ color: "#e8f0fe", fontWeight: 700 }}>{fmt(d.p50)}</span>
        <span style={{ color: "#6b7f96" }}>25th %ile</span><span style={{ color: "#c87a4a" }}>{fmt(d.p25)}</span>
        <span style={{ color: "#6b7f96" }}>10th %ile</span><span style={{ color: "#c85a4a" }}>{fmt(d.p10)}</span>
        {d.withdrawal > 0 && <>
          <span style={{ color: "#6b7f96", marginTop: 4 }}>Withdrawal</span>
          <span style={{ color: "#b39ddb", marginTop: 4 }}>{fmt(d.withdrawal)}/yr</span>
        </>}
      </div>
    </div>
  );
}

function ProgressBar({ year, total }) {
  const pct = total > 0 ? (year / total) * 100 : 0;
  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", zIndex: 10,
      background: "rgba(11,17,23,0.85)", borderRadius: 14, gap: 12,
    }}>
      <div style={{ fontFamily: FONT, fontSize: 14, color: "#8a9bb0", fontStyle: "italic" }}>
        Simulating {NUM_SIMS.toLocaleString()} retirements…
      </div>
      <div style={{ width: 220, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #4fc3f7, #81c784)",
          borderRadius: 2, transition: "width 0.2s ease",
        }} />
      </div>
      <div style={{ fontFamily: MONO, fontSize: 11, color: "#556677" }}>Year {year} / {total}</div>
    </div>
  );
}

function RetirementSimulator() {
  const [params, setParams] = useState(defaults);
  const [seed, setSeed] = useState(0);
  const set = (k) => (v) => setParams(p => ({ ...p, [k]: v }));

  const { results, progress } = useMonteCarloWorker(params, seed);
  const computing = progress !== null;

  const chartData = results?.chartData || [];
  const survivalRate = results?.survivalRate ?? 0;
  const medianFinal = results?.medianFinal ?? 0;
  const p10Final = results?.p10Final ?? 0;
  const p90Final = results?.p90Final ?? 0;
  const medianDepletionYear = results?.medianDepletionYear;
  const survivedCount = results?.survivedCount ?? 0;

  const survivalColor = survivalRate >= 80 ? "#81c784" : survivalRate >= 50 ? "#ffb74d" : "#ef5350";

  const legendItems = [
    { color: "rgba(79,195,247,0.12)", label: "10th–90th %ile" },
    { color: "rgba(79,195,247,0.28)", label: "25th–75th %ile" },
    { color: "#4fc3f7", label: "Median", type: "line" },
    { color: "rgba(179,157,219,0.45)", label: "Withdrawal" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0b1117 0%, #111d2b 40%, #0f1923 100%)",
      color: "#c8d8e8", fontFamily: FONT, padding: "40px 20px", boxSizing: "border-box",
    }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 36, textAlign: "center" }}>
          <div style={{ fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "#4fc3f7", marginBottom: 8, fontWeight: 600 }}>Monte Carlo Simulator</div>
          <h1 style={{ fontFamily: FONT, fontSize: 32, fontWeight: 400, color: "#e8f0fe", margin: 0, lineHeight: 1.2, fontStyle: "italic" }}>
            Retirement Portfolio Analysis
          </h1>
          <p style={{ fontSize: 14, color: "#556677", marginTop: 8, maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
            {NUM_SIMS.toLocaleString()} randomized simulations model the range of outcomes your portfolio might experience.
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 10, marginBottom: 28, flexWrap: "wrap", opacity: computing ? 0.35 : 1, transition: "opacity 0.3s" }}>
          <StatCard
            label="Survival Rate"
            value={results ? `${survivalRate.toFixed(2)}%` : "—"}
            color={survivalColor}
            sub={results ? `${survivedCount.toLocaleString()} of ${results.numSimulations.toLocaleString()} trials` : null}
          />
          <StatCard
            label="Median Final"
            value={results ? fmt(Math.max(0, medianFinal)) : "—"}
            color="#4fc3f7"
            sub={results ? `10th–90th: ${fmt(Math.max(0, p10Final))} – ${fmt(Math.max(0, p90Final))}` : null}
          />
          <StatCard
            label={medianDepletionYear ? "Median Depletion" : "Portfolio Status"}
            value={medianDepletionYear ? `Year ${medianDepletionYear}` : results ? "Survives" : "—"}
            color={medianDepletionYear ? "#ffb74d" : "#81c784"}
            sub={medianDepletionYear ? "When failed runs deplete" : results ? "Median path endures" : null}
          />
        </div>

        {/* Chart */}
        <div style={{
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 14, padding: "24px 16px 16px 8px", marginBottom: 28, position: "relative",
        }}>
          {computing && <ProgressBar year={progress.year} total={progress.total} />}
          <div style={{ display: "flex", gap: 16, justifyContent: "flex-end", paddingBottom: 6, flexWrap: "wrap", paddingRight: 8, opacity: computing ? 0.15 : 1, transition: "opacity 0.3s" }}>
            {legendItems.map(it => (
              <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: FONT, fontSize: 11, color: "#6b7f96" }}>
                {it.type === "line"
                  ? <div style={{ width: 14, height: 2.5, background: it.color, borderRadius: 1 }} />
                  : <div style={{ width: 10, height: 10, background: it.color, borderRadius: 2 }} />}
                {it.label}
              </div>
            ))}
          </div>
          <div style={{ opacity: computing ? 0.12 : 1, transition: "opacity 0.3s" }}>
            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="outerBand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4fc3f7" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#4fc3f7" stopOpacity={0.04} />
                  </linearGradient>
                  <linearGradient id="innerBand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4fc3f7" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#4fc3f7" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="year" tick={{ fill: "#556677", fontSize: 11, fontFamily: MONO }} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} tickLine={false}
                  label={{ value: "Year", position: "insideBottomRight", offset: -5, fill: "#445566", fontSize: 11, fontFamily: FONT }} />
                <YAxis yAxisId="balance" tickFormatter={fmt} tick={{ fill: "#556677", fontSize: 11, fontFamily: MONO }} axisLine={false} tickLine={false} width={65} />
                <YAxis yAxisId="withdrawal" orientation="right" tickFormatter={fmt} tick={{ fill: "#5a4a6a", fontSize: 11, fontFamily: MONO }} axisLine={false} tickLine={false} width={60} />
                <Tooltip content={<CustomTooltip />} />
                <Area yAxisId="balance" type="monotone" dataKey="p10" stackId="band" fill="transparent" stroke="none" />
                <Area yAxisId="balance" type="monotone" dataKey="band_10_25" stackId="band" fill="url(#outerBand)" stroke="none" />
                <Area yAxisId="balance" type="monotone" dataKey="band_25_75" stackId="band" fill="url(#innerBand)" stroke="none" />
                <Area yAxisId="balance" type="monotone" dataKey="band_75_90" stackId="band" fill="url(#outerBand)" stroke="none" />
                <Bar yAxisId="withdrawal" dataKey="withdrawal" fill="rgba(179,157,219,0.35)" stroke="rgba(179,157,219,0.5)" strokeWidth={0.5} radius={[3, 3, 0, 0]} barSize={12} />
                <Line yAxisId="balance" type="monotone" dataKey="p50" stroke="#4fc3f7" strokeWidth={2.5} dot={false}
                  activeDot={{ r: 5, fill: "#4fc3f7", stroke: "#0b1117", strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Controls */}
        <div style={{
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 14, padding: "24px 24px 12px", marginBottom: 16,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0 32px" }}>
            <Slider label="Starting Balance" value={params.startingBalance} onChange={set("startingBalance")} min={100000} max={5000000} step={50000} format={v => fmt(v)} />
            <Slider label="Annual Withdrawal" value={params.annualWithdrawal} onChange={set("annualWithdrawal")} min={10000} max={300000} step={5000} format={v => fmt(v)} />
            <Slider label="Expected Return (mean)" value={params.annualReturn} onChange={set("annualReturn")} min={0} max={15} step={0.5} format={v => `${v}%`} />
            <Slider label="Volatility (Std Dev)" value={params.volatility} onChange={set("volatility")} min={0} max={30} step={1} format={v => `${v}%`} accentColor="#ffb74d" />
            <Slider label="Inflation Rate" value={params.inflationRate} onChange={set("inflationRate")} min={0} max={8} step={0.5} format={v => `${v}%`} />
            <Slider label="Retirement Duration" value={params.years} onChange={set("years")} min={5} max={50} step={1} format={v => `${v} years`} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 4, marginBottom: 12, flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: FONT, fontSize: 13, color: "#8a9bb0" }}>
              <input type="checkbox" checked={params.adjustForInflation} onChange={e => set("adjustForInflation")(e.target.checked)}
                style={{ accentColor: "#4fc3f7", width: 16, height: 16, cursor: "pointer" }} />
              Adjust withdrawals for inflation
            </label>
            <button onClick={() => setSeed(s => s + 1)} disabled={computing}
              style={{
                fontFamily: FONT, fontSize: 13, color: computing ? "#556677" : "#4fc3f7",
                background: computing ? "rgba(255,255,255,0.03)" : "rgba(79,195,247,0.08)",
                border: `1px solid ${computing ? "rgba(255,255,255,0.06)" : "rgba(79,195,247,0.2)"}`,
                borderRadius: 8, padding: "7px 18px", cursor: computing ? "wait" : "pointer", transition: "all 0.2s",
              }}
              onMouseEnter={e => { if (!computing) e.target.style.background = "rgba(79,195,247,0.15)"; }}
              onMouseLeave={e => { if (!computing) e.target.style.background = "rgba(79,195,247,0.08)"; }}
            >
              Re-roll simulations
            </button>
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: "#3a4a5a", fontStyle: "italic", maxWidth: 540, margin: "20px auto 0" }}>
          Returns are modeled as independent, normally distributed annual samples. Actual markets exhibit fat tails, autocorrelation, and regime changes. For illustrative purposes only — consult a financial advisor.
        </p>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<RetirementSimulator />);
