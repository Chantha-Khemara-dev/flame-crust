import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  Flame,
  Clock3,
  CheckCircle2,
  ChefHat,
  Timer,
  AlertTriangle,
  CircleDot,
  X,
  ZoomIn,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getImageUrl } from "@/lib/food-api";

export const STAGES = {
  pending: {
    id: "pending",
    label: "To Prepare",
    station: "Station 1",
    note: "Prep & Dough",
    icon: Clock3,
    hue: "amber",
    stripe: "from-amber-400 via-amber-500 to-orange-500",
    chip: "bg-amber-500/12 text-amber-700 dark:text-amber-400 border-amber-500/25",
    iconBox: "bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/25",
    columnTint: "from-amber-500/[0.07] via-card to-card",
    hoverBorder: "hover:border-amber-500/50",
    action: "from-amber-500 via-orange-500 to-primary",
    actionLabel: "Start Cooking",
    nextStatus: "PREPARING",
  },
  preparing: {
    id: "preparing",
    label: "In the Oven",
    station: "Station 2",
    note: "Wood-Fired Stone Oven",
    icon: Flame,
    hue: "flame",
    stripe: "from-primary via-orange-500 to-amber-400",
    chip: "bg-primary/12 text-primary border-primary/25",
    iconBox:
      "bg-gradient-to-br from-primary via-orange-500 to-amber-500 text-white border-primary/20 shadow-warm",
    columnTint: "from-primary/[0.09] via-card to-card",
    hoverBorder: "hover:border-primary/60",
    action: "from-emerald-600 via-emerald-500 to-teal-500",
    actionLabel: "Mark as Ready",
    nextStatus: "READY",
  },
  ready: {
    id: "ready",
    label: "Ready for Pickup",
    station: "Station 3",
    note: "Expediter & Dispatch",
    icon: CheckCircle2,
    hue: "emerald",
    stripe: "from-emerald-500 via-emerald-400 to-teal-400",
    chip: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 border-emerald-500/25",
    iconBox: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
    columnTint: "from-emerald-500/[0.07] via-card to-card",
    hoverBorder: "hover:border-emerald-500/50",
    action: null,
    actionLabel: "Awaiting Pickup",
    nextStatus: null,
  },
};

export const STATUS_FLOW = ["PENDING", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED"];

export const STATUS_LABEL = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  READY: "Ready",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
};

const PREFS_KEY = "flame-crust-kitchen-prefs";
const DEFAULT_PREFS = {
  sound: true,
  targetPrepMinutes: 12,
  density: "comfortable",
  showImages: true,
};

function readPrefs() {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

let prefsSnapshot = readPrefs();
const prefsListeners = new Set();

function subscribePrefs(listener) {
  prefsListeners.add(listener);
  return () => prefsListeners.delete(listener);
}

export function useKitchenPrefs() {
  return useSyncExternalStore(subscribePrefs, () => prefsSnapshot, () => DEFAULT_PREFS);
}

export function setKitchenPref(key, value) {
  prefsSnapshot = { ...prefsSnapshot, [key]: value };
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefsSnapshot));
  } catch {
    /* storage unavailable — keep in-memory prefs */
  }
  prefsListeners.forEach((listener) => listener());
}

let audioCtx = null;
function getAudioCtx() {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

const CHIMES = {
  ticket: [
    { freq: 660, at: 0, dur: 0.12 },
    { freq: 880, at: 0.14, dur: 0.2 },
  ],
  ready: [
    { freq: 523, at: 0, dur: 0.1 },
    { freq: 659, at: 0.11, dur: 0.1 },
    { freq: 784, at: 0.22, dur: 0.24 },
  ],
  alert: [
    { freq: 900, at: 0, dur: 0.13 },
    { freq: 620, at: 0.18, dur: 0.13 },
    { freq: 900, at: 0.36, dur: 0.2 },
  ],
  tap: [{ freq: 440, at: 0, dur: 0.05 }],
};

export function playChime(kind = "tap") {
  if (!prefsSnapshot.sound) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  const notes = CHIMES[kind] || CHIMES.tap;
  notes.forEach(({ freq, at, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = ctx.currentTime + at;
    osc.type = kind === "alert" ? "square" : "sine";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(kind === "alert" ? 0.09 : 0.14, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  });
}

const clockListeners = new Set();
let clockTimer = null;

function subscribeClock(listener) {
  clockListeners.add(listener);
  if (!clockTimer) {
    clockTimer = setInterval(() => {
      const now = Date.now();
      clockListeners.forEach((l) => l(now));
    }, 1000);
  }
  return () => {
    clockListeners.delete(listener);
    if (clockListeners.size === 0) {
      clearInterval(clockTimer);
      clockTimer = null;
    }
  };
}

export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => subscribeClock(setNow), []);
  return now;
}

export function LiveClock({ className, showSeconds = true }) {
  const now = useNow();
  const date = new Date(now);
  return (
    <span className={cn("font-mono tabular-nums tracking-tight", className)}>
      {date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        ...(showSeconds ? { second: "2-digit" } : {}),
      })}
    </span>
  );
}

