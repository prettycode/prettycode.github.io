// ─── Monte Carlo Engine (runs in a Web Worker) ──────────────────────────────
// Integer arithmetic throughout the simulation: money in cents, rates in
// basis points (×10⁴), cumulative growth factors in micro-units (×10⁶).
// JS Numbers are IEEE-754 doubles but exact for integers up to 2⁵³ ≈ 9×10¹⁵,
// which covers cents-precision balances to ~$90T — enough headroom for any
// pathological run. Float64Array per-year storage holds those integer cents
// exactly and keeps the fast typed-array .sort() for percentile extraction.
// The only float math in this worker is the one-time Gaussian LUT build at
// init; the per-run hot loop is purely integer.

const MONTHS_PER_YEAR = 12;
const CENTS_PER_DOLLAR = 100;

const BP = 10000; // per-period rates: return, vol, inflation
const MICRO = 1000000; // cumulative factors: (1+inflation)^y
const GS = 10000000; // Gaussian sample scale (~7-digit per-sample resolution)

// xorshift32 — integer PRNG, 2³²-1 period. Replaces Math.random() so the
// hot loop stays in int32 land.
let rngState = (Date.now() ^ 0x9e3779b9) | 0;
if (rngState === 0) {
  rngState = 1;
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
  inflationAdjustBucket,
  bucketEarnsTBills,
  tBillRealPremium,
  monthly,
  retirementDelay = 0,
}) {
  // Only fund spending within the retirement horizon, excluding the delay.
  upfrontYears = Math.min(upfrontYears, years);
  years += retirementDelay;
  // Boundary: convert UI inputs to integer scales once on entry.
  const balCents = Math.round(balance * CENTS_PER_DOLLAR);
  const wdCents = Math.round(withdrawal * CENTS_PER_DOLLAR);
  const returnBp = Math.round(returnRate * BP);
  const volBp = Math.round(volatility * BP);
  // Monthly conversions — pick μ_m and σ_m so 12 compounded months match the
  // annual factor's mean AND variance:
  //   E:   (1+μ_m)¹² = 1+r          →  μ_m = (1+r)^(1/12) − 1
  //   Var: ((1+μ_m)² + σ_m²)¹² = (1+r)² + σ²   (12 i.i.d. arithmetic factors)
  // The textbook σ/√12 scaling is for *log* returns; under the arithmetic
  // factor model used here it leaves the year's compounded variance ~22%
  // too high at typical inputs, and the extra volatility drag drags median
  // paths *below* annual mode — masking the spread-withdrawal advantage and
  // reversing the intuitive "monthly should beat annual" outcome.
  const annualA = 1 + returnRate;
  const monthlyA = Math.pow(annualA, 1 / MONTHS_PER_YEAR);
  const monthlySigSq =
    Math.pow(annualA * annualA + volatility * volatility, 1 / MONTHS_PER_YEAR) -
    monthlyA * monthlyA;
  const returnMonthlyBp = Math.round((monthlyA - 1) * BP);
  const volMonthlyBp = Math.round(Math.sqrt(Math.max(0, monthlySigSq)) * BP);
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
    inflPow[y] = Math.floor((inflPow[y - 1] * (MICRO + inflMicro)) / MICRO);
  }
  // The input is in today's dollars; the bucket starts at retirement's
  // purchasing-power equivalent, even when later bucket inflation is off.
  const retirementWdCents = Math.floor(
    (wdCents * inflPow[retirementDelay]) / MICRO,
  );

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
        pow = Math.floor((pow * num) / MICRO);
      }
      lumpSumCents = Math.floor((retirementWdCents * sumMicro) / MICRO);
    } else {
      // ratio = (MICRO + wGrowMicro) / (MICRO + discMicro), tracked in MICRO
      // scale via iterative multiply to avoid pow() drift.
      let ratioPow = MICRO; // ratio^0 = 1
      let sumMicro = 0;
      const num = MICRO + wGrowMicro;
      const den = MICRO + discMicro;
      for (let i = 0; i < upfrontYears - 1; i++) {
        sumMicro += ratioPow;
        ratioPow = Math.floor((ratioPow * num) / den);
      }
      // tBillsCents = retirementWdCents · (1+wGrow) · sumMicro / MICRO. Split into two
      // divides so intermediates stay inside Number-safe int range.
      const grownWdCents = Math.floor((retirementWdCents * num) / MICRO);
      const tBillsCents = Math.floor((grownWdCents * sumMicro) / MICRO);
      lumpSumCents = retirementWdCents + tBillsCents;
    }
  }

  const yearBalances = new Array(years + 1);
  for (let y = 0; y <= years; y++) {
    yearBalances[y] = new Float64Array(runs);
  }
  yearBalances[0].fill(balCents);

  const withdrawalSumCents = new Float64Array(years + 1);
  // The portfolio excludes cash transferred to the bucket. Record the year
  // that cash is spent separately so the risk chart counts both resources.
  const bucketExhaustionYears = new Uint32Array(runs);
  const bucketCosts = [];
  if (isLumpSum) {
    const growth = inflationAdjustBucket ? 1 + inflMicro / MICRO : 1;
    const discount = bucketEarnsTBills ? 1 + tBillMicro / MICRO : 1;
    let cumulative = 0;
    for (let y = 1; y <= upfrontYears; y++) {
      cumulative +=
        (retirementWdCents * Math.pow(growth, y - 1)) /
        Math.pow(discount, Math.max(0, y - 2));
      // Match the integer lump sum exactly at the final boundary.
      bucketCosts.push(
        y === upfrontYears
          ? lumpSumCents
          : Math.min(lumpSumCents, Math.floor(cumulative)),
      );
    }
  }
  let survived = 0;
  const reportEvery = Math.max(1, Math.floor(runs / 100));

  for (let r = 0; r < runs; r++) {
    let bal = balCents;
    let depleted = false;

    for (let y = 1; y <= years; y++) {
      const retirementYear = y - retirementDelay;
      let actualW;
      let isLumpYear = false; // year 1 lump-sum draw — taken once at year start
      let isBucketFunded = false; // years 2..upfrontYears — bucket pays, no portfolio draw
      if (retirementYear <= 0) {
        actualW = 0;
        isBucketFunded = true; // Growth-only years use annual return sampling.
      } else if (isLumpSum) {
        if (retirementYear === 1) {
          actualW = lumpSumCents;
          isLumpYear = true;
          if (bal > 0 && lumpSumCents > 0) {
            // An underfunded bucket only lasts as long as the money actually
            // available. Allocate it to the earliest spending years first.
            const fundedCents = Math.min(bal, lumpSumCents);
            const lastCashYear =
              fundedCents === lumpSumCents
                ? upfrontYears
                : bucketCosts.findIndex((cost) => cost >= fundedCents) + 1;
            bucketExhaustionYears[r] = retirementDelay + lastCashYear;
          }
        } else if (retirementYear <= upfrontYears) {
          actualW = 0;
          isBucketFunded = true;
        } else {
          actualW = Math.floor((wdCents * inflPow[y - 1]) / MICRO);
        }
      } else {
        actualW = Math.floor((wdCents * inflPow[y - 1]) / MICRO);
      }
      withdrawalSumCents[y] += actualW;

      if (depleted) {
        yearBalances[y][r] = 0;
        continue;
      }

      // Monthly mode sub-steps the post-bucket years only: 12 draws of W/12,
      // each followed by a monthly return shock. Lump-sum and bucket-funded
      // years stay annual — the lump leaves all at once, and bucket years
      // have no portfolio draw, so sub-stepping them would only inflate the
      // RNG cost without changing the statistics.
      if (monthly && !isLumpYear && !isBucketFunded) {
        const monthlyW = Math.floor(actualW / MONTHS_PER_YEAR);
        const lastW = actualW - (MONTHS_PER_YEAR - 1) * monthlyW;
        for (let m = 0; m < MONTHS_PER_YEAR; m++) {
          const w = m === MONTHS_PER_YEAR - 1 ? lastW : monthlyW;
          bal -= w;
          if (bal <= 0) {
            bal = 0;
            depleted = true;
            break;
          }
          const shockBp = ((volMonthlyBp * gaussInt()) / GS) | 0;
          let factorBp = BP + returnMonthlyBp + shockBp;
          if (factorBp < 0) {
            factorBp = 0;
          }
          bal = Math.floor((bal * factorBp) / BP);
        }
        yearBalances[y][r] = bal;
      } else {
        bal -= actualW;
        if (bal <= 0) {
          bal = 0;
          depleted = true;
          yearBalances[y][r] = 0;
          continue;
        }

        // Per-year growth factor in bp: BP + returnBp + volBp·gauss/GS.
        // (volBp·gauss) ≤ 3000·5e7 ≈ 1.5e11, fits Number exactly; /GS lands
        // back in bp range. | 0 truncates the small int32 result.
        const shockBp = ((volBp * gaussInt()) / GS) | 0;
        let factorBp = BP + returnBp + shockBp;
        if (factorBp < 0) {
          factorBp = 0;
        } // a >100% loss can't push bal below 0
        bal = Math.floor((bal * factorBp) / BP);
        yearBalances[y][r] = bal;
      }
    }

    if (bal > 0) {
      survived++;
    }

    if (r % reportEvery === 0) {
      self.postMessage({ type: "progress", pct: r / runs });
    }
  }

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

  const percentiles = [];
  for (let y = 0; y <= years; y++) {
    const v = yearBalances[y];
    // Count only after both the portfolio and the spending bucket are empty.
    // The last bucket year's spending exhausts the cash by that year-end.
    let depletedCount = 0;
    for (let r = 0; r < runs; r++) {
      if (v[r] === 0 && y >= bucketExhaustionYears[r]) {
        depletedCount++;
      }
    }
    quickselect(v, k50, 0, last);
    quickselect(v, k25, 0, k50 - 1);
    quickselect(v, k10, 0, k25 - 1);
    quickselect(v, k75, k50 + 1, last);
    quickselect(v, k90, k75 + 1, last);
    percentiles.push({
      year: y,
      depletionRate: depletedCount / runs,
      p10: c2d(v[k10]),
      p25: c2d(v[k25]),
      p50: c2d(v[k50]),
      p75: c2d(v[k75]),
      p90: c2d(v[k90]),
      withdrawal: c2d(Math.floor(withdrawalSumCents[y] / runs)),
    });
  }

  const successRate = survived / runs;
  // yearBalances[years] is no longer fully sorted, but k50 holds the median.
  const medianEnding = percentiles[years].p50;

  return {
    percentiles,
    successRate,
    medianEnding,
    runs,
    lumpSum: c2d(lumpSumCents),
    retirementDelay,
  };
}

self.onmessage = function (e) {
  if (e.data.type === "run") {
    const result = runSimulation(e.data.params);
    self.postMessage({ type: "done", result: result });
  }
};
