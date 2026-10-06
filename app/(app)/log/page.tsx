import { DateNav, dateLabel } from "@/components/date-nav";
import { LogForm } from "@/components/log-form";
import { addDays, isISODate, todayISO } from "@/lib/dates";
import { getMetric, getProfile } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const date = params.date && isISODate(params.date) ? params.date : todayISO();
  const [profile, metric] = await Promise.all([getProfile(), getMetric(date)]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Weigh-in</h1>
        <p className="text-sm text-muted-foreground">Any measurement can wait until you have it.</p>
      </div>
      <DateNav
        label={dateLabel(date)}
        prevHref={`/log?date=${addDays(date, -1)}`}
        nextHref={`/log?date=${addDays(date, 1)}`}
      />
      <LogForm key={date} date={date} profile={profile} metric={metric} />
    </div>
  );
}
