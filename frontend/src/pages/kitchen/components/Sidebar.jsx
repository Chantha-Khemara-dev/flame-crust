import {
  LayoutDashboard,
  ChefHat,
  Users,
  LineChart,
  Flame,
  CheckCircle2,
  Clock3,
  LogOut,
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

function SidebarContent({ activeView, onSelectView, user, activeOrdersCount = 0, stageCounts = {}, onStageSelect, onSignOut }) {
  return (
    <div className="relative flex h-full flex-col border-r border-border/70 bg-card/90 text-foreground backdrop-blur-2xl dark:bg-zinc-950/90">
      <div className="flex items-center gap-3 border-b border-border/70 p-5 pt-[max(1.25rem,calc(env(safe-area-inset-top,0px)+0.75rem))] sm:p-6">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-orange-500 to-amber-500 text-white shadow-warm ring-2 ring-primary/20">
          <Flame className="size-6 animate-flicker fill-white/20" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-serif text-lg font-bold tracking-tight text-foreground">Flame &amp; Crust</span>
          </div>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <span className="truncate">KITCHEN PORTAL</span>
            <span className="size-1 rounded-full bg-emerald-500" />
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-4 custom-scrollbar">
        <div>
          <div className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/80">
            Stations &amp; Views
          </div>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = activeView === item.id;
              const badge = item.badgeKey === "orders" ? activeOrdersCount : 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectView(item.id)}
                  className={cn(
                    "group flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-xs font-bold transition-all",
                    active
                      ? "bg-primary text-primary-foreground shadow-warm"
                      : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground active:scale-98"
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Icon
                      className={cn(
                        "size-4 shrink-0 transition-transform group-hover:scale-110",
                        active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />
                    <span className="truncate font-serif text-sm">{item.label}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    {badge > 0 && (
                      <span
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black",
                          active
                            ? "bg-primary-foreground text-primary"
                            : "bg-primary/15 text-primary dark:bg-primary/25"
                        )}
                      >
                        {badge}
                      </span>
                    )}
                    {item.hint && (
                      <kbd
                        className={cn(
                          "hidden size-5 shrink-0 items-center justify-center rounded-md border text-[10px] font-mono sm:flex",
                          active
                            ? "border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground"
                            : "border-border/80 bg-secondary/50 text-muted-foreground"
                        )}
                      >
                        {item.hint}
                      </kbd>
                    )}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between px-3 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/80">
            <span>Live Queue</span>
            <span className="size-1.5 animate-pulse rounded-full bg-primary" />
          </div>
          <div className="space-y-1.5">
            {STATION_ROWS.map(({ stage, icon: Icon }) => {
              const meta = STAGES[stage] || {};
              const count = stageCounts[stage] || 0;
              return (
                <button
                  key={stage}
                  type="button"
                  onClick={() => onStageSelect?.(stage)}
                  className="group flex w-full items-center justify-between rounded-2xl border border-border/60 bg-secondary/30 px-3 py-2 text-left text-xs font-semibold text-foreground transition-all hover:border-primary/40 hover:bg-secondary/70 hover:shadow-xs active:scale-98"
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105",
                        meta.badgeClass || "bg-secondary text-foreground"
                      )}
                    >
                      <Icon className="size-3.5" />
                    </span>
                    <span className="truncate">
                      <span className="block truncate font-serif text-xs font-bold">{meta.label}</span>
                      <span className="block text-[10px] text-muted-foreground">
                        {stage === "pending" ? "Station 1" : stage === "preparing" ? "Station 2" : "Station 3"}
                      </span>
                    </span>
                  </span>
                  <span className="font-mono text-xs font-black tabular-nums text-muted-foreground group-hover:text-foreground">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-2 border-t border-border/70 bg-secondary/30 p-3 pb-[max(0.75rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))] dark:bg-zinc-900/30">
        <button
          type="button"
          onClick={() => onSelectView("chef-profile")}
          className={cn(
            "flex flex-1 min-w-0 items-center gap-2.5 rounded-2xl border p-2 text-left shadow-xs transition-all",
            activeView === "chef-profile"
              ? "border-primary/40 bg-primary/10 ring-2 ring-primary/20"
              : "border-border/70 bg-card/90 hover:border-primary/40 hover:bg-secondary/60 hover:shadow-warm"
          )}
        >
          <span className="relative shrink-0">
            <PersonAvatar
              name={user?.name}
              src={user?.avatar || user?.profile_photo}
              className="size-9 rounded-full"
            />
            <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card bg-emerald-500 ring-1 ring-emerald-500/40" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-serif text-xs font-bold text-foreground">
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

        {onSignOut && (
          <button
            type="button"
            onClick={onSignOut}
            title="Sign out / Exit Chef"
            className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-card/90 text-muted-foreground shadow-xs transition-all hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive active:scale-95"
          >
            <LogOut className="size-4" />
          </button>
        )}
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
  onSignOut,
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
        onSignOut={onSignOut}
      />
    </aside>
  );
}
