/* exported UserSettings */

// ─── UserSettings — sidebar persistence ────────────────────────────────────
// Persists the user-tunable sidebar values to localStorage so a reload
// restores the last-used configuration. Only keys whose value differs from
// the default are written; setting a key back to its default removes it from
// storage. That keeps the payload minimal and lets future default changes
// propagate to users who never customized that knob.
//
// Loaded after monte-carlo.js so the cagr/volatility/inflation defaults can
// be sourced from the same MARKET_PRESETS table the simulator boots with.

const USER_SETTINGS_STORAGE_KEY = "retirement-calc-settings-v1";

const SETTINGS_DEFAULTS = (() => {
  const SWR_TARGET = 0.9;
  const AGE_NOW = 43;
  const AGE_DEPLETION = 90;

  const initialMarket = MARKET_PRESETS.world.historical;
  return {
    balance: 3_500_000,
    withdrawal: 150_000,
    upfrontYears: 2,
    planningMode: "ages",
    settingsYears: AGE_DEPLETION - AGE_NOW,
    settingsDelay: 0,
    currentAge: AGE_NOW,
    retirementAge: AGE_NOW,
    planThroughAge: AGE_DEPLETION,
    targetSuccessRate: SWR_TARGET * 100,
    inflationAdjustBucket: false,
    bucketEarnsTBills: false,
    cagr: initialMarket.cagr,
    volatility: initialMarket.volatility,
    inflation: initialMarket.inflation,
    marketAssumptionsOpen: false,
    advancedOpen: false,
    showCalendarYears: false,
  };
})();

const UserSettings = (() => {
  // Cached snapshot of the parsed object so reads after the first don't
  // re-hit JSON.parse and don't force layout via the storage API.
  let cache = null;

  const hasOwn = (object, key) =>
    Object.prototype.hasOwnProperty.call(object, key);

  const isKnownSetting = (key) => hasOwn(SETTINGS_DEFAULTS, key);

  const isCompatible = (data) =>
    data !== null &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    Object.entries(data).every(
      ([key, value]) =>
        isKnownSetting(key) && typeof value === typeof SETTINGS_DEFAULTS[key],
    );

  const removeSavedSettings = () => {
    try {
      localStorage.removeItem(USER_SETTINGS_STORAGE_KEY);
    } catch {
      // Storage may be unavailable; the in-memory cache remains authoritative.
    }
  };

  const readAll = () => {
    if (cache !== null) {
      return cache;
    }
    try {
      const raw = localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      const hadFrequency =
        parsed !== null &&
        typeof parsed === "object" &&
        hasOwn(parsed, "withdrawalFrequency");
      // Retire the old frequency preference without discarding other settings.
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        delete parsed.withdrawalFrequency;
      }
      if (isCompatible(parsed)) {
        cache = parsed;
        if (hadFrequency) {
          writeAll(cache);
        }
      } else {
        cache = {};
        removeSavedSettings();
      }
    } catch {
      cache = {};
      removeSavedSettings();
    }
    return cache;
  };

  const writeAll = (data) => {
    cache = data;
    if (Object.keys(data).length === 0) {
      removeSavedSettings();
      return;
    }
    try {
      localStorage.setItem(USER_SETTINGS_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage may be disabled (private mode, quota); the in-memory cache
      // still holds the value so the rest of the session stays consistent.
    }
  };

  return {
    defaults: SETTINGS_DEFAULTS,
    has: isKnownSetting,
    get(key) {
      const stored = readAll();
      return hasOwn(stored, key) ? stored[key] : SETTINGS_DEFAULTS[key];
    },
    set(key, value) {
      if (!isKnownSetting(key)) {
        return;
      }
      const stored = readAll();
      const isDefault = value === SETTINGS_DEFAULTS[key];
      const present = hasOwn(stored, key);
      if (isDefault) {
        if (!present) {
          return;
        }
        const next = { ...stored };
        delete next[key];
        writeAll(next);
      } else {
        if (present && stored[key] === value) {
          return;
        }
        writeAll({ ...stored, [key]: value });
      }
    },
    clear() {
      writeAll({});
    },
  };
})();
