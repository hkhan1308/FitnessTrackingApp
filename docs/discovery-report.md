# Fit Log discovery report

Phase 1 only. This describes the code as it is. Nothing else in the repo was changed for this report.

The plan’s starting notes are out of date on two points: `food_log` does get a `meal` column, and the profile row does store the unit system and starting weight. Both are added after the original `CREATE TABLE` statements.

## 1. Meal slots

The original `food_log` table has no meal column. It is created in `lib/store.ts` at lines 65–79 with id, date, name, quantity, unit, grams, macros, source, food id, and created time.

`migrate()` then adds the column to an existing table:

- `lib/store.ts` line 223 calls `ensureColumn("food_log", "meal", "TEXT")`.
- `ensureColumn` (`lib/store.ts` lines 263–268) reads `PRAGMA table_info` and, if the column is missing, runs `ALTER TABLE food_log ADD COLUMN meal TEXT`.

The slot is not a separate table. It is one text value in `food_log.meal`.

Writes go through `encodeMeal` in `lib/meals.ts` lines 26–31:

- Breakfast, lunch, and dinner are stored as `breakfast`, `lunch`, and `dinner`. Occasion is ignored.
- The first snack is stored as `snack`.
- A later snack is stored as `snack:2`, `snack:3`, and so on.

Call sites:

- `addFoodLog` writes it at `lib/store.ts` lines 609 and 625.
- `updateFoodLog` writes it at lines 644 and 653.
- JSON import writes it at lines 870 and 886.
- CSV export writes the same encoded string at `app/api/export/route.ts` line 164.

Reads split that string back apart in `mapLog` (`lib/store.ts` lines 555–556):

- `parseMeal` (`lib/meals.ts` lines 10–15) keeps the part before the colon, so `snack:2` is the meal `snack`.
- `snackOccasion` (`lib/meals.ts` lines 17–24) reads the number after `snack:`. Anything else, including plain `snack`, is occasion 1.
- A null or unrecognized meal stays null. The food page labels those rows “Earlier entries” (`components/food-logger.tsx` lines 332–336). `mealLabel` in `lib/meals.ts` lines 37–40 returns the same label.

The food page (`components/food-logger.tsx`) keeps one section for breakfast, lunch, and dinner (lines 312–314). Snacks are one section per occasion (lines 324–325). “Another snack” (line 213) opens the next occasion, and new food is posted with that occasion.

History prints the label on a day row at `app/(app)/history/page.tsx` line 105. A row with no meal is shown there without the “Earlier entries” prefix.

## 2. Rolling average

`rollingAverages` in `lib/moving-average.ts` lines 1–18 averages the last 7 non-null values in the array. It does not know about calendar days.

For each entry:

- `null` or `NaN` pushes `null` into the result and is not added to the window.
- Any other number is appended to `seen`. The average uses `seen.slice(-window)` (default 7), then rounds to one decimal.

A gap does not count as a day in the window. The next logged number is averaged with the previous logged numbers, however far apart those array slots are. The caller decides what each array index means. This function never sees a date.

## 3. Goals

Calorie, macro, and goal body-fat targets are in `lib/targets.ts`. `lib/goals.ts` only turns a start, current, and goal weight into a progress percent. It does not calculate targets.

Functions in `lib/targets.ts`:

- `isActivity` (lines 21–23) accepts `sedentary`, `light`, `moderate`, `active`, or `very`.
- `goalBodyFatPercent` (lines 49–59). Lean mass is `currentWeightLbs * (1 - currentBodyFat / 100)`. Goal body fat is `(1 - lean / goalWeightLbs) * 100`, rounded to one decimal. It returns null when current or goal weight is not positive, when current body fat is not strictly between 0 and 80, or when goal weight is less than or equal to lean mass.
- `calculateTargets` (lines 61–109). Returns null if current weight, current body fat, or goal weight is missing, or if `goalBodyFatPercent` returns null. Otherwise:
  - BMR is `370 + 21.6 * leanKg`, with `leanKg = leanLbs / 2.2046226218`.
  - TDEE is BMR times the activity factor. The factors are 1.2, 1.375, 1.55, 1.725, and 1.9 (lines 5–11). An unknown activity uses 1.375.
  - Calories start at TDEE. If goal weight is more than 0.2 lb under current weight, calories are `TDEE * 0.85`. If goal weight is more than 0.2 lb over current weight, calories are `TDEE * 1.1`. A gap of 0.2 lb or less stays at TDEE.
  - If that calorie number is below BMR, it is raised to BMR. The result is then rounded to the nearest integer.
  - Protein is `round((goalWeightLbs / 2.2046226218) * 1.8)`.
  - Fat is `round((calories * 0.275) / 9)`. Carbs fill the remaining calories at 4 kcal per gram. If that remainder is negative, fat is reduced until carbs are not negative.
  - Direction is `loss`, `gain`, or `maintain` using the same 0.2 lb band.
