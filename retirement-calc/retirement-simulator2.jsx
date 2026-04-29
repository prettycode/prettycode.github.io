const { useState, useEffect } = React;

// ─── Monte Carlo Engine (runs in a Web Worker) ──────────────────────────────
// Integer arithmetic throughout the simulation: money in cents, rates in
// basis points (×10⁴), cumulative growth factors in micro-units (×10⁶).
// JS Numbers are IEEE-754 doubles but exact for integers up to 2⁵³ ≈ 9×10¹⁵,
// which covers cents-precision balances to ~$90T — enough headroom for any
// pathological run. Float64Array per-year storage holds those integer cents
// exactly and keeps the fast typed-array .sort() for percentile extraction.
// The only float math in this worker is the one-time Gaussian LUT build at
// init; the per-run hot loop is purely integer.
const WORKER_SOURCE = `
const BP = 10000;        // per-period rates: return, vol, inflation
const MICRO = 1000000;   // cumulative factors: (1+inflation)^y
const GS = 10000000;     // Gaussian sample scale (~7-digit per-sample resolution)

// xorshift32 — integer PRNG, 2³²-1 period. Replaces Math.random() so the
// hot loop stays in int32 land.
let rngState = (Date.now() ^ 0x9E3779B9) | 0;
if (rngState === 0) rngState = 1;
function nextU32() {
  rngState ^= rngState << 13;
  rngState ^= rngState >>> 17;
  rngState ^= rngState << 5;
  return rngState >>> 0;
}

// ── Gaussian inverse-CDF lookup table ──────────────────────────────────────
// THIS BLOCK IS THE ONLY FLOAT MATH IN THE FILE. It runs exactly once at
// worker init and freezes a 65,536-entry Int32Array. After init, sampling
// is one xorshift32 + one table read. Acklam's invNormCDF approximation
// gives ~9-digit accuracy in the body and ~7 in the tails — well past the
// table's 1/65536 quantization, so the LUT is the precision-limiting step.
const GAUSS_LUT_SIZE = 65536;
const GAUSS_LUT = new Int32Array(GAUSS_LUT_SIZE);
(function buildGaussLut() {
  function invNormCDF(p) {
    const a1=-39.69683028665376, a2=220.9460984245205, a3=-275.9285104469687,
          a4=138.3577518672690, a5=-30.66479806614716, a6=2.506628277459239;
    const b1=-54.47609879822406, b2=161.5858368580409, b3=-155.6989798598866,
          b4=66.80131188771972, b5=-13.28068155288572;
    const c1=-0.007784894002430293, c2=-0.3223964580411365, c3=-2.400758277161838,
          c4=-2.549732539343734, c5=4.374664141464968, c6=2.938163982698783;
    const d1=0.007784695709041462, d2=0.3224671290700398, d3=2.445134137142996,
          d4=3.754408661907416;
    const pLow = 0.02425, pHigh = 1 - pLow;
    let q, r;
    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c1*q+c2)*q+c3)*q+c4)*q+c5)*q+c6) /
             ((((d1*q+d2)*q+d3)*q+d4)*q+1);
    }
    if (p <= pHigh) {
      q = p - 0.5; r = q*q;
      return (((((a1*r+a2)*r+a3)*r+a4)*r+a5)*r+a6) * q /
             (((((b1*r+b2)*r+b3)*r+b4)*r+b5)*r+1);
    }
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c1*q+c2)*q+c3)*q+c4)*q+c5)*q+c6) /
            ((((d1*q+d2)*q+d3)*q+d4)*q+1);
  }
  for (let i = 0; i < GAUSS_LUT_SIZE; i++) {
    GAUSS_LUT[i] = Math.round(invNormCDF((i + 0.5) / GAUSS_LUT_SIZE) * GS);
  }
})();

function gaussInt() { return GAUSS_LUT[nextU32() >>> 16]; }

function runSimulation({ balance, withdrawal, returnRate, volatility, inflation, years, runs, upfrontYears, inflationAdjustBucket, bucketEarnsTBills, tBillRealPremium }) {
  // Boundary: convert UI inputs to integer scales once on entry.
  const balCents = Math.round(balance * 100);
  const wdCents = Math.round(withdrawal * 100);
  const returnBp = Math.round(returnRate * BP);
  const volBp = Math.round(volatility * BP);
  const inflMicro = Math.round(inflation * MICRO);
  // T-Bill nominal rate = inflation + historical real premium (~0.5%). Held in
  // MICRO scale alongside inflMicro so bucket discounting compounds at the same
  // precision as the inflation factor used to size withdrawals.
  const tBillMicro = inflMicro + Math.round(tBillRealPremium * MICRO);

  // Cumulative inflation factor in MICRO scale, built iteratively — bounds
  // drift to ≤1 part per 10⁶ per compounding step (vs the bp-scale 1-in-10⁴
  // that would drift visibly over 50 years).
  const inflPow = new Float64Array(years + 1);
  inflPow[0] = MICRO;
  for (let y = 1; y <= years; y++) {
    inflPow[y] = Math.floor(inflPow[y-1] * (MICRO + inflMicro) / MICRO);
  }

  // Upfront cash bucket: if upfrontYears > 1, year 1 withdraws a lump sum that
  // funds years 1..upfrontYears, and no further withdrawals happen until year
  // upfrontYears+1. When upfrontYears === 1 this collapses to the normal flow.
  // Sizing: year 1's withdrawal is plain cash (spent immediately). When
  // bucketEarnsTBills is on, only the *excess* — funds for years 2..N — earns
  // T-Bills, and only until one year before it's spent (a rolling 1-year cash
  // buffer is kept idle). So year y's portion (y ≥ 2) grows in T-Bills for
  // y-2 years. Withdrawals grow at inflation when inflationAdjustBucket is on.
  // L = wd · (1 + (1+wGrow) · Σᵢ₌₀^{N-2} ((1+wGrow)/(1+disc))ⁱ)
  // When disc = 0 this collapses to wd · Σᵢ₌₀^{N-1} (1+wGrow)ⁱ.
  const isLumpSum = upfrontYears > 1;
  let lumpSumCents = 0;
  if (isLumpSum) {
    const wGrowMicro = inflationAdjustBucket ? inflMicro : 0;
    const discMicro = bucketEarnsTBills ? tBillMicro : 0;
    if (discMicro === 0) {
      // No T-Bills earnings: sum the nominal (inflation-grown) withdrawals.
      let pow = MICRO; // (1+wGrow)^0
      let sumMicro = 0;
      const num = MICRO + wGrowMicro;
      for (let i = 0; i < upfrontYears; i++) {
        sumMicro += pow;
        pow = Math.floor(pow * num / MICRO);
      }
      lumpSumCents = Math.floor(wdCents * sumMicro / MICRO);
    } else {
      // ratio = (MICRO + wGrowMicro) / (MICRO + discMicro), tracked in MICRO
      // scale via iterative multiply to avoid pow() drift.
      let ratioPow = MICRO; // ratio^0 = 1
      let sumMicro = 0;
      const num = MICRO + wGrowMicro;
      const den = MICRO + discMicro;
      for (let i = 0; i < upfrontYears - 1; i++) {
        sumMicro += ratioPow;
        ratioPow = Math.floor(ratioPow * num / den);
      }
      // tBillsCents = wdCents · (1+wGrow) · sumMicro / MICRO. Split into two
      // divides so intermediates stay inside Number-safe int range.
      const grownWdCents = Math.floor(wdCents * num / MICRO);
      const tBillsCents = Math.floor(grownWdCents * sumMicro / MICRO);
      lumpSumCents = wdCents + tBillsCents;
    }
  }

  const yearBalances = new Array(years + 1);
  for (let y = 0; y <= years; y++) yearBalances[y] = new Float64Array(runs);
  yearBalances[0].fill(balCents);

  const withdrawalSumCents = new Float64Array(years + 1);
  const depletionYears = new Uint16Array(runs);
  let depletionCount = 0;
  let survived = 0;
  const reportEvery = Math.max(1, Math.floor(runs / 100));

  for (let r = 0; r < runs; r++) {
    let bal = balCents;
    let depleted = false;

    for (let y = 1; y <= years; y++) {
      let actualW, displayedW;
      if (isLumpSum) {
        if (y === 1) {
          actualW = lumpSumCents;
          displayedW = lumpSumCents;
        } else if (y <= upfrontYears) {
          actualW = 0;
          displayedW = 0;
        } else {
          actualW = Math.floor(wdCents * inflPow[y-1] / MICRO);
          displayedW = actualW;
        }
      } else {
        actualW = Math.floor(wdCents * inflPow[y-1] / MICRO);
        displayedW = actualW;
      }
      withdrawalSumCents[y] += displayedW;

      if (depleted) {
        yearBalances[y][r] = 0;
        continue;
      }

      bal -= actualW;
      if (bal <= 0) {
        bal = 0;
        depleted = true;
        depletionYears[depletionCount++] = y;
        yearBalances[y][r] = 0;
        continue;
      }

      // Per-year growth factor in bp: BP + returnBp + volBp·gauss/GS.
      // (volBp·gauss) ≤ 3000·5e7 ≈ 1.5e11, fits Number exactly; /GS lands
      // back in bp range. | 0 truncates the small int32 result.
      const shockBp = ((volBp * gaussInt()) / GS) | 0;
      let factorBp = BP + returnBp + shockBp;
      if (factorBp < 0) factorBp = 0;  // a >100% loss can't push bal below 0
      bal = Math.floor(bal * factorBp / BP);
      yearBalances[y][r] = bal;
    }

    if (bal > 0) survived++;

    if (r % reportEvery === 0) {
      self.postMessage({ type: 'progress', pct: r / runs });
    }
  }

  // Boundary: emit dollars (integer cents → integer dollars) so the React
  // side's fmtMoney/fmtPct keep their existing signatures.
  const c2d = (c) => Math.floor(c / 100);

  const percentiles = [];
  for (let y = 0; y <= years; y++) {
    const yearVals = yearBalances[y];
    yearVals.sort();
    percentiles.push({
      year: y,
      p10: c2d(yearVals[Math.floor(runs * 10 / 100)]),
      p25: c2d(yearVals[Math.floor(runs * 25 / 100)]),
      p50: c2d(yearVals[Math.floor(runs * 50 / 100)]),
      p75: c2d(yearVals[Math.floor(runs * 75 / 100)]),
      p90: c2d(yearVals[Math.floor(runs * 90 / 100)]),
      withdrawal: c2d(Math.floor(withdrawalSumCents[y] / runs)),
    });
  }

  const successRate = survived / runs;
  const medianEnding = c2d(yearBalances[years][Math.floor(runs / 2)]);

  let medianDepletionYear = null;
  if (depletionCount > 0) {
    const sortedDepletions = depletionYears.slice(0, depletionCount);
    sortedDepletions.sort();
    medianDepletionYear = sortedDepletions[Math.floor(depletionCount / 2)];
  }

  return { percentiles, successRate, medianEnding, medianDepletionYear, runs, lumpSum: c2d(lumpSumCents) };
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

// Historical real return on 3-month T-Bills above CPI inflation, ~1928–2023.
// Used so the T-Bill rate tracks the inflation slider (rate = inflation + this).
const T_BILL_REAL_PREMIUM = 0.005;

// Closed-form bucket size: year 1's withdrawal is plain cash, years 2..N grow
// at `disc` for y-2 years (a 1-year cash buffer is held idle the year before
// each spend). Mirrors the integer-scale loop in the worker so UI and
// simulation agree.
function bucketSize(wd, years, wGrow, disc) {
  if (years <= 0) return 0;
  if (disc === 0) {
    // No T-Bills earnings: sum the nominal withdrawals.
    if (wGrow === 0) return years * wd;
    return wd * (Math.pow(1 + wGrow, years) - 1) / wGrow;
  }
  if (years === 1) return wd;
  // L = wd + wd · (1 + wGrow) · Σⱼ₌₀^{N-2} ratio^j, ratio = (1+wGrow)/(1+disc).
  const ratio = (1 + wGrow) / (1 + disc);
  if (Math.abs(ratio - 1) < 1e-9) return wd + (1 + wGrow) * wd * (years - 1);
  return wd + wd * (1 + wGrow) * (1 - Math.pow(ratio, years - 1)) / (1 - ratio);
}

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
  const [upfrontYears, setUpfrontYears] = useState(1);
  const [inflationAdjustBucket, setInflationAdjustBucket] = useState(false);
  const [bucketEarnsTBills, setBucketEarnsTBills] = useState(false);
  const [returnRate, setReturnRate] = useState(0.098);
  const [volatility, setVolatility] = useState(0.195);
  const [inflation, setInflation] = useState(0.03);
  const [years, setYears] = useState(40);

  const [hover, setHover] = useState(null);

  const [sim, setSim] = useState(null);
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(true);

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
        params: { balance, withdrawal, returnRate, volatility, inflation, years, runs: SIM_RUNS, upfrontYears, inflationAdjustBucket: effectiveInflationAdjustBucket, bucketEarnsTBills: effectiveBucketEarnsTBills, tBillRealPremium: T_BILL_REAL_PREMIUM },
      });
    }, 150);
    return () => {
      clearTimeout(t);
      if (worker) worker.terminate();
    };
  }, [balance, withdrawal, returnRate, volatility, inflation, years, upfrontYears, effectiveInflationAdjustBucket, effectiveBucketEarnsTBills]);

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

  // Withdrawal scale (left axis)
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
      white-space: nowrap;
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
      height: 4px;
      background: linear-gradient(to right, var(--ink) 0%, var(--ink) var(--pct), rgba(26, 22, 18, 0.18) var(--pct), rgba(26, 22, 18, 0.18) 100%);
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

    /* ─── Advanced (collapsible) ─── */
    .advanced {
      margin-top: 4px;
      padding-top: 14px;
      border-top: 1px dashed var(--rule);
    }

    .advanced > summary {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--ink-2);
      cursor: pointer;
      user-select: none;
      list-style: none;
      padding: 2px 0;
      transition: color 0.15s ease;
    }

    .advanced > summary:hover { color: var(--ink); }

    .advanced > summary::-webkit-details-marker { display: none; }

    .advanced > summary::before {
      content: '+ ';
      display: inline-block;
      width: 14px;
      font-weight: 700;
    }

    .advanced[open] > summary::before { content: '− '; }

    .advanced-body { padding: 12px 0 4px; }

    .toggle-row {
      display: flex;
      align-items: flex-start;
      gap: 9px;
      cursor: pointer;
    }

    .toggle-row input[type="checkbox"] {
      margin: 2px 0 0;
      width: 12px;
      height: 12px;
      accent-color: var(--accent);
      cursor: pointer;
      flex-shrink: 0;
    }

    .toggle-label {
      font-family: 'Fraunces', serif;
      font-size: 13px;
      font-weight: 500;
      line-height: 1.25;
    }

    .toggle-sub {
      font-size: 10px;
      color: var(--ink-2);
      margin-top: 2px;
      line-height: 1.4;
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

    .chart-footnote {
      font-size: 11px;
      color: var(--ink-2);
      font-style: italic;
      line-height: 1.55;
      margin-top: 14px;
      max-width: 600px;
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
  // Withdrawal at hover tick h is the draw taken at the start of year h+1.
  // At the final tick we've run out of simulated years, so project one more
  // year of inflation onto the last withdrawal — assumes retirement continues
  // for as long as the portfolio sustains it.
  const hoverWithdrawal = hover !== null && sim
    ? (hover < years
        ? sim.percentiles[hover + 1].withdrawal
        : Math.floor(sim.percentiles[years].withdrawal * (1 + inflation)))
    : null;

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

            <details className="advanced">
              <summary>Advanced</summary>
              <div className="advanced-body">
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={inflationAdjustBucket}
                    onChange={(e) => setInflationAdjustBucket(e.target.checked)}
                  />
                  <div>
                    <div className="toggle-label">Inflation-adjust bucket</div>
                    <div className="toggle-sub">Size to fund N years of real spending instead of N × current annual.</div>
                  </div>
                </label>
                <label className="toggle-row" style={{ marginTop: 12 }}>
                  <input
                    type="checkbox"
                    checked={bucketEarnsTBills}
                    onChange={(e) => setBucketEarnsTBills(e.target.checked)}
                  />
                  <div>
                    <div className="toggle-label">Cash bucket earns T-Bills</div>
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
                inner band, 25th–75th. The stepped line marks median annual withdrawal, scaled to the left axis.
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

                  {/* Median portfolio line */}
                  <path
                    d={buildPath("p50")}
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
                      let d = `M ${x(0)} ${yScaleW(pts[0].withdrawal)}`;
                      for (let i = 1; i < pts.length; i++) {
                        d += ` L ${x(i)} ${yScaleW(pts[i-1].withdrawal)}`;
                        d += ` L ${x(i)} ${yScaleW(pts[i].withdrawal)}`;
                      }
                      d += ` L ${x(pts.length)} ${yScaleW(pts[pts.length-1].withdrawal)}`;
                      return d;
                    })()}
                    fill="none"
                    stroke="var(--withdrawal)"
                    strokeWidth="1.5"
                    strokeLinejoin="miter"
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
                      <span>Withdrawal</span><span>{fmtMoneyFull(hoverWithdrawal)}</span>
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
                Withdrawals are taken at the start of the year they fund, so each step begins one tick left of the balance series:
                the step starting at Y0 is the draw that funds year 1, Y1 the draw that funds year 2, and so on. With a multi-year
                cash bucket, Y0's step is the lump-sum drawn from the portfolio at retirement; the bucket-funded years that follow
                show zero portfolio withdrawal. The hover value at the final tick projects one more year of inflation onto the last
                simulated withdrawal — assuming retirement continues for as long as the portfolio sustains it.
              </p>
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