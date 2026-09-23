// Reading the Odds uses cumulative depletion, including bucket cash.
// Portfolio bands are tested separately below for ordinary non-bucket runs.
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
    monthly: false,
    ...overrides,
  });

const BANDS = [
  ["p10", 0.1],
  ["p25", 0.25],
  ["p50", 0.5],
  ["p75", 0.75],
  ["p90", 0.9],
];

// ~55% failure, chosen so the bands straddle it: p10/p25/p50 reach the axis
// and p75/p90 never do, exercising both sides of every assertion below.
const MIXED = {
  balance: 1_000_000,
  withdrawal: 45_000,
  returnRate: 0.07,
  volatility: 0.2,
  inflation: 0.03,
  years: 30,
  runs: 20_000,
};

test("depletion rates are cumulative and agree with final survival", () => {
  for (const monthly of [false, true]) {
    const result = simulate({ ...MIXED, monthly, retirementDelay: 3 });
    let previous = 0;
    for (const row of result.percentiles) {
      assert.ok(row.depletionRate >= previous);
      assert.ok(row.depletionRate <= 1);
      previous = row.depletionRate;
    }
    assert.ok(Math.abs(previous - (1 - result.successRate)) < 1e-12);
    assert.ok(previous > 0 && previous < 1);
  }
});

test("depletion timing includes delayed retirement and exact exhaustion", () => {
  for (const monthly of [false, true]) {
    const result = simulate({
      balance: 200,
      withdrawal: 100,
      returnRate: 0,
      years: 4,
      retirementDelay: 2,
      monthly,
    });
    assert.deepEqual(
      Array.from(result.percentiles, (p) => p.depletionRate),
      [0, 0, 0, 0, 1, 1, 1],
    );
  }
});

test("positive sub-dollar balances are not counted as depleted", () => {
  const result = simulate({
    balance: 1,
    withdrawal: 0,
    returnRate: -0.5,
    years: 1,
  });
  assert.equal(result.percentiles[1].p50, 0);
  assert.equal(result.percentiles[1].depletionRate, 0);
  assert.equal(result.successRate, 1);
});

test("a fully funded cash bucket delays exhaustion through its final year", () => {
  for (const monthly of [false, true]) {
    for (const retirementDelay of [0, 2]) {
      const result = simulate({
        balance: 200_000,
        withdrawal: 40_000,
        returnRate: 0,
        upfrontYears: 5,
        years: 10,
        retirementDelay,
        monthly,
      });
      assert.equal(result.percentiles[retirementDelay + 1].p50, 0);
      for (const row of result.percentiles) {
        assert.equal(
          row.depletionRate,
          row.year >= retirementDelay + 5 ? 1 : 0,
        );
      }
    }
  }
});

test("an underfunded cash bucket exhausts the actual available money", () => {
  for (const balance of [80_000, 100_000]) {
    const result = simulate({
      balance,
      withdrawal: 40_000,
      returnRate: 0,
      upfrontYears: 5,
      years: 6,
    });
    const exhaustionYear = Math.ceil(balance / 40_000);
    for (const row of result.percentiles) {
      assert.equal(row.depletionRate, row.year >= exhaustionYear ? 1 : 0);
    }
  }
});

test("cash coverage respects inflation and T-Bill sizing", () => {
  for (const inflationAdjustBucket of [false, true]) {
    for (const bucketEarnsTBills of [false, true]) {
      const params = {
        withdrawal: 40_000,
        returnRate: 0,
        inflation: 0.04,
        upfrontYears: 5,
        years: 6,
        inflationAdjustBucket,
        bucketEarnsTBills,
      };
      const sizing = simulate({ ...params, balance: 1_000_000 });
      // The reported lump sum is floored to dollars; one extra dollar fully
      // funds it, and a total investment loss then leaves only bucket cash.
      const result = simulate({
        ...params,
        balance: sizing.lumpSum + 1,
        returnRate: -1,
      });
      assert.equal(result.percentiles[1].p50, 0);
      assert.deepEqual(
        Array.from(result.percentiles, (row) => row.depletionRate),
        [0, 0, 0, 0, 0, 1, 1],
      );
    }
  }
});

function deriveOdds(yearData, options = {}) {
  const source = fs
    .readFileSync(path.join(__dirname, "../lib/outcome-odds.jsx"), "utf8")
    .replace(/\r\n/g, "\n");
  // Execute the component's actual derivation before its JSX render.
  const component = source.slice(0, source.indexOf("  return (\n    <section"));
  const ui = vm.createContext({ fmtMoney: String });
  vm.runInContext(
    `${component}\nreturn { lifespanLadder, firstTenthGone, medianSurvives, successRate };\n}`,
    ui,
  );
  return ui.OutcomeOdds({
    yearData,
    simYears: yearData.length - 1,
    totalRuns: 100,
    retirementDelay: 0,
    inflation: 0,
    ...options,
  });
}

test("lifespan rungs without depletion give failure bounds, not survival odds", () => {
  const { lifespanLadder: rows } = deriveOdds([
    null,
    {
      endBalance: {
        p10: 0,
        p25: 0,
        p50: 0,
        p75: 100,
        p90: 200,
        depletionRate: 0.55,
      },
    },
  ]);
  assert.equal(rows[2].odds, "1 in 2");
  assert.equal(rows[2].lead, "had run out by");
  assert.equal(rows[3].odds, "At most 3 in 4");
  assert.equal(rows[4].odds, "At most 9 in 10");
  for (const row of rows.slice(3)) {
    assert.equal(row.lead, "had run out by");
    assert.equal(row.primary, "the end of year 1");
  }
});

