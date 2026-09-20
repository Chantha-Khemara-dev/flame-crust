import { useMemo, useState } from "react";
import {
  Clock3,
  Flame,
  CheckCircle2,
  ShoppingBag,
  DollarSign,
  Utensils,
  AlertTriangle,
  Inbox,
  ChefHat,
  Search,
  Leaf,
  User,
  Timer,
  Sparkles,
  Trash2,
  Calendar,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getImageUrl } from "@/lib/food-api";
import { cn } from "@/lib/utils";
import {
  STAGES,
  StatTile,
  TicketProgress,
  TicketTimer,
  URGENCY_STYLE,
  clockOf,
  elapsedFrom,
  formatDuration,
  formatMinutes,
  formatMoney,
  parseOptions,
  playChime,
  shortOrderNo,
  urgencyOf,
  useNow,
  setKitchenPref,
} from "./kitchen-ui";

const STAGE_ORDER = ["pending", "preparing", "ready"];

export function DashboardView({
  pendingOrders = [],
  preparingOrders = [],
  readyOrders = [],
  updateOrderStatus,
  onOrderClick,
  stats = {},
  revenue = 0,
  totalOrdersToday = 0,
  stageFilter = "all",
  onStageFilterChange,
  query = "",
  onClearQuery,
  onSearchMobile,
  targetPrepMinutes = 12,
  density = "comfortable",
  showImages = true,
  syncing = false,
  error = null,
  timeScope = "all",
  onTimeScopeChange,
  staleOrdersCount = 0,
  onClearStaleOrders,
}) {
  const now = useNow();
  const compact = density === "compact";

  const buckets = useMemo(
    () => ({
      pending: Array.isArray(pendingOrders) ? pendingOrders : [],
      preparing: Array.isArray(preparingOrders) ? preparingOrders : [],
      ready: Array.isArray(readyOrders) ? readyOrders : [],
    }),
    [pendingOrders, preparingOrders, readyOrders]
  );

  const totalActive = buckets.pending.length + buckets.preparing.length + buckets.ready.length;

  const avgPrep = useMemo(() => {
    let total = 0;
    let count = 0;
    buckets.ready.forEach((order) => {
      if (!order.created_at || !order.updated_at) return;
      const diff = new Date(order.updated_at) - new Date(order.created_at);
      if (diff > 0 && diff < 7200000) {
        total += diff;
        count += 1;
      }
    });
    return count > 0 ? formatMinutes(total / count) : "—";
  }, [buckets.ready]);

  const oldestWait = (list) => {
    if (!list.length) return null;
    return list.reduce((max, order) => {
      const ms = elapsedFrom(order.created_at, now);
      return ms !== null && (max === null || ms > max) ? ms : max;
    }, null);
  };

  const stageMeta = (stage) => {
    const list = buckets[stage];
    const oldest = oldestWait(list);
    const late = list.filter(
      (o) => stage !== "ready" && (elapsedFrom(o.created_at, now) || 0) > targetPrepMinutes * 60000
    ).length;
    return { list, oldest, late };
  };

  const [showMobileStats, setShowMobileStats] = useState(() => {
    try {
      const saved = localStorage.getItem("kitchen_mobile_stats_open");
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const toggleMobileStats = () => {
    playChime("tap");
    setShowMobileStats((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("kitchen_mobile_stats_open", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const filters = [
    { id: "all", label: "All Stages", shortLabel: "All", count: totalActive, icon: ChefHat },
    { id: "pending", label: "To Prepare", shortLabel: "Prepare", count: buckets.pending.length, icon: Clock3 },
    { id: "preparing", label: "Cooking", shortLabel: "Cooking", count: buckets.preparing.length, icon: Flame },
    { id: "ready", label: "Ready", shortLabel: "Ready", count: buckets.ready.length, icon: CheckCircle2 },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Mobile Stats Toggle (Hidden on sm+, visible on phone) */}
      <div className="mb-2 shrink-0 sm:hidden">
        <button
          type="button"
          onClick={toggleMobileStats}
          aria-expanded={showMobileStats}
          className="flex w-full items-center justify-between rounded-xl border border-border/70 bg-card/85 px-3 py-2 text-xs font-semibold shadow-xs backdrop-blur-xl transition-colors hover:bg-secondary/60 active:opacity-75"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500">
              <ShoppingBag className="size-3.5" />
            </span>
            <span className="truncate font-serif font-bold text-foreground">Summary & Stats</span>
            <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground">
              {totalOrdersToday} tickets
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <span>{showMobileStats ? "Hide" : "Show"}</span>
            {showMobileStats ? (
              <ChevronUp className="size-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-3.5 text-muted-foreground" />
            )}
          </div>
        </button>
      </div>

      {/* Stats Cards Row - 2 rows of 3 on tablets/laptops for ample room, 6 on extra-wide screens */}
      <div
        className={cn(
          "relative mb-3 shrink-0 sm:mb-4 sm:block",
          showMobileStats ? "block" : "hidden sm:block"
        )}
      >
        <div className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1 no-scrollbar sm:grid sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 sm:snap-none sm:overflow-visible sm:pb-0">
          <StatTile
            label="Today's Tickets"
            value={totalOrdersToday}
            icon={ShoppingBag}
            tone="amber"
            className="min-w-[130px] shrink-0 snap-start sm:min-w-0 sm:shrink"
            hint={`${stats.completedToday || 0} completed`}
          />
          <StatTile
            label="In the Oven"
            value={buckets.preparing.length}
            icon={Flame}
            tone="flame"
            className="min-w-[130px] shrink-0 snap-start sm:min-w-0 sm:shrink"
            hint={buckets.preparing.length ? "Fire in progress" : "Oven clear"}
          />
          <StatTile
            label="Ready for Pickup"
            value={buckets.ready.length}
            icon={CheckCircle2}
            tone="emerald"
            className="min-w-[130px] shrink-0 snap-start sm:min-w-0 sm:shrink"
            hint={buckets.ready.length ? "Expediter has work" : "Pass is clear"}
          />
          <StatTile
            label="Running Late"
            value={stats.delayed || 0}
            icon={AlertTriangle}
            tone={stats.delayed > 0 ? "destructive" : "muted"}
            className={cn(
              "min-w-[130px] shrink-0 snap-start sm:min-w-0 sm:shrink",
              stats.delayed > 0 && "border-destructive/40 ring-1 ring-destructive/20"
            )}
            hint={`Target ${targetPrepMinutes} min`}
          />
          <StatTile
            label="Avg Prep Time"
            value={avgPrep}
            icon={Utensils}
            tone="sky"
            className="min-w-[130px] shrink-0 snap-start sm:min-w-0 sm:shrink"
            hint="Ticket → ready"
          />
          <StatTile
            label="Today's Revenue"
            value={formatMoney(revenue)}
            icon={DollarSign}
            tone="amber"
            className="min-w-[130px] shrink-0 snap-start sm:min-w-0 sm:shrink"
            hint="Completed tickets"
          />
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background via-background/70 to-transparent sm:hidden" />
      </div>

      <div className="mb-3 flex shrink-0 flex-col gap-2 sm:mb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 sm:grid sm:flex-1 sm:min-w-[280px] sm:grid-cols-4 sm:gap-1 sm:rounded-full sm:border sm:border-border/70 sm:bg-card/85 sm:p-1.5 sm:shadow-warm sm:ring-1 sm:ring-black/[0.03] sm:backdrop-blur-xl dark:sm:bg-zinc-900/85 dark:sm:ring-white/[0.05]">
          {filters.map((filter) => {
            const isActive = stageFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => {
                  playChime("tap");
                  onStageFilterChange?.(filter.id);
                }}
                className={cn(
                  "flex shrink-0 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-center text-xs font-semibold whitespace-nowrap transition-colors duration-150 sm:shrink sm:px-2.5 sm:py-2",
                  isActive
                    ? "bg-gradient-to-r from-primary via-orange-600 to-amber-600 font-serif font-bold text-white shadow-warm"
                    : "border border-border/70 bg-card/90 text-muted-foreground hover:bg-secondary/70 hover:text-foreground sm:border-transparent sm:bg-transparent"
                )}
              >
                <filter.icon className={cn("size-3.5 shrink-0", isActive && "text-white/90")} />
                <span className="text-xs font-semibold">{filter.label}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 font-sans text-[10px] font-bold tabular-nums",
                    isActive
                      ? "bg-white/25 text-white backdrop-blur-sm"
                      : "border border-border/60 bg-secondary text-muted-foreground"
                  )}
                >
                  {filter.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-start">
          <div className="flex items-center rounded-full border border-border/70 bg-card/85 p-1 shadow-warm ring-1 ring-black/[0.03] backdrop-blur-xl dark:bg-zinc-900/85">
            <button
              type="button"
              onClick={() => {
                playChime("tap");
                onTimeScopeChange?.("all");
              }}
              className={cn(
                "flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150",
                timeScope === "all"
                  ? "bg-primary font-bold text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              All Active
            </button>
            <button
              type="button"
              onClick={() => {
                playChime("tap");
                onTimeScopeChange?.("today");
              }}
              className={cn(
                "flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150",
                timeScope === "today"
                  ? "bg-primary font-bold text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Calendar className="size-3.5" />
              <span>Today Only</span>
            </button>
          </div>

          {staleOrdersCount > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (
                  window.confirm(
                    `Clean up ${staleOrdersCount} old order(s) older than 24h? This will mark them completed.`
                  )
                ) {
                  onClearStaleOrders?.();
                }
              }}
              className="flex h-9 items-center gap-1.5 rounded-full border-destructive/30 bg-destructive/10 px-3 text-xs font-bold text-destructive hover:bg-destructive/20 active:opacity-75"
              title="Archive tickets older than 24 hours"
            >
              <Trash2 className="size-3.5" />
              <span className="hidden sm:inline">Clean Stale</span>
              <span className="rounded-full bg-destructive/20 px-1.5 py-0.2 text-[10px] tabular-nums">
                {staleOrdersCount}
              </span>
            </Button>
          )}

          <Button
            variant="outline"
            size="icon"
            onClick={onSearchMobile}
            className="size-9 shrink-0 rounded-full border-border/70 bg-card text-muted-foreground shadow-xs transition-colors hover:border-primary/40 hover:text-primary active:opacity-75 md:hidden"
            title="Search tickets"
          >
            <Search className="size-4" />
          </Button>
        </div>
      </div>

      {error && !syncing && (
        <div className="mb-3 flex shrink-0 items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/8 px-3.5 py-2 text-xs font-semibold text-destructive">
          <AlertTriangle className="size-4 shrink-0" />
          <span className="truncate">Live sync paused — {error}. Showing last known board.</span>
        </div>
      )}

      {query && totalActive === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="max-w-sm rounded-3xl border border-dashed border-border/70 bg-card/60 p-8 text-center backdrop-blur-xl">
            <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-border/70 bg-secondary text-muted-foreground">
              <Search className="size-6" />
            </span>
            <h3 className="font-serif text-lg font-bold text-foreground">No tickets match “{query}”</h3>
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              Try an order number, guest name or dish name.
            </p>
            {onClearQuery && (
              <Button
                variant="outline"
                onClick={onClearQuery}
                className="mt-5 rounded-full border-border/70 bg-card font-serif text-xs font-bold shadow-xs hover:bg-secondary"
              >
                Clear search
              </Button>
            )}
          </div>
        </div>
      ) : stageFilter === "all" ? (
        <>
          <div className="flex flex-1 flex-col gap-5 overflow-y-auto overscroll-contain touch-pan-y pb-36 custom-scrollbar md:hidden">
            {STAGE_ORDER.map((stage) => {
              const { list, oldest, late } = stageMeta(stage);
              const config = STAGES[stage];
              return (
                <section key={stage} className="shrink-0">
                  <FeedStageHeader stage={stage} count={list.length} oldest={oldest} late={late} />
                  <div className="mt-2.5 flex flex-col gap-3">
                    {list.length === 0 ? (
                      <div className="flex items-center gap-2 rounded-xl border border-dashed border-border/60 bg-secondary/20 px-3 py-2">
                        <config.icon className="size-3.5 shrink-0 text-muted-foreground/70" />
                        <span className="truncate text-[11px] font-semibold text-muted-foreground">
                          {stage === "pending"
                            ? "Rail clear — no incoming tickets"
                            : stage === "preparing"
                              ? "Oven hot & idle"
                              : "Pass empty — nothing waiting"}
                        </span>
                      </div>
                    ) : (
                      list.map((order) => (
                        <TicketCard
                          key={order.id}
                          order={order}
                          stage={stage}
                          compact={compact}
                          showImages={showImages}
                          targetPrepMinutes={targetPrepMinutes}
                          onOpen={() => onOrderClick?.(order)}
                          onAdvance={() => updateOrderStatus?.(order.id, config.nextStatus)}
                        />
                      ))
                    )}
                  </div>
                </section>
              );
            })}
          </div>

          <div className="hidden min-h-0 flex-1 gap-4 overflow-x-auto overflow-y-hidden pb-1 custom-scrollbar md:grid md:grid-cols-[repeat(3,minmax(285px,1fr))] xl:gap-5">
            {STAGE_ORDER.map((stage) => {
              const { list, oldest, late } = stageMeta(stage);
              return (
                <StationColumn
                  key={stage}
                  stage={stage}
                  list={list}
                  oldest={oldest}
                  late={late}
                  targetPrepMinutes={targetPrepMinutes}
                  compact={compact}
                  showImages={showImages}
                  updateOrderStatus={updateOrderStatus}
                  onOrderClick={onOrderClick}
                  stacked
                />
              );
            })}
          </div>
        </>
      ) : (
        (() => {
          const { list, oldest, late } = stageMeta(stageFilter);
          return (
            <StationColumn
              stage={stageFilter}
              list={list}
              oldest={oldest}
              late={late}
              targetPrepMinutes={targetPrepMinutes}
              compact={compact}
              showImages={showImages}
              updateOrderStatus={updateOrderStatus}
              onOrderClick={onOrderClick}
              expanded
            />
          );
        })()
      )}
    </div>
  );
}

function StationColumn({
  stage,
  list,
  oldest,
  late,
  targetPrepMinutes,
  compact,
  showImages,
  updateOrderStatus,
  onOrderClick,
  stacked = false,
  expanded = false,
}) {
  const config = STAGES[stage];
  const Icon = config.icon;

  return (
    <section
      className={cn(
        "flex min-h-0 min-w-[280px] sm:min-w-[285px] flex-col overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-b shadow-warm ring-1 ring-black/[0.03] transition-colors dark:ring-white/[0.04]",
        config.columnTint,
        stacked ? "h-full min-h-0" : "h-full min-h-[320px]"
      )}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-card/70 px-3.5 py-3 backdrop-blur-xl sm:px-4 dark:bg-card/40">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-xl border sm:size-9",
              config.iconBox
            )}
          >
            <Icon className={cn("size-4", stage === "preparing" && "animate-flicker")} />
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-serif text-sm font-bold leading-tight tracking-tight text-foreground sm:text-base">
              {config.label}
            </h2>
            <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {config.station}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {late > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/12 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-destructive">
              <AlertTriangle className="size-2.5" /> {late} late
            </span>
          )}
          {oldest !== null && (
            <span className="hidden items-center gap-1 rounded-full border border-border/60 bg-secondary/70 px-2 py-0.5 font-mono text-[10px] font-bold tabular-nums text-muted-foreground 2xl:inline-flex">
              <Timer className="size-2.5" /> {formatDuration(oldest)}
            </span>
          )}
          <span className="rounded-full border border-border/70 bg-secondary/90 px-2.5 py-0.5 font-serif text-xs font-bold tabular-nums text-foreground shadow-2xs sm:text-sm">
            {list.length}
          </span>
        </div>
      </header>

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain touch-pan-y p-3 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-4 custom-scrollbar sm:gap-3.5 sm:p-4",
          stacked ? "max-h-[460px] md:max-h-none" : "",
          expanded && "md:grid md:grid-cols-2 md:content-start md:auto-rows-auto md:items-stretch md:gap-4 xl:grid-cols-3"
        )}
      >
        {list.length === 0 ? (
          <ColumnEmpty stage={stage} expanded={expanded} />
        ) : (
          list.map((order) => (
            <TicketCard
              key={order.id}
              order={order}
              stage={stage}
              compact={compact}
              showImages={showImages}
              targetPrepMinutes={targetPrepMinutes}
              onOpen={() => onOrderClick?.(order)}
              onAdvance={() => updateOrderStatus?.(order.id, config.nextStatus)}
            />
          ))
        )}
      </div>
    </section>
  );
}

function FeedStageHeader({ stage, count, oldest, late }) {
  const config = STAGES[stage];
  const Icon = config.icon;

  return (
    <div className="sticky top-0 z-10 -mx-0.5 flex items-center justify-between gap-2 rounded-2xl border border-border/60 bg-card/95 px-3 py-2 shadow-xs backdrop-blur-xl dark:bg-zinc-900/95">
      <div className="flex min-w-0 items-center gap-2">
        <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-xl border", config.iconBox)}>
          <Icon className="size-3.5" />
        </span>
        <span className="truncate font-serif text-sm font-bold text-foreground">{config.label}</span>
        {late > 0 && (
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-destructive/30 bg-destructive/12 px-1.5 py-px text-[9px] font-extrabold uppercase text-destructive">
            {late} late
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {oldest !== null && (
          <span className="flex items-center gap-1 rounded-full border border-border/60 bg-secondary/70 px-2 py-0.5 font-mono text-[10px] font-bold text-muted-foreground tabular-nums">
            <Timer className="size-3" /> {formatDuration(oldest)}
          </span>
        )}
        <span className="rounded-full border border-border/70 bg-secondary/90 px-2 py-0.5 font-serif text-xs font-bold text-foreground tabular-nums">
          {count}
        </span>
      </div>
    </div>
  );
}

function ColumnEmpty({ stage, expanded }) {
  const config = STAGES[stage];
  const Icon = config.icon;
  const copy = {
    pending: {
      title: "Rail is clear",
      text: "Every incoming ticket has been fired. New orders land here automatically.",
    },
    preparing: {
      title: "Oven is hot & idle",
      text: "Stone oven holding at 800°F. Nothing cooking right now.",
    },
    ready: {
      title: "Pass is empty",
      text: "All finished tickets were handed to drivers or guests.",
    },
  }[stage];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-card/50 p-6 text-center shadow-xs backdrop-blur-sm transition-all",
        expanded ? "min-h-[180px] md:col-span-2 xl:col-span-3" : "my-auto py-8"
      )}
    >
      <span className="mb-3 flex size-11 items-center justify-center rounded-2xl border border-border/70 bg-secondary/80 text-primary shadow-2xs">
        <Icon className="size-5" />
      </span>
      <p className="font-serif text-sm font-bold text-foreground sm:text-base">{copy.title}</p>
      <p className="mt-1 max-w-xs text-xs font-medium text-muted-foreground">{copy.text}</p>
      <span className="mt-3.5 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
        <Inbox className="size-3" /> Station clear
      </span>
    </div>
  );
}

function TicketCard({ order, stage, compact, showImages, targetPrepMinutes, onOpen, onAdvance }) {
  const now = useNow();
  const config = STAGES[stage];
  const items = Array.isArray(order.items) ? order.items : [];
  const itemCount = items.reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0);
  const waited = elapsedFrom(stage === "preparing" ? order.updated_at || order.created_at : order.created_at, now) || 0;
  const urgency = urgencyOf(stage, waited, targetPrepMinutes);
  const tone = URGENCY_STYLE[urgency.tone];
  const totalWait = elapsedFrom(order.created_at, now) || 0;
  const options = useMemo(() => {
    const seen = new Set();
    return items.flatMap((item) =>
      parseOptions(item.options).filter((opt) => {
        const key = `${item.id}:${opt}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
    );
  }, [items]);

  return (
    <article
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen?.();
        }
      }}
      className={cn(
        "group relative flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-3xl border bg-card shadow-warm transition-all duration-150 sm:hover:-translate-y-0.5 sm:hover:shadow-warm-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none dark:bg-zinc-900/90 touch-pan-y",
        tone.border,
        compact ? "min-h-[180px] p-3.5" : "min-h-[270px] p-4 sm:p-5",
        urgency.level >= 3 && "ring-1 ring-destructive/25"
      )}
    >
      <div className={cn("absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r", config.stripe)} />
      {urgency.level >= 2 && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-full bg-gradient-to-b from-destructive/[0.06] to-transparent" />
      )}

      <header className="mb-3 flex shrink-0 items-start justify-between gap-2 border-b border-border/60 pb-3 pt-1">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
              Ticket
            </span>
            {order.order_type && (
              <span className="rounded-full border border-border/70 bg-secondary px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-foreground/80">
                {order.order_type.replace(/_/g, " ")}
              </span>
            )}
            {urgency.level >= 2 && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide",
                  tone.chip,
                  urgency.level >= 3 && "animate-pulse"
                )}
              >
                <AlertTriangle className="size-2.5" />
                {urgency.level >= 3 ? "Critical" : "Late"}
              </span>
            )}
          </div>
          <h3
            className={cn(
              "truncate font-serif font-bold leading-tight tracking-tight text-foreground",
              compact ? "text-base" : "text-lg sm:text-xl"
            )}
          >
            #{shortOrderNo(order)}
          </h3>
          <p className="mt-1 flex items-center gap-1.5 truncate text-[11px] font-semibold text-muted-foreground">
            <User className="size-3 shrink-0" />
            <span className="truncate">{order.customer_name || "Guest"}</span>
            <span className="text-border">•</span>
            <Clock3 className="size-3 shrink-0" />
            <span className="tabular-nums">{clockOf(order.created_at)}</span>
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <TicketTimer
            startTime={stage === "preparing" ? order.updated_at || order.created_at : order.created_at}
            stage={stage}
            targetPrepMinutes={targetPrepMinutes}
          />
          <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">
            {formatMinutes(totalWait)} total
          </span>
        </div>
      </header>

      {stage !== "ready" && (
        <div className="mb-3 shrink-0">
          <TicketProgress
            startTime={stage === "preparing" ? order.updated_at || order.created_at : order.created_at}
            stage={stage}
            targetPrepMinutes={targetPrepMinutes}
          />
        </div>
      )}

      {order.notes && (
        <div className="mb-3 shrink-0 flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className={cn("line-clamp-2", compact && "line-clamp-1")}>{order.notes}</span>
        </div>
      )}

      <ul className={cn("mb-3 flex-auto max-h-[260px] overflow-y-auto overscroll-contain touch-pan-y custom-scrollbar space-y-2 pr-1", compact && "space-y-1.5")}>
        {items.length === 0 && (
          <li className="rounded-2xl border border-dashed border-border/60 px-3 py-2.5 text-center text-[11px] font-semibold text-muted-foreground">
            No items on this ticket
          </li>
        )}
        {items.map((item, index) => (
          <li key={item.id ?? index} className="flex items-start gap-2.5">
            {showImages && item.product_image && (
              <img
                src={getImageUrl(item.product_image)}
                alt=""
                loading="lazy"
                className={cn(
                  "shrink-0 rounded-xl border border-border/60 object-cover shadow-2xs",
                  compact ? "size-7 sm:size-8" : "size-8 sm:size-9"
                )}
              />
            )}
            <span
              className={cn(
                "flex shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 font-serif font-bold text-primary shadow-2xs",
                compact ? "size-5.5 text-[10px]" : "size-6 text-xs"
              )}
            >
              {item.quantity}×
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "block font-semibold text-foreground line-clamp-2 leading-snug",
                  compact ? "text-[11px]" : "text-xs sm:text-[12.5px]"
                )}
              >
                {item.product_name || "Item"}
              </span>
              <span className="mt-0.5 flex flex-wrap items-center gap-1">
                {item.product_spicy && (
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-primary/25 bg-primary/10 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-primary">
                    <Flame className="size-2.5" /> Spicy
                  </span>
                )}
                {item.product_vegetarian && (
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                    <Leaf className="size-2.5" /> Veg
                  </span>
                )}
                {parseOptions(item.options).map((opt, i) => (
                  <span
                    key={i}
                    className="rounded-md border border-border/60 bg-secondary/60 px-1.5 py-px text-[9.5px] font-semibold text-muted-foreground"
                  >
                    {opt}
                  </span>
                ))}
                {item.item_notes && (
                  <span className="truncate text-[9.5px] font-semibold text-amber-700 italic dark:text-amber-400">
                    “{item.item_notes}”
                  </span>
                )}
              </span>
            </span>
          </li>
        ))}
      </ul>

      {options.length > 0 && !compact && (
        <p className="mb-2.5 shrink-0 truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {options.length} modification{options.length > 1 ? "s" : ""} on this ticket
        </p>
      )}

      <footer className="mt-auto flex shrink-0 items-center gap-2 pt-2">
        <span className="hidden shrink-0 items-center gap-1 rounded-full border border-border/60 bg-secondary/60 px-2 py-1 text-[10px] font-bold text-muted-foreground sm:inline-flex">
          <ShoppingBag className="size-3" /> {itemCount}
        </span>
        {config.nextStatus ? (
          <Button
            onClick={(event) => {
              event.stopPropagation();
              onAdvance?.();
            }}
            className={cn(
              "group/btn flex-1 shrink-0 rounded-full bg-gradient-to-r px-3 text-white font-serif font-bold shadow-warm transition-all hover:brightness-105 active:scale-[0.98]",
              config.action,
              compact ? "h-9 text-xs" : "h-10 text-xs sm:h-11 sm:text-sm"
            )}
          >
            <config.icon className="mr-1.5 size-3.5 shrink-0 transition-transform group-hover/btn:scale-125" />
            <span className="truncate">
              {config.actionLabel || (stage === "pending" ? "Start Cooking" : stage === "preparing" ? "Mark Ready" : "Complete Order")}
            </span>
          </Button>
        ) : (
          <div
            className={cn(
              "flex flex-1 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 font-serif font-bold text-emerald-700 shadow-2xs dark:bg-emerald-500/18 dark:text-emerald-300",
              compact ? "h-10 text-[11px]" : "h-11 text-xs sm:h-12 sm:text-sm"
            )}
          >
            <CheckCircle2 className="mr-2 size-4" /> Awaiting Pickup
          </div>
        )}
      </footer>
    </article>
  );
}
