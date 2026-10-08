"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fmt } from "@/lib/format";

type Point = { label: string; value: number | null };

export function HistoryCharts({
  weight,
  bodyFat,
  macros,
  weightUnit,
  macroMax,
  goalsReady,
}: {
  weight: Point[];
  bodyFat: Point[];
  macros: Point[];
  weightUnit: string;
  macroMax: number;
  goalsReady: boolean;
}) {
  return (
    <div className="space-y-4">
      <HistoryChart
        title="Weight"
        description="Daily weigh-ins in this range."
        points={weight}
        unit={weightUnit}
        defaultType="line"
        empty="Nothing to chart yet. Log a weigh-in and it will show up here."
      />
      <HistoryChart
        title="Body fat"
        description="Navy tape estimates in this range."
        points={bodyFat}
        unit="%"
        defaultType="line"
        empty="Nothing to chart yet. Log waist and neck (and hip, for women) and it will show up here."
      />
      <HistoryChart
        title="Macro goals hit"
        description={
          goalsReady
            ? "Calories, carbs, and fat count inside 10% of the goal. Protein counts at 90% or more."
            : "Set calorie and macro goals in Settings before this can score a day."
        }
        points={goalsReady ? macros : []}
        unit="goals"
        defaultType="bar"
        domain={[0, Math.max(1, macroMax)]}
        empty={
          goalsReady
            ? "Nothing to chart yet. Log a meal and it will show up here."
            : "Nothing to chart yet. Set calorie and macro goals, then log meals against them."
        }
      />
    </div>
  );
}

function HistoryChart({
  title,
  description,
  points,
  unit,
  defaultType,
  empty,
  domain,
}: {
  title: string;
  description: string;
  points: Point[];
  unit: string;
  defaultType: "line" | "bar";
  empty: string;
  domain?: [number, number];
}) {
  const [type, setType] = useState<"line" | "bar">(defaultType);
  const data = points.filter((point) => point.value != null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant={type === "line" ? "default" : "outline"} className="h-10" onClick={() => setType("line")}>
            Line
          </Button>
          <Button type="button" variant={type === "bar" ? "default" : "outline"} className="h-10" onClick={() => setType("bar")}>
            Bar
          </Button>
        </div>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {type === "bar" ? (
                <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                    domain={domain ?? ["auto", "auto"]}
                    allowDecimals={unit !== "goals"}
                  />
                  <Tooltip formatter={(value) => [`${fmt(typeof value === "number" ? value : null, unit === "goals" ? 0 : 1)} ${unit}`, title]} />
                  <Bar dataKey="value" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                    domain={domain ?? ["auto", "auto"]}
                    allowDecimals={unit !== "goals"}
                  />
                  <Tooltip formatter={(value) => [`${fmt(typeof value === "number" ? value : null, unit === "goals" ? 0 : 1)} ${unit}`, title]} />
                  <Line dataKey="value" stroke="var(--chart-1)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--chart-1)" }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
