const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const context = vm.createContext({ self: { postMessage() {} } });
vm.runInContext(
  fs.readFileSync(path.join(__dirname, "../lib/monte-carlo-worker.js"), "utf8"),
  context,
);
const simulate = (overrides = {}) =>
  context.runSimulation({
    balance: 1000,
    withdrawal: 100,
    returnRate: 0.1,
    volatility: 0,
    inflation: 0,
    years: 2,
    runs: 100,
    upfrontYears: 1,
    inflationAdjustBucket: false,
    bucketEarnsTBills: false,
    tBillRealPremium: 0.005,

    ...overrides,
  });

test("delay adds growth-only years before the full retirement duration", () => {
  const result = simulate({ retirementDelay: 2, inflation: 0.1 });
  assert.equal(result.retirementDelay, 2);
  assert.deepEqual(
    Array.from(result.percentiles, (p) => p.p50),
    [1000, 1100, 1210, 1197, 1171],
  );
  assert.deepEqual(
    Array.from(result.percentiles, (p) => p.withdrawal),
    [0, 0, 0, 121, 133],
  );
  assert.equal(result.successRate, 1);
});

test("oversized cash buckets only fund the retirement horizon", () => {
  for (const years of [1, 3]) {
    for (const retirementDelay of [0, 5]) {
      for (const inflationAdjustBucket of [false, true]) {
        for (const bucketEarnsTBills of [false, true]) {
          const params = {
            years,
            retirementDelay,

            inflationAdjustBucket,
            bucketEarnsTBills,
            inflation: 0.03,
          };
          assert.deepEqual(
            simulate({ ...params, upfrontYears: 10 }),
            simulate({ ...params, upfrontYears: years }),
          );
        }
      }
    }
  }
});

test("a two-year bucket does not bankrupt an affordable one-year plan", () => {
  const result = simulate({
    balance: 100_000,
    withdrawal: 60_000,
    years: 1,
    upfrontYears: 2,
    returnRate: 0,
  });
  assert.equal(result.successRate, 1);
  assert.equal(result.percentiles[1].withdrawal, 60_000);
  assert.equal(result.medianEnding, 40_000);
});

test("cash bucket is drawn at retirement, after growth-only years", () => {
  const result = simulate({ retirementDelay: 2, upfrontYears: 2 });
  assert.deepEqual(
    Array.from(result.percentiles, (p) => p.withdrawal),
    [0, 0, 0, 200, 0],
  );
  assert.deepEqual(
    Array.from(result.percentiles, (p) => p.p50),
    [1000, 1100, 1210, 1111, 1222],
  );
});

test("annual withdrawals begin only after the delay", () => {
  const result = simulate({ retirementDelay: 2, returnRate: 0 });
  assert.deepEqual(
    Array.from(result.percentiles, (p) => p.p50),
    [1000, 1000, 1000, 900, 800],
  );
  assert.deepEqual(
    Array.from(result.percentiles, (p) => p.withdrawal),
    [0, 0, 0, 100, 100],
  );
});

test("zero delay preserves immediate retirement and depletion behavior", () => {
  assert.deepEqual(
    Array.from(simulate().percentiles, (p) => p.p50),
    [1000, 990, 979],
  );
  const result = simulate({ retirementDelay: 2, withdrawal: 2000 });
  assert.deepEqual(
    Array.from(result.percentiles, (p) => p.p50),
    [1000, 1100, 1210, 0, 0],
  );
  assert.equal(result.successRate, 0);
});

test("five-year delay preserves the purchasing power of a $150K withdrawal", () => {
  const result = simulate({
    balance: 1_000_000,
    withdrawal: 150_000,
    retirementDelay: 5,
    inflation: 0.03,
    returnRate: 0,
  });
  assert.deepEqual(
    Array.from(result.percentiles.slice(0, 6), (p) => p.withdrawal),
    [0, 0, 0, 0, 0, 0],
  );
  for (let year = 6; year <= 7; year++) {
    const expected = 150_000 * 1.03 ** (year - 1);
    // Micro-scale inflation factors and whole-dollar output truncate slightly.
    assert.ok(Math.abs(result.percentiles[year].withdrawal - expected) < 2);
  }
  assert.ok(
    Math.abs(result.percentiles[6].p50 - (1_000_000 - 150_000 * 1.03 ** 5)) < 2,
  );
  assert.equal(result.successRate, 1);
});

test("delayed buckets include pre-retirement inflation with every bucket option", () => {
  for (const inflationAdjustBucket of [false, true]) {
    for (const bucketEarnsTBills of [false, true]) {
      const result = simulate({
        balance: 10_000,
        returnRate: 0,
        retirementDelay: 2,
        years: 4,
        upfrontYears: 3,
        inflation: 0.1,
        tBillRealPremium: 0,

        inflationAdjustBucket,
        bucketEarnsTBills,
      });
      // $121 at retirement. Later bucket years either stay at $121 or
      // grow to $133.10/$146.41; only the third year earns a year of T-Bills.
      const bucket = inflationAdjustBucket
        ? bucketEarnsTBills
          ? 387
          : 400
        : bucketEarnsTBills
          ? 352
          : 363;
      // T-Bill discount factors can truncate just below a whole dollar.
      assert.ok(Math.abs(result.lumpSum - bucket) <= 1);
      assert.deepEqual(
        Array.from(result.percentiles, (p) => p.withdrawal),
        [0, 0, 0, result.lumpSum, 0, 0, 161],
      );
      assert.equal(result.successRate, 1);
    }
  }
});

test("immediate retirement still inflates only subsequent years", () => {
  const result = simulate({
    retirementDelay: 0,
    returnRate: 0,
    inflation: 0.1,
  });
  assert.deepEqual(
    Array.from(result.percentiles, (p) => p.withdrawal),
    [0, 100, 110],
  );
  assert.deepEqual(
    Array.from(result.percentiles, (p) => p.p50),
    [1000, 900, 790],
  );
});

test("inflation during the delay affects depletion and success-rate probes", () => {
  const result = simulate({
    balance: 220,
    retirementDelay: 2,
    returnRate: 0,
    inflation: 0.1,
  });
  assert.equal(result.percentiles[3].p50, 99);
  assert.equal(result.medianEnding, 0);
  assert.equal(result.successRate, 0);
});
