import {
  ChefHat,
  Mail,
  Phone,
  Star,
  Clock3,
  Flame,
  RefreshCw,
  LogOut,
  CheckCircle2,
  Volume2,
  VolumeX,
  Timer,
  Rows3,
  Rows4,
  Image as ImageIcon,
  Wallet,
  AlertTriangle,
  Keyboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  LiveClock,
  PersonAvatar,
  SectionHeading,
  StatusDot,
  formatMoney,
  playChime,
  setKitchenPref,
  useKitchenPrefs,
} from "./kitchen-ui";

const SHORTCUTS = [
  { keys: ["1", "2", "3"], label: "Focus a station column" },
  { keys: ["0"], label: "Show all stages" },
  { keys: ["B", "G", "P", "C"], label: "Jump between views" },
  { keys: ["R"], label: "Sync the board" },
  { keys: ["/"], label: "Search tickets" },
  { keys: ["M"], label: "Mute / unmute alerts" },
  { keys: ["T"], label: "Toggle light / dark" },
  { keys: ["Esc"], label: "Close panel or clear search" },
];

export function ChefProfileView({ user, stats = {}, revenueText, onRefresh, onSignOut }) {
  const prefs = useKitchenPrefs();

  const staffName = user?.name || "Kitchen Staff";
  const staffRole = user?.role_title || user?.role || "Head Chef";
  const staffEmail = user?.email || "No email on file";
  const staffPhone = user?.phone || "No phone on file";

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <SectionHeading
        icon={ChefHat}
        title="Chef Profile & Station"
        description="Your shift, live station metrics and kitchen preferences"
        className="shrink-0"
      >
        <Badge
          variant="outline"
          className="gap-1.5 rounded-full border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400"
        >
          <StatusDot tone="emerald" /> On duty • <LiveClock showSeconds={false} />
        </Badge>
      </SectionHeading>

      <div className="flex-1 overflow-y-auto pb-6 custom-scrollbar">
        <div className="max-w-5xl space-y-4 sm:space-y-5">
          <section className="overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-primary/[0.07] via-card to-amber-500/[0.06] shadow-warm">
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-7">
              <div className="relative shrink-0">
                <PersonAvatar
                  name={staffName}
                  src={user?.avatar || user?.profile_photo}
                  className="size-20 rounded-3xl border-2 border-primary/20 shadow-warm sm:size-24"
                  fallbackClass="from-primary via-orange-500 to-amber-500 text-3xl text-white sm:text-4xl"
                />
                <span className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border-2 border-card bg-gradient-to-br from-primary to-amber-500 text-white shadow-warm">
                  <ChefHat className="size-3.5" />
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="truncate font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    {staffName}
                  </h3>
                  <Badge
                    variant="outline"
                    className="rounded-full border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400"
                  >
                    On Duty
                  </Badge>
                </div>
                <p className="mt-1 text-xs font-extrabold uppercase tracking-[0.14em] text-primary sm:text-sm">
                  {staffRole}
                </p>
                <div className="mt-3 flex flex-col gap-1.5 text-xs font-medium text-muted-foreground sm:flex-row sm:gap-4 sm:text-sm">
                  <span className="flex items-center gap-1.5 truncate">
                    <Mail className="size-3.5 shrink-0 text-primary/70" /> {staffEmail}
                  </span>
                  <span className="flex items-center gap-1.5 truncate">
                    <Phone className="size-3.5 shrink-0 text-primary/70" /> {staffPhone}
                  </span>
                </div>
              </div>
            </div>

            <Separator className="bg-border/60" />

            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 sm:p-5">
              <Metric
                icon={CheckCircle2}
                label="Completed today"
                value={stats.completedToday ?? stats.totalOrdersToday ?? 0}
                tone="text-emerald-600 dark:text-emerald-400"
              />
              <Metric
                icon={Flame}
                label="Active in kitchen"
                value={stats.active ?? 0}
                tone="text-primary"
              />
              <Metric
                icon={Wallet}
                label="Revenue today"
                value={revenueText || formatMoney(stats.revenue)}
                tone="text-amber-600 dark:text-amber-400"
              />
              <Metric
                icon={AlertTriangle}
                label="Running late"
                value={stats.delayed ?? 0}
                tone={stats.delayed > 0 ? "text-destructive" : "text-muted-foreground"}
              />
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2 sm:gap-5">
            <section className="rounded-3xl border border-border/70 bg-card p-4 shadow-warm sm:p-5">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                  <Timer className="size-4" />
                </span>
                <div>
                  <h4 className="font-serif text-base font-bold text-foreground sm:text-lg">
                    Station preferences
                  </h4>
                  <p className="text-xs font-medium text-muted-foreground">
                    Saved on this device for every shift
                  </p>
                </div>
              </div>

              <div className="space-y-3.5">
                <div className="rounded-2xl border border-border/60 bg-secondary/30 p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        {prefs.sound ? (
                          <Volume2 className="size-3.5 text-primary" />
                        ) : (
                          <VolumeX className="size-3.5 text-muted-foreground" />
                        )}
                        Station alerts
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                        Chime on new tickets, ready orders and delays
                      </p>
                    </div>
                    <Switch
                      checked={prefs.sound}
                      onCheckedChange={(value) => {
                        setKitchenPref("sound", value);
                        if (value) playChime("ready");
                      }}
                    />
                  </div>
                  {prefs.sound && (
                    <Button
                      variant="outline"
                      onClick={() => playChime("ticket")}
                      className="mt-3 h-8 rounded-full border-border/70 bg-card font-serif text-[11px] font-bold text-foreground shadow-xs transition-all hover:bg-secondary active:scale-95"
                    >
                      Test chime
                    </Button>
                  )}
                </div>

                <div className="rounded-2xl border border-border/60 bg-secondary/30 p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <Clock3 className="size-3.5 text-primary" /> Target prep time
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                        Tickets past this are flagged as late
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 font-serif text-sm font-bold text-primary tabular-nums">
                      {prefs.targetPrepMinutes} min
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {[8, 10, 12, 15, 20].map((minutes) => (
                      <button
                        key={minutes}
                        type="button"
                        onClick={() => setKitchenPref("targetPrepMinutes", minutes)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all active:scale-95",
                          prefs.targetPrepMinutes === minutes
                            ? "border-primary/30 bg-primary/12 text-primary shadow-xs"
                            : "border-border/70 bg-card text-muted-foreground hover:border-primary/25 hover:text-foreground"
                        )}
                      >
                        {minutes}m
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-secondary/30 p-3.5">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    {prefs.density === "compact" ? (
                      <Rows4 className="size-3.5 text-primary" />
                    ) : (
                      <Rows3 className="size-3.5 text-primary" />
                    )}
                    Ticket density
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                    Compact fits more tickets on one screen
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-full border border-border/70 bg-card p-1">
                    {["comfortable", "compact"].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setKitchenPref("density", option)}
                        className={cn(
                          "rounded-full py-1.5 text-[11px] font-bold capitalize transition-all active:scale-95",
                          prefs.density === option
                            ? "bg-gradient-to-r from-primary via-orange-600 to-amber-600 text-white shadow-warm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-secondary/30 p-3.5">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <ImageIcon className="size-3.5 text-primary" /> Dish photos on tickets
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                      Show thumbnails in the board columns
                    </p>
                  </div>
                  <Switch
                    checked={prefs.showImages}
                    onCheckedChange={(value) => setKitchenPref("showImages", value)}
                  />
                </div>
              </div>
            </section>

            <div className="space-y-4 sm:space-y-5">
              <section className="rounded-3xl border border-border/70 bg-card p-4 shadow-warm sm:p-5">
                <div className="mb-4 flex items-center gap-2.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Clock3 className="size-4" />
                  </span>
                  <div>
                    <h4 className="font-serif text-base font-bold text-foreground sm:text-lg">
                      Today's shift
                    </h4>
                    <p className="text-xs font-medium text-muted-foreground">
                      Station live and receiving tickets
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-serif text-sm font-bold text-foreground sm:text-base">
                        Active duty • 08:00 → close
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        <StatusDot tone="emerald" /> Board auto-syncs every 10s
                      </p>
                    </div>
                    <span className="shrink-0 rounded-2xl border border-primary/20 bg-primary/10 px-3 py-2 text-center">
                      <LiveClock className="block font-serif text-lg font-bold text-primary" />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                        Station time
                      </span>
                    </span>
                  </div>

                  <div className="mt-3.5 flex items-center gap-2 border-t border-border/50 pt-3.5">
                    <Star className="size-4 shrink-0 fill-amber-500 text-amber-500" />
                    <p className="text-xs font-medium text-muted-foreground">
                      Guest ratings for this station are tracked on the{" "}
                      <span className="font-bold text-foreground">Performance</span> tab.
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {onRefresh && (
                    <Button
                      variant="outline"
                      onClick={onRefresh}
                      className="h-11 rounded-full border-border/70 bg-card font-serif text-xs font-bold text-foreground shadow-xs transition-all hover:border-primary/40 hover:bg-secondary active:scale-95 sm:text-sm"
                    >
                      <RefreshCw className="mr-2 size-4 text-primary" /> Sync data
                    </Button>
                  )}
                  {onSignOut && (
                    <Button
                      variant="outline"
                      onClick={onSignOut}
                      className="h-11 rounded-full border-destructive/30 bg-card font-serif text-xs font-bold text-destructive shadow-xs transition-all hover:bg-destructive/10 active:scale-95 sm:text-sm"
                    >
                      <LogOut className="mr-2 size-4" /> Sign out
                    </Button>
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-border/70 bg-card p-4 shadow-warm sm:p-5">
                <div className="mb-3.5 flex items-center gap-2.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-secondary text-foreground">
                    <Keyboard className="size-4" />
                  </span>
                  <div>
                    <h4 className="font-serif text-base font-bold text-foreground sm:text-lg">
                      Keyboard shortcuts
                    </h4>
                    <p className="text-xs font-medium text-muted-foreground">
                      Run the board without leaving the keyboard
                    </p>
                  </div>
                </div>
                <ul className="space-y-2">
                  {SHORTCUTS.map((shortcut) => (
                    <li
                      key={shortcut.label}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-secondary/25 px-3 py-2"
                    >
                      <span className="truncate text-xs font-semibold text-muted-foreground">
                        {shortcut.label}
                      </span>
                      <span className="flex shrink-0 items-center gap-1">
                        {shortcut.keys.map((key) => (
                          <kbd
                            key={key}
                            className="min-w-6 rounded-lg border border-border/70 bg-card px-1.5 py-0.5 text-center font-mono text-[10px] font-bold text-foreground shadow-2xs"
                          >
                            {key}
                          </kbd>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 p-3.5 backdrop-blur-sm">
      <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <Icon className={cn("size-3.5", tone)} />
        <span className="truncate">{label}</span>
      </span>
      <p className={cn("truncate font-serif text-xl font-bold tabular-nums sm:text-2xl", tone)}>
        {value}
      </p>
    </div>
  );
}
