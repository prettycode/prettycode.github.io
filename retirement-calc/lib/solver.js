/* exported startSolver, AMOUNT_LIMITS */

// Shared by the solver, sidebar sliders, and explanatory text.
const AMOUNT_LIMITS = {
  balance: { min: 100_000, max: 10_000_000, step: 50_000 },
  withdrawal: { min: 10_000, max: 300_000, step: 1_000 },
};

// Like startSimulation, a solver request exposes a promise and cancellation.
// params contains the fixed simulation assumptions; solveFor selects the one
// amount or retirement delay to vary. For delay searches, planThroughYears
// fixes the horizon from today. targetSuccessRate is a percentage.
function startSolver(
  params,
  solveFor,
  targetSuccessRate,
  onProgress = () => {},
) {
  const solvingBalance = solveFor === "balance";
  const TARGET = targetSuccessRate / 100;
  const {
    min: MIN_AMOUNT,
    max: MAX_AMOUNT,
    step: STEP,
  } = AMOUNT_LIMITS[solvingBalance ? "balance" : "withdrawal"];
  const MAX_ITER = 10;
  const baseParams = { ...params, runs: 100_000 };
  let request;
  let cancelled = false;
  let step = 0;

  const checkCancelled = () => {
    if (cancelled) {
      throw Object.assign(new Error("Cancelled"), { name: "AbortError" });
    }
  };
  const probe = async (amount) => {
    checkCancelled();
    request = startSimulation({ ...baseParams, [solveFor]: amount });
    const result = await request.promise;
    checkCancelled();
    return result.successRate;
  };
  const tick = () => onProgress(++step / (MAX_ITER + 2));

  // Search for the lowest passing balance or highest passing withdrawal.
  // Probe endpoints to detect range limits, then bisect on the slider grid.
  const promise = (async () => {
    if (solveFor === "retirementDelay") {
      const maxDelay = params.planThroughYears - 1;
      // Delay is not necessarily monotonic: inflation and investment risk can
      // outweigh growth. Check every whole year to find the earliest match.
      for (let delay = 0; delay <= maxDelay; delay++) {
        checkCancelled();
        request = startSimulation({
          ...baseParams,
          retirementDelay: delay,
          years: params.planThroughYears - delay,
        });
        const result = await request.promise;
        checkCancelled();
        onProgress((delay + 1) / (maxDelay + 1));
        if (result.successRate >= TARGET) {
          return { amount: delay, limit: delay === 0 ? "minimum" : null };
        }
      }
      return { amount: null, limit: "maximum" };
    }
    const loRate = await probe(MIN_AMOUNT);
    tick();
    if (solvingBalance ? loRate >= TARGET : loRate < TARGET) {
      return { amount: MIN_AMOUNT, limit: "minimum" };
    }
    const hiRate = await probe(MAX_AMOUNT);
    tick();
    if (solvingBalance ? hiRate < TARGET : hiRate >= TARGET) {
      return { amount: MAX_AMOUNT, limit: "maximum" };
    }

    let lo = MIN_AMOUNT;
    let hi = MAX_AMOUNT;
    for (let i = 0; i < MAX_ITER; i++) {
      const mid = Math.round((lo + hi) / 2 / STEP) * STEP;
      if (mid <= lo || mid >= hi) {
        break;
      }
      const rate = await probe(mid);
      if (solvingBalance ? rate < TARGET : rate >= TARGET) {
        lo = mid;
      } else {
        hi = mid;
      }
      tick();
    }
    return { amount: solvingBalance ? hi : lo, limit: null };
  })();

  return {
    promise,
    cancel() {
      cancelled = true;
      request?.cancel();
    },
  };
}
