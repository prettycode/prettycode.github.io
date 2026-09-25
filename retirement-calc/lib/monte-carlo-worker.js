// ─── Monte Carlo Engine (runs in a Web Worker) ──────────────────────────────
// Integer arithmetic throughout the simulation: money in cents, rates in
// basis points (×10⁴), cumulative growth factors in micro-units (×10⁶).
// JS Numbers are IEEE-754 doubles but exact for integers up to 2⁵³ ≈ 9×10¹⁵,
// which covers cents-precision balances to ~$90T — enough headroom for any
// pathological run. Float64Array per-run storage holds those integer cents
// exactly. Only the current and previous year's balances are kept, so memory
// depends on the run count, not the horizon.
// The only float math in this worker is the one-time Gaussian LUT build at
// init; the per-run hot loop is purely integer.

const CENTS_PER_DOLLAR = 100;

const BP = 10000; // per-period rates: return, vol, inflation
const MICRO = 1000000; // cumulative factors: (1+inflation)^y
const GS = 10000000; // Gaussian sample scale (~7-digit per-sample resolution)

// xorshift32 — integer PRNG, 2³²-1 period. Replaces Math.random() so the
// hot loop stays in int32 land.
let rngState = 1;
// Each run gets its own stream derived from (seed, run index), so run r sees
// the same returns in every simulation with the same seed, however many draws
// earlier runs consumed. The solver relies on this: probes that differ only in
// the searched amount compare the same market paths. Murmur3's finalizer
// spreads consecutive run indices across the state space.
function seedRun(seed, r) {
  let h = (seed ^ Math.imul(r + 1, 0x9e3779b9)) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  rngState = h === 0 ? 1 : h;
}
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
    const a1 = -39.69683028665376,
      a2 = 220.9460984245205,
      a3 = -275.9285104469687,
      a4 = 138.357751867269,
      a5 = -30.66479806614716,
      a6 = 2.506628277459239;
    const b1 = -54.47609879822406,
      b2 = 161.5858368580409,
      b3 = -155.6989798598866,
      b4 = 66.80131188771972,
      b5 = -13.28068155288572;
    const c1 = -0.007784894002430293,
      c2 = -0.3223964580411365,
      c3 = -2.400758277161838,
      c4 = -2.549732539343734,
      c5 = 4.374664141464968,
      c6 = 2.938163982698783;
    const d1 = 0.007784695709041462,
      d2 = 0.3224671290700398,
      d3 = 2.445134137142996,
      d4 = 3.754408661907416;
    const pLow = 0.02425,
      pHigh = 1 - pLow;
    let q, r;
    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (
        (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
        ((((d1 * q + d2) * q + d3) * q + d4) * q + 1)
      );
    }
    if (p <= pHigh) {
      q = p - 0.5;
      r = q * q;
      return (
        ((((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q) /
        (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1)
      );
    }
    q = Math.sqrt(-2 * Math.log(1 - p));
    return (
      -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
      ((((d1 * q + d2) * q + d3) * q + d4) * q + 1)
    );
  }
  for (let i = 0; i < GAUSS_LUT_SIZE; i++) {
    GAUSS_LUT[i] = Math.round(invNormCDF((i + 0.5) / GAUSS_LUT_SIZE) * GS);
  }
})();

function gaussInt() {
  return GAUSS_LUT[nextU32() >>> 16];
}