export function elapsedFrom(startTime, now = Date.now()) {
  const start = startTime ? new Date(startTime).getTime() : null;
  if (!start || Number.isNaN(start)) return null;
  return Math.max(0, now - start);
}

export function formatDuration(ms) {
  const totalSecs = Math.floor(ms / 1000);
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  if (hours > 0) return `${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function formatMinutes(ms) {
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "<1m";
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function urgencyOf(stage, ms, targetPrepMinutes = 12) {
  const targetMs = targetPrepMinutes * 60000;
  const ratio = ms / targetMs;
  if (stage === "ready") return { level: 0, tone: "emerald", label: "Ready" };
  if (ratio < 0.6) return { level: 0, tone: "emerald", label: "On track" };
  if (ratio < 1) return { level: 1, tone: "amber", label: "Approaching" };
  if (ratio < 1.5) return { level: 2, tone: "orange", label: "Over target" };
  return { level: 3, tone: "destructive", label: "Critical delay" };
}

export const URGENCY_STYLE = {
  emerald: {
    text: "text-emerald-600 dark:text-emerald-400",
    chip: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
    bar: "bg-gradient-to-r from-emerald-500 to-teal-400",
    border: "border-emerald-500/35",
  },
  amber: {
    text: "text-amber-600 dark:text-amber-400",
    chip: "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/25",
    bar: "bg-gradient-to-r from-amber-500 to-orange-400",
    border: "border-amber-500/40",
  },
  orange: {
    text: "text-orange-600 dark:text-orange-400",
    chip: "bg-orange-500/14 text-orange-700 dark:text-orange-300 border-orange-500/30",
    bar: "bg-gradient-to-r from-orange-500 to-primary",
    border: "border-orange-500/45",
  },
  destructive: {
    text: "text-destructive",
    chip: "bg-destructive/14 text-destructive border-destructive/35",
    bar: "bg-gradient-to-r from-destructive to-orange-600",
    border: "border-destructive/55",
  },
};

export function TicketTimer({ startTime, stage = "pending", targetPrepMinutes = 12, className, showLabel = false }) {
  const now = useNow();
  const ms = elapsedFrom(startTime, now);
  const info = useMemo(() => {
    if (ms === null) return null;
    return { ms, ...urgencyOf(stage, ms, targetPrepMinutes) };
  }, [ms, stage, targetPrepMinutes]);

  if (!info) return <span className={cn("text-xs text-muted-foreground", className)}>—</span>;
  const style = URGENCY_STYLE[info.tone];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-xs font-bold tabular-nums transition-colors",
        style.chip,
        info.level >= 2 && "animate-pulse",
        className
      )}
      title={info.label}
    >
      {info.level >= 2 ? (
        <AlertTriangle className="size-3.5 shrink-0" />
      ) : stage === "ready" ? (
        <CheckCircle2 className="size-3.5 shrink-0" />
      ) : (
        <Timer className="size-3.5 shrink-0" />
      )}
      {formatDuration(info.ms)}
      {showLabel && <span className="font-sans text-[10px] font-bold uppercase tracking-wider opacity-80">{info.label}</span>}
    </span>
  );
}

export function TicketProgress({ startTime, stage, targetPrepMinutes = 12, className }) {
  const now = useNow();
  const ms = elapsedFrom(startTime, now);
  if (ms === null) return null;
  const targetMs = targetPrepMinutes * 60000;
  const pct = stage === "ready" ? 100 : Math.min(100, Math.round((ms / targetMs) * 100));
  const { tone } = urgencyOf(stage, ms, targetPrepMinutes);

  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-secondary", className)}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-1000 ease-linear", URGENCY_STYLE[tone].bar)}
        style={{ width: `${Math.max(4, pct)}%` }}
      />
    </div>
  );
}

export function shortOrderNo(order) {
  const raw = order?.order_number ? String(order.order_number) : String(order?.id ?? "—");
  return raw.length > 8 ? raw.slice(-6) : raw;
}

export function formatMoney(value) {
  const num = Number(value || 0);
  return `$${num.toFixed(2)}`;
}

export function timeAgo(input, now = Date.now()) {
  const ms = elapsedFrom(input, now);
  if (ms === null) return "—";
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(input).toLocaleDateString([], { month: "short", day: "numeric" });
}

export function clockOf(input) {
  if (!input) return "—";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function parseOptions(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
  const text = String(raw).trim();
  if (!text || text === "{}" || text === "[]" || text === "null") return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
    if (parsed && typeof parsed === "object") {
      return Object.entries(parsed)
        .map(([key, value]) => {
          if (value === null || value === undefined || value === "") return null;
          if (Array.isArray(value)) return value.filter(Boolean).join(", ");
          if (typeof value === "object") return Object.values(value).filter(Boolean).join(", ");
          return String(value);
        })
        .filter(Boolean);
    }
  } catch {
    return [text];
  }
  return [];
}

export function initialsOf(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function PersonAvatar({ name, src, className, fallbackClass, wrapperClass, status }) {
  const initials = initialsOf(name);
  const tones = {
    online: "bg-emerald-500",
    busy: "bg-amber-500",
    offline: "bg-muted-foreground/40",
  };

  return (
    <span className={cn("relative inline-flex shrink-0", wrapperClass)}>
      <Avatar
        className={cn(
          "size-10 rounded-2xl border border-border/70 bg-secondary shadow-xs",
          className
        )}
      >
        {src ? <AvatarImage src={getImageUrl(src)} alt={name || "Avatar"} /> : null}
        <AvatarFallback
          delayMs={src ? 150 : 0}
          className={cn(
            "rounded-[inherit] bg-gradient-to-br from-primary/20 via-orange-500/16 to-amber-500/14 font-serif text-sm font-bold tracking-wide text-primary",
            fallbackClass
          )}
        >
          {initials || <ChefHat className="size-[45%] text-primary" />}
        </AvatarFallback>
      </Avatar>
      {status && (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card shadow-xs",
            tones[status] || tones.online
          )}
        />
      )}
    </span>
  );
}

export function PhotoViewer({ open, onClose, src, name, subtitle }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${name || "Guest"} profile photo`}
      onClick={onClose}
      className="fixed inset-0 z-[130] flex animate-in flex-col items-center justify-center gap-4 bg-black/90 px-5 pt-[max(1.25rem,env(safe-area-inset-top,0px))] pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] backdrop-blur-md duration-200 fade-in"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-[max(1rem,env(safe-area-inset-top,0px))] right-4 flex size-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-95"
        aria-label="Close photo"
      >
        <X className="size-5" />
      </button>

      <div
        onClick={(event) => event.stopPropagation()}
        className="relative max-h-[68dvh] max-w-[88vw] animate-in overflow-hidden rounded-3xl border border-white/15 bg-zinc-900 shadow-warm-lg duration-200 zoom-in-95"
      >
        {src ? (
          <img
            src={getImageUrl(src)}
            alt={name || "Guest"}
            className="max-h-[68dvh] w-auto max-w-[88vw] object-contain"
          />
        ) : (
          <div className="flex size-[min(68dvh,88vw)] max-h-[68dvh] items-center justify-center bg-gradient-to-br from-primary via-orange-500 to-amber-500">
            <span className="font-serif text-[min(24dvh,24vw)] font-bold text-white/90">
              {initialsOf(name) || <ChefHat className="size-[min(20dvh,20vw)]" />}
            </span>
          </div>
        )}
      </div>

      <div className="text-center" onClick={(event) => event.stopPropagation()}>
        <p className="font-serif text-lg font-bold text-white sm:text-xl">{name || "Guest"}</p>
        {subtitle && <p className="mt-0.5 text-xs font-medium text-white/60">{subtitle}</p>}
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
          Tap anywhere to close
        </p>
      </div>
    </div>
  );
}

