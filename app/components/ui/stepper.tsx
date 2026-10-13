export function Stepper({
  name,
  label,
  value,
  min = 0,
  max = 99,
  onChange,
  submit = true,
}: {
  name: string;
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  /** Leave false for a local preview so the number is not posted with the form. */
  submit?: boolean;
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
          name={submit ? name : undefined}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onKeyDown={
            submit
              ? undefined
              : (e) => {
                  if (e.key === "Enter") e.preventDefault();
                }
          }
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
