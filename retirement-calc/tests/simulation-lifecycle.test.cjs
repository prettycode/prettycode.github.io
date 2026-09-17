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

function harness() {
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
        return null;
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
      solveForTarget, setInflation, setPlanningMode, setWithdrawalFrequency, setBalance,
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
