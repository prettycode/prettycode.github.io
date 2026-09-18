/* exported fmtMoney, fmtMoneyFull, fmtPct, fmtOdds */

// ─── Formatting helpers ─────────────────────────────────────────────────────

const fmtMoney = (n) => {
  if (n >= 1_000_000) {
    return `$${(n / 1_000_000).toFixed(2)}M`;
  }
  if (n >= 1_000) {
    return `$${(n / 1_000).toFixed(0)}K`;
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
    return `${Math.max(1, Math.round(p * 1000))} in 1,000`;
  }
  return `${Math.round(p * 100)} in 100`;
};
