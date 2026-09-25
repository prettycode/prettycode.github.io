/* exported calculateSpendingPlan */

// Shared by the sidebar and worker. Money is integer cents; cumulative
// inflation factors use micro-units, floored at each compounding step.
function calculateSpendingPlan({
  withdrawal,
  inflation,
  years,
  retirementDelay = 0,
  upfrontYears = years,
  inflationAdjustedBucket = false,
}) {
  const micro = 1_000_000;
  const wdCents = Math.round(withdrawal * 100);
  const inflMicro = Math.round(inflation * micro);
  const totalYears = years + retirementDelay;
  const inflPow = new Float64Array(totalYears + 1);
  const annualSpendingCents = new Float64Array(totalYears + 1);
  inflPow[0] = micro;
  for (let y = 0; y <= totalYears; y++) {
    if (y > 0) {
      inflPow[y] = Math.floor((inflPow[y - 1] * (micro + inflMicro)) / micro);
    }
    annualSpendingCents[y] = Math.floor((wdCents * inflPow[y]) / micro);
  }
  const retirementWdCents = annualSpendingCents[retirementDelay];
  const coveredYears = Math.min(upfrontYears, years);
  const bucketYearCents = new Float64Array(coveredYears);
  const bucketPaidCents = new Float64Array(coveredYears + 1);
  for (let i = 0; i < coveredYears; i++) {
    bucketYearCents[i] = inflationAdjustedBucket
      ? annualSpendingCents[retirementDelay + i]
      : retirementWdCents;
    bucketPaidCents[i + 1] = bucketPaidCents[i] + bucketYearCents[i];
  }
  return {
    inflPow,
    annualSpendingCents,
    retirementWdCents,
    bucketYearCents,
    bucketPaidCents,
    // One year uses normal annual withdrawals, with no upfront transfer.
    lumpSumCents: coveredYears > 1 ? bucketPaidCents[coveredYears] : 0,
  };
}
