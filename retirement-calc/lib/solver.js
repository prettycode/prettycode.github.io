/* exported startSolver, AMOUNT_LIMITS, solverAmountRange */

// Shared by the solver, sidebar sliders, and explanatory text.
const AMOUNT_LIMITS = {
  balance: { min: 100_000, max: 10_000_000, step: 50_000 },
  withdrawal: { min: 10_000, max: 300_000, step: 1_000 },
};

// Search only amounts the controls can retain, on the existing slider grids.
function solverAmountRange(params, solveFor) {
  const balance = solveFor === "balance";
  const limits = AMOUNT_LIMITS[balance ? "balance" : "withdrawal"];
  return {
    ...limits,
    min: balance
      ? Math.max(
          limits.min,
          Math.ceil(params.withdrawal / limits.step) * limits.step,
        )
      : limits.min,
    max: balance
      ? limits.max
      : Math.min(
          limits.max,
          Math.floor(params.balance / limits.step) * limits.step,
        ),
  };
}

function startSolver(
  params,
  solveFor,
  targetSuccessRate,
  onProgress = () => {},
) {
  const target = targetSuccessRate / 100;
  const baseParams = { ...params, runs: 100_000, seed: SIM_SEED };
  let request;
  let cancelled = false;
  const checkCancelled = () => {
    if (cancelled) {
      throw Object.assign(new Error("Cancelled"), { name: "AbortError" });
    }
  };
  const candidate = (amount) => {
    const next = { ...baseParams, [solveFor]: amount };
    if (solveFor === "retirementDelay") {
      next.years = params.planThroughYears - amount;
    }
    const spendingPlan = calculateSpendingPlan({
      ...next,
      upfrontYears: next.years,
      inflationAdjustedBucket: next.featureFlags?.inflationAdjustedBucket,
    });
    next.upfrontYears = Math.min(
      params.upfrontYears,
      maxAffordableBucketYears(next.balance, spendingPlan),
    );
    return next;
  };
  const probe = async (next) => {
    checkCancelled();
    request = startSimulation(next);
    const result = await request.promise;
    checkCancelled();
    return result.successRate >= target;
  };
  const promise = (async () => {
    if (solveFor === "retirementDelay") {
      const maxDelay = params.planThroughYears - 1;
      for (let delay = 0; delay <= maxDelay; delay++) {
        const passes = await probe(candidate(delay));
        onProgress((delay + 1) / (maxDelay + 1));
        if (passes) {
          return { amount: delay, limit: delay === 0 ? "minimum" : null };
        }
      }
      return { amount: null, limit: "maximum" };
    }

    const solvingBalance = solveFor === "balance";
    const { min, max, step } = solverAmountRange(params, solveFor);
    // Changing bucket duration changes the spending schedule and may reverse
    // the success curve. Bisect only within spans with a constant bucket.
    const groups = [];
    for (let amount = min; amount <= max; amount += step) {
      const next = candidate(amount);
      const group = groups.at(-1);
      if (group && group.bucket === next.upfrontYears) {
        group.hi = amount;
      } else {
        groups.push({ lo: amount, hi: amount, bucket: next.upfrontYears });
      }
    }
    if (!solvingBalance) {
      groups.reverse();
    }
    const finish = (amount, passes = true) => ({
      amount,
      limit: !passes
        ? solvingBalance
          ? "maximum"
          : "minimum"
        : solvingBalance && amount === min
          ? "minimum"
          : !solvingBalance && amount === max
            ? "maximum"
            : null,
    });
    for (let i = 0; i < groups.length; i++) {
      let { lo, hi } = groups[i];
      const best = solvingBalance ? lo : hi;
      const worst = solvingBalance ? hi : lo;
      if (await probe(candidate(best))) {
        onProgress(1);
        return finish(best);
      }
      if (best !== worst && (await probe(candidate(worst)))) {
        while (hi - lo > step) {
          const mid = lo + Math.floor((hi - lo) / step / 2) * step;
          const passes = await probe(candidate(mid));
          if (solvingBalance ? passes : !passes) {
            hi = mid;
          } else {
            lo = mid;
          }
        }
        onProgress(1);
        return finish(solvingBalance ? hi : lo);
      }
      onProgress((i + 1) / groups.length);
    }
    return finish(solvingBalance ? max : min, false);
  })();
  return {
    promise,
    cancel() {
      cancelled = true;
      request?.cancel();
    },
  };
}
