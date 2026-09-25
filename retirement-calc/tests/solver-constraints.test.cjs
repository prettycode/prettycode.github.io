const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { test } = require("node:test");

function solver(rate) {
  const probes = [];
  const context = vm.createContext({
    SIM_SEED: 123,
    startSimulation(params) {
      probes.push(params);
      assert.ok(params.withdrawal <= params.balance);
      return {
        promise: Promise.resolve({ successRate: rate(params) }),
        cancel() {},
      };
    },
  });
  for (const file of ["spending-plan.js", "solver.js"]) {
    vm.runInContext(fs.readFileSync("lib/" + file, "utf8"), context);
  }
  return { context, probes };
}
const base = {
  balance: 100000,
  withdrawal: 10000,
  upfrontYears: 10,
  years: 30,
  inflation: 0,
  retirementDelay: 0,
};

test("spending search finds a passing island across bucket changes", async () => {
  const { context, probes } = solver((p) =>
    p.upfrontYears === 3 && p.withdrawal <= 32000 ? 1 : 0,
  );
  const result = await context.startSolver(base, "withdrawal", 90).promise;
  assert.equal(result.amount, 32000);
  assert.equal(result.limit, null);
  assert.ok(probes.every((p) => p.upfrontYears * p.withdrawal <= p.balance));
});

test("balance search finds a passing island even when the maximum fails", async () => {
  const { context } = solver((p) => (p.upfrontYears === 3 ? 1 : 0));
  const result = await context.startSolver(
    { ...base, balance: 1000000, withdrawal: 50000 },
    "balance",
    90,
  ).promise;
  assert.equal(result.amount, 150000);
  assert.equal(result.limit, null);
});

test("a passing minimum spending amount is not labeled a failed search", async () => {
  const { context } = solver((p) => (p.withdrawal === 10000 ? 1 : 0));
  const result = await context.startSolver(base, "withdrawal", 90).promise;
  assert.equal(result.amount, 10000);
  assert.equal(result.limit, null);
});
