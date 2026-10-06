"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { api } from "@/lib/client";
import type { Profile } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function text(value: number | null): string {
  return value == null ? "" : String(value);
}

function parse(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function SettingsPanel({ profile }: { profile: Profile }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [sex, setSex] = useState(profile.sex ?? "unset");
  const [currentWeight, setCurrentWeight] = useState(text(profile.currentWeightLbs));
  const [goalWeight, setGoalWeight] = useState(text(profile.goalWeightLbs));
  const [startFat, setStartFat] = useState(text(profile.startingBodyFat));
  const [goalFat, setGoalFat] = useState(text(profile.goalBodyFat));
  const [height, setHeight] = useState(text(profile.heightInches));
  const [calories, setCalories] = useState(text(profile.calorieGoal));
  const [protein, setProtein] = useState(text(profile.proteinGoal));
  const [carbs, setCarbs] = useState(text(profile.carbGoal));
  const [fat, setFat] = useState(text(profile.fatGoal));
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api("/api/profile", {
        method: "PUT",
        body: JSON.stringify({
          sex: sex === "male" || sex === "female" ? sex : null,
          currentWeightLbs: parse(currentWeight),
          goalWeightLbs: parse(goalWeight),
          startingBodyFat: parse(startFat),
          goalBodyFat: parse(goalFat),
          heightInches: parse(height),
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
          <CardTitle>Profile and goals</CardTitle>
          <CardDescription>Used for the Navy body-fat estimate and the daily targets. All optional.</CardDescription>
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
          <NumberField label="Height (in)" value={height} onChange={setHeight} />
          <NumberField label="Current weight (lb)" value={currentWeight} onChange={setCurrentWeight} />
          <NumberField label="Goal weight (lb)" value={goalWeight} onChange={setGoalWeight} />
          <NumberField label="Starting body fat %" value={startFat} onChange={setStartFat} />
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
