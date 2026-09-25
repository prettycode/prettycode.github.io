const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

// Load the worker with typed-array constructors that tally every byte
// allocated, so the test can compare allocations across horizons.
const context = vm.createContext({ self: { postMessage() {} } });
vm.runInContext(
  `var allocatedBytes = 0;
  for (const name of ["Float64Array", "Uint32Array", "Int32Array"]) {
    const Base = globalThis[name];
    globalThis[name] = class extends Base {
      constructor(...args) {
        super(...args);
        allocatedBytes += this.byteLength;
      }
    };
  }`,
  context,
);
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
    runs: 10_000,
    upfrontYears: 5,
    retirementDelay: 5,
    seed: 12345,
    ...overrides,
  });
const allocatedFor = (years) => {
  context.allocatedBytes = 0;
  simulate({ years });
  return context.allocatedBytes;
};

test("per-run storage does not grow with the number of years", () => {
  const runs = 10_000;
  const short = allocatedFor(10);
  const long = allocatedFor(100);
  // Only per-year scalars (a few doubles per year) may scale with the
  // horizon; a single extra per-run array would add runs × 8 bytes.
  assert.ok(long - short < runs * 8, `${short} → ${long} bytes`);
});

// Each run keeps its own RNG stream across years, so extending the horizon
// only appends years; it never changes the paths of the years before.
test("a longer horizon leaves the shared years unchanged", () => {
  const short = simulate({ years: 20 });
  const long = simulate({ years: 40 });
  assert.deepEqual(
    long.yearData.slice(0, short.yearData.length),
    short.yearData,
  );
});
