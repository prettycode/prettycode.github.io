const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { test } = require("node:test");
const read = (name) => fs.readFileSync(`lib/${name}`, "utf8");
const flush = async () => {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
};

function harness(saved = {}) {
  const workers = [],
    slots = [],
    pending = [];
  let cursor = 0;
  const context = vm.createContext({
    React: {
      useState(initial) {
        const i = cursor++;
        if (!(i in slots)) {
          slots[i] = typeof initial === "function" ? initial() : initial;
        }
        return [
          slots[i],
          (v) => {
            slots[i] = typeof v === "function" ? v(slots[i]) : v;
          },
        ];
      },
      useRef(initial) {
        const i = cursor++;
        return (slots[i] ??= { current: initial });
      },
      useEffect(fn, deps) {
        const i = cursor++;
        const old = slots[i];
        if (!old || deps.some((v, j) => v !== old.deps[j])) {
          pending.push(() => {
            old?.cleanup?.();
            slots[i] = { deps, cleanup: fn() };
          });
        }
      },
    },
    localStorage: {
      getItem() {
        return JSON.stringify(saved);
      },
      setItem() {},
      removeItem() {},
    },
    Worker: class {
      constructor() {
        workers.push(this);
      }
      postMessage(message) {
        this.message = message;
      }
      terminate() {
        this.terminated = true;
      }
      done(result) {
        this.onmessage({ data: { type: "done", result } });
      }
      fail() {
        this.onerror({ preventDefault() {} });
      }
    },
    setTimeout(fn) {
      fn();
      return 1;
    },
    clearTimeout() {},
  });
  vm.runInContext(
    read("monte-carlo.js") + read("solver.js") + read("user-settings.js"),
    context,
  );
  const source = read("index.jsx")
    .replace(/\r\n/g, "\n")
    .split('  return (\n    <div className="sim-root">')[0];
  vm.runInContext(
    source +
      `
    return {sim, simInputs: sim?.inputs, simCurrentAge: sim?.currentAge, running, solving, simulationError, solverError,
      currentSolverResult, balance, withdrawal, setWithdrawal, setTargetSuccessRate, setSolveFor,
      upfrontYears, maxUpfrontYears, startingBucketSize, setUpfrontYears,
      solveForTarget, setInflation, setBalance,
      setCurrentAge, setPlanThroughAge,
      setRetirementAge, currentAge,
      retirementAge, planThroughAge, retirementDelay,
      retry: () => setRetryCount(c => c + 1)};
  }`,
    context,
  );
  return {
    context,
    workers,
    render() {
      cursor = 0;
      const state = context.RetirementSimulator();
      pending.splice(0).forEach((fn) => fn());
      return state;
    },
  };
}
const result = {
  yearData: [
    { endBalance: { p50: 1000 } },
    { endBalance: { p50: 900 }, actual: 100 },
  ],
  summary: { successRate: 0.9 },
  retirementDelay: 0,
  successRate: 0.9,
};

test("cash bucket is capped on load and when portfolio amounts change", () => {
  const h = harness({ balance: 3_500_000, withdrawal: 3_500_000 });
  let state = h.render();
  assert.equal(state.upfrontYears, 1);
  assert.equal(state.maxUpfrontYears, 1);
  assert.equal(h.workers.at(-1).message.params.upfrontYears, 1);
  h.render();
  assert.equal(
    vm.runInContext('UserSettings.get("upfrontYears")', h.context),
    1,
  );

  state.setWithdrawal(1_000_000);
  state = h.render();
  assert.equal(state.maxUpfrontYears, 3);
  assert.equal(state.upfrontYears, 1);
  state.setUpfrontYears(3);
  state = h.render();
  assert.equal(state.upfrontYears, 3);
  state.setBalance(2_000_000);
  state = h.render();
  assert.equal(state.upfrontYears, 2);
  assert.equal(state.maxUpfrontYears, 2);
  state.setWithdrawal(2_000_000);
  state = h.render();
  assert.equal(state.upfrontYears, 1);
  assert.equal(h.workers.at(-1).message.params.upfrontYears, 1);
});

test("cash bucket is sized as the retirement withdrawal times funded years", () => {
  const h = harness({
    balance: 2_990_000,
    withdrawal: 1_000_000,
    upfrontYears: 3,
    inflation: 0.05,
  });
  const state = h.render();
  assert.equal(state.maxUpfrontYears, 2);
  assert.equal(state.upfrontYears, 2);
  assert.equal(state.startingBucketSize(2), 2_000_000);
  assert.equal(state.startingBucketSize(3), 3_000_000);
});

