import { SEED_FOODS } from "@/lib/food-seed";
import { estimateBodyFat, type Sex } from "@/lib/body-fat";
import { getDb } from "@/lib/db";
import {
  addDays,
  eachDay,
  endOfMonth,
  endOfWeek,
  isISODate,
  startOfMonth,
  startOfWeek,
  todayISO,
} from "@/lib/dates";
import { rankFoods } from "@/lib/food-match";
import { macrosForGrams, resolvePortion } from "@/lib/food-portion";
import { parseFoodQuery } from "@/lib/food-parse";
import { rollingAverages } from "@/lib/moving-average";
import { num } from "@/lib/format";

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    sex TEXT,
    current_weight_lbs REAL,
    goal_weight_lbs REAL,
    starting_body_fat REAL,
    goal_body_fat REAL,
    height_inches REAL,
    calorie_goal REAL,
    protein_goal REAL,
    carb_goal REAL,
    fat_goal REAL,
    updated_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS body_metrics (
    date TEXT PRIMARY KEY,
    weight_lbs REAL,
    waist_in REAL,
    neck_in REAL,
    hip_in REAL,
    body_fat_pct REAL,
    notes TEXT,
    updated_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS foods (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    aliases TEXT NOT NULL DEFAULT '[]',
    calories_per_100g REAL NOT NULL,
    protein_per_100g REAL NOT NULL,
    carbs_per_100g REAL NOT NULL,
    fat_per_100g REAL NOT NULL,
    units TEXT NOT NULL DEFAULT '{}',
    category TEXT,
    source TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS food_log (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity REAL,
    unit TEXT,
    grams REAL,
    calories REAL,
    protein REAL,
    carbs REAL,
    fat REAL,
    source TEXT NOT NULL,
    food_id TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS food_log_date ON food_log(date)`,
  `CREATE TABLE IF NOT EXISTS login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT NOT NULL,
    success INTEGER NOT NULL,
    attempted_at INTEGER NOT NULL
  )`,
];

export type Profile = {
  sex: Sex | null;
  currentWeightLbs: number | null;
  goalWeightLbs: number | null;
  startingBodyFat: number | null;
  goalBodyFat: number | null;
  heightInches: number | null;
  calorieGoal: number | null;
  proteinGoal: number | null;
  carbGoal: number | null;
  fatGoal: number | null;
};

export type Metric = {
  date: string;
  weightLbs: number | null;
  waistIn: number | null;
  neckIn: number | null;
  hipIn: number | null;
  bodyFatPct: number | null;
  weightAvg: number | null;
  bodyFatAvg: number | null;
  notes: string | null;
};

export type FoodLogItem = {
  id: string;
  date: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  grams: number | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  source: string;
  foodId: string | null;
  createdAt: string;
};

export type FoodRecord = {
  id: string;
  name: string;
  aliases: string[];
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  units: Record<string, number>;
  category: string | null;
  source: string;
};

export type MacroTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type LocalMatch = {
  foodId: string;
  name: string;
  score: number;
  quantity: number;
  unit: string;
  grams: number;
  assumed: boolean;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  source: "local";
};

const readyPromise = { current: null as Promise<void> | null };

function db() {
  return getDb();
}

function asNumber(value: unknown): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asText(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function ready(): Promise<void> {
  if (!readyPromise.current) {
    readyPromise.current = migrate().catch((error) => {
      readyPromise.current = null;
      throw error;
    });
  }
  await readyPromise.current;
}

async function migrate() {
  const client = db();
  for (const sql of SCHEMA) await client.execute(sql);
  const seeded = await client.execute({
    sql: "SELECT value FROM app_meta WHERE key = 'seed_version'",
    args: [],
  });
  if (String(seeded.rows[0]?.value ?? "") === "1") return;
  const now = new Date().toISOString();
  await client.batch(
    SEED_FOODS.map((food) => ({
      sql: `INSERT INTO foods (
        id, name, aliases, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g,
        units, category, source, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'seed', ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        aliases = excluded.aliases,
        calories_per_100g = excluded.calories_per_100g,
        protein_per_100g = excluded.protein_per_100g,
        carbs_per_100g = excluded.carbs_per_100g,
        fat_per_100g = excluded.fat_per_100g,
        units = excluded.units,
        category = excluded.category`,
      args: [
        food.id,
        food.name,
        JSON.stringify(food.aliases),
        food.kcal,
        food.protein,
        food.carbs,
        food.fat,
        JSON.stringify(food.units ?? {}),
        food.category,
        now,
      ],
    })),
    "write",
  );
  await client.execute({
    sql: `INSERT INTO app_meta (key, value) VALUES ('seed_version', '1')
      ON CONFLICT(key) DO UPDATE SET value = '1'`,
    args: [],
  });
}

function mapProfile(row: Record<string, unknown> | undefined): Profile {
  return {
    sex: row?.sex === "male" || row?.sex === "female" ? row.sex : null,
    currentWeightLbs: asNumber(row?.current_weight_lbs),
    goalWeightLbs: asNumber(row?.goal_weight_lbs),
    startingBodyFat: asNumber(row?.starting_body_fat),
    goalBodyFat: asNumber(row?.goal_body_fat),
    heightInches: asNumber(row?.height_inches),
    calorieGoal: asNumber(row?.calorie_goal),
    proteinGoal: asNumber(row?.protein_goal),
    carbGoal: asNumber(row?.carb_goal),
    fatGoal: asNumber(row?.fat_goal),
  };
}

export async function getProfile(): Promise<Profile> {
  await ready();
  const result = await db().execute("SELECT * FROM profile WHERE id = 1");
  return mapProfile(result.rows[0] as Record<string, unknown> | undefined);
}

export async function saveProfile(input: Profile): Promise<Profile> {
  await ready();
  const sex = input.sex === "male" || input.sex === "female" ? input.sex : null;
  await db().execute({
    sql: `INSERT INTO profile (
      id, sex, current_weight_lbs, goal_weight_lbs, starting_body_fat, goal_body_fat,
      height_inches, calorie_goal, protein_goal, carb_goal, fat_goal, updated_at
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      sex = excluded.sex,
      current_weight_lbs = excluded.current_weight_lbs,
      goal_weight_lbs = excluded.goal_weight_lbs,
      starting_body_fat = excluded.starting_body_fat,
      goal_body_fat = excluded.goal_body_fat,
      height_inches = excluded.height_inches,
      calorie_goal = excluded.calorie_goal,
      protein_goal = excluded.protein_goal,
      carb_goal = excluded.carb_goal,
      fat_goal = excluded.fat_goal,
      updated_at = excluded.updated_at`,
    args: [
      sex,
      input.currentWeightLbs,
      input.goalWeightLbs,
      input.startingBodyFat,
      input.goalBodyFat,
      input.heightInches,
      input.calorieGoal,
      input.proteinGoal,
      input.carbGoal,
      input.fatGoal,
      new Date().toISOString(),
    ],
  });
  await recomputeBodyFat({ ...input, sex });
  return getProfile();
}

async function recomputeBodyFat(profile: Profile) {
  const result = await db().execute(
    "SELECT date, waist_in, neck_in, hip_in FROM body_metrics",
  );
  const statements = result.rows.map((row) => ({
    sql: "UPDATE body_metrics SET body_fat_pct = ? WHERE date = ?",
    args: [
      estimateBodyFat({
        sex: profile.sex,
        heightInches: profile.heightInches,
        waistInches: asNumber(row.waist_in),
        neckInches: asNumber(row.neck_in),
        hipInches: asNumber(row.hip_in),
      }),
      String(row.date),
    ],
  }));
  if (statements.length) await db().batch(statements, "write");
}

function attachAverages(
  rows: Array<Omit<Metric, "weightAvg" | "bodyFatAvg">>,
): Metric[] {
  const weightAvgs = rollingAverages(rows.map((row) => row.weightLbs));
  const fatAvgs = rollingAverages(rows.map((row) => row.bodyFatPct));
  return rows.map((row, index) => ({
    ...row,
    weightAvg: weightAvgs[index],
    bodyFatAvg: fatAvgs[index],
  }));
}

function mapMetric(row: Record<string, unknown>): Omit<Metric, "weightAvg" | "bodyFatAvg"> {
  return {
    date: String(row.date),
    weightLbs: asNumber(row.weight_lbs),
    waistIn: asNumber(row.waist_in),
    neckIn: asNumber(row.neck_in),
    hipIn: asNumber(row.hip_in),
    bodyFatPct: asNumber(row.body_fat_pct),
    notes: asText(row.notes),
  };
}

export async function listMetrics(): Promise<Metric[]> {
  await ready();
  const result = await db().execute("SELECT * FROM body_metrics ORDER BY date ASC");
  return attachAverages(result.rows.map((row) => mapMetric(row as Record<string, unknown>)));
}

export async function getMetric(date: string): Promise<Metric | null> {
  const metrics = await listMetrics();
  return metrics.find((metric) => metric.date === date) ?? null;
}

export async function saveMetric(input: {
  date: string;
  weightLbs: number | null;
  waistIn: number | null;
  neckIn: number | null;
  hipIn: number | null;
  notes: string | null;
}): Promise<Metric | null> {
  if (!isISODate(input.date)) throw new Error("Use a real date.");
  await ready();
  const empty =
    input.weightLbs == null &&
    input.waistIn == null &&
    input.neckIn == null &&
    input.hipIn == null &&
    !input.notes;
  if (empty) {
    await deleteMetric(input.date);
    return null;
  }
  const profile = await getProfile();
  const bodyFat = estimateBodyFat({
    sex: profile.sex,
    heightInches: profile.heightInches,
    waistInches: input.waistIn,
    neckInches: input.neckIn,
    hipInches: input.hipIn,
  });
  await db().execute({
    sql: `INSERT INTO body_metrics (
      date, weight_lbs, waist_in, neck_in, hip_in, body_fat_pct, notes, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      weight_lbs = excluded.weight_lbs,
      waist_in = excluded.waist_in,
      neck_in = excluded.neck_in,
      hip_in = excluded.hip_in,
      body_fat_pct = excluded.body_fat_pct,
      notes = excluded.notes,
      updated_at = excluded.updated_at`,
    args: [
      input.date,
      input.weightLbs,
      input.waistIn,
      input.neckIn,
      input.hipIn,
      bodyFat,
      input.notes,
      new Date().toISOString(),
    ],
  });
  return getMetric(input.date);
}

export async function deleteMetric(date: string): Promise<void> {
  await ready();
  await db().execute({ sql: "DELETE FROM body_metrics WHERE date = ?", args: [date] });
}

async function listFoods(): Promise<FoodRecord[]> {
  await ready();
  const result = await db().execute("SELECT * FROM foods ORDER BY name ASC");
  return result.rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    aliases: parseJson<string[]>(row.aliases, []),
    caloriesPer100g: Number(row.calories_per_100g),
    proteinPer100g: Number(row.protein_per_100g),
    carbsPer100g: Number(row.carbs_per_100g),
    fatPer100g: Number(row.fat_per_100g),
    units: parseJson<Record<string, number>>(row.units, {}),
    category: asText(row.category),
    source: String(row.source),
  }));
}

export async function searchLocalFoods(query: string): Promise<{
  parsed: ReturnType<typeof parseFoodQuery>;
  matches: LocalMatch[];
}> {
  const parsed = parseFoodQuery(query);
  const foods = await listFoods();
  const ranked = rankFoods(foods, parsed.name);
  const matches = ranked.map((food) => {
    const portion = resolvePortion(food, parsed);
    const macros = macrosForGrams(food, portion.grams);
    return {
      foodId: food.id,
      name: food.name,
      score: food.score,
      quantity: portion.quantity,
      unit: portion.unit,
      grams: portion.grams,
      assumed: portion.assumed,
      ...macros,
      caloriesPer100g: food.caloriesPer100g,
      proteinPer100g: food.proteinPer100g,
      carbsPer100g: food.carbsPer100g,
      fatPer100g: food.fatPer100g,
      source: "local" as const,
    };
  });
  return { parsed, matches };
}

export async function rememberFood(input: {
  name: string;
  aliases?: string[];
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  units?: Record<string, number>;
  source: string;
}): Promise<string> {
  await ready();
  const existing = await db().execute({
    sql: "SELECT id FROM foods WHERE lower(name) = lower(?)",
    args: [input.name],
  });
  if (existing.rows[0]?.id) return String(existing.rows[0].id);
  const id = crypto.randomUUID();
  await db().execute({
    sql: `INSERT INTO foods (
      id, name, aliases, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g,
      units, category, source, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'saved', ?, ?)`,
    args: [
      id,
      input.name,
      JSON.stringify(input.aliases ?? []),
      input.caloriesPer100g,
      input.proteinPer100g,
      input.carbsPer100g,
      input.fatPer100g,
      JSON.stringify(input.units ?? {}),
      input.source,
      new Date().toISOString(),
    ],
  });
  return id;
}

function mapLog(row: Record<string, unknown>): FoodLogItem {
  return {
    id: String(row.id),
    date: String(row.date),
    name: String(row.name),
    quantity: asNumber(row.quantity),
    unit: asText(row.unit),
    grams: asNumber(row.grams),
    calories: asNumber(row.calories),
    protein: asNumber(row.protein),
    carbs: asNumber(row.carbs),
    fat: asNumber(row.fat),
    source: String(row.source),
    foodId: asText(row.food_id),
    createdAt: String(row.created_at),
  };
}

export async function getFoodLog(date: string): Promise<FoodLogItem[]> {
  await ready();
  const result = await db().execute({
    sql: "SELECT * FROM food_log WHERE date = ? ORDER BY created_at ASC",
    args: [date],
  });
  return result.rows.map((row) => mapLog(row as Record<string, unknown>));
}

export function totalsFor(items: FoodLogItem[]): MacroTotals {
  return items.reduce(
    (sum, item) => ({
      calories: sum.calories + (item.calories ?? 0),
      protein: sum.protein + (item.protein ?? 0),
      carbs: sum.carbs + (item.carbs ?? 0),
      fat: sum.fat + (item.fat ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export async function recentMeals(limit = 8): Promise<FoodLogItem[]> {
  await ready();
  const result = await db().execute({
    sql: "SELECT * FROM food_log ORDER BY created_at DESC LIMIT 60",
    args: [],
  });
  const unique: FoodLogItem[] = [];
  const seen = new Set<string>();
  for (const row of result.rows) {
    const item = mapLog(row as Record<string, unknown>);
    const key = `${item.name}|${item.quantity}|${item.unit}|${item.calories}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
    if (unique.length >= limit) break;
  }
  return unique;
}

export async function addFoodLog(input: Omit<FoodLogItem, "id" | "createdAt">): Promise<FoodLogItem> {
  if (!isISODate(input.date)) throw new Error("Use a real date.");
  if (!input.name.trim()) throw new Error("Name the food.");
  await ready();
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await db().execute({
    sql: `INSERT INTO food_log (
      id, date, name, quantity, unit, grams, calories, protein, carbs, fat, source, food_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      input.date,
      input.name.trim(),
      input.quantity,
      input.unit,
      input.grams,
      input.calories,
      input.protein,
      input.carbs,
      input.fat,
      input.source,
      input.foodId,
      createdAt,
    ],
  });
  return { ...input, id, name: input.name.trim(), createdAt };
}

export async function updateFoodLog(
  id: string,
  input: Pick<FoodLogItem, "name" | "quantity" | "unit" | "calories" | "protein" | "carbs" | "fat">,
): Promise<void> {
  await ready();
  await db().execute({
    sql: `UPDATE food_log SET name = ?, quantity = ?, unit = ?, calories = ?, protein = ?, carbs = ?, fat = ? WHERE id = ?`,
    args: [input.name.trim(), input.quantity, input.unit, input.calories, input.protein, input.carbs, input.fat, id],
  });
}

export async function deleteFoodLog(id: string): Promise<void> {
  await ready();
  await db().execute({ sql: "DELETE FROM food_log WHERE id = ?", args: [id] });
}

export async function copyFoodLog(id: string, date: string): Promise<FoodLogItem> {
  await ready();
  const result = await db().execute({ sql: "SELECT * FROM food_log WHERE id = ?", args: [id] });
  const row = result.rows[0];
  if (!row) throw new Error("That meal is gone.");
  const item = mapLog(row as Record<string, unknown>);
  return addFoodLog({ ...item, date, source: item.source });
}

async function loggedDates(from: string, to: string): Promise<number> {
  const result = await db().execute({
    sql: `SELECT COUNT(*) AS n FROM (
      SELECT date FROM body_metrics WHERE date BETWEEN ? AND ?
      UNION
      SELECT date FROM food_log WHERE date BETWEEN ? AND ?
    )`,
    args: [from, to, from, to],
  });
  return Number(result.rows[0]?.n ?? 0);
}

export async function getHome(rangeDays: number) {
  const today = todayISO();
  const [profile, metrics, foods, recent] = await Promise.all([
    getProfile(),
    listMetrics(),
    getFoodLog(today),
    recentMeals(),
  ]);
  const from = addDays(today, -(rangeDays - 1));
  const series = metrics.filter((metric) => metric.date >= from && metric.date <= today);
  const latestWeight = [...metrics].reverse().find((metric) => metric.weightLbs != null) ?? null;
  const latestFat = [...metrics].reverse().find((metric) => metric.bodyFatPct != null) ?? null;
  const earliestWeight = metrics.find((metric) => metric.weightLbs != null) ?? null;
  const earliestFat = metrics.find((metric) => metric.bodyFatPct != null) ?? null;
  const weekStart = startOfWeek(today);
  const monthStart = startOfMonth(today);
  const [weekLogged, monthLogged] = await Promise.all([
    loggedDates(weekStart, endOfWeek(today)),
    loggedDates(monthStart, endOfMonth(today)),
  ]);
  return {
    today,
    profile,
    totals: totalsFor(foods),
    recent,
    series,
    latestWeight,
    latestFat,
    earliestWeight,
    earliestFat,
    weekLogged,
    monthLogged,
    weekLength: 7,
    monthLength: eachDay(monthStart, endOfMonth(today)).length,
  };
}

export async function getDay(date: string) {
  const [profile, metric, foods, metrics] = await Promise.all([
    getProfile(),
    getMetric(date),
    getFoodLog(date),
    listMetrics(),
  ]);
  return { profile, metric, foods, totals: totalsFor(foods), metrics };
}

export async function getSpan(from: string, to: string) {
  const [metrics, logs] = await Promise.all([listMetrics(), ready().then(() => db().execute({
    sql: "SELECT * FROM food_log WHERE date BETWEEN ? AND ? ORDER BY date ASC, created_at ASC",
    args: [from, to],
  }))]);
  const items = logs.rows.map((row) => mapLog(row as Record<string, unknown>));
  const days = eachDay(from, to).map((date) => {
    const metric = metrics.find((item) => item.date === date) ?? null;
    const foods = items.filter((item) => item.date === date);
    return { date, metric, foods, totals: totalsFor(foods) };
  });
  const weightValues = days.map((day) => day.metric?.weightLbs ?? null).filter((value): value is number => value != null);
  const fatValues = days.map((day) => day.metric?.bodyFatPct ?? null).filter((value): value is number => value != null);
  const calorieDays = days.filter((day) => day.foods.length > 0);
  const average = (values: number[]) =>
    values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : null;
  return {
    days,
    summary: {
      weight: average(weightValues),
      bodyFat: average(fatValues),
      calories: calorieDays.length
        ? Math.round(calorieDays.reduce((sum, day) => sum + day.totals.calories, 0) / calorieDays.length)
        : null,
      protein: calorieDays.length
        ? Math.round((calorieDays.reduce((sum, day) => sum + day.totals.protein, 0) / calorieDays.length) * 10) / 10
        : null,
    },
  };
}

export async function exportData() {
  await ready();
  const [profile, metrics, foods, logs] = await Promise.all([
    getProfile(),
    listMetrics(),
    listFoods(),
    db().execute("SELECT * FROM food_log ORDER BY date ASC, created_at ASC"),
  ]);
  return {
    version: 1 as const,
    exportedAt: new Date().toISOString(),
    timezone: "America/Los_Angeles",
    profile,
    metrics,
    foods,
    foodLog: logs.rows.map((row) => mapLog(row as Record<string, unknown>)),
  };
}

export async function importData(payload: unknown) {
  if (!payload || typeof payload !== "object") throw new Error("That file is not a Fit Log backup.");
  const data = payload as {
    version?: number;
    profile?: Profile;
    metrics?: Metric[];
    foods?: FoodRecord[];
    foodLog?: FoodLogItem[];
  };
  if (data.version !== 1) throw new Error("This backup version is not supported.");
  await ready();
  const profile = data.profile;
  const statements: { sql: string; args: Array<string | number | null> }[] = [
    { sql: "DELETE FROM food_log", args: [] },
    { sql: "DELETE FROM body_metrics", args: [] },
    { sql: "DELETE FROM foods", args: [] },
    { sql: "DELETE FROM profile", args: [] },
  ];
  if (profile) {
    statements.push({
      sql: `INSERT INTO profile (
        id, sex, current_weight_lbs, goal_weight_lbs, starting_body_fat, goal_body_fat,
        height_inches, calorie_goal, protein_goal, carb_goal, fat_goal, updated_at
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        profile.sex === "male" || profile.sex === "female" ? profile.sex : null,
        num(profile.currentWeightLbs),
        num(profile.goalWeightLbs),
        num(profile.startingBodyFat),
        num(profile.goalBodyFat),
        num(profile.heightInches),
        num(profile.calorieGoal),
        num(profile.proteinGoal),
        num(profile.carbGoal),
        num(profile.fatGoal),
        new Date().toISOString(),
      ],
    });
  }
  for (const food of data.foods ?? []) {
    if (!food?.id || !food.name) continue;
    statements.push({
      sql: `INSERT INTO foods (
        id, name, aliases, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g,
        units, category, source, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        food.id,
        food.name,
        JSON.stringify(food.aliases ?? []),
        num(food.caloriesPer100g) ?? 0,
        num(food.proteinPer100g) ?? 0,
        num(food.carbsPer100g) ?? 0,
        num(food.fatPer100g) ?? 0,
        JSON.stringify(food.units ?? {}),
        food.category,
        food.source || "import",
        new Date().toISOString(),
      ],
    });
  }
  for (const metric of data.metrics ?? []) {
    if (!metric?.date || !isISODate(metric.date)) continue;
    statements.push({
      sql: `INSERT INTO body_metrics (
        date, weight_lbs, waist_in, neck_in, hip_in, body_fat_pct, notes, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        metric.date,
        num(metric.weightLbs),
        num(metric.waistIn),
        num(metric.neckIn),
        num(metric.hipIn),
        num(metric.bodyFatPct),
        metric.notes,
        new Date().toISOString(),
      ],
    });
  }
  for (const item of data.foodLog ?? []) {
    if (!item?.date || !isISODate(item.date) || !item.name) continue;
    statements.push({
      sql: `INSERT INTO food_log (
        id, date, name, quantity, unit, grams, calories, protein, carbs, fat, source, food_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        item.id || crypto.randomUUID(),
        item.date,
        item.name,
        num(item.quantity),
        item.unit,
        num(item.grams),
        num(item.calories),
        num(item.protein),
        num(item.carbs),
        num(item.fat),
        item.source || "import",
        item.foodId,
        item.createdAt || new Date().toISOString(),
      ],
    });
  }
  await db().batch(statements, "write");
  await db().execute({
    sql: "INSERT INTO app_meta (key, value) VALUES ('seed_version', '0') ON CONFLICT(key) DO UPDATE SET value = '0'",
    args: [],
  });
  readyPromise.current = null;
  await ready();
  const restored = await getProfile();
  await recomputeBodyFat(restored);
}

const LOCK_WINDOW_MS = 15 * 60 * 1000;

export async function loginLocked(ip: string): Promise<boolean> {
  await ready();
  const result = await db().execute({
    sql: `SELECT COUNT(*) AS n FROM login_attempts
      WHERE ip = ? AND success = 0 AND attempted_at > ?`,
    args: [ip, Date.now() - LOCK_WINDOW_MS],
  });
  return Number(result.rows[0]?.n ?? 0) >= 8;
}

export async function recordLogin(ip: string, success: boolean) {
  await ready();
  await db().execute({
    sql: "INSERT INTO login_attempts (ip, success, attempted_at) VALUES (?, ?, ?)",
    args: [ip, success ? 1 : 0, Date.now()],
  });
  if (success) {
    await db().execute({
      sql: "DELETE FROM login_attempts WHERE ip = ? AND success = 0",
      args: [ip],
    });
  }
}

export function requireDate(value: string | null | undefined): string {
  const date = value || todayISO();
  if (!isISODate(date)) throw new Error("Use a real date.");
  return date;
}
