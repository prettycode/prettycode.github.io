const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const { test } = require("node:test");

function settings(saved = {}) {
  const storage = {
    value: JSON.stringify(saved),
    getItem() {
      return this.value;
    },
    setItem(k, v) {
      this.value = v;
    },
    removeItem() {
      this.value = null;
    },
  };
  const context = vm.createContext({
    localStorage: storage,
    MARKET_PRESETS: { world: { historical: {} } },
  });
  vm.runInContext(
    fs.readFileSync("lib/user-settings.js", "utf8") +
      "\nthis.settings = UserSettings;",
    context,
  );
  return { api: context.settings, storage };
}

test("incompatible saved settings are erased and ignored", () => {
  for (const saved of [
    { years: 40, retirementDelay: 7, balance: 123 },
    { retirementDelay: 0 },
    { balance: "123" },
    [],
    null,
  ]) {
    const { api, storage } = settings(saved);
    assert.equal(api.get("balance"), api.defaults.balance);
    assert.equal(api.get("settingsYears"), api.defaults.settingsYears);
    assert.equal(api.get("settingsDelay"), api.defaults.settingsDelay);
    assert.equal(storage.value, null);
  }
});

test("malformed saved JSON is erased and ignored", () => {
  const { api, storage } = settings();
  storage.value = "{broken";
  assert.equal(api.get("planningMode"), "settings");
  assert.equal(storage.value, null);
});

test("age settings do not supply missing duration settings", () => {
  const { api } = settings({ retirementAge: 55 });
  assert.equal(api.get("retirementAge"), 55);
  assert.equal(api.get("settingsYears"), api.defaults.settingsYears);
  assert.equal(api.get("settingsDelay"), api.defaults.settingsDelay);
});

test("fresh settings use duration defaults without inheriting an age timeline", () => {
  const { api } = settings();
  assert.equal(api.get("planningMode"), "settings");
  assert.equal(api.get("settingsYears"), api.defaults.settingsYears);
  assert.equal(api.get("settingsDelay"), api.defaults.settingsDelay);
});

test("age plan and target survive persistence and reset", () => {
  const { api, storage } = settings();
  for (const [key, value] of Object.entries({
    currentAge: 43,
    retirementAge: 50,
    planThroughAge: 90,
    targetSuccessRate: 90,
  })) {
    api.set(key, value);
  }
  const restored = settings(JSON.parse(storage.value)).api;
  assert.equal(restored.get("retirementAge"), 50);
  assert.equal(restored.get("planThroughAge"), 90);
  assert.equal(restored.get("targetSuccessRate"), 90);
  restored.clear();
  assert.equal(restored.get("retirementAge"), restored.defaults.retirementAge);
});

for (const planningMode of ["ages", "settings"]) {
  test(`${planningMode} mode uses its own simulation timeline`, () => {
    const { api } = settings({
      planningMode,
      currentAge: 43,
      retirementAge: 50,
      planThroughAge: 90,
      settingsYears: 30,
      settingsDelay: 2,
    });
    const effects = [];
    let message;
    const context = vm.createContext({
      UserSettings: api,
      React: {
        useRef: () => ({ current: null }),
        useState: (v) => [typeof v === "function" ? v() : v, () => {}],
        useEffect: (fn) => effects.push(fn),
        createElement: () => null,
      },
      ReactDOM: { createRoot: () => ({ render() {} }) },
      document: { getElementById() {} },
      MARKET_PRESETS: { world: { historical: {} } },
      Worker: class {
        postMessage(m) {
          message = m;
        }
      },
      setTimeout: (fn) => {
        fn();
        return 1;
      },
      MONTE_CARLO_WORKER_URL: "worker",
      SIM_RUNS: 100,
      T_BILL_REAL_PREMIUM: 0.005,
      cagrToArithmetic: () => 0,
      fmtMoney() {},
      fmtPct() {},
      Slider() {},
      PortfolioChart() {},
    });
    vm.runInContext(fs.readFileSync("lib/monte-carlo.js", "utf8"), context);
    // Run the component's state/effect setup without requiring a JSX build dependency.
    const source =
      fs
        .readFileSync("lib/index.jsx", "utf8")
        .replace(/\r\n/g, "\n")
        .split('  return (\n    <div className="sim-root">')[0] + "\n}";
    vm.runInContext(source + "\nRetirementSimulator();", context);
    effects.forEach((fn) => fn());
    assert.equal(
      message.params.retirementDelay,
      planningMode === "ages" ? 7 : 2,
    );
    assert.equal(message.params.years, planningMode === "ages" ? 40 : 30);
  });
}

test("settings mode and its timeline persist independently of ages", () => {
  const { api, storage } = settings({
    currentAge: 43,
    retirementAge: 50,
    planThroughAge: 90,
  });
  assert.equal(api.get("settingsYears"), api.defaults.settingsYears);
  assert.equal(api.get("settingsDelay"), api.defaults.settingsDelay);
  api.set("planningMode", "settings");
  api.set("settingsYears", 30);
  api.set("settingsDelay", 2);
  const restored = settings(JSON.parse(storage.value)).api;
  assert.equal(restored.get("planningMode"), "settings");
  assert.equal(restored.get("settingsYears"), 30);
  assert.equal(restored.get("settingsDelay"), 2);
  assert.equal(restored.get("retirementAge"), 50);
  assert.equal(restored.get("planThroughAge"), 90);
});
