import { DateNav, dateLabel } from "@/components/date-nav";
import { FoodLogger } from "@/components/food-logger";
import { addDays, isISODate, todayISO } from "@/lib/dates";
import { getFoodLog, getProfile, recentMeals, totalsFor } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function FoodPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const date = params.date && isISODate(params.date) ? params.date : todayISO();
  const [profile, items, recent, yesterday] = await Promise.all([
    getProfile(),
    getFoodLog(date),
    recentMeals(),
    getFoodLog(addDays(date, -1)),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Food</h1>
        <p className="text-sm text-muted-foreground">Type it the way you’d say it.</p>
      </div>
      <DateNav
        label={dateLabel(date)}
        prevHref={`/food?date=${addDays(date, -1)}`}
        nextHref={`/food?date=${addDays(date, 1)}`}
      />
      <FoodLogger
        key={date}
        date={date}
        profile={profile}
        items={items}
        totals={totalsFor(items)}
        recent={recent}
        yesterday={yesterday}
      />
    </div>
  );
}
