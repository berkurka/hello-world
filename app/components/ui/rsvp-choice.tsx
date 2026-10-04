export type RsvpAnswer = "yes" | "maybe" | "no";

const CHOICES: { value: RsvpAnswer; label: string }[] = [
  { value: "yes", label: "Going" },
  { value: "maybe", label: "Maybe" },
  { value: "no", label: "Can't go" },
];

export function RsvpChoice({
  value,
  onChange,
  allowMaybe = false,
  name = "attending",
  readOnly = false,
}: {
  value?: RsvpAnswer | "";
  onChange?: (value: RsvpAnswer) => void;
  /** Show the third answer. Leave false until Maybe is saved on the server. */
  allowMaybe?: boolean;
  name?: string;
  readOnly?: boolean;
}) {
  const options = CHOICES.filter((choice) => allowMaybe || choice.value !== "maybe");
  if (readOnly) {
    return (
      <div className="segment" aria-hidden="true">
        {options.map((choice) => (
          <span key={choice.value} className="segment-btn">
            {choice.label}
          </span>
        ))}
      </div>
    );
  }
  return (
    <div className="segment" role="radiogroup" aria-label="Will you attend?">
      {options.map((choice) => {
        const on = value === choice.value;
        return (
          <label key={choice.value} className={on ? `segment-btn on ${choice.value}` : "segment-btn"}>
            <input
              type="radio"
              name={name}
              value={choice.value}
              required
              checked={on}
              onChange={() => onChange?.(choice.value)}
            />
            {choice.label}
          </label>
        );
      })}
    </div>
  );
}
