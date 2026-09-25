const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { test } = require("node:test");

const context = vm.createContext({ React: {} });
vm.runInContext(fs.readFileSync("lib/format.js", "utf8"), context);
vm.runInContext(
  fs
    .readFileSync("lib/index.jsx", "utf8")
    .split("function RetirementSimulator()")[0],
  context,
);

test("nonzero odds never round to impossible or certain", () => {
  assert.equal(vm.runInContext("fmtOdds(0.000001)", context), "1 in 1,000");
  assert.equal(vm.runInContext("fmtOdds(0.999999)", context), "999 in 1,000");
  assert.equal(vm.runInContext("fmtOdds(0)", context), "0 in 100");
  assert.equal(vm.runInContext("fmtOdds(1)", context), "100 in 100");
  assert.equal(context.formatSuccessChance(0.96), "96 in 100");
  assert.equal(context.formatSuccessChance(0.04), "4 in 100");
  assert.equal(context.formatSuccessChance(0.9), "9 in 10");
});

test("success chance of exactly 0 or 1 reads sensibly", () => {
  assert.equal(context.formatSuccessChance(0), "0 in 100");
  assert.equal(context.formatSuccessChance(1), "100 in 100");
  assert.equal(context.formatSuccessChance(0.5), "1 in 2");
});

test("fmtMoney picks the unit from the rounded value", () => {
  assert.equal(vm.runInContext("fmtMoney(999_600)", context), "$1.00M");
  assert.equal(vm.runInContext("fmtMoney(999_499)", context), "$999K");
  assert.equal(vm.runInContext("fmtMoney(999.6)", context), "$1K");
  assert.equal(vm.runInContext("fmtMoney(999.4)", context), "$999");
  assert.equal(vm.runInContext("fmtMoney(1_500_000)", context), "$1.50M");
});
