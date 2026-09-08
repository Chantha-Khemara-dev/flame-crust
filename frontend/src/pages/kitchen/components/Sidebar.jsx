import {
  LayoutDashboard,
  ChefHat,
  Users,
  LineChart,
  Flame,
  CheckCircle2,
  Clock3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PersonAvatar, STAGES, StatusDot } from "./kitchen-ui";

const menuItems = [
  { id: "dashboard", label: "Kitchen Board", icon: LayoutDashboard, badgeKey: "orders", hint: "B" },
  { id: "customers", label: "Guests", icon: Users, hint: "G" },
  { id: "performance", label: "Performance", icon: LineChart, hint: "P" },
  { id: "chef-profile", label: "Chef Profile", icon: ChefHat, hint: "C" },
];

const STATION_ROWS = [
  { stage: "pending", icon: Clock3 },
  { stage: "preparing", icon: Flame },
  { stage: "ready", icon: CheckCircle2 },
];

function SidebarContent({ activeView, onSelectView, user, activeOrdersCount = 0, stageCounts = {}, onStageSelect }) {
  return (
    <div className="relative flex h-full flex-col border-r border-border/70 bg-card/90 text-foreground backdrop-blur-2xl dark:bg-zinc-950/90">
      <div className="flex items-center gap-3 border-b border-border/70 p-5 pt-[max(1.25rem,calc(env(safe-area-inset-top,0px)+0.75rem))] sm:p-6">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-orange-500 to-amber-500 text-white shadow-warm ring-2 ring-primary/20">
          <Flame className="size-6 animate-flicker fill-white/20" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate font-serif text-xl font-bold leading-none tracking-tight text-foreground">
            Flame &amp; Crust
          </h1>
          <p className="mt-1.5 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-primary dark:text-accent">
            <span>Kitchen Portal</span>
            <StatusDot tone="emerald" />
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3.5 py-5 custom-scrollbar">
        <p className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
          Stations &amp; Views
        </p>
        <nav className="flex flex-col gap-1.5">
          {menuItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectView(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-left text-sm font-semibold transition-all duration-200",
                  isActive
                    ? "border border-primary/30 bg-gradient-to-r from-primary via-orange-600 to-amber-600 font-serif font-bold text-white shadow-warm"
                    : "border border-transparent text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                )}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <item.icon
                    className={cn(
                      "size-5 shrink-0 transition-transform duration-200 group-hover:scale-110",
                      isActive ? "text-white" : "text-muted-foreground group-hover:text-primary"
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {item.badgeKey === "orders" && activeOrdersCount > 0 && (
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[10px] font-extrabold tabular-nums shadow-xs",
                        isActive
                          ? "bg-white/25 text-white backdrop-blur-sm"
                          : "bg-gradient-to-r from-primary to-orange-500 text-white"
                      )}
                    >
                      {activeOrdersCount}
                    </span>
                  )}
                  <kbd
                    className={cn(
                      "hidden min-w-5 rounded-md border px-1 py-0.5 text-center font-mono text-[9px] font-bold xl:block",
                      isActive
                        ? "border-white/25 bg-white/15 text-white/85"
                        : "border-border/70 bg-secondary/60 text-muted-foreground"
                    )}
                  >
                    {item.hint}
                  </kbd>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="mt-6 rounded-3xl border border-border/70 bg-secondary/25 p-3.5">
          <div className="mb-2.5 flex items-center justify-between px-1">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
              Live queue
            </p>
            <StatusDot tone={activeOrdersCount > 0 ? "flame" : "emerald"} pulse={activeOrdersCount > 0} />
          </div>
          <ul className="space-y-1.5">
            {STATION_ROWS.map(({ stage, icon: Icon }) => {
              const config = STAGES[stage];
              const count = stageCounts[stage] || 0;
              return (
                <li key={stage}>
                  <button
                    type="button"
                    onClick={() => onStageSelect?.(stage)}
                    className="flex w-full items-center gap-2.5 rounded-2xl border border-transparent px-2.5 py-2 text-left transition-all hover:border-border/70 hover:bg-card active:scale-[0.98]"
                  >
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-xl border",
                        config.iconBox
                      )}
                    >
                      <Icon className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-bold text-foreground">
                        {config.label}
                      </span>
                      <span className="block truncate text-[10px] font-medium text-muted-foreground">
                        {config.station}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full border border-border/70 bg-card px-2 py-0.5 font-serif text-xs font-bold text-foreground tabular-nums shadow-2xs">
                      {count}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="shrink-0 border-t border-border/70 bg-secondary/30 p-4 pb-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))] dark:bg-zinc-900/30">
        <button
          type="button"
          onClick={() => onSelectView("chef-profile")}
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl border p-3 text-left shadow-xs transition-all",
            activeView === "chef-profile"
              ? "border-primary/40 bg-primary/10 ring-2 ring-primary/20"
              : "border-border/70 bg-card/90 hover:border-primary/40 hover:bg-secondary/60 hover:shadow-warm"
          )}
        >
          <span className="relative shrink-0">
            <PersonAvatar
              name={user?.name}
              src={user?.avatar || user?.profile_photo}
              className="size-10 rounded-full"
            />
            <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-card bg-emerald-500 ring-1 ring-emerald-500/40" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-serif text-sm font-bold text-foreground">
              {user?.name || "Staff"}
            </span>
            <span className="flex items-center gap-1.5 truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span className="truncate">{user?.role_title || user?.role || "Chef"}</span>
              <span className="flex shrink-0 items-center gap-1 font-extrabold text-emerald-600 dark:text-emerald-400">
                <StatusDot tone="emerald" /> Active
              </span>
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}

export function KitchenSidebar({
  activeView,
  setActiveView,
  user,
  activeOrdersCount = 0,
  stageCounts = {},
  onStageSelect,
}) {
  return (
    <aside className="hidden h-[calc(100vh-env(safe-area-inset-top,0px))] w-64 shrink-0 overflow-hidden border-r border-border/60 transition-colors lg:flex">
      <SidebarContent
        activeView={activeView}
        onSelectView={setActiveView}
        user={user}
        activeOrdersCount={activeOrdersCount}
        stageCounts={stageCounts}
        onStageSelect={onStageSelect}
      />
    </aside>
  );
}
