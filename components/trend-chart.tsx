"use client";

import { formatShort } from "@/lib/dates";
import { fmt } from "@/lib/format";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = { date: string; value: number | null; avg: number | null };

export function TrendChart({
  points,
  unit,
}: {
  points: Point[];
  unit: string;
}) {
  const data = points
    .filter((point) => point.value != null)
    .map((point) => ({ ...point, label: formatShort(point.date) }));

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Log a few days to see this trend.</p>;
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            width={36}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              fontSize: 12,
            }}
            formatter={(value, name) => [
              `${fmt(typeof value === "number" ? value : null, 1)} ${unit}`,
              name === "avg" ? "7-day average" : "Day",
            ]}
          />
          <Line dataKey="value" name="value" stroke="var(--chart-2)" strokeWidth={0} dot={{ r: 3, fill: "var(--chart-2)" }} />
          <Line dataKey="avg" name="avg" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
