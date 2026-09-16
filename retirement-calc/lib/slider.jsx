// ─── Slider Component ───────────────────────────────────────────────────────

function Slider({ label, value, min, max, step, onChange, format, sublabel, editable = false, disabled = false }) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div className="slider-row">
      <div className="slider-header">
        <div>
          <div className="slider-label">{label}</div>
          {sublabel && <div className="slider-sub">{sublabel}</div>}
        </div>
        <div className="slider-value">{editable ? (
          <input type="number" aria-label={label} min={min} max={max} step={step}
            key={`${value}-${min}-${max}`} defaultValue={value} disabled={disabled}
            style={{ width: 64, font: 'inherit', color: 'inherit', background: 'transparent', border: '1px solid var(--rule)', padding: 4 }}
            onBlur={(e) => {
              const parsed = Number(e.target.value);
              const next = e.target.value.trim() && Number.isFinite(parsed)
                ? Math.max(min, Math.min(max, Math.round(parsed))) : value;
              e.target.value = next;
              onChange(next);
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          />
        ) : format(value)}</div>
      </div>
      <div className="slider-track-wrap">
        <input
          type="range"
          aria-label={editable ? `${label} slider` : label}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ "--pct": `${pct}%` }}
        />
      </div>
    </div>
  );
}
