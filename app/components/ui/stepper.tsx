export function Stepper({
  name,
  label,
  value,
  min = 0,
  max = 99,
  onChange,
}: {
  name: string;
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  const id = `count-${name}`;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="stepper">
        <button
          className="btn secondary"
          type="button"
          aria-label={`Fewer ${label}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          −
        </button>
        <input
          id={id}
          className="control"
          name={name}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={(e) => {
            const next = Number.parseInt(e.target.value, 10);
            if (Number.isNaN(next)) onChange(min);
            else onChange(Math.min(max, Math.max(min, next)));
          }}
        />
        <button
          className="btn secondary"
          type="button"
          aria-label={`More ${label}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          +
        </button>
      </div>
    </div>
  );
}
