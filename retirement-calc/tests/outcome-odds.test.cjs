// Reading the Odds uses cumulative depletion, including bucket cash.
// Portfolio bands are tested separately below for ordinary non-bucket runs.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const context = vm.createContext({ self: { postMessage() {} } });
context.importScripts = (name) =>
  vm.runInContext(fs.readFileSync(`lib/${name}`, "utf8"), context);
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
  const result = simulate({ ...MIXED, retirementDelay: 3 });
  let previous = 0;
  for (const row of result.yearData) {
    assert.ok(row.depletionRate >= previous);
    assert.ok(row.depletionRate <= 1);
    previous = row.depletionRate;
  }
  assert.ok(Math.abs(previous - (1 - result.successRate)) < 1e-12);
  assert.ok(previous > 0 && previous < 1);
});

test("depletion timing includes delayed retirement and exact exhaustion", () => {
  const result = simulate({
    balance: 200,
    withdrawal: 100,
    returnRate: 0,
    years: 4,
    retirementDelay: 2,
  });
  assert.deepEqual(
    Array.from(result.yearData, (p) => p.depletionRate),
    [0, 0, 0, 0, 1, 1, 1],
  );
});

test("positive sub-dollar balances are not counted as depleted", () => {
  const result = simulate({
    balance: 1,
    withdrawal: 0,
    returnRate: -0.5,
    years: 1,
  });
  assert.equal(result.yearData[1].endBalance.p50, 0);
  assert.equal(result.yearData[1].depletionRate, 0);
  assert.equal(result.successRate, 1);
});