test("odds dates match depletion milestones for full and partial cash buckets", () => {
  for (const balance of [200_000, 100_000, 80_000]) {
    for (const retirementDelay of [0, 2]) {
      const result = simulate({
        balance,
        withdrawal: 40_000,
        returnRate: 0,
        upfrontYears: 5,
        years: 10,
        retirementDelay,
      });
      const yearData = [
        null,
        ...Array.from(result.percentiles.slice(1), (endBalance) => ({
          endBalance,
        })),
      ];
      const odds = deriveOdds(yearData, { retirementDelay, currentAge: 60 });
      const exhaustionYear = retirementDelay + Math.ceil(balance / 40_000);
      assert.equal(odds.firstTenthGone, exhaustionYear);
      assert.equal(odds.successRate, 0);
      assert.equal(odds.medianSurvives, false);
      for (const rung of odds.lifespanLadder) {
        assert.equal(rung.primary, `age ${60 + exhaustionYear}`);
      }
    }
  }
});

test("odds use exact depletion thresholds even when portfolio bands disagree", () => {
  const rates = [0, 0.1, 0.25, 0.5, 0.75, 0.9];
  const yearData = [
    null,
    ...rates.map((depletionRate) => ({
      endBalance: { p10: 0, p25: 0, p50: 0, p75: 0, p90: 0, depletionRate },
    })),
  ];
  const odds = deriveOdds(yearData);
  assert.equal(odds.firstTenthGone, 2);
  assert.deepEqual(
    Array.from(odds.lifespanLadder, (rung) => rung.primary),
    [2, 3, 4, 5, 6].map((y) => `year ${y} of retirement`),
  );
  const beforeExhaustion = deriveOdds(yearData.slice(0, 2));
  assert.equal(beforeExhaustion.firstTenthGone, null);
  assert.equal(beforeExhaustion.successRate, 1);
  assert.equal(beforeExhaustion.medianSurvives, true);
  assert.equal(deriveOdds(yearData.slice(0, 5)).medianSurvives, false);
});

// Portfolio-band crossings, distinct from cash-aware depletion milestones.
const ranOutBy = (result, key) => {
  for (let y = 1; y < result.percentiles.length; y++) {
    if (result.percentiles[y][key] <= 0) {
      return y;
    }
  }
  return null;
};

test("a band sits at $0 exactly when that share of futures has failed", () => {
  const result = simulate(MIXED);
  const failureRate = 1 - result.successRate;
  assert.ok(
    failureRate > 0.1 && failureRate < 0.9,
    `expected a mixed population, got ${failureRate}`,
  );
  const ending = result.percentiles[result.percentiles.length - 1];
  for (const [key, share] of BANDS) {
    // Quantile indices are floor(runs * share), so skip the razor edge where
    // a single run decides it.
    if (Math.abs(failureRate - share) < 1 / MIXED.runs) {
      continue;
    }
    if (failureRate > share) {
      assert.equal(
        ending[key],
        0,
        `${key} should be $0 at ${failureRate} failure`,
      );
    } else {
      assert.ok(
        ending[key] > 0,
        `${key} should be positive at ${failureRate} failure`,
      );
    }
  }
});

test("a band that reaches $0 never recovers, so the first crossing is the only one", () => {
  const result = simulate(MIXED);
  for (const [key] of BANDS) {
    const crossing = ranOutBy(result, key);
    if (crossing === null) {
      continue;
    }
    for (let y = crossing; y < result.percentiles.length; y++) {
      assert.equal(
        result.percentiles[y][key],
        0,
        `${key} recovered after year ${crossing}`,
      );
    }
  }
});

test("a plan that never fails has no band crossings to report", () => {
  const result = simulate({ balance: 100_000, withdrawal: 1000, years: 10 });
  assert.equal(result.successRate, 1);
  for (const [key] of BANDS) {
    assert.equal(ranOutBy(result, key), null);
  }
});

test("a plan that always fails crosses every band in the year the money goes", () => {
  for (const monthly of [false, true]) {
    // $250 funds two $100 draws with no growth; the third empties it.
    const result = simulate({
      balance: 250,
      withdrawal: 100,
      returnRate: 0,
      years: 3,
      monthly,
    });
    assert.equal(result.successRate, 0);
    for (const [key] of BANDS) {
      assert.equal(
        ranOutBy(result, key),
        3,
        `${key} crossed at the wrong year`,
      );
    }
  }
});

test("crossings respect a retirement delay, landing after the growth-only years", () => {
  // Draws begin in year 3; year 4's draw exceeds the $50 left.
  const result = simulate({
    balance: 150,
    withdrawal: 100,
    returnRate: 0,
    years: 5,
    retirementDelay: 2,
  });
  for (const [key] of BANDS) {
    assert.equal(ranOutBy(result, key), 4);
  }
});

test("bands cross in order — worse percentiles fail no later than better ones", () => {
  const result = simulate(MIXED);
  const last = result.percentiles.length;
  const crossings = BANDS.map(([key]) => ranOutBy(result, key) ?? last);
  for (let i = 1; i < crossings.length; i++) {
    assert.ok(
      crossings[i] >= crossings[i - 1],
      `${BANDS[i][0]} crossed at ${crossings[i]}, before ${BANDS[i - 1][0]} at ${crossings[i - 1]}`,
    );
  }
});
