/* exported fmtMoney, fmtMoneyFull, fmtPct, fmtOdds */

// ─── Formatting helpers ─────────────────────────────────────────────────────

// Pick the unit from the rounded value so 999,600 shows "$1.00M", not "$1000K".
const fmtMoney = (n) => {
  const thousands = Math.round(n / 1_000);
  if (thousands >= 1_000) {
    return `$${(n / 1_000_000).toFixed(2)}M`;
  }
  if (Math.round(n) >= 1_000) {
    return `$${thousands}K`;
  }
  return `$${Math.round(n)}`;
};

const fmtMoneyFull = (n) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

const fmtPct = (n, digits = 1) => `${(n * 100).toFixed(digits)}%`;

// Use thousandths for rare outcomes so a small chance never rounds to zero.
const fmtOdds = (p) => {
  if (p > 0 && p < 1 && (p < 0.01 || p > 0.99)) {
    return `${Math.max(1, Math.min(999, Math.round(p * 1000)))} in 1,000`;
  }
  return `${Math.round(p * 100)} in 100`;
};
