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

test('delay adds growth-only years before the full retirement duration', () => {
  const result = simulate({ retirementDelay: 2, inflation: 0.1 });
  assert.equal(result.retirementDelay, 2);
  assert.deepEqual(Array.from(result.percentiles, p => p.p50), [1000, 1100, 1210, 1221, 1222]);
  assert.deepEqual(Array.from(result.percentiles, p => p.withdrawal), [0, 0, 0, 100, 110]);
  assert.equal(result.successRate, 1);
});

test('cash bucket is drawn at retirement, after growth-only years', () => {
  for (const monthly of [false, true]) {
    const result = simulate({ retirementDelay: 2, upfrontYears: 2, monthly });
    assert.deepEqual(Array.from(result.percentiles, p => p.withdrawal), [0, 0, 0, 200, 0]);
    assert.deepEqual(Array.from(result.percentiles, p => p.p50), [1000, 1100, 1210, 1111, 1222]);
  }
});

test('monthly withdrawals begin only after the delay', () => {
  const result = simulate({ retirementDelay: 2, monthly: true, returnRate: 0 });
  assert.deepEqual(Array.from(result.percentiles, p => p.p50), [1000, 1000, 1000, 900, 800]);
  assert.deepEqual(Array.from(result.percentiles, p => p.withdrawal), [0, 0, 0, 100, 100]);
});

test('zero delay preserves immediate retirement and depletion behavior', () => {
  assert.deepEqual(Array.from(simulate().percentiles, p => p.p50), [1000, 990, 979]);
  const result = simulate({ retirementDelay: 2, withdrawal: 2000 });
  assert.deepEqual(Array.from(result.percentiles, p => p.p50), [1000, 1100, 1210, 0, 0]);
  assert.equal(result.successRate, 0);
});