test("cash bucket selection is capped to the retirement horizon and follows age changes", () => {
  const h = harness({
    currentAge: 60,
    retirementAge: 65,
    planThroughAge: 70,
    upfrontYears: 10,
  });
  let state = h.render();
  assert.equal(state.maxUpfrontYears, 5);
  assert.equal(state.upfrontYears, 5);
  assert.equal(h.workers.at(-1).message.params.upfrontYears, 5);
  h.render();
  assert.equal(vm.runInContext('UserSettings.get("upfrontYears")', h.context), 5);

  state.setPlanThroughAge(68);
  state = h.render();
  assert.equal(state.maxUpfrontYears, 3);
  assert.equal(state.upfrontYears, 3);
  state.setRetirementAge(67);
  state = h.render();
  assert.equal(state.maxUpfrontYears, 1);
  assert.equal(state.upfrontYears, 1);
  assert.equal(h.workers.at(-1).message.params.upfrontYears, 1);
});

test("cash bucket dollars keep increasing beyond five years when the plan allows it", () => {
  const h = harness({
    currentAge: 60,
    retirementAge: 60,
    planThroughAge: 80,
    balance: 3_500_000,
    withdrawal: 150_000,
  });
  let state = h.render();
  assert.equal(state.maxUpfrontYears, 10);
  for (let years = 4; years <= 10; years++) {
    state.setUpfrontYears(years);
    state = h.render();
    assert.equal(state.upfrontYears, years);
    assert.equal(state.startingBucketSize(state.upfrontYears), 150_000 * years);
    assert.equal(h.workers.at(-1).message.params.upfrontYears, years);
  }
});

test("increasing current age advances retirement and the plan horizon as needed", () => {
  const h = harness({ currentAge: 43, retirementAge: 65, planThroughAge: 90 });
  let state = h.render();
  for (const [age, horizon] of [
    [70, 90],
    [90, 91],
    [119, 120],
  ]) {
    state.setCurrentAge(age);
    state = h.render();
    assert.equal(state.retirementAge, age);
    assert.equal(state.planThroughAge, horizon);
    assert.equal(state.retirementDelay, 0);
    assert.equal(h.workers.at(-1).message.params.retirementDelay, 0);
    assert.equal(h.workers.at(-1).message.params.years, horizon - age);
    state = h.render();
    assert.equal(
      vm.runInContext('UserSettings.get("retirementAge")', h.context),
      age,
    );
    assert.equal(
      vm.runInContext('UserSettings.get("planThroughAge")', h.context),
      horizon,
    );
  }
  state.setCurrentAge(60);
  state = h.render();
  assert.equal(state.retirementAge, 119);
  assert.equal(state.planThroughAge, 120);
});

test("retirement at the maximum age advances the plan horizon beyond it", () => {
  const h = harness({
    currentAge: 119,
    retirementAge: 119,
    planThroughAge: 120,
  });
  h.render().setRetirementAge(120);
  const state = h.render();
  assert.equal(state.currentAge, 119);
  assert.equal(state.retirementAge, 120);
  assert.equal(state.planThroughAge, 121);
  assert.equal(h.workers.at(-1).message.params.retirementDelay, 1);
  assert.equal(h.workers.at(-1).message.params.years, 1);
  h.render();
  assert.equal(
    vm.runInContext('UserSettings.get("planThroughAge")', h.context),
    121,
  );
});

test("invalid saved age ordering is repaired before simulation and persisted", () => {
  const h = harness({ currentAge: 70, retirementAge: 60, planThroughAge: 65 });
  const state = h.render();
  assert.equal(state.retirementAge, 70);
  assert.equal(state.planThroughAge, 71);
  assert.equal(h.workers[0].message.params.retirementDelay, 0);
  assert.equal(h.workers[0].message.params.years, 1);
  h.render();
  assert.equal(
    vm.runInContext('UserSettings.get("retirementAge")', h.context),
    70,
  );
  assert.equal(
    vm.runInContext('UserSettings.get("planThroughAge")', h.context),
    71,
  );
});

test("age changes update the simulation timeline and persist", () => {
  const h = harness();
  let state = h.render();
  state.setRetirementAge(65);
  state = h.render();
  assert.equal(state.retirementDelay, 22);
  state.setCurrentAge(45);
  state = h.render();
  assert.equal(state.retirementDelay, 20);
  assert.equal(h.workers.at(-1).message.params.retirementDelay, 20);
  assert.equal(h.workers.at(-1).message.params.years, 25);
  assert.equal(
    vm.runInContext('UserSettings.get("retirementAge")', h.context),
    65,
  );
  assert.equal(
    vm.runInContext('UserSettings.get("currentAge")', h.context),
    45,
  );

  state.setPlanThroughAge(95);
  state = h.render();
  assert.equal(h.workers.at(-1).message.params.years, 30);
  assert.equal(
    vm.runInContext('UserSettings.get("planThroughAge")', h.context),
    95,
  );
  state.setCurrentAge(65);
  state = h.render();
  assert.equal(state.retirementDelay, 0);
  state.setCurrentAge(60);
  state = h.render();
  assert.equal(state.retirementDelay, 5);
  state.setRetirementAge(60);
  state = h.render();
  assert.equal(state.retirementDelay, 0);
});

