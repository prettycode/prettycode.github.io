// The "Reading the Odds" section reads failure timing straight off the
// percentile bands: a balance floored at $0 means a run has failed, so the
// year the pXX band first touches the axis is the year XX% of futures had run
// out. These tests pin that correspondence, since the ladder's rungs are
// claims stated in plain language to the user and nothing else checks it.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const context = vm.createContext({ self: { postMessage() {} } });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../lib/monte-carlo-worker.js'), 'utf8'), context);
const simulate = (overrides = {}) => context.runSimulation({
  balance: 1000, withdrawal: 100, returnRate: 0.1, volatility: 0,
  inflation: 0, years: 2, runs: 100, upfrontYears: 1,
  inflationAdjustBucket: false, bucketEarnsTBills: false,
  tBillRealPremium: 0.005, monthly: false, ...overrides,
});

const BANDS = [['p10', 0.10], ['p25', 0.25], ['p50', 0.50], ['p75', 0.75], ['p90', 0.90]];

// ~55% failure, chosen so the bands straddle it: p10/p25/p50 reach the axis
// and p75/p90 never do, exercising both sides of every assertion below.
const MIXED = {
  balance: 1_000_000, withdrawal: 45_000, returnRate: 0.07, volatility: 0.2,
  inflation: 0.03, years: 30, runs: 20_000,
};

// Mirrors OutcomeOdds' ranOutBy: first year the band reaches $0, else null.
const ranOutBy = (result, key) => {
  for (let y = 1; y < result.percentiles.length; y++) {
    if (result.percentiles[y][key] <= 0) return y;
  }
  return null;
};

test('a band sits at $0 exactly when that share of futures has failed', () => {
  const result = simulate(MIXED);
  const failureRate = 1 - result.successRate;
  assert.ok(failureRate > 0.1 && failureRate < 0.9, `expected a mixed population, got ${failureRate}`);
  const ending = result.percentiles[result.percentiles.length - 1];
  for (const [key, share] of BANDS) {
    // Quantile indices are floor(runs * share), so skip the razor edge where
    // a single run decides it.
    if (Math.abs(failureRate - share) < 1 / MIXED.runs) continue;
    if (failureRate > share) assert.equal(ending[key], 0, `${key} should be $0 at ${failureRate} failure`);
    else assert.ok(ending[key] > 0, `${key} should be positive at ${failureRate} failure`);
  }
});

test('a band that reaches $0 never recovers, so the first crossing is the only one', () => {
  const result = simulate(MIXED);
  for (const [key] of BANDS) {
    const crossing = ranOutBy(result, key);
    if (crossing === null) continue;
    for (let y = crossing; y < result.percentiles.length; y++) {
      assert.equal(result.percentiles[y][key], 0, `${key} recovered after year ${crossing}`);
    }
  }
});

test('a plan that never fails has no band crossings to report', () => {
  const result = simulate({ balance: 100_000, withdrawal: 1000, years: 10 });
  assert.equal(result.successRate, 1);
  for (const [key] of BANDS) assert.equal(ranOutBy(result, key), null);
});

test('a plan that always fails crosses every band in the year the money goes', () => {
  for (const monthly of [false, true]) {
    // $250 funds two $100 draws with no growth; the third empties it.
    const result = simulate({ balance: 250, withdrawal: 100, returnRate: 0, years: 3, monthly });
    assert.equal(result.successRate, 0);
    for (const [key] of BANDS) assert.equal(ranOutBy(result, key), 3, `${key} crossed at the wrong year`);
  }
});

test('crossings respect a retirement delay, landing after the growth-only years', () => {
  // Draws begin in year 3; year 4's draw exceeds the $50 left.
  const result = simulate({
    balance: 150, withdrawal: 100, returnRate: 0, years: 5, retirementDelay: 2,
  });
  for (const [key] of BANDS) assert.equal(ranOutBy(result, key), 4);
});

test('bands cross in order — worse percentiles fail no later than better ones', () => {
  const result = simulate(MIXED);
  const last = result.percentiles.length;
  const crossings = BANDS.map(([key]) => ranOutBy(result, key) ?? last);
  for (let i = 1; i < crossings.length; i++) {
    assert.ok(crossings[i] >= crossings[i - 1],
      `${BANDS[i][0]} crossed at ${crossings[i]}, before ${BANDS[i - 1][0]} at ${crossings[i - 1]}`);
  }
});