test("a fully funded cash bucket delays exhaustion through its final year", () => {
  for (const retirementDelay of [0, 2]) {
    const result = simulate({
      balance: 200_000,
      withdrawal: 40_000,
      returnRate: 0,
      upfrontYears: 5,
      years: 10,
      retirementDelay,
    });
    assert.equal(result.yearData[retirementDelay + 1].endBalance.p50, 0);
    for (const row of result.yearData) {
      assert.equal(row.depletionRate, row.year >= retirementDelay + 5 ? 1 : 0);
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
    for (const row of result.yearData) {
      assert.equal(row.depletionRate, row.year >= exhaustionYear ? 1 : 0);
    }
  }
});

test("cash coverage respects bucket sizing under inflation", () => {
  const params = {
    withdrawal: 40_000,
    returnRate: 0,
    inflation: 0.04,
    upfrontYears: 5,
    years: 6,
  };
  const sizing = simulate({ ...params, balance: 1_000_000 });
  // The reported lump sum is floored to dollars; one extra dollar fully
  // funds it, and a total investment loss then leaves only bucket cash.
  const result = simulate({
    ...params,
    balance: sizing.lumpSum + 1,
    returnRate: -1,
  });
  assert.equal(result.yearData[1].endBalance.p50, 0);
  assert.deepEqual(
    Array.from(result.yearData, (row) => row.depletionRate),
    [0, 0, 0, 0, 0, 1, 1],
  );
});

function deriveOdds(simulation) {
  const source = fs
    .readFileSync(path.join(__dirname, "../lib/outcome-odds.jsx"), "utf8")
    .replace(/\r\n/g, "\n");
  // Execute the component's actual derivation before its JSX render.
  const component = source.slice(0, source.indexOf("  return (\n    <section"));
  const ui = vm.createContext({ fmtMoney: String });
  vm.runInContext(
    `${component}\nreturn { balanceLadder, balanceRangeNote, ladderNote, lifespanLadder, firstTenthGone, medianSurvives, successRate };\n}`,
    ui,
  );
  return ui.OutcomeOdds({ simulation });
}

function endingOdds(balances, failureRate = 0) {
  return deriveOdds({
    years: 1,
    retirementDelay: 0,
    summary: {
      successRate: 1 - failureRate,
      depletionYears: {
        0.1: null,
        0.25: null,
        0.5: null,
        0.75: null,
        0.9: null,
      },
    },
    yearData: [
      null,
      {
        totalEndBalance: balances,
        totalEndBalanceToday: balances,
        depletionRate: failureRate,
      },
    ],
  });
}

test("zero-balance rungs give lower bounds instead of conflicting exact odds", () => {
  const odds = endingOdds(
    { p10: 0, p25: 0, p50: 100, p75: 200, p90: 300 },
    0.2582,
  );
  assert.equal(odds.medianSurvives, true);
  assert.equal(odds.balanceLadder[3].odds, "1 in 4");
  assert.equal(odds.balanceLadder[4].odds, "1 in 10");
  assert.match(odds.ladderNote, /Each row means “at least”/);
  assert.match(odds.balanceRangeNote, /At least half.*inclusive/);
  assert.match(
    odds.balanceRangeNote,
    /At least 9 in 10 finish ≤ 300/,
  );
  assert.doesNotMatch(odds.balanceRangeNote, /4 in 5/);
});

test("positive percentile ranges retain the central 80 percent bound", () => {
  const odds = endingOdds({ p10: 10, p25: 25, p50: 50, p75: 75, p90: 90 });
  assert.match(
    odds.balanceRangeNote,
    /At least 4 in 5 finish between 10 and 90, inclusive/,
  );
  assert.equal(odds.balanceLadder[0].lead, "ends ≥");
  assert.equal(odds.balanceLadder[4].lead, "ends ≤");
});

test("tied and rounded-zero balances are not equated with depletion", () => {
  const odds = endingOdds({ p10: 0, p25: 0, p50: 0, p75: 0, p90: 0 });
  assert.equal(odds.successRate, 1);
  assert.equal(odds.medianSurvives, true);
  assert.equal(odds.balanceLadder[2].lead, "ends ≥");
  assert.match(odds.balanceLadder[4].primary, /rounded/);
  assert.match(
    odds.balanceRangeNote,
    /actual share that ran out is reported above/,
  );
});

test("lifespan rungs without depletion give failure bounds, not survival odds", () => {
  const { lifespanLadder: rows } = deriveOdds({
    years: 1,
    retirementDelay: 0,
    summary: {
      successRate: 0.45,
      depletionYears: { 0.1: 1, 0.25: 1, 0.5: 1, 0.75: null, 0.9: null },
    },
    yearData: [
      null,
      {
        totalEndBalance: {
          p10: 0,
          p25: 0,
          p50: 0,
          p75: 100,
          p90: 200,
        },
        totalEndBalanceToday: {},
        depletionRate: 0.55,
      },
    ],
  });
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
        currentAge: 60,
      });
      const odds = deriveOdds({ ...result, currentAge: 60 });
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
  const snapshot = (length) => ({
    years: length,
    retirementDelay: 0,
    yearData: [
      null,
      ...rates.slice(0, length).map((depletionRate) => ({
        totalEndBalance: { p10: 0, p25: 0, p50: 0, p75: 0, p90: 0 },
        totalEndBalanceToday: {},
        depletionRate,
      })),
    ],
    summary: {
      successRate: 1 - rates[length - 1],
      depletionYears: Object.fromEntries(
        [0.1, 0.25, 0.5, 0.75, 0.9].map((p, i) => [
          p,
          i + 2 <= length ? i + 2 : null,
        ]),
      ),
    },
  });
  const odds = deriveOdds(snapshot(6));
  assert.equal(odds.firstTenthGone, 2);
  assert.deepEqual(
    Array.from(odds.lifespanLadder, (rung) => rung.primary),
    [2, 3, 4, 5, 6].map((y) => `year ${y} of retirement`),
  );
  const beforeExhaustion = deriveOdds(snapshot(1));
  assert.equal(beforeExhaustion.firstTenthGone, null);
  assert.equal(beforeExhaustion.successRate, 1);
  assert.equal(beforeExhaustion.medianSurvives, true);
  assert.equal(deriveOdds(snapshot(4)).medianSurvives, false);
});

// Portfolio-band crossings, distinct from cash-aware depletion milestones.
const ranOutBy = (result, key) => {
  for (let y = 1; y < result.yearData.length; y++) {
    if (result.yearData[y].endBalance[key] <= 0) {
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
  const ending = result.yearData[result.yearData.length - 1].endBalance;
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
    for (let y = crossing; y < result.yearData.length; y++) {
      assert.equal(
        result.yearData[y].endBalance[key],
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
  // $250 funds two $100 draws with no growth; the third empties it.
  const result = simulate({
    balance: 250,
    withdrawal: 100,
    returnRate: 0,
    years: 3,
  });
  assert.equal(result.successRate, 0);
  for (const [key] of BANDS) {
    assert.equal(ranOutBy(result, key), 3, `${key} crossed at the wrong year`);
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
  const last = result.yearData.length;
  const crossings = BANDS.map(([key]) => ranOutBy(result, key) ?? last);
  for (let i = 1; i < crossings.length; i++) {
    assert.ok(
      crossings[i] >= crossings[i - 1],
      `${BANDS[i][0]} crossed at ${crossings[i]}, before ${BANDS[i - 1][0]} at ${crossings[i - 1]}`,
    );
  }
});