test("worker failure clears running, retry succeeds, and stale messages are ignored", async () => {
  const h = harness();
  h.render();
  h.workers[0].fail();
  await flush();
  let state = h.render();
  assert.equal(state.running, false);
  assert.ok(state.simulationError);
  state.retry();
  h.render();
  h.workers[1].done(result);
  await flush();
  state = h.render();
  assert.equal(state.simulationError, null);
  assert.equal(state.running, false);
  assert.equal(state.sim.successRate, 0.9);
  h.workers[0].done({ ...result, successRate: 0 });
  await flush();
  assert.equal(h.render().sim.successRate, 0.9);
  assert.ok(h.workers.every((w) => w.terminated));
});

test("pending results retain inflation, ages and balance from the completed run", async () => {
  const h = harness();
  h.render();
  h.workers[0].done(result);
  await flush();
  let state = h.render();
  const original = state.simInputs;
  state.setInflation(0.1);
  state.setCurrentAge(40);
  state.setBalance(4000000);
  h.render();
  state = h.render();
  assert.equal(state.simInputs, original);
  assert.equal(state.simCurrentAge, 43);
  assert.equal(state.running, true);
  h.workers[1].done(result);
  await flush();
  state = h.render();
  assert.equal(state.simInputs.inflation, 0.1);
  assert.equal(state.simCurrentAge, 40);
  assert.equal(state.simInputs.currentAge, 40);
  assert.equal(state.simInputs.balance, 4000000);
});

test("solver failure clears solving and permits another attempt", async () => {
  const h = harness();
  h.render();
  h.workers[0].done(result);
  await flush();
  const solve = h.render().solveForTarget();
  h.workers[1].fail();
  await solve;
  let state = h.render();
  assert.equal(state.solving, false);
  assert.ok(state.solverError);
  const retry = state.solveForTarget();
  h.workers[2].done({ ...result, successRate: 0 });
  await retry;
  state = h.render();
  assert.equal(state.solving, false);
  assert.equal(state.solverError, null);
});

test("changing inputs cancels a pending solver without applying its result", async () => {
  const h = harness();
  h.render();
  h.workers[0].done(result);
  await flush();
  let state = h.render();
  const solve = state.solveForTarget();
  state.setInflation(0.1);
  h.render();
  await solve;
  assert.ok(h.workers[1].terminated);
  assert.equal(h.render().solverError, null);
  assert.equal(h.render().solving, false);
  assert.equal(h.render().currentSolverResult, null);
});

for (const limit of ["minimum", "maximum", null]) {
  test(`solver displays withdrawal without applying it and reports search limit: ${limit}`, async () => {
    const h = harness();
    h.render();
    h.workers[0].done(result);
    await flush();
    const before = h.render();
    const solve = before.solveForTarget();
    let index = 1;
    while (h.workers[index]) {
      const worker = h.workers[index++];
      const amount = worker.message.params.withdrawal;
      worker.done({
        ...result,
        successRate:
          limit === "minimum"
            ? 0
            : limit === "maximum"
              ? 1
              : amount <= 80000
                ? 1
                : 0,
      });
      await flush();
    }
    await solve;
    let state = h.render();
    const expected =
      limit === "minimum" ? 10000 : limit === "maximum" ? 300000 : 80000;
    assert.equal(state.withdrawal, before.withdrawal);
    assert.equal(state.sim, before.sim);
    assert.equal(state.running, false);
    assert.equal(h.workers.length, index);
    assert.equal(state.currentSolverResult.withdrawal, expected);
    assert.equal(state.currentSolverResult.limit, limit);
    state.setInflation(0.1);
    assert.equal(h.render().currentSolverResult, null);
  });
}

