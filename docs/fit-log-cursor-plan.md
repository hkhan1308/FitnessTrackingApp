Fit Log: Cursor Implementation Plan

Save this file in the repo as docs/fit-log-cursor-plan.md. Phases reference it and docs/discovery-report.md.

Version 2. Updated after the Phase 1 discovery report. The first version was written against an older lib/store.ts; the phases below now match the code in the repo.

How to use this file





Before Phase 4, export a JSON backup from the app (Settings, Backup). Keep it somewhere safe.



Paste Section 0 into Cursor as a project rule (.cursor/rules/fit-log.mdc) so it applies to every phase.



Run one phase per Cursor session. Paste the phase into Agent mode, let it finish, review the diff, run the checks, commit, then move to the next phase.



Every phase ends with a STOP. Cursor should report back and wait. It should not start the next phase on its own.



Phases are ordered so each one is protected by the one before it. Do not reorder them.







Phase



What it does



Risk



Status





1



Discovery report, no code changes



None



Done (e406d23)





2



Unit tests that lock in current behavior



None



Done (6454204)





2.5



One test runner, typecheck tests



None









3



Data-safety bug fixes



Low









4



Numbered migration runner



Medium









5



Schema changes: user_id, profile fields



Medium (backup first)









6



Split store.ts into repositories



Low (behavior unchanged)









7



Backup v2 with Zod validation



Low









8



Query performance and the rolling average



Low









9



Goal math correctness



Medium (review numbers)









10



Raw vs cooked grams



Medium









11



Update the spec and AI plan docs



None









12



AI groundwork (only after the AI plan is approved)



Low









Section 0: Project rules (paste as a Cursor rule)

You are working on Fit Log, a personal fitness and nutrition tracker.
Stack: Next.js 16 App Router, React 19, TypeScript, Tailwind 4, shadcn/ui,
Recharts, Turso via @libsql/client. Deployed on Vercel. Single passcode auth.

Source of truth documents: docs/project-spec.md and docs/ai-plan.md.

Hard rules:
- Do not change these formulas unless a phase explicitly says so:
  Katch-McArdle BMR (370 + 21.6 x lean kg), activity x1.375 default,
  15% deficit / 10% surplus, calories never below BMR,
  protein 1.8 g/kg of goal weight, fat 27.5% of calories, carbs remainder,
  U.S. Navy body-fat formulas, macro "hit" rule (calories, carbs, fat within
  10%; protein at least 90%).
- food_log rows store a macro snapshot at log time. Never recompute old
  rows from the foods table. Editing a food must not rewrite history.
- All SQL is parameterized. No string-built SQL with user input.
- Stored body measurements stay in pounds and inches.
- Dates are YYYY-MM-DD. Default timezone America/Los_Angeles.
- Do not add dependencies other than the ones a phase names.
- Do not touch the AI features in docs/ai-plan.md unless a phase says so.
- Before each fix, confirm the problem exists in the current code
  (see docs/discovery-report.md). If it does not, skip it and say so.
- Meal slots are stored in food_log.meal using the encoding in
  lib/meals.ts: breakfast, lunch, dinner, snack, snack:2, snack:3.
  Never change that encoding.
- Target math lives in lib/targets.ts. lib/goals.ts is only progress
  percent.
- Keep diffs small and focused on the current phase. No drive-by refactors,
  no renaming of routes, no UI redesigns.
- Never run migrations or destructive SQL against the production Turso
  database. Use a dev Turso database or an in-memory libsql client in tests.

Before finishing any phase:
- Run: npx tsc --noEmit, npm run lint, npm test, and (after Phase 2.5)
  npx tsc -p tsconfig.test.json --noEmit.
- Report: files changed, what changed and why, anything you were unsure
  about, and anything you chose not to do. Then STOP and wait.





Phase 1: Discovery report (no code changes)

Goal: Produce a written report on the current state of the code. Change nothing.

Read the codebase and answer each item with file paths and line references:

1. Meal slots. The spec says food is logged under breakfast, lunch, dinner,
   or Snack N, with older rows under "Earlier entries". lib/store.ts has no
   meal column on food_log. Where is the meal slot stored and read? Is there
   any code that adds a meal column to an existing table?
