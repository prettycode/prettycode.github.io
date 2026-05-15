const BAR_COLOR = '#2563eb';

export function Breakdown({
  title, items, total,
}: {
  title: string;
  items: Array<{ label: string; value: number }>;
  total: number;
}) {
  const visible = items.filter(i => i.value > 0);
  if (visible.length === 0 || total === 0) return null;
  return (
    <div>
      <p className="text-[10px] font-medium tracking-[0.15em] text-neutral-400 uppercase mb-3">
        {title}
      </p>
      <div className="space-y-2.5">
        {visible.map(({ label, value }) => {
          const pct = (value / total) * 100;
          return (
            <div key={label}>
              <div className="flex items-baseline justify-between text-xs mb-1">
                <span className="text-neutral-700">{label}</span>
                <span className="tabular-nums text-neutral-500">{pct.toFixed(1)}%</span>
              </div>
              <div className="h-1.5 bg-neutral-100 overflow-hidden">
                <div
                  className="h-full"
                  style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: BAR_COLOR }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
