import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Pie,
  PieChart as RechartsPie,
  XAxis,
  YAxis,
} from "recharts";
import { getDashboard, list } from "@/lib/api";
import { getImageUrl } from "@/lib/food-api";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatTime } from "@/lib/utils";
import {
  DollarSign,
  ShoppingBag,
  Bike,
  Package,
  Store,
  Plus,
  ArrowRight,
  ArrowUpRight,
  ClipboardList,
  Ticket,
  Clock3,
  Sparkles,
  ShieldCheck,
  Truck,
  Flame,
  CalendarDays,
  Layers,
  ChefHat,
  PieChart as PieIcon,
  MessageSquare,
  AlertTriangle,
  Star,
  Wallet,
  ReceiptText,
  CircleDollarSign,
  Target,
  GitCommitHorizontal,
} from "lucide-react";

let memoryDashboardCache = null;
try {
  const stored = localStorage.getItem("flame_admin_dashboard_cache");
  if (stored) memoryDashboardCache = JSON.parse(stored);
} catch {
  memoryDashboardCache = null;
}

const WEEKLY_GOAL = 3500;

const PIE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const revenueChartConfig = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
  orders: { label: "Orders", color: "var(--chart-2)" },
};

const PIPELINE = [
  { status: "PENDING", label: "Pending", bar: "bg-primary" },
  { status: "CONFIRMED", label: "Confirmed", bar: "bg-sky-500" },
  { status: "PREPARING", label: "Preparing", bar: "bg-amber-500" },
  { status: "READY", label: "Ready", bar: "bg-emerald-500" },
  { status: "OUT_FOR_DELIVERY", label: "Dispatched", bar: "bg-indigo-500" },
  { status: "DELIVERED", label: "Delivered", bar: "bg-teal-500" },
];

const STATUS_STYLE = {
  PENDING: "border-primary/25 bg-primary/10 text-primary",
  CONFIRMED: "border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  PREPARING: "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  READY: "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  OUT_FOR_DELIVERY: "border-indigo-500/25 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  DELIVERED: "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  COMPLETED: "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  CANCELLED: "border-destructive/30 bg-destructive/10 text-destructive",
};

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.items)) return value.items;
  if (value && Array.isArray(value.content)) return value.content;
  if (value && Array.isArray(value.data)) return value.data;
  return [];
}

