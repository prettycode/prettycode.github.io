/* exported Slider */

// ─── Slider Component ───────────────────────────────────────────────────────

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  sublabel,
  description,
  editable = false,
  disabled = false,
}) {
  const questionId = React.useId();
  const descriptionId = React.useId();
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  // The details stay in the accessibility tree (collapsed, not removed) so
  // screen readers always get them as the input's description.
  const describedBy =
    [sublabel && questionId, description && descriptionId]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <div
      className="slider-row"
      onKeyDown={(event) => {
        if (event.key === "Escape" && detailsOpen) {
          setDetailsOpen(false);
        }
      }}
    >
      <div className="slider-header">
        <div className="slider-label">
          {label}
          {description && (
            <button
              type="button"
              className="slider-info"
              aria-label={`Details for ${label}`}
              title={detailsOpen ? "Hide details" : "Show details"}
              aria-expanded={detailsOpen}
              aria-controls={descriptionId}
              onClick={() => setDetailsOpen(!detailsOpen)}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 20 20"
                aria-hidden="true"
                focusable="false"
              >
                <circle
                  className="slider-info-ring"
                  cx="10"
                  cy="10"
                  r="7.5"
                  strokeWidth="1.25"
                />
                <path
                  className="slider-info-stem"
                  d="M10 9v4.25"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <circle className="slider-info-dot" cx="10" cy="6.4" r="0.95" />
              </svg>
            </button>
          )}
        </div>
        <div className="slider-value">
          {editable ? (
            <input
              type="number"
              aria-label={label}
              aria-describedby={describedBy}
              min={min}
              max={max}
              step={step}
              key={`${value}-${min}-${max}`}
              defaultValue={value}
              disabled={disabled}
              style={{
                width: 64,
                font: "inherit",
                color: "inherit",
                background: "transparent",
                border: "1px solid var(--rule)",
                padding: 4,
              }}
              onBlur={(e) => {
                const parsed = Number(e.target.value);
                const next =
                  e.target.value.trim() && Number.isFinite(parsed)
                    ? Math.max(min, Math.min(max, Math.round(parsed)))
                    : value;
                e.target.value = next;
                onChange(next);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                }
              }}
            />
          ) : (
            format(value)
          )}
        </div>
      </div>
      {sublabel && (
        <div className="slider-sub" id={questionId}>
          {sublabel}
        </div>
      )}
      {description && (
        <div
          className="slider-details"
          data-open={detailsOpen}
          inert={detailsOpen ? undefined : ""}
        >
          <div className="slider-details-clip">
            <div className="slider-description" id={descriptionId}>
              {[].concat(description).map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="slider-track-wrap">
        <input
          type="range"
          aria-label={editable ? `${label} slider` : label}
          aria-describedby={describedBy}
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
