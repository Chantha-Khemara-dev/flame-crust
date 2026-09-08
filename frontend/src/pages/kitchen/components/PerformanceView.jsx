import { useMemo } from "react";
import {
  LineChart,
  CheckCircle2,
  Clock3,
  TrendingUp,
  AlertTriangle,
  Star,
  Timer,
  Flame,
  Zap,
} from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import {
  SectionHeading,
  StatTile,
  elapsedFrom,
  formatMinutes,
  formatMoney,
} from "./kitchen-ui";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const hourlyConfig = {
  tickets: { label: "Tickets", color: "var(--chart-1)" },
};

const weeklyConfig = {
  tickets: { label: "Tickets", color: "var(--chart-2)" },
};

const prepConfig = {
  tickets: { label: "Tickets", color: "var(--chart-3)" },
};

export function PerformanceView({ orders = [], reviews = [], targetPrepMinutes = 12 }) {
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeReviews = Array.isArray(reviews) ? reviews : [];

  const metrics = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const todays = safeOrders.filter((o) => o.created_at && new Date(o.created_at) >= todayStart);
    const completed = todays.filter((o) =>
      ["READY", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED"].includes(o.status)
    );
    const cancelled = todays.filter((o) => o.status === "CANCELLED");

    const prepSamples = [];
    safeOrders.forEach((order) => {
      if (!order.created_at || !order.updated_at) return;
      if (!["READY", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED"].includes(order.status)) return;
      const diff = new Date(order.updated_at) - new Date(order.created_at);
      if (diff > 0 && diff < 4 * 3600 * 1000) prepSamples.push(diff);
    });

    const avgPrepMs = prepSamples.length
      ? prepSamples.reduce((sum, ms) => sum + ms, 0) / prepSamples.length
      : null;
    const fastest = prepSamples.length ? Math.min(...prepSamples) : null;
    const slowest = prepSamples.length ? Math.max(...prepSamples) : null;
    const onTime = prepSamples.filter((ms) => ms <= targetPrepMinutes * 60000).length;

    const openTickets = todays.filter((o) =>
      ["PENDING", "CONFIRMED", "PREPARING"].includes(o.status)
    );
    const runningLate = openTickets.filter(
      (o) => (elapsedFrom(o.created_at) || 0) > targetPrepMinutes * 60000
    );

    const revenue = completed.reduce((sum, o) => sum + (parseFloat(o.total || o.total_amount) || 0), 0);
    const hoursElapsed = Math.max(1, Math.floor((Date.now() - todayStart.getTime()) / 3600000));

    const hourly = [];
    for (let hour = 0; hour <= Math.min(23, new Date().getHours()); hour += 1) {
      const count = todays.filter((o) => new Date(o.created_at).getHours() === hour).length;
      hourly.push({
        hour: `${((hour + 11) % 12) + 1}${hour < 12 ? "a" : "p"}`,
        tickets: count,
      });
    }

    const weekly = Array.from({ length: 7 }).map((_, index) => {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + index);
      const next = new Date(day);
      next.setDate(day.getDate() + 1);
      const dayOrders = safeOrders.filter((o) => {
        if (!o.created_at) return false;
        const created = new Date(o.created_at);
        return created >= day && created < next;
      });
      return {
        day: DAY_LABELS[day.getDay()],
        tickets: dayOrders.length,
        revenue: dayOrders.reduce(
          (sum, o) => sum + (parseFloat(o.total || o.total_amount) || 0),
          0
        ),
        isToday: index === 6,
      };
    });

    const buckets = [
      { label: "<5m", min: 0, max: 5 * 60000 },
      { label: "5-10m", min: 5 * 60000, max: 10 * 60000 },
      { label: "10-15m", min: 10 * 60000, max: 15 * 60000 },
      { label: "15-25m", min: 15 * 60000, max: 25 * 60000 },
      { label: "25m+", min: 25 * 60000, max: Infinity },
    ].map((bucket) => ({
      label: bucket.label,
      tickets: prepSamples.filter((ms) => ms >= bucket.min && ms < bucket.max).length,
    }));

    return {
      todaysCount: todays.length,
      completedCount: completed.length,
      cancelledCount: cancelled.length,
      avgPrepMs,
      fastestMs: fastest,
      slowestMs: slowest,
      onTimeRate: prepSamples.length ? Math.round((onTime / prepSamples.length) * 100) : null,
      runningLate: runningLate.length,
      revenue,
      throughput: Math.round((todays.length / hoursElapsed) * 10) / 10,
      hourly,
      weekly,
      buckets,
      sampleSize: prepSamples.length,
    };
  }, [safeOrders, targetPrepMinutes]);

  const rating = useMemo(() => {
    const scored = safeReviews.filter((r) => Number(r.rating) > 0);
    if (!scored.length) {
      return { average: null, count: 0, distribution: [], positiveRate: null, recent: [] };
    }
    const sum = scored.reduce((total, r) => total + Number(r.rating), 0);
    const average = sum / scored.length;
    const distribution = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: scored.filter((r) => Number(r.rating) === star).length,
    }));
    const positive = scored.filter((r) => Number(r.rating) >= 4).length;

    return {
      average,
      count: scored.length,
      distribution,
      positiveRate: Math.round((positive / scored.length) * 100),
      recent: [...scored]
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        .slice(0, 4),
    };
  }, [safeReviews]);

  const ringPct = rating.average ? Math.min(1, rating.average / 5) : 0;
  const circumference = 2 * Math.PI * 52;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <SectionHeading
        icon={LineChart}
        title="Kitchen Performance"
        description="Throughput, prep speed and guest satisfaction from live data"
        className="shrink-0"
      >
        <Badge
          variant="outline"
          className="rounded-full border-border/70 bg-card px-3 py-1.5 text-[11px] font-bold text-muted-foreground shadow-xs"
        >
          Target prep {targetPrepMinutes} min
        </Badge>
      </SectionHeading>

      <div className="flex-1 space-y-4 overflow-y-auto pb-6 custom-scrollbar sm:space-y-5">
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <StatTile
            label="Completed Today"
            value={metrics.completedCount}
            icon={CheckCircle2}
            tone="emerald"
            hint={`${metrics.todaysCount} tickets received`}
          />
          <StatTile
            label="Avg Prep Time"
            value={metrics.avgPrepMs !== null ? formatMinutes(metrics.avgPrepMs) : "—"}
            icon={Clock3}
            tone="sky"
            hint={
              metrics.sampleSize
                ? `Fastest ${formatMinutes(metrics.fastestMs)} • Slowest ${formatMinutes(metrics.slowestMs)}`
                : "No completed tickets yet"
            }
          />
          <StatTile
            label="Tickets / Hour"
            value={metrics.throughput}
            icon={TrendingUp}
            tone="amber"
            hint={`${formatMoney(metrics.revenue)} revenue today`}
          />
          <StatTile
            label="Running Late"
            value={metrics.runningLate}
            icon={AlertTriangle}
            tone={metrics.runningLate > 0 ? "destructive" : "muted"}
            hint={
              metrics.onTimeRate !== null
                ? `${metrics.onTimeRate}% fired on time`
                : "Waiting for data"
            }
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="rounded-3xl border border-border/70 bg-card p-4 shadow-warm sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-serif text-base font-bold text-foreground sm:text-lg">
                  Today's ticket flow
                </h3>
                <p className="text-xs font-medium text-muted-foreground">
                  Tickets received per hour since opening
                </p>
              </div>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                <Zap className="size-4" />
              </span>
            </div>
            {metrics.hourly.some((point) => point.tickets > 0) ? (
              <ChartContainer config={hourlyConfig} className="aspect-auto h-56 w-full">
                <AreaChart data={metrics.hourly} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                  <defs>
                    <linearGradient id="fillTickets" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-tickets)" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="var(--color-tickets)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis
                    dataKey="hour"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={18}
                    className="text-[10px]"
                  />
                  <YAxis tickLine={false} axisLine={false} width={40} allowDecimals={false} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                  <Area
                    dataKey="tickets"
                    type="monotone"
                    fill="url(#fillTickets)"
                    stroke="var(--color-tickets)"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <EmptyState
                icon={Clock3}
                title="No tickets today yet"
                description="Hourly throughput appears as soon as orders start landing."
                className="py-8"
              />
            )}
          </section>

          <section className="rounded-3xl border border-border/70 bg-card p-4 shadow-warm sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-serif text-base font-bold text-foreground sm:text-lg">
                  Last 7 days
                </h3>
                <p className="text-xs font-medium text-muted-foreground">
                  Daily ticket volume across the week
                </p>
              </div>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <TrendingUp className="size-4" />
              </span>
            </div>
            <ChartContainer config={weeklyConfig} className="aspect-auto h-56 w-full">
              <BarChart data={metrics.weekly} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} width={40} allowDecimals={false} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                <Bar dataKey="tickets" radius={[8, 8, 4, 4]} maxBarSize={42}>
                  {metrics.weekly.map((entry) => (
                    <Cell
                      key={entry.day}
                      fill="var(--color-tickets)"
                      fillOpacity={entry.isToday ? 1 : 0.45}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
            <div className="mt-3 flex items-center justify-between rounded-2xl border border-border/60 bg-secondary/35 px-3.5 py-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Week revenue
              </span>
              <span className="font-serif text-base font-bold text-emerald-600 tabular-nums dark:text-emerald-400">
                {formatMoney(metrics.weekly.reduce((sum, day) => sum + day.revenue, 0))}
              </span>
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <section className="rounded-3xl border border-border/70 bg-card p-4 shadow-warm sm:p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Timer className="size-4" />
              </span>
              <div className="min-w-0">
                <h3 className="truncate font-serif text-base font-bold text-foreground sm:text-lg">
                  Prep time spread
                </h3>
                <p className="truncate text-xs font-medium text-muted-foreground">
                  {metrics.sampleSize} completed ticket{metrics.sampleSize === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            {metrics.sampleSize ? (
              <ChartContainer config={prepConfig} className="aspect-auto h-52 w-full">
                <BarChart data={metrics.buckets} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} width={44} allowDecimals={false} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                  <Bar dataKey="tickets" radius={[8, 8, 4, 4]} maxBarSize={40} fill="var(--color-tickets)" />
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyState
                icon={Timer}
                title="No prep data yet"
                description="Complete a ticket to start measuring station speed."
                className="py-6"
              />
            )}
          </section>

          <section className="rounded-3xl border border-border/70 bg-card p-4 shadow-warm sm:p-5 lg:col-span-2">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Star className="size-4" />
              </span>
              <div className="min-w-0">
                <h3 className="truncate font-serif text-base font-bold text-foreground sm:text-lg">
                  Guest satisfaction
                </h3>
                <p className="truncate text-xs font-medium text-muted-foreground">
                  {rating.count ? `${rating.count} verified review${rating.count === 1 ? "" : "s"}` : "No reviews recorded yet"}
                </p>
              </div>
            </div>

            {rating.count === 0 ? (
              <EmptyState
                icon={Star}
                title="No reviews yet"
                description="Ratings appear here once guests review their dishes."
                className="py-6"
              />
            ) : (
              <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
                <div className="flex items-center gap-4 sm:flex-col sm:gap-3">
                  <div className="relative flex size-28 shrink-0 items-center justify-center sm:size-32">
                    <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="52" fill="none" strokeWidth="10" className="stroke-secondary" />
                      <circle
                        cx="60"
                        cy="60"
                        r="52"
                        fill="none"
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference * (1 - ringPct)}
                        className="stroke-primary transition-[stroke-dashoffset] duration-700"
                      />
                    </svg>
                    <div className="text-center">
                      <span className="block font-serif text-3xl font-bold text-foreground tabular-nums">
                        {rating.average.toFixed(1)}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        out of 5
                      </span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="font-serif text-2xl font-bold text-foreground tabular-nums">
                      {rating.positiveRate}%
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      4★ and above
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <ul className="space-y-1.5">
                    {rating.distribution.map((row) => {
                      const pct = rating.count ? Math.round((row.count / rating.count) * 100) : 0;
                      return (
                        <li key={row.star} className="flex items-center gap-2.5">
                          <span className="flex w-9 shrink-0 items-center gap-0.5 text-[11px] font-bold text-muted-foreground tabular-nums">
                            {row.star}
                            <Star className="size-3 fill-amber-500 text-amber-500" />
                          </span>
                          <span className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                            <span
                              className={cn(
                                "block h-full rounded-full transition-all duration-700",
                                row.star >= 4
                                  ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                                  : row.star === 3
                                    ? "bg-gradient-to-r from-amber-500 to-orange-400"
                                    : "bg-gradient-to-r from-destructive to-orange-600"
                              )}
                              style={{ width: `${Math.max(pct, row.count ? 4 : 0)}%` }}
                            />
                          </span>
                          <span className="w-8 shrink-0 text-right text-[11px] font-bold text-muted-foreground tabular-nums">
                            {row.count}
                          </span>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="space-y-2 border-t border-border/60 pt-3">
                    {rating.recent.map((review) => (
                      <div
                        key={review.id}
                        className="rounded-2xl border border-border/60 bg-secondary/30 p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  "size-3",
                                  i < Number(review.rating)
                                    ? "fill-amber-500 text-amber-500"
                                    : "text-border"
                                )}
                              />
                            ))}
                          </span>
                          <span className="text-[10px] font-semibold text-muted-foreground">
                            {review.created_at ? new Date(review.created_at).toLocaleDateString([], { month: "short", day: "numeric" }) : ""}
                          </span>
                        </div>
                        {review.comment && (
                          <p className="mt-1.5 line-clamp-2 text-xs font-medium text-foreground">
                            “{review.comment}”
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        <section className="rounded-3xl border border-border/70 bg-gradient-to-br from-primary/[0.06] via-card to-amber-500/[0.05] p-4 shadow-warm sm:p-5">
          <div className="mb-3.5 flex items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-orange-500 to-amber-500 text-white shadow-warm">
              <Flame className="size-4 animate-flicker" />
            </span>
            <div>
              <h3 className="font-serif text-base font-bold text-foreground sm:text-lg">Station health</h3>
              <p className="text-xs font-medium text-muted-foreground">
                Today's ticket outcome at a glance
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {[
              { label: "Received", value: metrics.todaysCount, tone: "text-foreground" },
              { label: "Completed", value: metrics.completedCount, tone: "text-emerald-600 dark:text-emerald-400" },
              { label: "Cancelled", value: metrics.cancelledCount, tone: "text-destructive" },
              {
                label: "On-time rate",
                value: metrics.onTimeRate !== null ? `${metrics.onTimeRate}%` : "—",
                tone: "text-primary",
              },
            ].map((cell) => (
              <div
                key={cell.label}
                className="rounded-2xl border border-border/60 bg-card/80 p-3.5 backdrop-blur-sm"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {cell.label}
                </p>
                <p className={cn("mt-1 font-serif text-xl font-bold tabular-nums", cell.tone)}>
                  {cell.value}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
