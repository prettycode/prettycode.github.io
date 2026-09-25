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
    balance: 1_000_000,
    withdrawal: 40_000,
    returnRate: 0.07,
    volatility: 0.18,
    inflation: 0.03,
    years: 30,
    runs: 5_000,
    upfrontYears: 1,
    seed: 12345,
    ...overrides,
  });

test("the same inputs and seed return identical results", () => {
  const a = simulate();
  const b = simulate();
  assert.equal(a.successRate, b.successRate);
  assert.deepEqual(a.summary, b.summary);
  assert.notEqual(
    simulate({ seed: 999 }).summary.medianEnding,
    a.summary.medianEnding,
  );
});

// Depleted runs stop drawing returns. Each run is seeded from its own index,
// so that doesn't shift the paths later runs see, and every amount is tested
// against the same market paths.
test("success rate moves in one direction as the searched amount changes", () => {
  const withdrawals = [];
  // Steps this fine are smaller than sampling noise, so only shared market
  // paths keep the rates in order.
  for (let w = 50_000; w <= 60_000; w += 250) {
    withdrawals.push(simulate({ withdrawal: w, runs: 2_000 }).successRate);
  }
  for (let i = 1; i < withdrawals.length; i++) {
    assert.ok(withdrawals[i] <= withdrawals[i - 1], `withdrawal step ${i}`);
  }
  assert.ok(withdrawals[0] > withdrawals.at(-1));

  const balances = [];
  for (let b = 1_000_000; b <= 1_200_000; b += 5_000) {
    balances.push(simulate({ balance: b, runs: 2_000 }).successRate);
  }
  for (let i = 1; i < balances.length; i++) {
    assert.ok(balances[i] >= balances[i - 1], `balance step ${i}`);
  }
  assert.ok(balances.at(-1) > balances[0]);
});