function money(value) {
  return `$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function timeAgo(input) {
  if (!input) return "—";
  const then = new Date(input).getTime();
  if (Number.isNaN(then)) return "—";
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(input).toLocaleDateString([], { month: "short", day: "numeric" });
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const to = Number(target) || 0;
    if (from === to) {
      setValue(to);
      return undefined;
    }
    let raf;
    const start = performance.now();
    const tick = (time) => {
      const progress = Math.min(1, (time - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (to - from) * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

function Sparkline({ data, tone = "revenue", className }) {
  const config = { value: { label: "trend", color: `var(--chart-${tone === "orders" ? 2 : 1})` } };
  return (
    <ChartContainer config={config} className={cn("h-9 w-full", className)}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--color-value)"
          strokeWidth={2}
          fill="var(--color-value)"
          fillOpacity={0.16}
        />
      </AreaChart>
    </ChartContainer>
  );
}

function GoalRing({ progress, className }) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <span className={cn("relative flex size-11 items-center justify-center", className)}>
      <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={radius} fill="none" strokeWidth="3.5" className="stroke-white/25" />
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          className="stroke-white transition-[stroke-dashoffset] duration-1000"
        />
      </svg>
      <Target className="size-4 text-white/90" />
    </span>
  );
}

function AdminDashboardSkeleton() {
  return (
    <div className="w-full space-y-5 sm:space-y-6">
      <Skeleton className="h-48 rounded-[28px] sm:h-52" />
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 sm:gap-5 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[132px] rounded-3xl" />
        ))}
      </div>
      <Skeleton className="h-24 rounded-3xl" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 sm:gap-6">
        <Skeleton className="h-[340px] rounded-[28px] lg:col-span-2" />
        <Skeleton className="h-[340px] rounded-[28px]" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 sm:gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[280px] rounded-[28px]" />
        ))}
      </div>
    </div>
  );
}

function KpiCard({ label, value, hint, icon: Icon, tone = "primary", spark, delay = 0 }) {
  const tones = {
    primary: "border-primary/20 bg-primary/10 text-primary",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    sky: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400",
    flame:
      "border-primary/20 bg-gradient-to-br from-primary via-orange-500 to-amber-500 text-white shadow-warm",
  };

  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className="group relative flex animate-card-fade-in flex-col justify-between overflow-hidden rounded-3xl border border-border/70 bg-card/85 p-4 shadow-warm backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-warm-lg sm:p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="truncate text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground sm:text-[11px]">
          {label}
        </span>
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-xl border transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3 sm:size-9",
            tones[tone]
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <div className="mt-3">
        <p className="truncate font-serif text-xl font-bold tracking-tight text-foreground tabular-nums sm:text-[1.7rem]">
          {value}
        </p>
        {hint && <p className="mt-1 truncate text-[11px] font-semibold text-muted-foreground">{hint}</p>}
        {spark}
      </div>
    </div>
  );
}

function PanelHeader({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3 border-b border-border/50 pb-4">
      <div className="flex min-w-0 items-start gap-2.5">
        {Icon && (
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <Icon className="size-4" />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="truncate font-serif text-base font-bold text-foreground sm:text-lg">{title}</h3>
          {subtitle && <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState(() => memoryDashboardCache);
  const [recentOrders, setRecentOrders] = useState(() => memoryDashboardCache?.recentOrders || []);
  const [allOrders, setAllOrders] = useState(() => memoryDashboardCache?.allOrders || []);
  const [chartData, setChartData] = useState(() => memoryDashboardCache?.chartDataProcessed || []);
  const [productImages, setProductImages] = useState(() => memoryDashboardCache?.productImages || {});
  const [loading, setLoading] = useState(!memoryDashboardCache);
  const [error, setError] = useState(null);

  const adminAuth = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("adminAuth") || "null");
    } catch {
      return null;
    }
  }, []);

  const processChartData = (dashData) => {
    if (Array.isArray(dashData?.chartData) && dashData.chartData.length > 0) {
      return dashData.chartData.map((point) => {
        const date = new Date(point.order_date);
        return {
          date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          revenue: Number(point.daily_revenue || 0),
          orders: Number(point.order_count || 0),
        };
      });
    }
    return [];
  };

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      getDashboard(),
      list("products", { limit: 100 }).catch(() => null),
      list("orders", { limit: 200, sort: "id", dir: "desc" }).catch(() => null),
    ])
      .then(([dashData, productsRes, ordersRes]) => {
        if (!isMounted || !dashData) return;

        const processedChart = processChartData(dashData);
        const orders = dashData.recentOrders || dashData.orders || [];
        const images = {};
        toArray(productsRes).forEach((product) => {
          if (product?.name) images[product.name] = product.image || null;
        });
        const ordersAll = toArray(ordersRes);

        setData(dashData);
        setRecentOrders(orders);
        setAllOrders(ordersAll.length ? ordersAll : orders);
        setChartData(processedChart);
        setProductImages(images);
        setError(null);

        memoryDashboardCache = {
          ...dashData,
          recentOrders: orders,
          allOrders: ordersAll.length ? ordersAll : orders,
          chartDataProcessed: processedChart,
          productImages: images,
        };
        try {
          localStorage.setItem("flame_admin_dashboard_cache", JSON.stringify(memoryDashboardCache));
        } catch {
          /* storage unavailable — keep in-memory cache */
        }
      })
      .catch((err) => {
        if (isMounted && !data) setError(err?.message || "Failed to load dashboard data");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const totalRevenue = Number(data?.totalRevenue || 0);
  const totalOrdersCount = Number(data?.totalOrders || recentOrders.length || 0);
  const avgOrderValue = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;

  const weekTotals = useMemo(() => {
    const revenue = chartData.reduce((sum, point) => sum + point.revenue, 0);
    const orders = chartData.reduce((sum, point) => sum + point.orders, 0);
    const today = chartData[chartData.length - 1];
    const best = chartData.reduce((max, point) => (point.revenue > (max?.revenue || 0) ? point : max), null);
    return { revenue, orders, today, best };
  }, [chartData]);

  const pipeline = useMemo(() => {
    const counts = PIPELINE.map((stage) => ({
      ...stage,
      count: allOrders.filter((order) => String(order.status || "").toUpperCase() === stage.status).length,
    }));
    const total = counts.reduce((sum, stage) => sum + stage.count, 0);
    return { counts, total };
  }, [allOrders]);

  const topProducts = useMemo(
    () =>
      (Array.isArray(data?.topProducts) ? data.topProducts : []).map((product) => ({
        ...product,
        image: productImages[product.name] || null,
      })),
    [data?.topProducts, productImages]
  );

  const categoryData = useMemo(() => {
    const source = Array.isArray(data?.categoryData) ? data.categoryData : [];
    const total = source.reduce((sum, cat) => sum + Number(cat.value || 0), 0);
    return source.map((cat, index) => ({
      name: cat.name,
      value: Number(cat.value || 0),
      pct: total > 0 ? Math.round((Number(cat.value || 0) / total) * 100) : 0,
      color: PIE_COLORS[index % PIE_COLORS.length],
    }));
  }, [data?.categoryData]);

  const categoryTotal = categoryData.reduce((sum, cat) => sum + cat.value, 0);

  const recentReviews = useMemo(
    () =>
      (Array.isArray(data?.recentReviews) ? data.recentReviews : []).map((review) => ({
        customer: review.customer || "Anonymous",
        rating: Number(review.rating || 0),
        comment: review.comment || "",
        time: review.time,
      })),
    [data?.recentReviews]
  );

  const lowStock = useMemo(
    () =>
      (Array.isArray(data?.lowStock) ? data.lowStock : []).map((stock) => ({
        item: stock.item,
        current: Number(stock.current || 0),
        min: Number(stock.min || 0),
        critical: stock.critical === 1 || stock.critical === true,
      })),
    [data?.lowStock]
  );

  const animatedRevenue = useCountUp(totalRevenue);
  const animatedOrders = useCountUp(totalOrdersCount);
  const animatedAvg = useCountUp(avgOrderValue);
  const animatedToday = useCountUp(weekTotals.today?.revenue || 0);

  const quickLinks = [
    { label: "Add New Product", href: "/admin/products", icon: Plus, desc: "Pizza, burgers & sides", gradient: "from-orange-500 to-amber-500" },
    { label: "Kitchen Display", href: "/admin/kitchen", icon: ChefHat, desc: "Live prep queue", gradient: "from-primary to-rose-500" },
    { label: "Manage Orders", href: "/admin/orders", icon: ClipboardList, desc: "Statuses & dispatch", gradient: "from-sky-500 to-indigo-500" },
    { label: "Coupons & Deals", href: "/admin/coupons", icon: Ticket, desc: "Promo codes", gradient: "from-emerald-500 to-teal-500" },
  ];

  if (loading && !data) return <AdminDashboardSkeleton />;

  const todayStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const goalProgress = weekTotals.revenue / WEEKLY_GOAL;

  return (
    <div className="w-full space-y-5 pb-12 sm:space-y-6">
      {error && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-xs font-semibold text-destructive">
          <AlertTriangle className="size-4 shrink-0" />
          <span className="truncate">{error} — showing last cached snapshot.</span>
        </div>
      )}

      <section className="relative overflow-hidden rounded-[28px] border border-primary/20 bg-gradient-to-br from-primary via-orange-600 to-amber-500 p-6 text-white shadow-warm-lg sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/4 size-72 rounded-full bg-amber-300/20 blur-3xl" />
        <Flame className="pointer-events-none absolute -right-6 -bottom-10 size-56 text-white/10" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[11px] font-bold backdrop-blur-md">
                <CalendarDays className="size-3" />
                {todayStr}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/40 bg-emerald-400/20 px-3 py-1 text-[11px] font-bold text-emerald-50 backdrop-blur-md">
                <span className="size-1.5 rounded-full bg-emerald-300 animate-pulse" />
                Store & kitchen live
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[11px] font-bold backdrop-blur-md">
                <ShieldCheck className="size-3" />
                Bakong KHQR ready
              </span>
            </div>

            <div className="space-y-1.5">
              <h1 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                {greeting()}, {adminAuth?.name || "Admin"}
              </h1>
              <p className="max-w-xl text-xs leading-relaxed text-white/80 sm:text-sm">
                Live oversight of sales, settlements, kitchen preparation and driver dispatch — all in
                one command center.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              asChild
              className="h-11 rounded-2xl border border-white/25 bg-white px-5 font-serif text-xs font-bold text-primary shadow-lg transition-all hover:bg-white/90 active:scale-95 sm:text-sm"
            >
              <Link to="/admin/products">
                <Plus className="size-4" />
                New Product
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-11 rounded-2xl border-white/30 bg-white/10 px-5 font-serif text-xs font-bold text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-95 sm:text-sm"
            >
              <Link to="/admin/kitchen">
                <ChefHat className="size-4" />
                Kitchen KDS
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="h-11 rounded-2xl px-4 text-xs font-bold text-white/85 transition-all hover:bg-white/15 hover:text-white active:scale-95 sm:text-sm"
            >
              <Link to="/">
                <Store className="size-4" />
                Storefront
                <ArrowUpRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="relative z-10 mt-6 grid grid-cols-1 gap-3 border-t border-white/15 pt-5 sm:grid-cols-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/15 backdrop-blur-md">
              <CircleDollarSign className="size-4.5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-white/70">Today so far</p>
              <p className="truncate font-serif text-lg font-bold tabular-nums">{money(animatedToday)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/15 backdrop-blur-md">
              <ReceiptText className="size-4.5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-white/70">Tickets today</p>
              <p className="truncate font-serif text-lg font-bold tabular-nums">
                {weekTotals.today?.orders ?? 0}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <GoalRing progress={goalProgress} />
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-white/70">Weekly goal</p>
              <p className="truncate font-serif text-lg font-bold tabular-nums">
                {Math.round(Math.min(1, goalProgress) * 100)}%
                <span className="ml-1.5 text-[11px] font-semibold text-white/70">of {money(WEEKLY_GOAL)}</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3.5 md:grid-cols-3 sm:gap-5 xl:grid-cols-5">
        <KpiCard
          delay={0}
          label="Total Revenue"
          value={money(animatedRevenue)}
          hint={`${money(weekTotals.today?.revenue)} today`}
          icon={CircleDollarSign}
          tone="emerald"
          spark={<Sparkline data={chartData.map((p) => ({ value: p.revenue }))} tone="revenue" className="mt-2.5" />}
        />
        <KpiCard
          delay={60}
          label="Total Orders"
          value={Math.round(animatedOrders).toLocaleString()}
          hint={`${weekTotals.orders} in the last 7 days`}
          icon={ShoppingBag}
          tone="sky"
          spark={<Sparkline data={chartData.map((p) => ({ value: p.orders }))} tone="orders" className="mt-2.5" />}
        />
        <KpiCard
          delay={120}
          label="Avg Order Value"
          value={money(animatedAvg)}
          hint="Revenue ÷ orders"
          icon={Wallet}
          tone="amber"
        />
        <KpiCard
          delay={180}
          label="Active Drivers"
          value={String(data?.activeDrivers ?? 0)}
          hint={Number(data?.activeDrivers || 0) > 0 ? "On shift now" : "No drivers on shift"}
          icon={Truck}
          tone="flame"
        />
        <KpiCard
          delay={240}
          label="Live Products"
          value={String(data?.totalProducts ?? 0)}
          hint="Published on the menu"
          icon={Package}
          tone="primary"
        />
      </section>

      <section
        className="animate-card-fade-in rounded-[28px] border border-border/70 bg-card/85 p-5 shadow-warm backdrop-blur-xl sm:p-6"
        style={{ animationDelay: "120ms" }}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <GitCommitHorizontal className="size-4" />
            </span>
            <div>
              <h3 className="font-serif text-base font-bold text-foreground sm:text-lg">Order pipeline</h3>
              <p className="text-xs font-medium text-muted-foreground">
                {pipeline.total} tracked order{pipeline.total === 1 ? "" : "s"} across the lifecycle
              </p>
            </div>
          </div>
          <Link
            to="/admin/orders"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
          >
            Open orders <ArrowRight className="size-3" />
          </Link>
        </div>

        {pipeline.total === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/60 bg-secondary/20 py-6 text-center text-xs font-semibold text-muted-foreground">
            No orders tracked yet — the pipeline fills in as guests check out.
          </p>
        ) : (
          <>
            <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-secondary">
              {pipeline.counts.map((stage) =>
                stage.count > 0 ? (
                  <div
                    key={stage.status}
                    title={`${stage.label}: ${stage.count}`}
                    className={cn("h-full transition-all duration-700", stage.bar)}
                    style={{ width: `${(stage.count / pipeline.total) * 100}%` }}
                  />
                ) : null
              )}
            </div>
            <div className="mt-3.5 flex flex-wrap gap-x-4 gap-y-2">
              {pipeline.counts.map((stage) => (
                <span key={stage.status} className="flex items-center gap-1.5 text-[11px] font-bold">
                  <span className={cn("size-2 rounded-full", stage.bar)} />
                  <span className="text-muted-foreground">{stage.label}</span>
                  <span className="text-foreground tabular-nums">{stage.count}</span>
                </span>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3 sm:gap-6">
        <div
          className="flex animate-card-fade-in flex-col rounded-[28px] border border-border/70 bg-card/85 p-5 shadow-warm backdrop-blur-xl sm:p-6 lg:col-span-2"
          style={{ animationDelay: "160ms" }}
        >
          <PanelHeader
            icon={ReceiptText}
            title="Revenue & order volume"
            subtitle="Last 7 days of settled transactions"
            action={
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="outline" className="rounded-xl border-border/60 bg-secondary/50 px-2.5 py-1 text-[11px] font-bold text-foreground">
                  {money(weekTotals.revenue)}
                </Badge>
                <Badge variant="outline" className="rounded-xl border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                  {weekTotals.orders} orders
                </Badge>
              </div>
            }
          />

          {chartData.length === 0 ? (
            <EmptyState
              icon={ReceiptText}
              title="No sales recorded yet"
              description="Once orders start settling, the revenue and volume trend appears here."
              className="py-10"
            />
          ) : (
            <ChartContainer config={revenueChartConfig} className="aspect-auto h-[240px] w-full sm:h-[280px]">
              <ComposedChart data={chartData} margin={{ top: 10, right: 8, bottom: 0, left: -8 }}>
                <defs>
                  <linearGradient id="adminRevenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-revenue)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-revenue)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={10} />
                <YAxis yAxisId="revenue" tickLine={false} axisLine={false} width={52} tickFormatter={(value) => `$${value}`} />
                <YAxis yAxisId="orders" orientation="right" tickLine={false} axisLine={false} width={34} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                <Bar yAxisId="orders" dataKey="orders" fill="var(--color-orders)" fillOpacity={0.35} radius={[6, 6, 0, 0]} maxBarSize={26} />
                <Area
                  yAxisId="revenue"
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-revenue)"
                  strokeWidth={3}
                  fill="url(#adminRevenueFill)"
                  activeDot={{ r: 5, strokeWidth: 2 }}
                />
              </ComposedChart>
            </ChartContainer>
          )}

          {weekTotals.best && (
            <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-border/60 bg-secondary/30 px-3.5 py-2.5">
              <Sparkles className="size-4 shrink-0 text-amber-500" />
              <p className="truncate text-[11px] font-semibold text-muted-foreground sm:text-xs">
                Best day this week: <span className="font-bold text-foreground">{weekTotals.best.date}</span> with{" "}
                <span className="font-bold text-primary">{money(weekTotals.best.revenue)}</span>
              </p>
            </div>
          )}
        </div>

        <div
          className="flex animate-card-fade-in flex-col rounded-[28px] border border-border/70 bg-card/85 p-5 shadow-warm backdrop-blur-xl sm:p-6"
          style={{ animationDelay: "200ms" }}
        >
          <PanelHeader
            icon={Flame}
            title="Top selling items"
            subtitle="By units sold, all time"
            action={
              <Link to="/admin/products" className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-primary hover:underline">
                View all <ArrowRight className="size-3" />
              </Link>
            }
          />

          {topProducts.length === 0 ? (
            <EmptyState
              icon={Flame}
              title="No sales yet"
              description="Your best sellers will rank here once guests start ordering."
              className="py-8"
            />
          ) : (
            <ul className="flex flex-1 flex-col gap-2.5">
              {topProducts.map((product, index) => (
                <li
                  key={product.name}
                  className="group flex items-center gap-3 rounded-2xl border border-transparent p-2 transition-colors hover:border-border/60 hover:bg-secondary/40"
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-lg font-serif text-[10px] font-bold shadow-xs",
                      index === 0
                        ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white"
                        : index === 1
                          ? "bg-gradient-to-br from-zinc-300 to-zinc-500 text-white"
                          : index === 2
                            ? "bg-gradient-to-br from-amber-700 to-amber-900 text-white"
                            : "border border-border/60 bg-secondary text-muted-foreground"
                    )}
                  >
                    {index + 1}
                  </span>
                  {product.image ? (
                    <img
                      src={getImageUrl(product.image)}
                      alt=""
                      loading="lazy"
                      className="size-10 shrink-0 rounded-xl border border-border/60 object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-secondary/60">
                      <Package className="size-4 text-muted-foreground" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-foreground transition-colors group-hover:text-primary">
                      {product.name}
                    </span>
                    <span className="block text-[10px] font-semibold text-muted-foreground">
                      {Number(product.sales || 0).toLocaleString()} sold
                    </span>
                  </span>
                  <span className="shrink-0 font-serif text-xs font-bold text-foreground tabular-nums">
                    {money(product.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-4 sm:gap-6">
        <div className="space-y-3 xl:col-span-1">
          <h3 className="flex items-center gap-2 px-1 font-serif text-base font-bold text-foreground">
            <Sparkles className="size-4 text-primary" /> Quick shortcuts
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-1">
            {quickLinks.map((item, index) => (
              <Link
                key={item.label}
                to={item.href}
                style={{ animationDelay: `${240 + index * 50}ms` }}
                className="group flex animate-card-fade-in items-center justify-between gap-3 overflow-hidden rounded-3xl border border-border/70 bg-card/85 p-3.5 shadow-xs backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-warm"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr text-white shadow-xs transition-transform group-hover:scale-110 group-hover:rotate-3",
                      item.gradient
                    )}
                  >
                    <item.icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold text-foreground transition-colors group-hover:text-primary">
                      {item.label}
                    </span>
                    <span className="block truncate text-[10px] font-medium text-muted-foreground">{item.desc}</span>
                  </span>
                </span>
                <ArrowRight className="size-3.5 shrink-0 text-muted-foreground opacity-40 transition-all group-hover:translate-x-0.5 group-hover:text-primary group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-3 xl:col-span-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="flex items-center gap-2 font-serif text-base font-bold text-foreground">
              <ClipboardList className="size-4 text-primary" /> Live recent orders
            </h3>
            <Link to="/admin/orders" className="inline-flex items-center gap-1 text-[11px] font-bold tracking-wider text-primary hover:underline">
              View all <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-border/70 bg-card/85 shadow-warm backdrop-blur-xl">
            {recentOrders.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="Waiting for incoming orders"
                description="Checkout orders and Bakong payments appear here in real time."
                className="py-12"
              />
            ) : (
              <ul className="divide-y divide-border/40">
                {recentOrders.slice(0, 6).map((order) => {
                  const status = String(order.status || "PENDING").toUpperCase();
                  const live = ["PREPARING", "READY", "OUT_FOR_DELIVERY"].includes(status);
                  return (
                    <li key={order.id} className="group flex items-center justify-between gap-3 p-3.5 transition-colors hover:bg-secondary/40 sm:p-4">
                      <div className="flex min-w-0 items-center gap-3.5">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/15 to-orange-500/15 font-serif text-xs font-bold text-primary transition-transform group-hover:scale-105">
                          {(order.customer_name || "G").charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="max-w-[160px] truncate text-xs font-bold text-foreground">
                              {order.customer_name || order.customer_phone || `Guest #${order.customer_id || ""}`}
                            </p>
                            <span className="rounded-md border border-border/60 bg-secondary/80 px-1.5 py-0.5 font-mono text-[10px] font-bold text-muted-foreground">
                              #{order.order_number ? (order.order_number.length > 8 ? order.order_number.slice(-6) : order.order_number) : order.id}
                            </span>
                          </div>
                          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                            <Clock3 className="size-3" />
                            {formatTime(order.created_at) || "just now"}
                            <span className="text-border">•</span>
                            {timeAgo(order.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="font-serif text-sm font-bold text-foreground tabular-nums">
                          {money(order.total_price || order.total)}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider",
                            STATUS_STYLE[status] || STATUS_STYLE.PENDING
                          )}
                        >
                          {live && <span className="size-1.5 rounded-full bg-current animate-pulse" />}
                          {status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3 sm:gap-6">
        <div
          className="flex animate-card-fade-in flex-col rounded-[28px] border border-border/70 bg-card/85 p-5 shadow-warm backdrop-blur-xl sm:p-6"
          style={{ animationDelay: "280ms" }}
        >
          <PanelHeader icon={PieIcon} title="Sales by category" subtitle="Share of items sold" />

          {categoryData.length === 0 ? (
            <EmptyState icon={PieIcon} title="No category sales yet" description="The category mix appears once items start selling." className="py-8" />
          ) : (
            <>
              <div className="relative mx-auto my-2 size-[190px]">
                <RechartsPie width={190} height={190}>
                  <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={82} paddingAngle={4} stroke="none">
                    {categoryData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                </RechartsPie>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Items</span>
                  <span className="font-serif text-2xl font-bold text-foreground tabular-nums">
                    {categoryTotal.toLocaleString()}
                  </span>
                </div>
              </div>
              <Separator className="my-4 bg-border/50" />
              <ul className="space-y-2">
                {categoryData.map((cat) => (
                  <li key={cat.name} className="flex items-center gap-2.5 text-[11px] font-bold">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">{cat.name}</span>
                    <span className="shrink-0 text-foreground tabular-nums">{cat.pct}%</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div
          className="flex animate-card-fade-in flex-col rounded-[28px] border border-border/70 bg-card/85 p-5 shadow-warm backdrop-blur-xl sm:p-6"
          style={{ animationDelay: "320ms" }}
        >
          <PanelHeader icon={MessageSquare} title="Customer feedback" subtitle="Latest verified reviews" />

          {recentReviews.length === 0 ? (
            <EmptyState icon={MessageSquare} title="No reviews yet" description="Guest reviews will show up here as they arrive." className="py-8" />
          ) : (
            <ul className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1 custom-scrollbar">
              {recentReviews.map((review, index) => (
                <li key={index} className="rounded-2xl border border-border/50 bg-secondary/30 p-3 transition-colors hover:bg-secondary/50">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-bold text-foreground">{review.customer}</span>
                    <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">{timeAgo(review.time)}</span>
                  </div>
                  <div className="mb-1.5 flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, starIndex) => (
                      <Star key={starIndex} className={cn("size-3", starIndex < review.rating ? "fill-amber-400 text-amber-400" : "text-border")} />
                    ))}
                  </div>
                  {review.comment && (
                    <p className="text-[11px] italic leading-relaxed text-muted-foreground line-clamp-2">“{review.comment}”</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          className="flex animate-card-fade-in flex-col rounded-[28px] border border-border/70 bg-card/85 p-5 shadow-warm backdrop-blur-xl sm:p-6"
          style={{ animationDelay: "360ms" }}
        >
          <PanelHeader icon={Layers} title="Inventory levels" subtitle="Items at or near threshold" />

          {lowStock.length === 0 ? (
            <EmptyState icon={ShieldCheck} title="Pantry fully stocked" description="No inventory items are near their low-stock threshold." className="py-8" />
          ) : (
            <ul className="flex flex-1 flex-col gap-2.5">
              {lowStock.map((stock) => {
                const ratio = stock.min > 0 ? Math.min(1, stock.current / (stock.min * 2)) : 1;
                return (
                  <li
                    key={stock.item}
                    className={cn(
                      "rounded-2xl border p-3 transition-colors",
                      stock.critical ? "border-destructive/30 bg-destructive/8" : "border-border/50 bg-secondary/30"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={cn(
                            "flex size-8.5 shrink-0 items-center justify-center rounded-xl border",
                            stock.critical ? "border-destructive/30 bg-destructive/15 text-destructive" : "border-primary/20 bg-primary/10 text-primary"
                          )}
                        >
                          <Layers className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-foreground">{stock.item}</p>
                          <p className="text-[10px] font-semibold text-muted-foreground">Threshold {stock.min}</p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className={cn("block font-serif text-xs font-bold tabular-nums", stock.critical ? "text-destructive" : "text-emerald-600 dark:text-emerald-400")}>
                          {stock.current}
                        </span>
                        <span className="text-[9px] font-bold uppercase text-muted-foreground">in stock</span>
                      </div>
                    </div>
                    <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className={cn("h-full rounded-full transition-all", stock.critical ? "bg-gradient-to-r from-destructive to-orange-500" : "bg-gradient-to-r from-emerald-500 to-teal-400")}
                        style={{ width: `${Math.max(6, Math.round(ratio * 100))}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="flex flex-col items-center justify-between gap-3 rounded-[28px] border border-border/70 bg-card/85 px-5 py-4 shadow-xs backdrop-blur-xl sm:flex-row sm:px-6">
        <p className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
          <Bike className="size-4 text-primary" />
          Dispatch, settlements and KDS sync automatically every few seconds.
        </p>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="rounded-full border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <DollarSign className="size-2.5" /> Payments healthy
          </Badge>
          <Badge variant="outline" className="rounded-full border-border/60 bg-secondary/60 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Auto-refresh on
          </Badge>
        </div>
      </section>
    </div>
  );
}
