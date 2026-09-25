const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { test } = require("node:test");

function engine() {
  const context = vm.createContext({ self: { postMessage() {} } });
  vm.runInContext(
    fs.readFileSync("lib/monte-carlo-worker.js", "utf8"),
    context,
  );
  return context;
}

const context = engine();
const simulate = (overrides = {}) =>
  context.runSimulation({
    balance: 100_000,
    withdrawal: 20_000,
    years: 10,
    runs: 100,
    upfrontYears: 5,
    retirementDelay: 0,
    currentAge: 60,
    returnRate: 0,
    volatility: 0,
    inflation: 0,
    ...overrides,
  });

test("bucket cash connects headline depletion, risk milestones, and schedule", () => {
  const result = simulate();
  assert.equal(result.portfolioDepletion.year, 1);
  assert.equal(result.summary.medianDepletionYear, 5);
  assert.equal(result.summary.medianDepletionAge, 65);
  assert.equal(result.summary.depletionYears[0.5], 5);
  assert.equal(result.summary.successRate, 0);
  assert.equal(result.summary.totalDrawn, 100_000);
  for (const row of result.yearData) {
    assert.equal(row.depletionRate, row.year >= 5 ? 1 : 0);
    assert.equal(
      row.totalEndBalance.p50,
      Math.max(0, 100_000 - row.year * 20_000),
    );
    if (row.year > 0) {
      assert.equal(row.endBalance.p50, 0);
      assert.equal(row.cashBalance, row.totalEndBalance.p50);
      assert.equal(row.actual, row.year === 1 ? 100_000 : 0);
      assert.equal(row.spending, row.year <= 5 ? 20_000 : 0);
      assert.equal(row.growth, 0);
    }
  }
});

test("partial buckets report actual funding, spending, and depletion", () => {
  const result = simulate({ balance: 50_000 });
  assert.deepEqual(
    Array.from(result.yearData.slice(1, 5), (row) => row.spending),
    [20_000, 20_000, 10_000, 0],
  );
  assert.equal(result.yearData[1].intended, 100_000);
  assert.equal(result.yearData[1].actual, 50_000);
  assert.equal(result.summary.totalDrawn, 50_000);
  assert.equal(result.summary.medianDepletionAge, 63);
});

test("delay and inflation are included in the worker's ages and real amounts", () => {
  const result = simulate({
    balance: 72_000,
    withdrawal: 20_000,
    years: 5,
    upfrontYears: 3,
    retirementDelay: 1,
    inflation: 0.2,
  });
  assert.equal(result.yearData[1].spending, 0);
  assert.equal(result.yearData[1].actual, 0);
  assert.equal(result.yearData[2].actual, 72_000);
  assert.equal(result.yearData[2].spending, 24_000);
  assert.equal(result.yearData[2].cashBalance, 48_000);
  assert.equal(result.yearData[2].startAge, 61);
  assert.equal(result.summary.medianDepletionAge, 64);
  assert.equal(result.summary.endingAge, 66);
  assert.equal(result.summary.lastWithdrawalToday, 60_000);
  assert.equal(result.summary.totalDrawnToday, 60_000);
});

test("inflationAdjustedBucket: funded bucket years spend what a no-bucket plan intends", () => {
  const plan = {
    balance: 1_000_000,
    years: 8,
    upfrontYears: 4,
    retirementDelay: 2,
    inflation: 0.05,
    featureFlags: { inflationAdjustedBucket: true },
  };
  const bucket = simulate(plan);
  const noBucket = simulate({ ...plan, upfrontYears: 1 });
  for (let y = 3; y <= 10; y++) {
    assert.equal(bucket.yearData[y].spending, noBucket.yearData[y].intended);
  }
  const bucketYears = noBucket.yearData.slice(3, 7);
  const lumpSum = bucketYears.reduce((sum, row) => sum + row.intended, 0);
  // Row amounts are floored from cents to dollars, so sums can differ by $1 each.
  assert.ok(Math.abs(bucket.lumpSum - lumpSum) <= 4);
  const cashAfterTwoYears =
    bucket.lumpSum - bucketYears[0].intended - bucketYears[1].intended;
  assert.ok(Math.abs(bucket.yearData[4].cashBalance - cashAfterTwoYears) <= 2);
});

test("inflationAdjustedBucket: partial funding runs out on the inflated schedule", () => {
  // Bucket years pay 20,000 / 24,000 / 28,800; 50,000 lasts into year 3.
  const result = simulate({
    balance: 50_000,
    years: 5,
    upfrontYears: 3,
    inflation: 0.2,
    featureFlags: { inflationAdjustedBucket: true },
  });
  assert.deepEqual(
    Array.from(result.yearData.slice(1, 5), (row) => row.spending),
    [20_000, 24_000, 6_000, 0],
  );
  assert.equal(result.summary.medianDepletionAge, 63);
});

