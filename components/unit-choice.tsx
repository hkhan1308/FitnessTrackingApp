import { Button } from "@/components/ui/button";
import type { UnitSystem } from "@/lib/units";

export function UnitChoice({
  value,
  onChange,
}: {
  value: UnitSystem;
  onChange: (value: UnitSystem) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2" role="group" aria-label="Measurement units">
      {(
        [
          ["us", "Pounds and inches"],
          ["metric", "Kilograms and centimeters"],
        ] as const
      ).map(([option, label]) => (
        <Button
          key={option}
          type="button"
          variant={value === option ? "default" : "outline"}
          className="h-11"
          onClick={() => onChange(option)}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
