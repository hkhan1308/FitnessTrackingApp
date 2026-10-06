"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/client";
import { fmt, fmtInt, fmtQty } from "@/lib/format";
import type { FoodLogItem, MacroTotals, Profile } from "@/lib/store";
import { MacroBars } from "@/components/macro-bars";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Match = {
  foodId: string | null;
  name: string;
  detail?: string;
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
  source: string;
};

type SearchResponse = {
  matches: Match[];
  searchedWeb: boolean;
  errors: string[];
  parsed: { name: string };
};

export function FoodLogger({
  date,
  profile,
  items,
  totals,
  recent,
  yesterday,
}: {
  date: string;
  profile: Profile;
  items: FoodLogItem[];
  totals: MacroTotals;
  recent: FoodLogItem[];
  yesterday: FoodLogItem[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [manual, setManual] = useState(false);
  const [editing, setEditing] = useState<FoodLogItem | null>(null);

  async function search(event?: React.FormEvent) {
    event?.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setManual(false);
    try {
      const data = await api<SearchResponse>("/api/foods/search", {
        method: "POST",
        body: JSON.stringify({ query }),
      });
      setResult(data);
      if (data.matches.length === 0) setManual(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  async function addMatch(match: Match, saveToLibrary: boolean) {
    try {
      await api("/api/food-log", {
        method: "POST",
        body: JSON.stringify({
          date,
          name: match.name,
          quantity: match.quantity,
          unit: match.unit,
          grams: match.grams,
          calories: match.calories,
          protein: match.protein,
          carbs: match.carbs,
          fat: match.fat,
          source: match.source,
          foodId: match.foodId,
          saveToLibrary,
          caloriesPer100g: match.caloriesPer100g,
          proteinPer100g: match.proteinPer100g,
          carbsPer100g: match.carbsPer100g,
          fatPer100g: match.fatPer100g,
          aliases: result?.parsed.name ? [result.parsed.name] : [],
        }),
      });
      setQuery("");
      setResult(null);
      toast.success(`Added ${match.name}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add that.");
    }
  }

  async function copyMeal(id: string) {
    try {
      await api("/api/food-log/copy", {
        method: "POST",
        body: JSON.stringify({ id, date }),
      });
      toast.success("Meal logged.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not log that again.");
    }
  }

  async function remove(id: string) {
    try {
      await api(`/api/food-log/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete.");
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Today’s targets</CardTitle>
        </CardHeader>
        <CardContent>
          <MacroBars totals={totals} profile={profile} />
        </CardContent>
      </Card>

      <form onSubmit={search} className="flex gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="100g chicken breast"
          aria-label="Food"
          className="h-11"
        />
        <Button className="h-11" type="submit" disabled={searching}>
          {searching ? "…" : "Add"}
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">
        Cooked portions. Local foods are used first. The web is only searched when nothing local fits.
      </p>

      {recent.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {recent.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => copyMeal(item.id)}
              className="shrink-0 rounded-full border px-3 py-1.5 text-xs"
            >
              {item.name}
            </button>
          ))}
        </div>
      ) : null}

      {result ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {result.searchedWeb
              ? "No local match. Pick a web result, or enter it yourself."
              : "From your food table."}
          </p>
          {result.errors.map((error) => (
            <p key={error} className="text-sm text-destructive">{error}</p>
          ))}
          {result.matches.map((match) => (
            <Card key={`${match.source}-${match.name}`}>
              <CardContent className="space-y-2 pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{match.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtQty(match.quantity)} {match.unit}
                      {match.assumed ? " · size assumed" : ""} · {labelFor(match.source)}
                    </p>
                  </div>
                  <p className="text-sm tabular-nums">{fmtInt(match.calories)} kcal</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {fmt(match.protein, 1)}p · {fmt(match.carbs, 1)}c · {fmt(match.fat, 1)}f
                  {match.detail ? ` · ${match.detail}` : ""}
                </p>
                <Button className="h-10 w-full" onClick={() => addMatch(match, match.source !== "local")}>
                  Add this
                </Button>
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" className="h-10 w-full" onClick={() => setManual(true)}>
            Enter macros myself
          </Button>
        </div>
      ) : null}

      {manual ? (
        <ManualForm
          date={date}
          initialName={result?.parsed.name || query}
          onDone={() => {
            setManual(false);
            setResult(null);
            setQuery("");
            router.refresh();
          }}
        />
      ) : null}

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Logged</h2>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing logged for this day yet.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl bg-card px-3 py-3 ring-1 ring-foreground/10">
              <button type="button" className="min-w-0 text-left" onClick={() => setEditing(item)}>
                <p className="truncate font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.quantity != null ? `${fmtQty(item.quantity)} ${item.unit ?? ""}` : "—"} · {labelFor(item.source)}
                </p>
              </button>
              <div className="text-right">
                <p className="text-sm tabular-nums">{fmtInt(item.calories)} kcal</p>
                <button type="button" className="text-xs text-muted-foreground" onClick={() => remove(item.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {yesterday.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium">Log again from yesterday</h2>
          {yesterday.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => copyMeal(item.id)}
              className="flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm"
            >
              <span>{item.name}</span>
              <span className="text-muted-foreground">{fmtInt(item.calories)} kcal</span>
            </button>
          ))}
        </section>
      ) : null}

      <EditDialog item={editing} onClose={() => setEditing(null)} onSaved={() => router.refresh()} />
    </div>
  );
}

function labelFor(source: string): string {
  if (source === "local" || source === "seed") return "Local";
  if (source === "manual") return "Manual";
  if (source === "usda") return "USDA";
  if (source === "open-food-facts") return "Open Food Facts";
  return "Saved";
}

function ManualForm({
  date,
  initialName,
  onDone,
}: {
  date: string;
  initialName: string;
  onDone: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [remember, setRemember] = useState(true);
  const [saving, setSaving] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const meal = {
        calories: Number(calories),
        protein: Number(protein),
        carbs: Number(carbs),
        fat: Number(fat),
      };
      await api("/api/food-log", {
        method: "POST",
        body: JSON.stringify({
          date,
          name,
          quantity: 1,
          unit: "serving",
          grams: null,
          ...meal,
          source: "manual",
          saveToLibrary: remember,
          caloriesPer100g: meal.calories,
          proteinPer100g: meal.protein,
          carbsPer100g: meal.carbs,
          fatPer100g: meal.fat,
        }),
      });
      toast.success(remember ? "Saved, and remembered for next time." : "Meal added.");
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual entry</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="manual-name">Food</Label>
            <Input id="manual-name" value={name} onChange={(event) => setName(event.target.value)} className="h-11" required />
          </div>
          <NumberField id="cal" label="Calories" value={calories} onChange={setCalories} />
          <NumberField id="protein" label="Protein (g)" value={protein} onChange={setProtein} />
          <NumberField id="carbs" label="Carbs (g)" value={carbs} onChange={setCarbs} />
          <NumberField id="fat" label="Fat (g)" value={fat} onChange={setFat} />
          <label className="col-span-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
            Remember this as 1 serving
          </label>
          <Button className="col-span-2 h-11" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Add manual entry"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} inputMode="decimal" required value={value} onChange={(event) => onChange(event.target.value)} className="h-11" />
    </div>
  );
}

function EditDialog({
  item,
  onClose,
  onSaved,
}: {
  item: FoodLogItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <Dialog open={item != null} onOpenChange={(open) => { if (!open) onClose(); }}>
      {item ? <EditForm key={item.id} item={item} onClose={onClose} onSaved={onSaved} /> : null}
    </Dialog>
  );
}

function EditForm({
  item,
  onClose,
  onSaved,
}: {
  item: FoodLogItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [calories, setCalories] = useState(item.calories == null ? "" : String(item.calories));
  const [protein, setProtein] = useState(item.protein == null ? "" : String(item.protein));
  const [carbs, setCarbs] = useState(item.carbs == null ? "" : String(item.carbs));
  const [fat, setFat] = useState(item.fat == null ? "" : String(item.fat));

  async function save() {
    try {
      await api(`/api/food-log/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          quantity: item.quantity,
          unit: item.unit,
          calories: Number(calories),
          protein: Number(protein),
          carbs: Number(carbs),
          fat: Number(fat),
        }),
      });
      toast.success("Meal updated.");
      onClose();
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update.");
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit meal</DialogTitle>
      </DialogHeader>
      <div className="grid gap-3">
        <Input value={name} onChange={(event) => setName(event.target.value)} className="h-11" />
        <div className="grid grid-cols-2 gap-2">
          <Input inputMode="decimal" value={calories} onChange={(event) => setCalories(event.target.value)} placeholder="Calories" className="h-11" />
          <Input inputMode="decimal" value={protein} onChange={(event) => setProtein(event.target.value)} placeholder="Protein" className="h-11" />
          <Input inputMode="decimal" value={carbs} onChange={(event) => setCarbs(event.target.value)} placeholder="Carbs" className="h-11" />
          <Input inputMode="decimal" value={fat} onChange={(event) => setFat(event.target.value)} placeholder="Fat" className="h-11" />
        </div>
      </div>
      <DialogFooter>
        <Button className="h-11" onClick={save}>Save changes</Button>
      </DialogFooter>
    </DialogContent>
  );
}