test("without inflationAdjustedBucket, bucket years stay flat", () => {
  const result = simulate({
    balance: 1_000_000,
    upfrontYears: 3,
    inflation: 0.2,
  });
  assert.equal(result.lumpSum, 60_000);
  assert.deepEqual(
    Array.from(result.yearData.slice(1, 5), (row) => row.spending),
    [20_000, 20_000, 20_000, 34_560],
  );
});

test("an invested loss does not erase cash available for later spending", () => {
  const result = simulate({ balance: 110_000, returnRate: -1 });
  assert.equal(result.yearData[1].endBalance.p50, 0);
  assert.equal(result.yearData[1].totalEndBalance.p50, 80_000);
  assert.equal(result.yearData[1].growth, -10_000);
  assert.equal(result.summary.medianDepletionAge, 65);
});

test("no-bucket totals equal investments; rounded zero is not depletion", () => {
  const result = simulate({
    balance: 1,
    withdrawal: 0,
    upfrontYears: 1,
    returnRate: -0.5,
    years: 1,
  });
  assert.equal(result.yearData[1].totalEndBalance.p50, 0);
  assert.equal(result.yearData[1].depletionRate, 0);
  assert.equal(result.summary.medianDepletionAge, null);
  assert.equal(result.portfolioDepletion, null);
  assert.equal(result.summary.successRate, 1);
});

test("exact exhaustion and surviving plans use the same year-end convention", () => {
  const depleted = simulate({ upfrontYears: 1, years: 5 });
  assert.equal(depleted.summary.medianDepletionAge, 65);
  assert.equal(depleted.yearData[5].depletionRate, 1);
  const surviving = simulate({ balance: 200_000, years: 5 });
  assert.equal(surviving.summary.medianDepletionAge, null);
  assert.equal(surviving.summary.successRate, 1);
  assert.equal(surviving.summary.medianEnding, 100_000);
  assert.equal(
    surviving.summary.medianEnding,
    surviving.yearData[5].totalEndBalance.p50,
  );
  assert.equal(surviving.summary.lastWithdrawal, 100_000);
});

test("growth is the median of individual gains, not the change in median balances", () => {
  const controlled = engine();
  let sample = 0;
  // Half grow by 100%, then lose 50%; half lose 50%, then grow by 100%.
  controlled.gaussInt = () =>
    [10_000_000, -5_000_000, -5_000_000, 10_000_000][sample++ % 4];
  const result = controlled.runSimulation({
    balance: 1000,
    withdrawal: 100,
    years: 2,
    runs: 100,
    upfrontYears: 1,
    returnRate: 0,
    volatility: 1,
    inflation: 0,
  });
  assert.equal(result.yearData[2].startBalance.p50, 1800);
  assert.equal(result.yearData[2].afterWithdrawal.p50, 1700);
  assert.equal(result.yearData[2].endBalance.p50, 850);
  assert.equal(result.yearData[2].growth, 350);
});

test("trajectory and risk read the same worker snapshot with separate balance meanings", () => {
  const source = fs
    .readFileSync("lib/chart.jsx", "utf8")
    .replace(/\r\n/g, "\n");
  const component = source.slice(0, source.indexOf("  return (\n    <"));
  const ui = vm.createContext({
    React: { useState: () => [null, () => {}] },
    fmtMoney: String,
    fmtPct: String,
  });
  vm.runInContext(
    `${component}\nreturn { riskAt, stepDown, yearData, summary, portfolioDepletion };\n}`,
    ui,
  );
  const simulation = simulate();
  const chart = ui.PortfolioChart({ simulation });
  assert.equal(chart.yearData, simulation.yearData);
  assert.equal(chart.summary, simulation.summary);
  assert.equal(chart.stepDown("p50", 1), 0);
  assert.equal(chart.portfolioDepletion.year, 1);
  assert.equal(chart.riskAt(1), 0);
  assert.equal(chart.riskAt(chart.summary.medianDepletionYear), 1);
});

test("a 50% depletion milestone includes partial buckets even while the portfolio median is positive", () => {
  const controlled = engine();
  const samples = [
    ...Array(50).fill(-5_000_000),
    ...Array.from({ length: 50 }, () => [5_000_000, 0, 0, 0, 0, 0]).flat(),
  ];
  let sample = 0;
  controlled.gaussInt = () => samples[sample++];
  const result = controlled.runSimulation({
    balance: 100,
    withdrawal: 20,
    years: 5,
    runs: 100,
    upfrontYears: 5,
    retirementDelay: 1,
    currentAge: 60,
    returnRate: 0,
    volatility: 1,
    inflation: 0,
  });
  assert.equal(sample, samples.length);
  assert.equal(result.yearData[3].depletionRate, 0);
  assert.equal(result.yearData[4].depletionRate, 0.5);
  assert.equal(result.yearData[4].endBalance.p50, 50);
  assert.equal(result.summary.depletionYears[0.5], 4);
  assert.equal(result.summary.medianDepletionAge, 64);
  assert.equal(result.summary.successRate, 0.5);
});
