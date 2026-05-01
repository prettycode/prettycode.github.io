// ─── Slider Component ───────────────────────────────────────────────────────

function Slider({ label, value, min, max, step, onChange, format, sublabel }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="slider-row">
      <div className="slider-header">
        <div>
          <div className="slider-label">{label}</div>
          {sublabel && <div className="slider-sub">{sublabel}</div>}
        </div>
        <div className="slider-value">{format(value)}</div>
      </div>
      <div className="slider-track-wrap">
        <input
          type="range"
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