for (const limit of ["minimum", "maximum", null]) {
  test(`balance solver preserves withdrawal and reports range limit: ${limit}`, async () => {
    const h = harness({
      withdrawal: 123000,
      retirementAge: 53,
    });
    h.render();
    h.workers[0].done(result);
    await flush();
    h.render().setSolveFor("balance");
    const before = h.render();
    const solve = before.solveForTarget();
    let index = 1;
    while (h.workers[index]) {
      const worker = h.workers[index++];
      const params = worker.message.params;
      assert.equal(params.withdrawal, 123000);
      assert.equal(params.retirementDelay, 10);
      worker.done({
        ...result,
        successRate:
          limit === "minimum"
            ? 1
            : limit === "maximum"
              ? 0
              : params.balance >= 3020000
                ? 0.9
                : 0.89,
      });
      await flush();
    }
    await solve;
    let state = h.render();
    const expected =
      limit === "minimum" ? 100000 : limit === "maximum" ? 10000000 : 3050000;
    assert.equal(state.balance, before.balance);
    assert.equal(state.sim, before.sim);
    assert.equal(state.running, false);
    assert.equal(h.workers.length, index);
    assert.equal(state.withdrawal, 123000);
    assert.equal(state.currentSolverResult.balance, expected);
    assert.equal(state.currentSolverResult.limit, limit);
    state.setWithdrawal(124000);
    state = h.render();
    assert.equal(state.currentSolverResult, null);
  });
}

test("changing withdrawal cancels a balance solve without applying stale results", async () => {
  const h = harness();
  h.render();
  h.workers[0].done(result);
  await flush();
  h.render().setSolveFor("balance");
  const state = h.render();
  const solve = state.solveForTarget();
  state.setWithdrawal(120000);
  h.render();
  await solve;
  h.workers[1].done({ ...result, successRate: 1 });
  await flush();
  const next = h.render();
  assert.equal(next.balance, state.balance);
  assert.equal(next.withdrawal, 120000);
  assert.equal(next.currentSolverResult, null);
  assert.equal(next.solving, false);
  assert.equal(next.solverError, null);
});

for (const failure of ["constructor", "postMessage", "messageerror"]) {
  test(`worker ${failure} failure rejects and cleans up`, async () => {
    let terminated = false,
      worker;
    const context = vm.createContext({
      Worker: class {
        constructor() {
          if (failure === "constructor") {
            throw new Error("blocked");
          }
          worker = this;
        }
        postMessage() {
          if (failure === "postMessage") {
            throw new Error("clone");
          }
        }
        terminate() {
          terminated = true;
        }
      },
    });
    vm.runInContext(read("monte-carlo.js"), context);
    const request = context.startSimulation({});
    if (failure === "messageerror") {
      worker.onmessageerror();
    }
    await assert.rejects(request.promise);
    assert.equal(terminated, failure !== "constructor");
  });
}

for (const match of [0, 3, null]) {
  test(`delay solver finds earliest retirement without changing savings: ${match}`, async () => {
    const h = harness({
      currentAge: 43,
      retirementAge: 48,
      planThroughAge: 53,
      withdrawal: 123000,
      upfrontYears: 10,
    });
    h.render();
    h.workers[0].done(result);
    await flush();
    h.render().setSolveFor("retirementDelay");
    const before = h.render();
    const solve = before.solveForTarget();
    let index = 1;
    while (h.workers[index]) {
      const worker = h.workers[index++];
      const params = worker.message.params;
      assert.equal(params.retirementDelay, index - 2);
      assert.equal(params.balance, before.balance);
      assert.equal(params.withdrawal, before.withdrawal);
      assert.equal(params.years, 10 - params.retirementDelay);
      // A single passing year also covers a non-monotonic success curve.
      worker.done({
        ...result,
        successRate: params.retirementDelay === match ? 0.95 : 0.5,
      });
      await flush();
    }
    await solve;
    let state = h.render();
    assert.equal(state.retirementDelay, before.retirementDelay);
    assert.equal(state.retirementAge, before.retirementAge);
    assert.equal(state.sim, before.sim);
    assert.equal(state.running, false);
    assert.equal(h.workers.length, index);
    assert.equal(state.balance, before.balance);
    assert.equal(state.withdrawal, before.withdrawal);
    assert.equal(state.planThroughAge, 53);
    assert.equal(state.currentSolverResult.found, match !== null);
    assert.equal(state.currentSolverResult.retirementDelay, match ?? 5);
    if (match === null) {
      assert.equal(index - 1, 10);
      assert.equal(state.currentSolverResult.limit, "maximum");
    } else {
      assert.equal(index - 1, match + 1);
      assert.equal(h.workers.at(-1).message.params.retirementDelay, match);
    }
    state.setRetirementAge(47);
    state = h.render();
    assert.equal(state.currentSolverResult, null);
  });
}

test("changing inputs cancels a delay solve without applying a stale retirement age", async () => {
  const h = harness();
  h.render();
  h.workers[0].done(result);
  await flush();
  h.render().setSolveFor("retirementDelay");
  const state = h.render();
  const solve = state.solveForTarget();
  state.setBalance(4000000);
  h.render();
  await solve;
  h.workers[1].done({ ...result, successRate: 1 });
  await flush();
  const next = h.render();
  assert.equal(next.retirementAge, state.retirementAge);
  assert.equal(next.currentSolverResult, null);
  assert.equal(next.solving, false);
});
