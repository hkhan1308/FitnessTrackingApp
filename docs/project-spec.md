# Fit Log project spec

Personal fitness and nutrition tracker for one person, used mainly on a phone. The app is built and running. The local AI features in [the local AI plan](/cursor/stores/self/docs/ai-plan.md) are specified there and are not built yet.

## Aims

- Record weight, tape measurements, and meals without a multi-user account system.
- Turn those logs into body-fat estimates, calorie and macro targets, and a history you can see.
- Keep everyday foods, especially Pakistani and Mediterranean meals, available without a network lookup.
- Stay deployable on a free Vercel subdomain with a hosted database that survives redeploys.
- Add local AI later for meal sentences, log suggestions, and goal explanations, without sending logs to a third-party model API.

## Objectives

- One passcode gate. No signup and no second account.
- Log any subset of body metrics for a day, in US or metric units, and edit them later.
- Estimate body fat with the U.S. Navy formulas for men and women when the required tape measurements exist.
- Calculate calorie, protein, carb, fat, and goal body-fat targets from current metrics and a goal weight, and allow overrides.
- Log foods under breakfast, lunch, dinner, or more than one snack in the same day.
- Resolve foods from a built-in cooked-food table first, then Open Food Facts, then USDA if a key exists, then manual macros.
- Show weight, body fat, and macro-goal progress on Monday–Sunday history charts.
- Export CSV and restore from JSON.
- Run the trial locally, then host it at a small scale if the trial holds up.

## Tech stack

- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS 4 and shadcn/ui
- Recharts for history charts
- Turso (hosted libSQL / SQLite) via `@libsql/client`. No local SQLite file and no JSON file as the database, because a Vercel deploy does not keep the disk.
- Session cookie, httpOnly, 30 days, checked on pages and API routes
- Environment variables: `APP_PASSCODE`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, optional `USDA_API_KEY`
- Dev server: `npm run dev` on port 3847
- Code: [FitnessTrackingApp](https://github.com/hkhan1308/FitnessTrackingApp)
- Planned, not installed: Ollama running Qwen2.5 7B Instruct (3B if memory is tight) at `127.0.0.1:11434`

## Requirements

### Access

- Single passcode from `APP_PASSCODE`.
- Wrong passcode is rejected. Missing `APP_PASSCODE` is an error, not an open app.
- Repeated failures lock login for a few minutes.
- Dates are `YYYY-MM-DD` in `America/Los_Angeles`.

### Profile and units

- Profile holds sex, height, starting weight, and the saved unit system.
- Weigh-in and display use either pounds and inches or kilograms and centimeters.
- Stored body measurements stay in pounds and inches. The Navy formula runs in inches.

### Body metrics

- Every measurement on a day is optional and editable. One metrics row per date.
- Men’s body fat uses waist, neck, and height. Women’s also uses hip.
- Body fat is stored only when the required inputs exist, and the screen calls it an estimate.
- The 7-day average uses however many days exist, up to 7, and sits next to the daily number.

### Goals

- Inputs: current weight, current body fat, goal weight. Sex, height, and starting weight come from the profile.
- Lean mass is current weight × (1 − current body fat). Goal body fat holds that lean mass constant. A lighter goal is fat loss. A heavier goal is treated as added fat. No body-fat target is offered if the goal weight is at or below lean mass.
- BMR is Katch-McArdle: 370 + 21.6 × lean mass in kilograms. Age is not required.
- TDEE is BMR × activity. Default activity is lightly active (×1.375).
- A lighter goal uses a 15% calorie deficit. A heavier goal uses a 10% surplus. Calories do not drop below BMR.
- Protein is 1.8 g per kilogram of goal weight. Fat is 27.5% of calories. Carbs fill the rest.
- Changing inputs recalculates the goals. Any goal can be edited before save.
- Assumptions are visible in Settings.

### Food log

- The user picks breakfast, lunch, dinner, or a snack before adding food.
- Breakfast, lunch, and dinner are one section per day.
- More than one snack occasion is allowed (Snack, Snack 2, …). New food goes into the selected snack.
- Older rows with no meal appear under “Earlier entries.”
- Portions for rice, daal, biryani, and similar dishes are cooked. Gram weights are the raw or packaged weight that was typed.
- Search order: local table, then Open Food Facts, then USDA when `USDA_API_KEY` is set, then manual macros.
- A picked web result is saved into the local table.
- Each food shows where it came from (local, web, or manual). Editing a saved food updates the local row.
- Recent foods and log-again stay available.

### History

- Line charts are the default for weight and body fat. Bars are the default for macro goals. Each chart can switch between line and bar.
- Weeks are Monday–Sunday.
- An empty range says there is nothing to chart yet.
- A macro day counts as hit when calories, carbs, and fat are within 10% of the goal and protein is at least 90% of its goal.

### Backup

- CSV export for a spreadsheet.
- JSON backup and import for a restore.

### Hosting

- Vercel free tier, `*.vercel.app`, no custom domain required for the trial.
- First visit creates the Turso tables.
- Phone install is Add to Home Screen / Install app from the HTTPS URL.

## Local food table

The starter foods are not downloaded from USDA or Open Food Facts.

- Source file: `lib/food-seed.ts` (`SEED_FOODS`, 88 entries).
- Each entry has an id, name, aliases, category (`pakistani`, `mediterranean`, or `everyday`), calories and macros per 100 g, and household units with gram weights (cup, plate, roti, piece, and so on).
- On first database setup, `lib/store.ts` inserts those rows into the Turso `foods` table with `source = 'seed'` when `app_meta.seed_version` is not already `1`.
- The numbers are hand-entered cooked values in that file. They are not a cited bulk import. Chicken breast at 165 kcal per 100 g is the usual cooked figure; mixed dishes such as biryani are typical cooked estimates.
- Foods added later from the web or by hand are separate rows. They are not part of the seed file.

## AI requirements (not built)

Approved only after the plan is accepted. Details: [the local AI plan](/cursor/stores/self/docs/ai-plan.md).

- Sentence meal logging, then local-table matching, saved only after confirm.
- Daily, weekly, and monthly suggestions from server-computed summaries. The model does not change logs or goals.
- A goal-calorie explanation when weight is flat, saved only if the user accepts.
- One local instruct model (Qwen2.5 7B Instruct via Ollama). One read-only food search tool. No RAG.

## Out of scope

Water, steps, photos, extra accounts, a vendor LLM, embeddings, and automatic writes from the model.
