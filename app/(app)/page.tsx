import Link from "next/link";
import { MacroBars } from "@/components/macro-bars";
import { TrendChart } from "@/components/trend-chart";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPretty } from "@/lib/dates";
import { fmt } from "@/lib/format";
import { goalProgress, remainingLabel } from "@/lib/goals";
import { getHome } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const params = await searchParams;
  const days = params.days === "90" ? 90 : 30;
  const home = await getHome(days);
  const currentWeight = home.latestWeight?.weightLbs ?? home.profile.currentWeightLbs;
  const startWeight = home.earliestWeight?.weightLbs ?? home.profile.currentWeightLbs;
  const currentFat = home.latestFat?.bodyFatPct ?? home.profile.startingBodyFat;
  const startFat = home.profile.startingBodyFat ?? home.earliestFat?.bodyFatPct ?? null;
  const weightGoal = goalProgress(startWeight, currentWeight, home.profile.goalWeightLbs);
  const fatGoal = goalProgress(startFat, currentFat, home.profile.goalBodyFat);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <p className="text-sm text-muted-foreground">{formatPretty(home.today)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <GoalCard
          title="Weight"
          value={currentWeight == null ? "—" : `${fmt(currentWeight, 1)} lb`}
          detail={
            weightGoal
              ? remainingLabel(weightGoal.remaining, "lb")
              : "Set a goal weight"
          }
          percent={weightGoal?.percent ?? 0}
          extra={home.latestWeight?.weightAvg == null ? null : `7-day avg ${fmt(home.latestWeight.weightAvg, 1)} lb`}
        />
        <GoalCard
          title="Body fat"
          value={currentFat == null ? "—" : `${fmt(currentFat, 1)}%`}
          detail={fatGoal ? remainingLabel(fatGoal.remaining, "%") : "Set a body-fat goal"}
          percent={fatGoal?.percent ?? 0}
          extra={home.latestFat?.bodyFatAvg == null ? "Estimate" : `7-day avg ${fmt(home.latestFat.bodyFatAvg, 1)}%`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Meals</CardTitle>
          <CardDescription>Running totals against your daily goals.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <MacroBars totals={home.totals} profile={home.profile} />
          <Link href="/food" className={buttonVariants({ className: "h-11 w-full" })}>
            Log food
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="text-sm text-muted-foreground">Logged this week</p>
            <p className="text-xl font-semibold tabular-nums">{home.weekLogged} / {home.weekLength}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">This month</p>
            <p className="text-xl font-semibold tabular-nums">{home.monthLogged} / {home.monthLength}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weight</CardTitle>
          <CardDescription>Dots are daily weigh-ins. The line is the 7-day average.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Link href="/?days=30" className={buttonVariants({ variant: days === 30 ? "default" : "outline", size: "sm" })}>30 days</Link>
            <Link href="/?days=90" className={buttonVariants({ variant: days === 90 ? "default" : "outline", size: "sm" })}>90 days</Link>
          </div>
          <TrendChart
            unit="lb"
            points={home.series.map((point) => ({
              date: point.date,
              value: point.weightLbs,
              avg: point.weightAvg,
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Body fat</CardTitle>
          <CardDescription>Tape estimates. Trust the average more than any single day.</CardDescription>
        </CardHeader>
        <CardContent>
          <TrendChart
            unit="%"
            points={home.series.map((point) => ({
              date: point.date,
              value: point.bodyFatPct,
              avg: point.bodyFatAvg,
            }))}
          />
        </CardContent>
      </Card>

      <Link href="/log" className={buttonVariants({ variant: "outline", className: "h-11 w-full" })}>
        Log a weigh-in
      </Link>
    </div>
  );
}

function GoalCard({
  title,
  value,
  detail,
  percent,
  extra,
}: {
  title: string;
  value: string;
  detail: string;
  percent: number;
  extra: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">{detail}</p>
        {extra ? <p className="text-xs text-muted-foreground">{extra}</p> : null}
      </CardContent>
    </Card>
  );
}
