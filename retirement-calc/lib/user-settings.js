// ─── UserSettings — sidebar persistence ────────────────────────────────────
// Persists the user-tunable sidebar values to localStorage so a reload
// restores the last-used configuration. Only keys whose value differs from
// the default are written; setting a key back to its default removes it from
// storage. That keeps the payload minimal and lets future default changes
// propagate to users who never customized that knob.
//
// Loaded after monte-carlo.js so the cagr/volatility/inflation defaults can
// be sourced from the same MARKET_PRESETS table the simulator boots with.

const USER_SETTINGS_STORAGE_KEY = 'retirement-calc-settings-v1';

const SETTINGS_DEFAULTS = (() => {
  const initialMarket = MARKET_PRESETS.world.historical;
  return {
    balance: 4_000_000,
    withdrawal: 150_000,
    withdrawalFrequency: 'annual',
    upfrontYears: 3,
    years: 40,
    inflationAdjustBucket: false,
    bucketEarnsTBills: false,
    cagr: initialMarket.cagr,
    volatility: initialMarket.volatility,
    inflation: initialMarket.inflation,
    advancedOpen: false,
  };
})();

const UserSettings = (() => {
  // Cached snapshot of the parsed object so reads after the first don't
  // re-hit JSON.parse and don't force layout via the storage API.
  let cache = null;

  const readAll = () => {
    if (cache !== null) return cache;
    try {
      const raw = localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      cache = parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      cache = {};
    }
    return cache;
  };

  const writeAll = (data) => {
    cache = data;
    try {
      if (Object.keys(data).length === 0) {
        localStorage.removeItem(USER_SETTINGS_STORAGE_KEY);
      } else {
        localStorage.setItem(USER_SETTINGS_STORAGE_KEY, JSON.stringify(data));
      }
    } catch {
      // Storage may be disabled (private mode, quota); the in-memory cache
      // still holds the value so the rest of the session stays consistent.
    }
  };

  return {
    defaults: SETTINGS_DEFAULTS,
    has(key) {
      return Object.prototype.hasOwnProperty.call(SETTINGS_DEFAULTS, key);
    },
    get(key) {
      const stored = readAll();
      return Object.prototype.hasOwnProperty.call(stored, key)
        ? stored[key]
        : SETTINGS_DEFAULTS[key];
    },
    set(key, value) {
      if (!Object.prototype.hasOwnProperty.call(SETTINGS_DEFAULTS, key)) return;
      const stored = readAll();
      const isDefault = value === SETTINGS_DEFAULTS[key];
      const present = Object.prototype.hasOwnProperty.call(stored, key);
      if (isDefault) {
        if (!present) return;
        const next = { ...stored };
        delete next[key];
        writeAll(next);
      } else {
        if (present && stored[key] === value) return;
        writeAll({ ...stored, [key]: value });
      }
    },
    clear() {
      writeAll({});
    },
  };
})();
