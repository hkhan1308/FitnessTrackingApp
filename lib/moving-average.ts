export function rollingAverages(
  values: Array<number | null>,
  window = 7,
): Array<number | null> {
  const result: Array<number | null> = [];
  const seen: number[] = [];
  for (const value of values) {
    if (value == null || Number.isNaN(value)) {
      result.push(null);
      continue;
    }
    seen.push(value);
    const slice = seen.slice(-window);
    const total = slice.reduce((sum, item) => sum + item, 0);
    result.push(Math.round((total / slice.length) * 10) / 10);
  }
  return result;
}
