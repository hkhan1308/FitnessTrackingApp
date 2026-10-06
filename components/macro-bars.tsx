import { fmt, fmtInt } from "@/lib/format";
import type { MacroTotals, Profile } from "@/lib/store";

const rows = [
  { key: "calories", label: "Calories", digits: 0 },
  { key: "protein", label: "Protein", digits: 0, suffix: "g" },
  { key: "carbs", label: "Carbs", digits: 0, suffix: "g" },
  { key: "fat", label: "Fat", digits: 0, suffix: "g" },
] as const;

export function MacroBars({ totals, profile }: { totals: MacroTotals; profile: Profile }) {
  const goals = {
    calories: profile.calorieGoal,
    protein: profile.proteinGoal,
    carbs: profile.carbGoal,
    fat: profile.fatGoal,
  };
  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const value = totals[row.key];
        const goal = goals[row.key];
        const percent = goal && goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
        const shown = row.digits === 0 ? fmtInt(value) : fmt(value, 1);
        const goalText = goal == null ? "No goal" : row.digits === 0 ? fmtInt(goal) : fmt(goal, 0);
        return (
          <div key={row.key} className="space-y-1">
            <div className="flex items-baseline justify-between text-sm">
              <span>{row.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {shown}
                {"suffix" in row ? row.suffix : ""} / {goalText}
                {"suffix" in row && goal != null ? row.suffix : ""}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
