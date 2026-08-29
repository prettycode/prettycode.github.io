import { useMemo, useState } from "react";

const BAR_COLOR = "#2563eb";

type BreakdownItem = { label: string; value: number };
type SortMode = "default" | "value-asc" | "value-desc";

const SORT_MODES: SortMode[] = ["default", "value-asc", "value-desc"];
const SORT_LABEL: Record<SortMode, string> = {
  default: "Default order",
  "value-asc": "Smallest first",
  "value-desc": "Largest first",
};
const NEXT_SORT_LABEL: Record<SortMode, string> = {
  default: SORT_LABEL["value-asc"],
  "value-asc": SORT_LABEL["value-desc"],
  "value-desc": SORT_LABEL.default,
};

function sortItems(items: BreakdownItem[], sortMode: SortMode) {
  switch (sortMode) {
    case "value-desc":
      return [...items].sort(
        (a, b) => b.value - a.value || a.label.localeCompare(b.label),
      );
    case "value-asc":
      return [...items].sort(
        (a, b) => a.value - b.value || a.label.localeCompare(b.label),
      );
    default:
      return items;
  }
}

function nextSortMode(sortMode: SortMode) {
  return SORT_MODES[(SORT_MODES.indexOf(sortMode) + 1) % SORT_MODES.length];
}

function SortIcon({ mode }: { mode: SortMode }) {
  const widths: Record<SortMode, [number, number, number]> = {
    default: [10, 10, 10],
    "value-asc": [5, 8, 11],
    "value-desc": [11, 8, 5],
  };

  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      {widths[mode].map((width, index) => (
        <path key={index} d={`M2 ${3 + index * 4}h${width}`} />
      ))}
    </svg>
  );
}

export function Breakdown({
  title,
  items,
  total,
  sortable = false,
}: {
  title: string;
  items: BreakdownItem[];
  total: number;
  sortable?: boolean;
}) {
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const visible = useMemo(
    () =>
      sortItems(
        items.filter((i) => i.value > 0),
        sortMode,
      ),
    [items, sortMode],
  );

  if (visible.length === 0 || total === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-[10px] font-medium tracking-[0.15em] text-neutral-400 uppercase">
          {title}
        </p>
        {sortable && (
          <button
            type="button"
            onClick={() => setSortMode(nextSortMode)}
            className="text-neutral-400 hover:text-neutral-900 focus:text-neutral-900 transition-colors"
            aria-label={`${SORT_LABEL[sortMode]}; sort ${title} breakdown by ${NEXT_SORT_LABEL[sortMode].toLowerCase()}`}
            title={`${SORT_LABEL[sortMode]} - click for ${NEXT_SORT_LABEL[sortMode].toLowerCase()}`}
          >
            <SortIcon mode={sortMode} />
          </button>
        )}
      </div>
      <div className="space-y-2.5">
        {visible.map(({ label, value }) => {
          const pct = (value / total) * 100;
          return (
            <div key={label}>
              <div className="flex items-baseline justify-between text-xs mb-1">
                <span className="text-neutral-700">{label}</span>
                <span className="tabular-nums text-neutral-500">
                  {pct.toFixed(1)}%
                </span>
              </div>
              <div className="h-1.5 bg-neutral-100 overflow-hidden">
                <div
                  className="h-full"
                  style={{
                    width: `${Math.min(pct, 100)}%`,
                    backgroundColor: BAR_COLOR,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
