"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { UnitChoice } from "@/components/unit-choice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/client";
import type { Profile } from "@/lib/store";
import {
  ACTIVITY_LABELS,
  calculateTargets,
  isActivity,
  TARGET_ASSUMPTIONS,
  type ActivityLevel,
  type CalculatedTargets,
} from "@/lib/targets";
import {
  displayText,
  fromDisplayLength,
  fromDisplayWeight,
  lengthUnit,
  toDisplayLength,
  toDisplayWeight,
  weightUnit,
  type UnitSystem,
} from "@/lib/units";

function parse(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function convertText(value: string, from: UnitSystem, to: UnitSystem, kind: "weight" | "length"): string {
  const parsed = parse(value);
  if (parsed == null || from === to) return value;
  const canonical = kind === "weight" ? fromDisplayWeight(parsed, from) : fromDisplayLength(parsed, from);
  const shown = kind === "weight" ? toDisplayWeight(canonical, to) : toDisplayLength(canonical, to);
  return displayText(shown);
}

export function SettingsPanel({ profile }: { profile: Profile }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [units, setUnits] = useState<UnitSystem>(profile.units);
  const [sex, setSex] = useState(profile.sex ?? "unset");
  const [activity, setActivity] = useState<ActivityLevel>(profile.activity);
  const [height, setHeight] = useState(displayText(toDisplayLength(profile.heightInches, profile.units)));
  const [startingWeight, setStartingWeight] = useState(displayText(toDisplayWeight(profile.startingWeightLbs, profile.units)));
  const [currentWeight, setCurrentWeight] = useState(displayText(toDisplayWeight(profile.currentWeightLbs, profile.units)));
  const [goalWeight, setGoalWeight] = useState(displayText(toDisplayWeight(profile.goalWeightLbs, profile.units)));
  const [startFat, setStartFat] = useState(profile.startingBodyFat == null ? "" : String(profile.startingBodyFat));
  const [currentFat, setCurrentFat] = useState(profile.currentBodyFat == null ? "" : String(profile.currentBodyFat));
  const [goalFat, setGoalFat] = useState(profile.goalBodyFat == null ? "" : String(profile.goalBodyFat));
  const [calories, setCalories] = useState(profile.calorieGoal == null ? "" : String(profile.calorieGoal));
  const [protein, setProtein] = useState(profile.proteinGoal == null ? "" : String(profile.proteinGoal));
  const [carbs, setCarbs] = useState(profile.carbGoal == null ? "" : String(profile.carbGoal));
  const [fat, setFat] = useState(profile.fatGoal == null ? "" : String(profile.fatGoal));
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const weightLabel = weightUnit(units);
  const lengthLabel = lengthUnit(units);

  function targetsFor(next: {
    currentWeight?: string;
    currentFat?: string;
    goalWeight?: string;
    activity?: ActivityLevel;
    units?: UnitSystem;
  }): CalculatedTargets | null {
    const system = next.units ?? units;
    return calculateTargets({
      currentWeightLbs: fromDisplayWeight(parse(next.currentWeight ?? currentWeight), system),
      currentBodyFat: parse(next.currentFat ?? currentFat),
      goalWeightLbs: fromDisplayWeight(parse(next.goalWeight ?? goalWeight), system),
      activity: next.activity ?? activity,
    });
  }

  function applyTargets(calc: CalculatedTargets | null) {
    if (!calc) return;
    setGoalFat(String(calc.goalBodyFat));
    setCalories(String(calc.calories));
    setProtein(String(calc.protein));
    setCarbs(String(calc.carbs));
    setFat(String(calc.fat));
  }

  function onUnits(next: UnitSystem) {
    if (next === units) return;
    setHeight(convertText(height, units, next, "length"));
    setStartingWeight(convertText(startingWeight, units, next, "weight"));
    setCurrentWeight(convertText(currentWeight, units, next, "weight"));
    setGoalWeight(convertText(goalWeight, units, next, "weight"));
    setUnits(next);
    applyTargets(targetsFor({ units: next }));
  }

  const preview = targetsFor({});
  const missing = [
    currentWeight.trim() ? null : "current weight",
    currentFat.trim() ? null : "current body fat",
    goalWeight.trim() ? null : "goal weight",
  ].filter((item): item is string => item != null);

  async function save() {
    setSaving(true);
    try {
      await api("/api/profile", {
        method: "PUT",
        body: JSON.stringify({
          sex: sex === "male" || sex === "female" ? sex : null,
          units,
          activity,
          heightInches: fromDisplayLength(parse(height), units),
          startingWeightLbs: fromDisplayWeight(parse(startingWeight), units),
          currentWeightLbs: fromDisplayWeight(parse(currentWeight), units),
          goalWeightLbs: fromDisplayWeight(parse(goalWeight), units),
          startingBodyFat: parse(startFat),
          currentBodyFat: parse(currentFat),
          goalBodyFat: parse(goalFat),
          calorieGoal: parse(calories),
          proteinGoal: parse(protein),
          carbGoal: parse(carbs),
          fatGoal: parse(fat),
        }),
      });
      toast.success("Profile saved.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function onImport(file: File | undefined) {
    if (!file) return;
    if (!window.confirm("Replace your profile, weigh-ins, meals, and saved foods with this backup?")) return;
    setImporting(true);
    try {
      const payload = JSON.parse(await file.text());
      await api("/api/import", { method: "POST", body: JSON.stringify(payload) });
      toast.success("Backup restored.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  async function logout() {
    await api("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Units</CardTitle>
          <CardDescription>Weights and tape measurements are stored in pounds and inches, then shown in the system you pick.</CardDescription>
        </CardHeader>
        <CardContent>
          <UnitChoice value={units} onChange={onUnits} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Body</CardTitle>
          <CardDescription>Sex and height feed the Navy body-fat estimate. Weight and current body fat feed the calorie targets.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="sex">Sex</Label>
            <select
              id="sex"
              value={sex}
              onChange={(event) => setSex(event.target.value)}
              className="h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              <option value="unset">Not set</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <NumberField label={`Height (${lengthLabel})`} value={height} onChange={setHeight} />
          <div className="space-y-1.5">
            <Label htmlFor="activity">Activity</Label>
            <select
              id="activity"
              value={activity}
              onChange={(event) => {
                const next = isActivity(event.target.value) ? event.target.value : "light";
                setActivity(next);
                applyTargets(targetsFor({ activity: next }));
              }}
              className="h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((option) => (
                <option key={option} value={option}>{ACTIVITY_LABELS[option]}</option>
              ))}
            </select>
          </div>
          <NumberField
            label={`Starting weight (${weightLabel})`}
            value={startingWeight}
            onChange={(value) => {
              setStartingWeight(value);
            }}
          />
          <NumberField
            label={`Current weight (${weightLabel})`}
            value={currentWeight}
            onChange={(value) => {
              setCurrentWeight(value);
              applyTargets(targetsFor({ currentWeight: value }));
            }}
          />
          <NumberField
            label={`Goal weight (${weightLabel})`}
            value={goalWeight}
            onChange={(value) => {
              setGoalWeight(value);
              applyTargets(targetsFor({ goalWeight: value }));
            }}
          />
          <NumberField label="Starting body fat %" value={startFat} onChange={setStartFat} />
          <NumberField
            label="Current body fat %"
            value={currentFat}
            onChange={(value) => {
              setCurrentFat(value);
              applyTargets(targetsFor({ currentFat: value }));
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Calculated targets</CardTitle>
          <CardDescription>
            {missing.length
              ? `Add ${missing.join(", ")} to calculate targets.`
              : preview
                ? preview.adjustment
                : "Goal weight is at or below estimated lean mass, so body fat would not stay positive if lean mass is held constant."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {preview ? (
            <dl className="grid grid-cols-2 gap-2">
              <Stat label="Lean mass" value={`${displayText(toDisplayWeight(preview.leanLbs, units))} ${weightLabel}`} />
              <Stat label="Goal body fat" value={`${preview.goalBodyFat}%`} />
              <Stat label="BMR" value={`${preview.bmr} kcal`} />
              <Stat label="TDEE" value={`${preview.tdee} kcal`} />
              <Stat label="Calories" value={`${preview.calories} kcal`} />
              <Stat label="Protein" value={`${preview.protein} g`} />
              <Stat label="Fat" value={`${preview.fat} g`} />
              <Stat label="Carbs" value={`${preview.carbs} g`} />
            </dl>
          ) : null}
          <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
            {TARGET_ASSUMPTIONS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <Button type="button" variant="outline" className="h-11 w-full" onClick={() => applyTargets(preview)} disabled={!preview}>
            Use calculated targets
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Goals you keep</CardTitle>
          <CardDescription>These save as your targets. Change a weight, body fat, or activity field and they recalculate. Edit any number here to override that result.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <NumberField label="Goal body fat %" value={goalFat} onChange={setGoalFat} />
          <NumberField label="Calorie goal" value={calories} onChange={setCalories} />
          <NumberField label="Protein goal (g)" value={protein} onChange={setProtein} />
          <NumberField label="Carb goal (g)" value={carbs} onChange={setCarbs} />
          <NumberField label="Fat goal (g)" value={fat} onChange={setFat} />
          <Button className="col-span-2 h-11" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-2">
          {(["system", "light", "dark"] as const).map((option) => (
            <Button
              key={option}
              variant={theme === option ? "default" : "outline"}
              className="h-11 capitalize"
              onClick={() => setTheme(option)}
            >
              {option}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backup</CardTitle>
          <CardDescription>CSV is the spreadsheet copy. JSON is the file to restore from.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <a className="block" href="/api/export?format=csv">
            <Button variant="outline" className="h-11 w-full">Export all data to CSV</Button>
          </a>
          <a className="block" href="/api/export?format=json">
            <Button variant="outline" className="h-11 w-full">Download JSON backup</Button>
          </a>
          <Label htmlFor="import" className="block">
            <span className="mb-1.5 block">Restore JSON backup</span>
            <Input
              id="import"
              type="file"
              accept="application/json"
              className="h-11"
              disabled={importing}
              onChange={(event) => onImport(event.target.files?.[0])}
            />
          </Label>
        </CardContent>
      </Card>

      <Button variant="ghost" className="h-11 w-full" onClick={logout}>
        Log out
      </Button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} className="h-11" />
    </div>
  );
}