2. Rolling average. Open lib/moving-average.ts. Does rollingAverages average
   the last 7 array entries or the last 7 calendar days? Show the logic.
3. Goals. Find the module that calculates calorie, macro, and goal body-fat
   targets. List every function and the formula it uses. Describe exactly
   what happens when goal weight is heavier than current weight.
4. Login. Find the login route. How is the `ip` value derived? What happens
   if the header is missing?
5. Units. Where is the user's unit system (US or metric) stored? Where is
   starting weight stored? Neither is in the profile table.
6. Callers. List every file that imports from lib/store.ts and which
   functions it uses.
7. Tests. Is there any test setup? Is zod already a dependency?
8. Dates. Show how todayISO decides the timezone.

Output the report as docs/discovery-report.md. Make no other changes.
STOP and wait for review.





Phase 2: Characterization tests

Goal: Lock in current behavior of the pure functions with tests, so later
phases cannot change them by accident.

Add vitest as a dev dependency. Add "test": "vitest run" to package.json.
Create tests under tests/ (or colocated *.test.ts, follow repo convention if
one exists).

Write tests for:
- lib/body-fat.ts: male and female Navy estimates with known inputs, and
  null when required measurements are missing.
- The goals module found in Phase 1: BMR, TDEE, deficit, surplus, BMR floor,
  protein, fat, carbs, goal body fat for a lighter goal, and the "no
  body-fat target when goal weight is at or below lean mass" case.
- The macro-hit rule: exactly at each boundary (90% protein, +/-10% for the
  others) and just outside it.
- lib/food-portion.ts: resolvePortion and macrosForGrams for a household
  unit (roti, plate) and for grams.
- lib/food-parse.ts: parseFoodQuery on "2 roti", "1 plate biryani",
  "150g chicken breast", "daal".
- lib/dates.ts: startOfWeek is Monday, endOfWeek is Sunday, month bounds,
  addDays across a month boundary.
- lib/moving-average.ts: test what it does TODAY, even if Phase 1 showed it
  is index-based. Add a comment on that test saying it will change in
  Phase 8.

Rules:
- Test current behavior. Do not fix anything in this phase. If a result
  looks wrong, keep the test matching current behavior and list it in your
  report.
- No database in these tests. Pure functions only.

Acceptance: npm test passes. Report any behavior that looked wrong.
STOP and wait for review.





Phase 2.5: One test runner, typecheck tests

Goal: Clean up the test setup from Phase 2. No behavior changes.

- Move lib/logic.test.ts from node:test to vitest. Keep every assertion.
  npm test runs vitest only. Remove the node --test script.
