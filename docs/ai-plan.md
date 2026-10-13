# Fit Log local AI plan

Status: draft for approval. Do not build until this is accepted.

Scope: the first three AI features only.

1. Sentence meal logging on the food page.
2. Daily, weekly, and monthly suggestions on History.
3. A goal-calorie adjustment when weight stalls, explained in Settings.

## What stays in code

The current goal math stays the source of truth: Katch-McArdle, lightly active (×1.375), 15% deficit or 10% surplus, protein at 1.8 g/kg of goal weight, fat at 27.5% of calories, carbs as the remainder. Macro “hit” stays the current rule (calories, carbs, and fat within 10%; protein at least 90%).

The model is not allowed to invent calories, macros, body-fat, or a new formula. It extracts text, or it explains numbers the server already computed. A save happens only after the user confirms.

## Local, in this app

“Local” means the model runs beside the Next.js server, and meal text and body metrics are not sent to a third-party model API.

Turso is already a hosted database, and the phone only talks to the app. The model does not run on the phone. The server calls a local inference endpoint (Ollama at `127.0.0.1:11434` for the first version).

The same server routes stay when this is hosted for a few users. Only the model base URL changes, from that laptop endpoint to one small model server you control. User data still does not go to a public LLM vendor.

This cloud machine may be CPU-only. A 7B model is the quality target; a 3B model is the fallback if memory is tight. Slow answers are acceptable for the trial. They are not acceptable as the phone experience later, which is why the model stays on a server you run, not in the browser.

## Model

Use one instruct LLM with structured JSON output.

- First choice: Qwen2.5 7B Instruct, via Ollama, quantized.
- Fallback: Qwen2.5 3B Instruct if 7B does not fit.

No fine-tune. No second model. No vision model in this round.

## RAG and semantic search

Not in this round.

Sentence logging extracts food names and amounts, then uses the existing local food table (name search). Ambiguous hits are shown to the user. Open Food Facts stays the current fallback when the local table misses.

History does not retrieve old notes. The server aggregates the selected day, week, or month in SQL and passes that short summary to the model. One user’s month of meals fits in a summary. It does not need embeddings.

Semantic search is the later step, when the food catalog is large enough that keyword match fails, or when the user asks fuzzy questions (“meals like my usual lunch”).

## Tool calls

One tool, used only by sentence logging:

- `search_local_foods(query)` — returns a few rows from the existing food table (id, name, portion, calories, protein, carbs, fat). No writes.

The model may call it to ground names. The server still checks every chosen id against the table before anything is shown as a real food. If the model names a food the tool did not return, that item is marked unmatched.

Daily, weekly, and monthly suggestions do not use tools. The range is chosen in the UI. The server loads the summary, then one model call writes the paragraph.

The goal suggestion does not use tools. The server computes the trend and the proposed calorie change. The model only explains that proposal.

No general agent loop. No SQL tool. No tool that can write goals or meals.

## Decision layer

This is application code on the server, not a separate product.

Meal sentence:

1. User picks the meal slot and submits the sentence.
2. Model returns items: name, quantity, unit. Nothing else is trusted.
3. Each item is resolved through `search_local_foods` and the existing matcher.
4. The page shows matches, low-confidence choices, and unmatched lines.
5. User confirms. The existing food-log save path writes the rows.

Suggestions:

1. User picks day, week (Monday–Sunday), or month.
2. Server builds a summary: days logged, calorie and macro totals versus goals, protein by meal, weight start and end, body-fat start and end, days each macro was hit.
3. Server attaches flags in code (under protein, outside the calorie band, weight flat, logging gaps).
4. Model writes a short suggestion using only that summary and those flags.
5. The text is shown. It does not change goals or logs.

Goal adjustment:

1. Server reads about 14 days of weight. If the slope is effectively flat and the goal weight is still unmet, it proposes a small calorie change using the existing deficit and surplus rules, and it does not drop calories below BMR.
2. Model explains the proposal in a few sentences.
3. User accepts or edits. Settings saves through the current goal fields.



## Observability

A thin local log, not a tracing platform.

One Turso table, `ai_runs`, written by the server for each call: time, feature (`meal_parse`, `coach`, `goal_explain`), model name, duration, success or failure, and a short validation error when the JSON was rejected. Do not store the raw meal sentence in that table for now.

Server logs are enough to debug the trial. Langfuse, OpenTelemetry, and a vendor prompt log are out of scope. The table is what you keep so a later small launch can see failures and latency.

## Later, if the trial works

- Host the same model on one machine you control. Point the app at it. Phones keep using the website.
- Add accounts only when a second real user needs isolation. Until then the passcode stays.
- Add semantic food search when the catalog outgrows keyword match.
- Add photo logging only after sentence logging is trusted.
- Add a vendor LLM only as an explicit option, off by default.



## Not in this round

Vision, fine-tuning, embeddings, a vector database, multi-agent orchestration, automatic goal or meal writes, and a third-party AI API.