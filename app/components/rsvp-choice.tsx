"use client";

type Choice = "yes" | "no" | "maybe";

export function RsvpChoice({
  attending,
  allowMaybe,
  onChange,
}: {
  attending: Choice | "";
  allowMaybe: boolean;
  onChange: (value: Choice) => void;
}) {
  const options: [Choice, string][] = allowMaybe
    ? [
        ["yes", "Yes"],
        ["maybe", "Maybe"],
        ["no", "No"],
      ]
    : [
        ["yes", "Yes"],
        ["no", "No"],
      ];
  return (
    <div className="choice">
      {options.map(([value, label]) => (
        <label key={value} className={attending === value ? "pick on" : "pick"}>
          <input
            type="radio"
            name="attending"
            value={value}
            required
            checked={attending === value}
            onChange={() => onChange(value)}
          />
          {label}
        </label>
      ))}
    </div>
  );
}