export function AvatarButton({
  name,
  src,
  status,
  className,
  fallbackClass,
  onOpen,
  hint = "View photo",
  radiusClass = "rounded-2xl",
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onOpen?.();
      }}
      title={hint}
      aria-label={`${hint} — ${name || "guest"}`}
      className={cn(
        "group/photo relative shrink-0 transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
        radiusClass
      )}
    >
      <PersonAvatar
        name={name}
        src={src}
        status={status}
        className={className}
        fallbackClass={fallbackClass}
      />
      <span
        className={cn(
          "pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover/photo:opacity-100",
          radiusClass
        )}
      >
        <ZoomIn className="size-4 text-white" />
      </span>
    </button>
  );
}

export function CoverBanner({ src, className, children, overlay = true }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-primary/30 via-orange-500/22 to-amber-500/28",
        className
      )}
    >
      {src ? (
        <img
          src={getImageUrl(src)}
          alt=""
          loading="lazy"
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <Flame className="absolute -right-3 -bottom-4 size-24 text-white/25" />
      )}
      {overlay && (
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/25 to-transparent" />
      )}
      {children}
    </div>
  );
}

export function StatusDot({ tone = "emerald", pulse = true, className }) {
  const tones = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    flame: "bg-primary",
    muted: "bg-muted-foreground/40",
  };
  return (
    <span className={cn("relative flex size-2 shrink-0", className)}>
      {pulse && <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-60", tones[tone])} />}
      <span className={cn("relative inline-flex size-2 rounded-full", tones[tone])} />
    </span>
  );
}

