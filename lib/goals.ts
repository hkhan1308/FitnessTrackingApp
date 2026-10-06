export function goalProgress(
  start: number | null,
  current: number | null,
  goal: number | null,
): { percent: number; remaining: number; atGoal: boolean } | null {
  if (current == null || goal == null) return null;
  const remaining = goal - current;
  const atGoal = Math.abs(remaining) < 0.05;
  const origin = start ?? current;
  const total = goal - origin;
  let percent = 0;
  if (Math.abs(total) < 0.0001) {
    percent = atGoal ? 100 : 0;
  } else {
    percent = ((current - origin) / total) * 100;
  }
  percent = Math.max(0, Math.min(100, percent));
  return { percent, remaining, atGoal };
}

export function remainingLabel(
  remaining: number,
  unit: string,
  digits = 1,
): string {
  if (Math.abs(remaining) < 0.05) return "At goal";
  const amount = Math.abs(remaining).toFixed(digits);
  return `${amount} ${unit} to go`;
}
