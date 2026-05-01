// ─── Monte Carlo Engine — main-thread side ─────────────────────────────────
// The hot loop lives in monte-carlo-worker.js so the UI stays responsive
// during 1M-run simulations. This file holds the constants and helpers the
// React component needs at render time, plus the URL the component uses to
// instantiate the worker.

const MONTE_CARLO_WORKER_URL = 'lib/monte-carlo-worker.js';

const SIM_RUNS = 1_000_000;

// Historical real return on 3-month T-Bills above CPI inflation, ~1928–2023.
// Used so the T-Bill rate tracks the inflation slider (rate = inflation + this).
const T_BILL_REAL_PREMIUM = 0.005;

// Market-assumption presets sourced from Historical-Stock-Market-And-Inflation-Data.html.
// Inflation comes from U.S. CPI in both regions — the source has no separate world-CPI series.
const MARKET_PRESETS = {
  us: {
    historical: { cagr: 0.093, volatility: 0.198, inflation: 0.029 },
    worst:      { cagr: 0.047, volatility: 0.28,  inflation: 0.046 },
  },
  world: {
    historical: { cagr: 0.083, volatility: 0.174, inflation: 0.029 },
    worst:      { cagr: 0.040, volatility: 0.23,  inflation: 0.046 },
  },
};

// Convert a target CAGR to the per-year arithmetic mean μ that the worker's
// additive-shock model needs. With (1+R) ~ N(1+μ, σ²), the long-run geometric
// mean satisfies E[ln(1+R)] ≈ ln(1+μ) − σ²/(2(1+μ)²); inverting gives the
// fixed point 1+μ = (1+CAGR)·exp(σ²/(2(1+μ)²)). Eight iterations is well past
// machine precision for any sane (CAGR, σ).
function cagrToArithmetic(cagr, vol) {
  let m = 1 + cagr;
  for (let i = 0; i < 8; i++) {
    m = (1 + cagr) * Math.exp(vol * vol / (2 * m * m));
  }
  return m - 1;
}

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
