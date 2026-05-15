import { formatPercent } from '../utils/format';

export interface BarSegment {
  label: string;
  value: number;
  color: string;
}

export function StackedBar({
  segments, total, height = 8,
}: {
  segments: BarSegment[];
  total: number;
  height?: number;
}) {
  if (total <= 0) return <div className="w-full bg-neutral-100" style={{ height }} />;
  return (
    <div className="flex w-full overflow-hidden bg-neutral-100" style={{ height }}>
      {segments.map((s, i) =>
        s.value > 0 ? (
          <div
            key={i}
            title={`${s.label}: ${formatPercent(s.value, total)}`}
            style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color }}
          />
        ) : null
      )}
    </div>
  );
}
