"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { bodyFatHint, estimateBodyFat } from "@/lib/body-fat";
import { api } from "@/lib/client";
import { fmt } from "@/lib/format";
import type { Metric, Profile } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function text(value: number | null | undefined): string {
  return value == null ? "" : String(value);
}

function parse(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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
  const [weight, setWeight] = useState(text(metric?.weightLbs));
  const [waist, setWaist] = useState(text(metric?.waistIn));
  const [neck, setNeck] = useState(text(metric?.neckIn));
  const [hip, setHip] = useState(text(metric?.hipIn));
  const [notes, setNotes] = useState(metric?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const preview = useMemo(
    () =>
      estimateBodyFat({
        sex: profile.sex,
        heightInches: profile.heightInches,
        waistInches: parse(waist),
        neckInches: parse(neck),
        hipInches: parse(hip),
      }),
    [profile.sex, profile.heightInches, waist, neck, hip],
  );

  async function save() {
    setSaving(true);
    try {
      await api("/api/metrics", {
        method: "PUT",
        body: JSON.stringify({
          date,
          weightLbs: parse(weight),
          waistIn: parse(waist),
          neckIn: parse(neck),
          hipIn: parse(hip),
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Measurements</CardTitle>
          <CardDescription>Leave any field blank. Only what you measure today gets saved.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <Field label="Weight (lb)" value={weight} onChange={setWeight} />
          <Field label="Waist (in)" value={waist} onChange={setWaist} />
          <Field label="Neck (in)" value={neck} onChange={setNeck} />
          <Field label="Hip (in)" value={hip} onChange={setHip} />
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
            weight average {metric?.weightAvg == null ? "—" : `${fmt(metric.weightAvg, 1)} lb`}
          </p>
          <p className="text-muted-foreground">
            Using waist {waist || "—"}, neck {neck || "—"}, hip {hip || "—"}, height{" "}
            {profile.heightInches == null ? "—" : `${fmt(profile.heightInches, 1)} in`}.
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
