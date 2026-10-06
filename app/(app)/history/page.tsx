import Link from "next/link";
import { DateNav } from "@/components/date-nav";
import { buttonVariants } from "@/components/ui/button";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  formatMonth,
  formatPretty,
  formatShort,
  isISODate,
  startOfMonth,
  startOfWeek,
  todayISO,
  weekdayShort,
} from "@/lib/dates";
import { fmt, fmtInt } from "@/lib/format";
import { getDay, getSpan } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const params = await searchParams;
  const view = params.view === "week" || params.view === "month" ? params.view : "day";
  const date = params.date && isISODate(params.date) ? params.date : todayISO();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
        <p className="text-sm text-muted-foreground">Weeks run Monday through Sunday.</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(["day", "week", "month"] as const).map((item) => (
          <Link
            key={item}
            href={`/history?view=${item}&date=${date}`}
            className={buttonVariants({ variant: view === item ? "default" : "outline", className: "h-10 capitalize" })}
          >
            {item}
          </Link>
        ))}
      </div>
      {view === "day" ? <DayView date={date} /> : null}
      {view === "week" ? <SpanView date={date} mode="week" /> : null}
      {view === "month" ? <SpanView date={date} mode="month" /> : null}
    </div>
  );
}

async function DayView({ date }: { date: string }) {
  const day = await getDay(date);
  return (
    <div className="space-y-4">
      <DateNav
        label={formatPretty(date)}
        prevHref={`/history?view=day&date=${addDays(date, -1)}`}
        nextHref={`/history?view=day&date=${addDays(date, 1)}`}
      />
      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="font-medium">Body</h2>
        {day.metric ? (
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <Stat label="Weight" value={day.metric.weightLbs == null ? "—" : `${fmt(day.metric.weightLbs, 1)} lb`} />
            <Stat label="7-day weight" value={day.metric.weightAvg == null ? "—" : `${fmt(day.metric.weightAvg, 1)} lb`} />
            <Stat label="Waist" value={day.metric.waistIn == null ? "—" : `${fmt(day.metric.waistIn, 1)} in`} />
            <Stat label="Neck" value={day.metric.neckIn == null ? "—" : `${fmt(day.metric.neckIn, 1)} in`} />
            <Stat label="Hip" value={day.metric.hipIn == null ? "—" : `${fmt(day.metric.hipIn, 1)} in`} />
            <Stat label="Body fat estimate" value={day.metric.bodyFatPct == null ? "—" : `${fmt(day.metric.bodyFatPct, 1)}%`} />
            <Stat label="7-day body fat" value={day.metric.bodyFatAvg == null ? "—" : `${fmt(day.metric.bodyFatAvg, 1)}%`} />
            {day.metric.notes ? <p className="col-span-2 text-muted-foreground">{day.metric.notes}</p> : null}
          </dl>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No measurements this day.</p>
        )}
        <Link href={`/log?date=${date}`} className={`${buttonVariants({ variant: "outline", size: "sm" })} mt-3`}>
          Edit weigh-in
        </Link>
      </section>
      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Food</h2>
          <p className="text-sm tabular-nums text-muted-foreground">{fmtInt(day.totals.calories)} kcal</p>
        </div>
        {day.foods.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No meals this day.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {day.foods.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span>{item.name}</span>
                <span className="tabular-nums text-muted-foreground">
                  {fmt(item.protein, 0)}p · {fmtInt(item.calories)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          {fmt(day.totals.protein, 0)}g protein · {fmt(day.totals.carbs, 0)}g carbs · {fmt(day.totals.fat, 0)}g fat
        </p>
        <Link href={`/food?date=${date}`} className={`${buttonVariants({ variant: "outline", size: "sm" })} mt-3`}>
          Edit meals
        </Link>
      </section>
    </div>
  );
}

async function SpanView({ date, mode }: { date: string; mode: "week" | "month" }) {
  const from = mode === "week" ? startOfWeek(date) : startOfMonth(date);
  const to = mode === "week" ? endOfWeek(date) : endOfMonth(date);
  const span = await getSpan(from, to);
  const label = mode === "week" ? `${formatShort(from)} – ${formatShort(to)}` : formatMonth(date);
  const prev = mode === "week" ? addDays(from, -7) : addMonths(date, -1);
  const next = mode === "week" ? addDays(from, 7) : addMonths(date, 1);

  return (
    <div className="space-y-4">
      <DateNav
        label={label}
        prevHref={`/history?view=${mode}&date=${prev}`}
        nextHref={`/history?view=${mode}&date=${next}`}
      />
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Summary label="Avg weight" value={span.summary.weight == null ? "—" : `${fmt(span.summary.weight, 1)} lb`} />
        <Summary label="Avg body fat" value={span.summary.bodyFat == null ? "—" : `${fmt(span.summary.bodyFat, 1)}%`} />
        <Summary label="Avg calories" value={span.summary.calories == null ? "—" : fmtInt(span.summary.calories)} />
        <Summary label="Avg protein" value={span.summary.protein == null ? "—" : `${fmt(span.summary.protein, 0)}g`} />
      </div>
      <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Day</th>
              <th className="px-3 py-2 font-medium">Weight</th>
              <th className="px-3 py-2 font-medium">Fat %</th>
              <th className="px-3 py-2 font-medium">kcal</th>
              <th className="px-3 py-2 font-medium">Protein</th>
            </tr>
          </thead>
          <tbody>
            {span.days.map((day) => (
              <tr key={day.date} className="border-t">
                <td className="px-3 py-2">
                  <Link href={`/history?view=day&date=${day.date}`} className="underline-offset-2 hover:underline">
                    {weekdayShort(day.date)} {formatShort(day.date)}
                  </Link>
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {day.metric?.weightLbs == null ? "—" : fmt(day.metric.weightLbs, 1)}
                  <span className="block text-xs text-muted-foreground">
                    {day.metric?.weightAvg == null ? "" : `avg ${fmt(day.metric.weightAvg, 1)}`}
                  </span>
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {day.metric?.bodyFatPct == null ? "—" : fmt(day.metric.bodyFatPct, 1)}
                  <span className="block text-xs text-muted-foreground">
                    {day.metric?.bodyFatAvg == null ? "" : `avg ${fmt(day.metric.bodyFatAvg, 1)}`}
                  </span>
                </td>
                <td className="px-3 py-2 tabular-nums">{day.foods.length ? fmtInt(day.totals.calories) : "—"}</td>
                <td className="px-3 py-2 tabular-nums">{day.foods.length ? fmt(day.totals.protein, 0) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card p-3 ring-1 ring-foreground/10">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
