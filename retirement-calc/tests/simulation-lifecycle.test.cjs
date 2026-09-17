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
  vm.runInContext(read("monte-carlo.js") + read("user-settings.js"), context);
  const source = read("index.jsx")
    .replace(/\r\n/g, "\n")
    .split('  return (\n    <div className="sim-root">')[0];
  vm.runInContext(
    source +
      `
    return {sim, simInputs, simUseAges, running, solving, simulationError, solverError,
      currentSolverResult, withdrawal, setWithdrawal, setTargetSuccessRate,
      solveForTarget, setInflation, setPlanningMode, setWithdrawalFrequency, setBalance,
      handleRetirementStartChange, setCurrentAge, setPlanThroughAge,
      setRetirementAge, currentAge,
      retirementAge, planThroughAge, settingsDelay,
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
  percentiles: [{ p50: 1000 }, { p50: 900, withdrawal: 100 }],
  retirementDelay: 0,
  successRate: 0.9,
};

for (const planningMode of ["settings", "ages"]) {
  test(`${planningMode} startup reconciles retirement timing across mode switches`, () => {
    const h = harness({
      planningMode,
      currentAge: 43,
      retirementAge: 65,
      settingsDelay: 5,
    });
    let state = h.render();
    const expectedDelay = planningMode === "ages" ? 22 : 5;
    for (const mode of ["ages", "settings", "ages"]) {
      assert.equal(state.settingsDelay, expectedDelay);
      assert.equal(state.retirementAge, state.currentAge + expectedDelay);
      assert.equal(
        vm.runInContext('UserSettings.get("settingsDelay")', h.context),
        expectedDelay,
      );
      assert.equal(
        vm.runInContext('UserSettings.get("retirementAge")', h.context),
        state.retirementAge,
      );
      state.setPlanningMode(mode);
      state = h.render();
      assert.equal(
        h.workers.at(-1).message.params.retirementDelay,
        expectedDelay,
      );
    }
  });
}

test("duration retirement start updates and persists the age plan", () => {
  const h = harness();
  let state = h.render();
  state.handleRetirementStartChange(10);
  state = h.render();
  assert.equal(state.settingsDelay, 10);
  assert.equal(state.retirementAge, 53);
  assert.equal(state.planThroughAge, 90);
  assert.equal(
    vm.runInContext('UserSettings.get("retirementAge")', h.context),
    53,
  );
  state.setPlanningMode("ages");
  h.render();
  assert.equal(h.workers.at(-1).message.params.retirementDelay, 10);
  assert.equal(h.workers.at(-1).message.params.years, 37);

  state = h.render();
  state.setPlanningMode("settings");
  state.handleRetirementStartChange(0);
  state = h.render();
  assert.equal(state.retirementAge, 43);
  assert.equal(state.settingsDelay, 0);
});

test("age changes update and persist the duration retirement start", () => {
  const h = harness();
  let state = h.render();
  state.setPlanningMode("ages");
  state = h.render();
  state.setRetirementAge(65);
  state = h.render();
  assert.equal(state.settingsDelay, 22);
  state.setCurrentAge(45);
  state = h.render();
  assert.equal(state.settingsDelay, 20);
  assert.equal(
    vm.runInContext('UserSettings.get("settingsDelay")', h.context),
    20,
  );
  state.setPlanningMode("settings");
  state = h.render();
  assert.equal(h.workers.at(-1).message.params.retirementDelay, 20);
  assert.equal(h.workers.at(-1).message.params.years, 30);

  state.setPlanningMode("ages");
  state = h.render();
  state.setCurrentAge(65);
  state = h.render();
  assert.equal(state.settingsDelay, 0);
  state.setCurrentAge(60);
  state = h.render();
  assert.equal(state.settingsDelay, 5);
  state.setRetirementAge(60);
  state = h.render();
  assert.equal(state.settingsDelay, 0);
});

test("duration retirement start keeps the age plan end after retirement", () => {
  const h = harness();
  let state = h.render();
  state.setCurrentAge(115);
  state.setPlanThroughAge(120);
  state = h.render();
  state.handleRetirementStartChange(10);
  state = h.render();
  assert.equal(state.retirementAge, 125);
  assert.equal(state.planThroughAge, 126);
  state.setPlanningMode("ages");
  h.render();
  assert.equal(h.workers.at(-1).message.params.retirementDelay, 10);
  assert.equal(h.workers.at(-1).message.params.years, 1);
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

test("pending results retain inflation, mode, frequency and balance from the completed run", async () => {
  const h = harness();
  h.render();
  h.workers[0].done(result);
  await flush();
  let state = h.render();
  const original = state.simInputs;
  state.setInflation(0.1);
  state.setPlanningMode("ages");
  state.setWithdrawalFrequency("annual");
  state.setBalance(4000000);
  h.render();
  state = h.render();
  assert.equal(state.simInputs, original);
  assert.equal(state.simUseAges, false);
  assert.equal(state.running, true);
  h.workers[1].done(result);
  await flush();
  state = h.render();
  assert.equal(state.simInputs.inflation, 0.1);
  assert.equal(state.simUseAges, true);
  assert.equal(state.simInputs.withdrawalFrequency, "annual");
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
  test(`solver reports the applied withdrawal and search limit: ${limit}`, async () => {
    const h = harness();
    h.render();
    h.workers[0].done(result);
    await flush();
    const solve = h.render().solveForTarget();
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
    assert.equal(state.withdrawal, expected);
    assert.equal(state.currentSolverResult.withdrawal, expected);
    assert.equal(state.currentSolverResult.limit, limit);
    state.setInflation(0.1);
    assert.equal(h.render().currentSolverResult, null);
  });
}

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