// Iterative Floyd quickselect with median-of-three pivot. After return, a[k]
// holds the value that a full sort of a[l..r] would place at index k, with
// a[l..k-1] all ≤ a[k] and a[k+1..r] all ≥ a[k]. We only need 5 quantile
// indices per year, not a full ordering — O(n) selection beats O(n log n)
// sort across 40+ year-arrays of 1M elements (the dominant post-loop cost).
function quickselect(a, k, l, r) {
  while (true) {
    if (r - l <= 1) {
      if (r - l === 1 && a[r] < a[l]) {
        const t = a[l];
        a[l] = a[r];
        a[r] = t;
      }
      return;
    }
    const mid = (l + r) >>> 1;
    let t = a[mid];
    a[mid] = a[l + 1];
    a[l + 1] = t;
    if (a[l] > a[r]) {
      t = a[l];
      a[l] = a[r];
      a[r] = t;
    }
    if (a[l + 1] > a[r]) {
      t = a[l + 1];
      a[l + 1] = a[r];
      a[r] = t;
    }
    if (a[l] > a[l + 1]) {
      t = a[l];
      a[l] = a[l + 1];
      a[l + 1] = t;
    }
    const pivot = a[l + 1];
    let i = l + 1,
      j = r;
    while (true) {
      do {
        i++;
      } while (a[i] < pivot);
      do {
        j--;
      } while (a[j] > pivot);
      if (j < i) {
        break;
      }
      t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    a[l + 1] = a[j];
    a[j] = pivot;
    if (j >= k) {
      r = j - 1;
    }
    if (j <= k) {
      l = j + 1;
    }
  }
}

function runSimulation({
  balance,
  withdrawal,
  returnRate,
  volatility,
  inflation,
  years,
  runs,
  upfrontYears,
  retirementDelay = 0,
  currentAge,
  featureFlags = {},
  seed = Date.now(),
}) {
  // Only fund spending within the retirement horizon, excluding the delay.
  upfrontYears = Math.min(upfrontYears, years);
  years += retirementDelay;
  // Boundary: convert UI inputs to integer scales once on entry.
  const balCents = Math.round(balance * CENTS_PER_DOLLAR);
  const wdCents = Math.round(withdrawal * CENTS_PER_DOLLAR);
  const returnBp = Math.round(returnRate * BP);
  const volBp = Math.round(volatility * BP);
  const inflMicro = Math.round(inflation * MICRO);

  // Cumulative inflation factor in MICRO scale, built iteratively — bounds
  // drift to ≤1 part per 10⁶ per compounding step (vs the bp-scale 1-in-10⁴
  // that would drift visibly over 50 years).
  const inflPow = new Float64Array(years + 1);
  inflPow[0] = MICRO;
  for (let y = 1; y <= years; y++) {
    inflPow[y] = Math.floor((inflPow[y - 1] * (MICRO + inflMicro)) / MICRO);
  }
  // The input is in today's dollars; the bucket starts at retirement's
  // purchasing-power equivalent.
  const retirementWdCents = Math.floor(
    (wdCents * inflPow[retirementDelay]) / MICRO,
  );

  // Upfront cash bucket: if upfrontYears > 1, year 1 withdraws a lump sum that
  // funds years 1..upfrontYears, and no further withdrawals happen until year
  // upfrontYears+1. When upfrontYears === 1 this collapses to the normal flow.
  // The bucket is held as idle cash. bucketYearCents[i] is what bucket year
  // i+1 pays: the flat retirement-year amount, or with inflationAdjustedBucket
  // the same inflated amount a no-bucket plan would draw that year.
  // bucketPaidCents[k] is the total paid by the end of bucket year k, so the
  // lump sum is bucketPaidCents[N].
  const isLumpSum = upfrontYears > 1;
  const bucketYearCents = new Float64Array(upfrontYears);
  const bucketPaidCents = new Float64Array(upfrontYears + 1);
  for (let i = 0; i < upfrontYears; i++) {
    bucketYearCents[i] = featureFlags.inflationAdjustedBucket
      ? Math.floor((wdCents * inflPow[retirementDelay + i]) / MICRO)
      : retirementWdCents;
    bucketPaidCents[i + 1] = bucketPaidCents[i] + bucketYearCents[i];
  }
  const lumpSumCents = isLumpSum ? bucketPaidCents[upfrontYears] : 0;

  // Years run on the outside and runs on the inside, so only this year's and
  // last year's balances are alive at once and memory stays flat in the
  // horizon. Each run keeps its RNG state between years, so it draws exactly
  // the stream it would draw running all of its years back to back.
  const rngStates = new Uint32Array(runs);
  for (let r = 0; r < runs; r++) {
    seedRun(seed, r);
    rngStates[r] = rngState;
  }
  let balances = new Float64Array(runs).fill(balCents);
  let previousBalances = new Float64Array(runs);

  const bucketFunding = new Float64Array(runs);
  const totalDrawn = new Float64Array(runs);
  const totalDrawnToday = new Float64Array(runs);
  const lastDraw = new Float64Array(runs);
  const lastDrawToday = new Float64Array(runs);
  // The portfolio excludes cash transferred to the bucket. Record the year
  // that cash is spent separately so the risk chart counts both resources.
  const bucketExhaustionYears = new Uint32Array(runs);

  // Boundary: emit dollars (integer cents → integer dollars) so the React
  // side's fmtMoney/fmtPct keep their existing signatures.
  const c2d = (c) => Math.floor(c / CENTS_PER_DOLLAR);

  // Chain the quantile selections so each one only searches the half of the
  // array left unresolved by its predecessor: p50 splits the array, quartiles
  // work on each half, deciles on the relevant quarter. With 1M runs that's
  // ~n + n/2 + n/4 + n/4 + n/4 ≈ 2.25n comparisons per year vs ~n log n ≈ 20n
  // for a full sort.
  const k10 = Math.floor((runs * 10) / 100);
  const k25 = Math.floor((runs * 25) / 100);
  const k50 = Math.floor((runs * 50) / 100);
  const k75 = Math.floor((runs * 75) / 100);
  const k90 = Math.floor((runs * 90) / 100);
  const last = runs - 1;

  // Select on reusable scratch storage: keep each run's yearly balances
  // aligned so total balances and gains are computed per run, before quantiles.
  const scratch = new Float64Array(runs);
  const quantiles = () => {
    quickselect(scratch, k50, 0, last);
    quickselect(scratch, k25, 0, k50 - 1);
    quickselect(scratch, k10, 0, k25 - 1);
    quickselect(scratch, k75, k50 + 1, last);
    quickselect(scratch, k90, k75 + 1, last);
    return Object.fromEntries(
      [
        ["p10", k10],
        ["p25", k25],
        ["p50", k50],
        ["p75", k75],
        ["p90", k90],
      ].map(([key, index]) => [key, c2d(scratch[index])]),
    );
  };
  const medianCents = (values) => {
    if (values) {
      scratch.set(values);
    }
    quickselect(scratch, k50, 0, last);
    return scratch[k50];
  };
  const median = (values) => c2d(medianCents(values));
  const cashAt = (r, y) =>
    y <= retirementDelay
      ? 0
      : Math.max(
          0,
          bucketFunding[r] -
            bucketPaidCents[Math.min(y - retirementDelay, upfrontYears)],
        );
  const realBalances = (values, y) =>
    Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        (value * MICRO) / inflPow[y],
      ]),
    );
  const depletionYears = Object.fromEntries(
    [0.1, 0.25, 0.5, 0.75, 0.9].map((p) => [p, null]),
  );
  // Set once every run has funded its bucket, in retirement year 1.
  let medianBucketFunding = 0;
  // One public record per year, including year 0 (today). start/endBalance
  // and afterWithdrawal describe investments; total balances include cash.
  // actual is the median portfolio draw, spending includes bucket payments,
  // and growth is the median individual gain. Depletion always includes cash.
  const yearData = [];
  let previousInvestedCents;
  let portfolioDepletion = null;
  for (let y = 0; y <= years; y++) {
    const retirementYear = y - retirementDelay;
    let intendedCents = 0;
    if (y > 0) {
      [previousBalances, balances] = [balances, previousBalances];
      if (retirementYear <= 0) {
        intendedCents = 0;
      } else if (isLumpSum && retirementYear === 1) {
        intendedCents = lumpSumCents;
      } else if (isLumpSum && retirementYear <= upfrontYears) {
        intendedCents = 0;
      } else {
        intendedCents = Math.floor((wdCents * inflPow[y - 1]) / MICRO);
      }

      for (let r = 0; r < runs; r++) {
        let bal = previousBalances[r];
        if (isLumpSum && retirementYear === 1 && bal > 0 && lumpSumCents > 0) {
          // An underfunded bucket only lasts as long as the money actually
          // available. Allocate it to the earliest spending years first.
          const fundedCents = Math.min(bal, lumpSumCents);
          bucketFunding[r] = fundedCents;
          let lastCashYear = 1;
          while (bucketPaidCents[lastCashYear] < fundedCents) {
            lastCashYear++;
          }
          bucketExhaustionYears[r] = retirementDelay + lastCashYear;
        }
        const drawn = Math.min(bal, intendedCents);
        if (drawn > 0) {
          const drawnToday = Math.floor((drawn * MICRO) / inflPow[y - 1]);
          totalDrawn[r] += drawn;
          totalDrawnToday[r] += drawnToday;
          lastDraw[r] = drawn;
          lastDrawToday[r] = drawnToday;
        }

        // An empty portfolio stays empty and draws no more returns.
        bal -= intendedCents;
        if (bal <= 0) {
          balances[r] = 0;
          continue;
        }

        // Per-year growth factor in bp: BP + returnBp + volBp·gauss/GS.
        // (volBp·gauss) ≤ 3000·5e7 ≈ 1.5e11, fits Number exactly; /GS lands
        // back in bp range. | 0 truncates the small int32 result.
        rngState = rngStates[r];
        const shockBp = ((volBp * gaussInt()) / GS) | 0;
        rngStates[r] = rngState;
        let factorBp = BP + returnBp + shockBp;
        if (factorBp < 0) {
          factorBp = 0;
        } // a >100% loss can't push bal below 0
        balances[r] = Math.floor((bal * factorBp) / BP);
      }

      if (retirementYear === 1) {
        medianBucketFunding = medianCents(bucketFunding);
      }
    }

    let depletedCount = 0;
    let portfolioEmptyCount = 0;
    for (let r = 0; r < runs; r++) {
      if (balances[r] === 0) {
        portfolioEmptyCount++;
        if (y >= bucketExhaustionYears[r]) {
          depletedCount++;
        }
      }
    }
    scratch.set(balances);
    const endBalance = quantiles();
    const investedCents = Object.fromEntries(
      [
        ["p10", k10],
        ["p25", k25],
        ["p50", k50],
        ["p75", k75],
        ["p90", k90],
      ].map(([key, index]) => [key, scratch[index]]),
    );
    const previous = yearData[y - 1];
    const startBalance = previous ? previous.endBalance : endBalance;
    const afterWithdrawal = Object.fromEntries(
      Object.keys(endBalance).map((key) => [
        key,
        c2d(
          Math.max(
            0,
            (previousInvestedCents ?? investedCents)[key] - intendedCents,
          ),
        ),
      ]),
    );
    let totalEndBalance = endBalance;
    if (isLumpSum && retirementYear > 0 && retirementYear < upfrontYears) {
      for (let r = 0; r < runs; r++) {
        scratch[r] = balances[r] + cashAt(r, y);
      }
      totalEndBalance = quantiles();
    }
    const depletionRate = depletedCount / runs;
    for (const threshold of Object.keys(depletionYears)) {
      if (
        depletionYears[threshold] === null &&
        depletionRate >= Number(threshold)
      ) {
        depletionYears[threshold] = y;
      }
    }
    // Portfolio line termination is distinct from cash-aware plan depletion.
    const startDepleted = y > 0 && previousInvestedCents.p50 <= intendedCents;
    if (
      !portfolioDepletion &&
      y > 0 &&
      (startDepleted || portfolioEmptyCount / runs > 0.5)
    ) {
      portfolioDepletion = { year: y, startDepleted };
    }
    const actualCents =
      y > 0 ? Math.min(previousInvestedCents.p50, intendedCents) : 0;
    // Fixed spending is monotone in funded cash, so its median can be
    // transformed directly without allocating another per-year run array.
    const cashBalance =
      retirementYear <= 0
        ? 0
        : c2d(
            Math.max(
              0,
              medianBucketFunding -
                bucketPaidCents[Math.min(retirementYear, upfrontYears)],
            ),
          );
    const spending =
      y === 0 || retirementYear <= 0
        ? 0
        : isLumpSum && retirementYear <= upfrontYears
          ? c2d(
              Math.min(
                bucketYearCents[retirementYear - 1],
                Math.max(
                  0,
                  medianBucketFunding - bucketPaidCents[retirementYear - 1],
                ),
              ),
            )
          : c2d(actualCents);
    for (let r = 0; r < runs; r++) {
      scratch[r] =
        y === 0
          ? 0
          : balances[r] - Math.max(0, previousBalances[r] - intendedCents);
    }
    const growth = median();
    yearData.push({
      year: y,
      startAge:
        currentAge === undefined ? null : currentAge + Math.max(0, y - 1),
      endAge: currentAge === undefined ? null : currentAge + y,
      startBalance,
      endBalance,
      afterWithdrawal,
      totalStartBalance: previous ? previous.totalEndBalance : totalEndBalance,
      totalEndBalance,
      totalEndBalanceToday: realBalances(totalEndBalance, y),
      cashBalance,
      spending,
      growth,
      intended: c2d(intendedCents),
      actual: c2d(actualCents),
      depletionRate,
    });
    previousInvestedCents = investedCents;
    self.postMessage({ type: "progress", pct: y / years });
  }
  const ending = yearData[years];
  const summary = {
    successRate: 1 - ending.depletionRate,
    medianEnding: ending.totalEndBalance.p50,
    medianEndingToday: ending.totalEndBalanceToday.p50,
    medianDepletionYear: depletionYears[0.5],
    medianDepletionAge:
      currentAge === undefined || depletionYears[0.5] === null
        ? null
        : currentAge + depletionYears[0.5],
    endingAge: ending.endAge,
    lastWithdrawal: median(lastDraw),
    lastWithdrawalToday: median(lastDrawToday),
    totalDrawn: median(totalDrawn),
    totalDrawnToday: median(totalDrawnToday),
    depletionYears,
  };
  return {
    yearData,
    summary,
    portfolioDepletion,
    years,
    currentAge,
    retirementDelay,
    runs,
    lumpSum: c2d(lumpSumCents),
    // Solver probes use the same cash-aware success calculation.
    successRate: summary.successRate,
  };
}

self.onmessage = function (e) {
  if (e.data.type === "run") {
    const result = runSimulation(e.data.params);
    self.postMessage({ type: "done", result: result });
  }
};