- tsconfig.json excludes **/*.test.ts, so tests are never typechecked.
  Add tsconfig.test.json that extends tsconfig.json and includes the test
  files. Add "typecheck:test": "tsc -p tsconfig.test.json --noEmit" to
  package.json.
- Fix any type errors this reveals in the tests themselves. If a type
  error points at app code, report it, do not fix it here.

Acceptance: npm test runs all tests under vitest (31 or more), npm run
typecheck:test passes.
STOP and wait for review.





Phase 3: Data-safety bug fixes

Goal: Fix four bugs that can lose or corrupt data. Each fix gets a test.

For database tests, create tests/helpers/test-db.ts that builds a libsql
client with url ":memory:" and runs the existing schema. Make lib/db.ts
accept an injected client for tests if it does not already (minimal change,
production behavior unchanged).

Fix 1: Seeding overwrites user edits.
- In migrate(), change the seed insert from ON CONFLICT(id) DO UPDATE to
  ON CONFLICT(id) DO NOTHING.
- In importData(), set seed_version to '1' after a restore, not '0'.
  The backup already contains the foods.
- Test: edit a seed food's calories, run import of a backup containing the
  edited row, confirm the edited value survives.

Fix 2: updateFoodLog leaves grams stale (confirm first; the function now
also writes meal, so check whether grams is handled).
- When quantity or unit changes and the row has a food_id, recompute grams
  from the food's units table using the existing resolvePortion logic.
- When the row has no food_id (manual or web), accept an optional grams
  value in the input and store it; if none is given, set grams to null
  rather than leaving the old value.
- Do not recompute calories or macros here. The caller already sends them.
- Test both paths.

Fix 3: login_attempts grows forever.
- In recordLogin, also delete rows where attempted_at is older than 24 hours.
- Test that old rows are removed.

Fix 4: Lockout keying.
- clientIp in lib/request.ts falls back to the shared string "local" when
  x-forwarded-for is missing, so every headerless request shares one
  lockout bucket. Keep the first-entry, trimmed parsing. Replace the
  fallback with a per-request value ("unknown:" + crypto.randomUUID())
  and log a warning. Accept that headerless (local dev) logins have no
  effective lockout.
- Test clientIp in isolation: normal header, multiple entries, missing
  header (two calls give different values).

Acceptance: all four tests pass, all Phase 2 tests still pass, no UI changes.
STOP and wait for review.





Phase 4: Numbered migration runner

Goal: Replace "CREATE TABLE IF NOT EXISTS on every cold start" with
versioned migrations, without an ORM and without breaking the existing
production database.

Design:
- Create lib/migrations/ with one file per migration:
  001_baseline.ts, 002_..., each exporting { id: number, name: string,
  up: (tx) => Promise<void> }.
- Create lib/migrate.ts with runMigrations(client):
  - Creates schema_migrations (id INTEGER PRIMARY KEY, name TEXT NOT NULL,
    applied_at TEXT NOT NULL) if missing.
  - Reads applied ids, runs each pending migration in order inside a
    write transaction, inserts its row on success.
  - Stops on the first failure and throws with the migration name.
- 001_baseline must reproduce the current schema exactly: every CREATE
  TABLE / CREATE INDEX with IF NOT EXISTS, plus every ensureColumn call
  currently in migrate() (food_log.meal, profile.units,
  profile.starting_weight_lbs, and any others you find). It is a no-op on
  the existing production database and builds a fresh one correctly. It
  also contains the seed insert (ON CONFLICT DO NOTHING) and sets
  seed_version.
- Keep the existing ensureColumn helper (move it to lib/migrate.ts) and
  use it in every later migration that adds a column.
- ready() in lib/store.ts now calls runMigrations once per process, keeping
  the existing promise caching and reset-on-failure behavior.
- Remove the SCHEMA array from store.ts.

Tests (in-memory libsql):
- Fresh database: all migrations run, tables exist, seed foods present.
- Running twice: second run applies nothing.
- Database that already has the tables (simulate production): baseline
  succeeds without error and no data is lost.

Acceptance: app runs locally against a dev Turso database with no change
in behavior. All tests pass.
STOP and wait for review.





Phase 5: Schema changes

Prerequisite: Hamza has exported a JSON backup and the dev Turso database
is in .env.local. Confirm with him before running anything against a real
database.

Goal: Add the remaining profile and food fields, and prepare every table
for more than one user, without changing what the single user sees.

Already done in the current code, do NOT redo: food_log.meal,
profile.units, profile.starting_weight_lbs.

002_user_id
SQLite cannot change a primary key, so rebuild these tables:
- body_metrics: new table with user_id TEXT NOT NULL and
  PRIMARY KEY (user_id, date). Copy rows with user_id = 'owner'.
  Drop old, rename new.
- profile: new table with user_id TEXT PRIMARY KEY replacing id = 1,
  carrying every existing column including units and starting_weight_lbs.
  Copy the single row with user_id = 'owner'.
- food_log: ADD COLUMN user_id TEXT NOT NULL DEFAULT 'owner'.
  Replace the date index with an index on (user_id, date).
- foods: ADD COLUMN user_id TEXT. NULL means a shared seed food.
  Rows with source other than 'seed' get user_id = 'owner'.
Do the rebuilds inside the migration transaction.

003_profile_fields
Add to profile (use ensureColumn):
- activity TEXT NOT NULL DEFAULT 'light', using the isActivity values in
  lib/targets.ts (sedentary, light, moderate, active, very). If activity
  is already persisted somewhere, report it and migrate that value here.
- timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles'
- age INTEGER (optional, used only as a fallback in Phase 9)
- lean_gain_share REAL NOT NULL DEFAULT 0.5 (used in Phase 9)
Update Profile, mapProfile, saveProfile, and the Settings form for
activity. Timezone, age, and lean_gain_share can be stored now and shown
in Settings in Phase 9.

004_foods_tracking
Add to foods:
- edited_at TEXT (set whenever the user edits a food)
- external_id TEXT (barcode or Open Food Facts / USDA id when known)

Session wiring:
- Add lib/session-user.ts with getUserId(request or cookies) that returns
  'owner' for any valid session. Route handlers call it and pass userId
  into store functions. Every store query filters by user_id.
- For foods, searches return rows where user_id IS NULL OR user_id = ?.

Small fix:
- app/(app)/history/page.tsx shows rows with no meal without the
  "Earlier entries" label. Use mealLabel from lib/meals.ts so it matches
  the food page.

Tests:
- Each migration on a database seeded with realistic rows (metrics on
  several dates, food logs including snack:2 rows, a profile with units
  and starting weight, a user-saved food). Row counts and values are
  identical afterward, with user_id = 'owner'.
- A query as user 'owner' sees everything; a query as user 'other' sees
  only seed foods.

Acceptance: the app looks and behaves exactly as before, apart from the
history label fix. All tests pass.
STOP and wait for review.





Phase 6: Split store.ts into repositories

Goal: Break lib/store.ts into small single-purpose modules. Behavior must
not change.

Create lib/repo/:
- profile.ts      getProfile, saveProfile, recomputeBodyFat
- metrics.ts      listMetrics, getMetric, saveMetric, deleteMetric
- foods.ts        listFoods, searchLocalFoods, rememberFood
- food-log.ts     getFoodLog, addFoodLog, updateFoodLog, deleteFoodLog,
                  copyFoodLog, recentMeals, totalsFor
- views.ts        getHome, getDay, getSpan
- backup.ts       exportData, importData
- auth.ts         loginLocked, recordLogin
- types.ts        Profile, Metric, FoodLogItem, FoodRecord, MacroTotals,
                  LocalMatch
- shared.ts       asNumber, asText, parseJson, ready

Every exported function takes userId as its first argument (except pure
helpers like totalsFor).

Keep lib/store.ts as a temporary barrel that re-exports from lib/repo/ so
no caller breaks. Then update callers to import from lib/repo/ directly
and delete the barrel in the same phase if all callers are updated.

Rules: move code, do not rewrite it. Any change beyond moving and adding
userId must be listed in the report.

Acceptance: all tests pass, tsc and lint clean, app behaves identically.
STOP and wait for review.





Phase 7: Backup v2 with validation

Goal: Make export and import safe and future-proof.

- Add zod as a dependency if Phase 1 found it missing.
- lib/repo/backup-schema.ts: Zod schemas for backup v1 (current format,
  which may already include meal, units, and starting weight) and v2. v2
  adds activity, timezone, age, lean_gain_share on profile, and
  edited_at / external_id on foods. Meal values keep the lib/meals.ts
  encoding (snack:2) exactly as stored. Coerce numbers, allow nulls, reject
  unknown versions.
- exportData writes version 2 and the profile's timezone instead of the
  hardcoded string.
- importData accepts v1 or v2. v1 is upgraded in memory (missing fields
  get their defaults; a missing meal stays null) before insert.
- Before inserting, check for duplicate food ids, duplicate metric dates,
  and duplicate log ids inside the file. Fail with a clear message that
  names the first duplicate.
- Validation errors return a short readable message to the UI, for example
  "Row 14 in foodLog has an invalid date." Never show a raw driver error.
- Import stays one atomic batch. Seed foods are not re-applied (Phase 3).

Tests: v1 file imports, v2 round-trips exactly (export then import then
export gives the same data), malformed file fails with a readable message
and leaves the database unchanged.

STOP and wait for review.





Phase 8: Performance and the rolling average

Goal: Stop loading whole tables for single-day and range views, and make
the 7-day average mean 7 calendar days.

Rolling average:
- If Phase 1 confirmed rollingAverages is index-based, change it to a
  calendar window: for each row, average non-null values whose date is in
  (row.date - 6 days, row.date]. It still uses however many days exist,
  up to 7, as the spec says.
- Update the Phase 2 test to the new behavior and add a test with a gap
  (entries on day 1 and day 20 must not average together).

Range queries:
- getMetric(userId, date): query only the window (date - 6 days, date] and
  compute the averages from that, not the whole table.
- getDay, getHome, getSpan: query metrics WHERE date BETWEEN (from - 6
  days) AND to, compute averages, then drop the lead-in rows from output.
  getDay must not load metrics twice.

Food search:
- searchLocalFoods: prefilter in SQL with name LIKE ? OR aliases LIKE ?
  using the parsed name tokens, cap at 50 rows, then call rankFoods as
  before. If the prefilter returns nothing, fall back to the current full
  scan so fuzzy matches still work. Add a test that a typo still matches.

Startup and profile saves:
- runMigrations reads applied ids with a single query and only opens a
  transaction when something is pending.
- saveProfile calls recomputeBodyFat only when sex or height changed.

Acceptance: identical numbers on screen for existing data (except the
rolling average where gaps exist). All tests pass.
STOP and wait for review.





Phase 9: Goal math correctness

Goal: Fix two gaps in the target logic in lib/targets.ts. All other
formulas in Section 0 stay exactly the same, including the 0.2 lb maintain
band and the existing activity factor table.

Fix 1: A heavier goal should not be treated as all fat.
- Current behavior: gaining weight is treated as added fat, so goal body
  fat rises during a muscle-building phase.
- Change goalBodyFatPercent. New behavior, only when direction is gain
  (goal weight more than 0.2 lb above current):
    gain      = goalWeight - currentWeight
    goalLean  = leanMass + gain * leanGainShare   (profile.lean_gain_share, default 0.5)
    goalBF    = 1 - goalLean / goalWeight
- Lighter goals keep the current logic (lean mass held constant).
- Settings shows lean_gain_share as an editable assumption with a one-line
  explanation: "Share of weight gain assumed to be lean mass."

Fix 2: Goals need body fat, and body fat needs tape measurements.
- Fallback order for the body fat used in goal math:
    a) current body fat input, if given
    b) most recent stored body_fat_pct within the last 30 days
    c) none: if profile.age is set, compute BMR with Mifflin-St Jeor
       (kg, cm: men 10w + 6.25h - 5a + 5, women 10w + 6.25h - 5a - 161)
       and show no goal body-fat target
    d) none and no age: show "Add waist and neck measurements, or your age,
       to calculate goals." and calculate nothing
- Katch-McArdle remains the primary method. Settings states which method
  was used and why.
- calculateTargets reads profile.activity (string) and maps it through
  the existing factor table. Do not store a raw number.
- Update TARGET_ASSUMPTIONS to describe the gain logic and the body-fat
  fallback order.
- Settings shows timezone (read-only for now), age, and lean_gain_share.

Tests: each fallback branch, the surplus goal body fat at 0, 0.5, and 1.0
lean share, and confirm every Phase 2 goal test for lighter goals still
passes unchanged.

STOP and wait for review. List any number in the UI that changed for
Hamza's current data.





Phase 10: Raw vs cooked grams

Goal: Stop gram entries for rice, daal, pasta, and similar foods from being
scored against the wrong basis. Seed values are per 100 g COOKED.

Migration 005_gram_basis:
- food_log: ADD COLUMN gram_basis TEXT ('cooked', 'raw', 'packaged', or NULL
  for household units like plate or roti).
- foods: ADD COLUMN cooked_per_raw REAL (cooked grams per raw gram, NULL
  when it does not apply).

Seed data:
- In lib/food-seed.ts add cooked_per_raw only to foods where it applies
  (rice dishes, plain rice, daal/lentils, chickpeas, pasta). Use these as
  approximate starting values and mark them in a code comment as editable
  estimates: rice 3.0, pasta 2.2, lentils/daal 2.5, chickpeas 2.4.
- Add a migration that sets cooked_per_raw on existing seed rows only where
  edited_at IS NULL.

Behavior:
- When a food has cooked_per_raw and the unit is grams, the food page shows
  a two-option toggle: Cooked / Raw (default Cooked).
- Raw grams are converted: cookedGrams = rawGrams * cooked_per_raw, then
  macrosForGrams runs on cookedGrams. Store the typed grams and
  gram_basis = 'raw' on the log row, and the computed macros as usual.
- Foods without cooked_per_raw behave exactly as today.

Tests: 100 g raw rice gives the macros of 300 g cooked rice; cooked entry
is unchanged; foods without the field are unaffected.

STOP and wait for review.





Phase 11: Update the docs

Goal: Bring docs/project-spec.md and docs/ai-plan.md in line with what was
built and decided. Docs only, no code.

project-spec.md:
- Profile: units and starting weight (already present), activity,
  timezone, optional age, lean gain share.
- Food log: meal encoding from lib/meals.ts, gram_basis, raw/cooked toggle,
  cooked_per_raw.
- Goals: surplus lean-gain share, body-fat fallback order, Mifflin-St Jeor
  fallback, activity from profile.
- Data: numbered migrations in lib/migrations, user_id on every table
  ('owner' for now), backup v2 with v1 import support.
- Quality: vitest, test commands, what is covered.
- Code layout: lib/repo/ modules.

ai-plan.md:
- Replace "Local" wording with "self-hosted model, no third-party LLM
  vendor." Turso and Vercel are already hosted.
- Add a Hosting Decision section stating the problem: a Vercel function
  cannot reach 127.0.0.1 on a laptop, and CPU inference on a 7B model can
  exceed Vercel function time limits. List two options:
    A) One VPS running Next.js and Ollama together (Docker Compose, about
       8 GB RAM for a 7B model at Q4). Recommended for the trial.
    B) Keep Vercel; model on a separate box behind Tailscale or a
       Cloudflare tunnel with a shared secret; AI calls become async jobs
       (POST returns a job id, client polls, result stored in Turso).
  Mark the decision as PENDING for Hamza.
- Add an LLMProvider interface: complete({ prompt, schema }) returning
  validated JSON. Base URL and provider come from env. A vendor provider
  is just another implementation, off by default.
- Meal parsing: remove the search_local_foods tool call. The model only
  extracts { name, quantity, unit }[] using Ollama JSON-schema output. The
  server then runs the existing matcher. Same safety, one inference call.
- Model: benchmark Qwen2.5 7B and 3B against Qwen3 4B and 8B before
  choosing.
- Evaluation: add an eval harness section. 50 to 100 real meal sentences
  (including Roman Urdu like "do roti aur daal") with expected items.
  Metrics: item recall, quantity accuracy, match rate, latency per model.
  The harness is built before the meal UI.
- Raw sentences: store them in a meal_parse_inputs table with a delete
  control, so real failures can become eval cases. ai_runs still does not
  store the sentence.
- Goal adjustment: replace the 14-day slope rule with:
    - regression on the 7-day moving average, at least 8 weigh-ins in
      the 14-day window
    - check logged intake first; if average intake is more than 10% off
      target, suggest hitting the current target instead of changing it
    - cap each change at +/-100 to 150 kcal, 14-day cooldown
    - in a surplus phase a stall means increase, not decrease
    - never below BMR

STOP and wait for review.





Phase 12: AI groundwork

Run only after Hamza approves the updated docs/ai-plan.md and makes the hosting decision.

Goal: Build the parts of the AI plan that do not depend on the UI, so the
model choice is made with data.

- lib/ai/provider.ts: LLMProvider interface and an OllamaProvider using the
  base URL from env (OLLAMA_BASE_URL). Uses Ollama's format parameter with a
  JSON schema. Validates the response with Zod. Timeout and one retry on
  invalid JSON.
- Migration: ai_runs (id, user_id, created_at, feature, model, prompt_version,
  duration_ms, success, error) and meal_parse_inputs (id, user_id,
  created_at, text). No meal text in ai_runs.
- lib/ai/meal-parse.ts: prompt and schema for extracting
  { name, quantity, unit }[]. No tool calls. Writes an ai_runs row.
- evals/meal-parse/cases.jsonl: start with 20 cases Hamza will expand to
  50 to 100. Each case: { input, expected: [{ name, quantity, unit }] }.
- evals/meal-parse/run.ts: runs every case against a given model name,
  then runs the existing matcher on the output. Prints item recall,
  quantity accuracy, match rate, p50 and p95 latency. Writes results to
  evals/results/<model>-<date>.json.
- npm script: "eval:meal": "tsx evals/meal-parse/run.ts".

Do not build any UI in this phase. Do not call any third-party LLM API.

STOP and report results for whichever models Hamza has pulled in Ollama.

