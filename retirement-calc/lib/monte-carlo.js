/* exported SIM_RUNS, startSimulation, MARKET_PRESETS, cagrToArithmetic */

// ─── Monte Carlo Engine — main-thread side ─────────────────────────────────
// The hot loop lives in monte-carlo-worker.js so the UI stays responsive
// during 1M-run simulations. This file holds the constants and helpers the
// React component needs at render time, plus the URL the component uses to
// instantiate the worker.

const MONTE_CARLO_WORKER_URL = "lib/monte-carlo-worker.js";

const SIM_RUNS = 1_000_000;

// One request owns its worker, including startup failures and cancellation.
function startSimulation(params, onProgress = () => {}) {
  let worker;
  let settled = false;
  let cancel;
  const promise = new Promise((resolve, reject) => {
    const finish = (error, result) => {
      if (settled) {
        return;
      }
      settled = true;
      if (worker) {
        worker.terminate();
      }
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    };
    cancel = () =>
      finish(Object.assign(new Error("Cancelled"), { name: "AbortError" }));
    try {
      worker = new Worker(MONTE_CARLO_WORKER_URL);
      worker.onerror = (event) => {
        event.preventDefault();
        finish(new Error("Simulation worker failed."));
      };
      worker.onmessageerror = () =>
        finish(new Error("Simulation response could not be read."));
      worker.onmessage = ({ data }) => {
        if (settled) {
          return;
        }
        if (data.type === "progress") {
          onProgress(data.pct);
        } else if (data.type === "done") {
          finish(null, data.result);
        }
      };
      worker.postMessage({ type: "run", params });
    } catch (error) {
      finish(error);
    }
  });
  return { promise, cancel };
}

// Market-assumption presets sourced from Historical-Stock-Market-And-Inflation-Data.html.
// Inflation comes from U.S. CPI in both regions — the source has no separate world-CPI series.
const MARKET_PRESETS = {
  us: {
    historical: { cagr: 0.093, volatility: 0.198, inflation: 0.029 },
    worst: { cagr: 0.047, volatility: 0.28, inflation: 0.046 },
  },
  world: {
    historical: { cagr: 0.083, volatility: 0.174, inflation: 0.029 },
    worst: { cagr: 0.04, volatility: 0.23, inflation: 0.046 },
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
    m = (1 + cagr) * Math.exp((vol * vol) / (2 * m * m));
  }
  return m - 1;
}