export function SectionHeading({ icon: Icon, title, description, children, className }) {
  return (
    <div
      className={cn(
        "mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="flex items-start gap-3">
        {Icon && (
          <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-xs">
            <Icon className="size-5" />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="font-serif text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h2>
          {description && (
            <p className="mt-0.5 text-xs font-medium text-muted-foreground sm:text-sm">{description}</p>
          )}
        </div>
      </div>
      {children && <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function StatTile({ label, value, icon: Icon, tone = "amber", hint, className }) {
  const tones = {
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    flame:
      "border-primary/20 bg-gradient-to-br from-primary via-orange-500 to-amber-500 text-white shadow-warm",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    sky: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400",
    destructive: "border-destructive/25 bg-destructive/12 text-destructive",
    muted: "border-border/70 bg-secondary text-muted-foreground",
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-border/70 bg-card p-3.5 shadow-warm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-warm-lg sm:p-4",
        className
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:text-[11px]">
          {label}
        </span>
        {Icon && (
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-xl border transition-transform duration-200 group-hover:scale-110 sm:size-8",
              tones[tone]
            )}
          >
            <Icon className="size-3.5 sm:size-4" />
          </span>
        )}
      </div>
      <div className="truncate font-serif text-xl font-bold tracking-tight text-foreground sm:text-2xl lg:text-[1.75rem]">
        {value}
      </div>
      {hint && <div className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function CountdownRing({ progress, className, children }) {
  const radius = 15;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));

  return (
    <span className={cn("relative flex size-9 items-center justify-center", className)}>
      <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r={radius} fill="none" strokeWidth="2.5" className="stroke-border" />
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          className="stroke-primary transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      {children}
    </span>
  );
}

export function KdsBoardSkeleton() {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex shrink-0 gap-2.5 overflow-hidden sm:grid sm:grid-cols-3 sm:gap-3.5 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[86px] min-w-[124px] shrink-0 rounded-3xl sm:h-[100px] sm:min-w-0" />
        ))}
      </div>
      <Skeleton className="h-12 shrink-0 rounded-full sm:h-14" />
      <div className="grid flex-1 gap-3.5 md:grid-cols-3 md:gap-5">
        {Array.from({ length: 3 }).map((_, col) => (
          <div
            key={col}
            className={cn(
              "flex flex-col gap-3 rounded-3xl border border-border/70 bg-card/60 p-3 backdrop-blur-xl sm:p-4",
              col > 0 && "hidden md:flex"
            )}
          >
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <Skeleton className="size-9 rounded-2xl" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-28 rounded" />
                  <Skeleton className="h-2.5 w-20 rounded" />
                </div>
              </div>
              <Skeleton className="h-6 w-8 rounded-full" />
            </div>
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-44 w-full rounded-3xl" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function useInterval(callback, delay) {
  const saved = useRef(callback);
  useEffect(() => {
    saved.current = callback;
  }, [callback]);
  useEffect(() => {
    if (delay === null) return undefined;
    const id = setInterval(() => saved.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

export function StageGlyph({ stage, className }) {
  const Icon = STAGES[stage]?.icon || CircleDot;
  return <Icon className={cn("size-4", className)} />;
}