- `macroGoalScore` (lines 133–152). A goal is skipped when it is null or not positive. Calories, carbs, and fat hit when the logged total is within 10 percent of the goal (`abs(actual - goal) / goal <= 0.1`). Protein hits when it is at least 90 percent of the goal. The function returns `{ hit, checked }`, or null when no goal was checked.

When the goal weight is heavier than the current weight by more than 0.2 lb, direction is `gain`, calories are 10 percent above TDEE (still subject to the BMR floor and rounding), and goal body fat goes up. The extra weight is treated as fat, because lean mass is held constant. `TARGET_ASSUMPTIONS` at lines 111–117 says the same thing. If the heavier goal is still at or below lean mass, `goalBodyFatPercent` returns null and `calculateTargets` returns null, so there is no calorie target either.

## 4. Login

The login route is `app/api/login/route.ts`, `POST`.

The IP is not read in that file. Line 14 calls `clientIp(request)` from `lib/request.ts` lines 1–3:

```ts
request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local"
```

That is the first comma-separated entry, trimmed. If the header is missing, empty, or the first entry trims to an empty string, the value is the shared string `"local"`. There is no per-request fallback.

`loginLocked` (`lib/store.ts` lines 903–911) counts failed attempts for that exact string in the last 15 minutes and locks at 8 failures. A missing header therefore shares one lockout bucket for every request that also has no header.

## 5. Units and starting weight

Both live on the single profile row, but neither is in the original `CREATE TABLE`.

`profile` is created at `lib/store.ts` lines 28–41 with sex, current weight, goal weight, starting and goal body fat, height, and the four macro goals. It does not list `units` or `starting_weight_lbs`.

`migrate()` adds them at lines 219–220:

- `ensureColumn("profile", "units", "TEXT")`
- `ensureColumn("profile", "starting_weight_lbs", "REAL")`

`mapProfile` (lines 274–276) reads `units` as `"metric"` only when the stored value is exactly `metric`. Anything else, including null, becomes `"us"`. Starting weight is `starting_weight_lbs`.

`saveProfile` (lines 300–334) writes both columns. The unit value saved is `metric` or `us`.

This is separate from `foods.units`, which is a JSON map of household unit names to grams (`lib/store.ts` lines 52–63 and 144).

## 6. Callers of `lib/store.ts`

Runtime imports:

| File | Imports |
| --- | --- |
| `app/(app)/page.tsx` | `getHome` |
| `app/(app)/food/page.tsx` | `getFoodLog`, `getProfile`, `recentMeals`, `totalsFor` |
| `app/(app)/log/page.tsx` | `getMetric`, `getProfile` |
| `app/(app)/history/page.tsx` | `getDay`, `getProfile`, `getSpan`, type `Profile` |
| `app/(app)/settings/page.tsx` | `getProfile` |
| `app/api/export/route.ts` | `exportData` |
| `app/api/import/route.ts` | `importData` |
| `app/api/login/route.ts` | `loginLocked`, `recordLogin` |
| `app/api/profile/route.ts` | `getProfile`, `saveProfile` |
| `app/api/metrics/route.ts` | `deleteMetric`, `getMetric`, `requireDate`, `saveMetric` |
| `app/api/foods/search/route.ts` | `searchLocalFoods` |
| `app/api/food-log/route.ts` | `addFoodLog`, `getFoodLog`, `rememberFood`, `requireDate`, `totalsFor` |
| `app/api/food-log/copy/route.ts` | `copyFoodLog`, `requireDate`, `updateFoodLog` |
| `app/api/food-log/[id]/route.ts` | `deleteFoodLog`, `updateFoodLog` |

Type-only imports:

| File | Types |
| --- | --- |
| `components/settings-panel.tsx` | `Profile` |
| `components/food-logger.tsx` | `FoodLogItem`, `MacroTotals`, `Profile` |
| `components/macro-bars.tsx` | `MacroTotals`, `Profile` |
| `components/log-form.tsx` | `Metric`, `Profile` |

No test file imports `lib/store.ts`.

## 7. Tests and zod

There is one test file, `lib/logic.test.ts`. It uses `node:test` and `node:assert/strict`. `package.json` runs it with `node --experimental-strip-types --test lib/*.test.ts`. There is no vitest config and no `tests/` directory.

`tsconfig.json` excludes `**/*.test.ts`, so `tsc` does not typecheck that file.

Zod is not a direct dependency in `package.json`, and no application file imports it. The lockfile only mentions it as a dependency of other packages.

## 8. Dates

`todayISO` is in `lib/dates.ts` lines 11–18. It formats `now` (default `new Date()`) with `Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" })`. `en-CA` is what produces `YYYY-MM-DD`. The timezone is the constant `TIMEZONE` on line 1, `America/Los_Angeles`.

Week and month helpers do not use that timezone. They parse a `YYYY-MM-DD` string as UTC noon (`parseISODate`, lines 20–23) and do calendar math in UTC. `startOfWeek` (lines 35–39) treats Monday as the first day and Sunday as the last.
