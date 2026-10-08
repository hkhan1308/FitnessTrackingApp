"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UnitChoice } from "@/components/unit-choice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bodyFatHint, estimateBodyFat } from "@/lib/body-fat";
import { api } from "@/lib/client";
import { fmt } from "@/lib/format";
import type { Metric, Profile } from "@/lib/store";
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

export function LogForm({
  date,
  profile,
  metric,
}: {
  date: string;
  profile: Profile;
  metric: Metric | null;
}) {
  const router = useRouter();
  const [units, setUnits] = useState<UnitSystem>(profile.units);
  const [weight, setWeight] = useState(displayText(toDisplayWeight(metric?.weightLbs ?? null, profile.units)));
  const [waist, setWaist] = useState(displayText(toDisplayLength(metric?.waistIn ?? null, profile.units)));
  const [neck, setNeck] = useState(displayText(toDisplayLength(metric?.neckIn ?? null, profile.units)));
  const [hip, setHip] = useState(displayText(toDisplayLength(metric?.hipIn ?? null, profile.units)));
  const [notes, setNotes] = useState(metric?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const weightLabel = weightUnit(units);
  const lengthLabel = lengthUnit(units);
  const waistIn = fromDisplayLength(parse(waist), units);
  const neckIn = fromDisplayLength(parse(neck), units);
  const hipIn = fromDisplayLength(parse(hip), units);

  const preview = useMemo(
    () =>
      estimateBodyFat({
        sex: profile.sex,
        heightInches: profile.heightInches,
        waistInches: waistIn,
        neckInches: neckIn,
        hipInches: hipIn,
      }),
    [profile.sex, profile.heightInches, waistIn, neckIn, hipIn],
  );

  async function changeUnits(next: UnitSystem) {
    if (next === units) return;
    setWeight(convertText(weight, units, next, "weight"));
    setWaist(convertText(waist, units, next, "length"));
    setNeck(convertText(neck, units, next, "length"));
    setHip(convertText(hip, units, next, "length"));
    setUnits(next);
    try {
      await api("/api/profile", {
        method: "PUT",
        body: JSON.stringify({ ...profile, units: next }),
      });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save units.");
    }
  }

  async function save() {
    setSaving(true);
    try {
      await api("/api/metrics", {
        method: "PUT",
        body: JSON.stringify({
          date,
          weightLbs: fromDisplayWeight(parse(weight), units),
          waistIn,
          neckIn,
          hipIn,
          notes,
        }),
      });
      toast.success(preview == null ? "Day saved." : `Estimate ${fmt(preview, 1)}% body fat.`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    try {
      await api(`/api/metrics?date=${date}`, { method: "DELETE" });
      setWeight("");
      setWaist("");
      setNeck("");
      setHip("");
      setNotes("");
      toast.success("Entry deleted.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete.");
    } finally {
      setSaving(false);
    }
  }

  const heightText =
    profile.heightInches == null ? "—" : `${displayText(toDisplayLength(profile.heightInches, units))} ${lengthLabel}`;
  const avgWeight =
    metric?.weightAvg == null ? "—" : `${displayText(toDisplayWeight(metric.weightAvg, units))} ${weightLabel}`;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Units</CardTitle>
          <CardDescription>Older logs stay in pounds and inches. This only changes how you enter and read them.</CardDescription>
        </CardHeader>
        <CardContent>
          <UnitChoice value={units} onChange={changeUnits} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Measurements</CardTitle>
          <CardDescription>Leave any field blank. Only what you measure today gets saved.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <Field label={`Weight (${weightLabel})`} value={weight} onChange={setWeight} />
          <Field label={`Waist (${lengthLabel})`} value={waist} onChange={setWaist} />
          <Field label={`Neck (${lengthLabel})`} value={neck} onChange={setNeck} />
          <Field label={`Hip (${lengthLabel})`} value={hip} onChange={setHip} />
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="notes">Note</Label>
            <Input id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional" className="h-11" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Body fat estimate</CardTitle>
          <CardDescription>{bodyFatHint(profile.sex)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-2xl font-semibold tabular-nums">
            {preview == null ? "—" : `${fmt(preview, 1)}%`}
            <span className="ml-2 text-sm font-normal text-muted-foreground">estimate</span>
          </p>
          <p className="text-muted-foreground">
            7-day average {metric?.bodyFatAvg == null ? "—" : `${fmt(metric.bodyFatAvg, 1)}%`}
            {" · "}
            weight average {avgWeight}
          </p>
          <p className="text-muted-foreground">
            Using waist {waist || "—"} {waist ? lengthLabel : ""}, neck {neck || "—"} {neck ? lengthLabel : ""}, hip {hip || "—"} {hip ? lengthLabel : ""}, height {heightText}.
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button className="h-11 flex-1" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save day"}
        </Button>
        {metric ? (
          <Button className="h-11" variant="destructive" onClick={remove} disabled={saving}>
            Delete
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function Field({
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
      <Input
        id={id}
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11"
      />
    </div>
  );
}
