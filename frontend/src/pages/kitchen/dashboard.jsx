import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { list, update } from "@/lib/api";
import { unsubscribeFromPushNotifications } from "@/lib/push-notifications";
import { toast } from "sonner";
import {
  RefreshCw,
  LogOut,
  Sun,
  Moon,
  LayoutDashboard,
  Users,
  LineChart,
  ChefHat,
  Flame,
  Search,
  Volume2,
  VolumeX,
  X,
  MoreVertical,
  Wifi,
  WifiOff,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ErrorState } from "@/components/shared/error-state";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider.jsx";

import { KitchenSidebar } from "./components/Sidebar";
import { DashboardView } from "./components/DashboardView";
import { CustomersView } from "./components/CustomersView";
import { PerformanceView } from "./components/PerformanceView";
import { OrderDetailsPanel } from "./components/OrderDetailsPanel";
import { ChefProfileView } from "./components/MiscViews";
import {
  CountdownRing,
  KdsBoardSkeleton,
  LiveClock,
  StatusDot,
  formatMoney,
  playChime,
  shortOrderNo,
  STATUS_LABEL,
  useKitchenPrefs,
  useNow,
  setKitchenPref,
} from "./components/kitchen-ui";

let cachedStandaloneKitchenProducts = [];

const AUTO_SYNC_MS = 10000;

const VIEW_META = {
  dashboard: { title: "Kitchen Board", subtitle: "Live ticket flow across all stations" },
  orders: { title: "Kitchen Board", subtitle: "Live ticket flow across all stations" },
  preparing: { title: "Kitchen Board", subtitle: "Live ticket flow across all stations" },
  ready: { title: "Kitchen Board", subtitle: "Live ticket flow across all stations" },
  customers: { title: "Customers", subtitle: "Guest directory, order history & spend" },
  performance: { title: "Performance", subtitle: "Speed, throughput & guest satisfaction" },
  "chef-profile": { title: "Chef Profile", subtitle: "Your shift, station & preferences" },
};

const DOCK_ITEMS = [
  { id: "dashboard", label: "Board", icon: LayoutDashboard, badge: true, hint: "1" },
  { id: "customers", label: "Guests", icon: Users, hint: "2" },
  { id: "performance", label: "Insights", icon: LineChart, hint: "3" },
  { id: "chef-profile", label: "Profile", icon: ChefHat, hint: "4" },
];

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.items)) return value.items;
  if (value && Array.isArray(value.content)) return value.content;
  if (value && Array.isArray(value.data)) return value.data;
  return [];
};

export default function KitchenDashboard() {
  const navigate = useNavigate();
  const prefs = useKitchenPrefs();
  const now = useNow();

  const [orders, setOrders] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  const [products, setProducts] = useState(() => cachedStandaloneKitchenProducts);
  const [customers, setCustomers] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [reviews, setReviews] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [online, setOnline] = useState(true);
  const [lastSync, setLastSync] = useState(() => Date.now());
  const [user, setUser] = useState(null);

  const { theme, setTheme } = useTheme();
  const [activeView, setActiveView] = useState("dashboard");
  const [stageFilter, setStageFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const searchRef = useRef(null);
  const knownTickets = useRef(null);
  const alertedDelays = useRef(new Set());

  const toggleTheme = useCallback(
    (e) => setTheme(theme === "dark" ? "light" : "dark", e),
    [theme, setTheme]
  );

  useEffect(() => {
    const auth = localStorage.getItem("kitchenAuth") || localStorage.getItem("adminAuth");
    if (!auth) {
      navigate("/login?redirect=/kitchen/dashboard", { replace: true });
      return;
    }
    try {
      const parsed = JSON.parse(auth);
      if (!parsed.token) throw new Error("No token");
      setUser(parsed);
    } catch {
      navigate("/login?redirect=/kitchen/dashboard", { replace: true });
    }
  }, [navigate]);

  const fetchData = useCallback(
    async (isInitial = false) => {
      try {
        const wanted = [
          ["orders", list("orders", { limit: 100, sort: "id", dir: "desc" })],
          ["order_items", list("order_items", { limit: 250, sort: "id", dir: "desc" })],
          ["order_status_history", list("order_status_history", { limit: 400, sort: "id", dir: "desc" })],
        ];

        if (isInitial) {
          wanted.push(["customers", list("customers", { limit: 100, sort: "id", dir: "desc" })]);
          wanted.push(["addresses", list("addresses", { limit: 200, sort: "id", dir: "desc" })]);
          wanted.push(["reviews", list("reviews", { limit: 250, sort: "id", dir: "desc" })]);
        }
        if (isInitial || cachedStandaloneKitchenProducts.length === 0) {
          wanted.push(["products", list("products", { limit: 100 })]);
        }

        const responses = await Promise.all(wanted.map(([, promise]) => promise));
        const payload = {};
        wanted.forEach(([key], index) => {
          payload[key] = toArray(responses[index]);
        });

        if (payload.orders) setOrders(payload.orders);
        if (payload.order_items) setOrderItems(payload.order_items);
        if (payload.order_status_history) setOrderHistory(payload.order_status_history);
        if (payload.customers) setCustomers(payload.customers);
        if (payload.addresses) setAddresses(payload.addresses);
        if (payload.reviews) setReviews(payload.reviews);
        if (payload.products?.length > 0) {
          cachedStandaloneKitchenProducts = payload.products;
          setProducts(payload.products);
        }

        setError(null);
        setOnline(true);
        setLastSync(Date.now());
      } catch (err) {
        setOnline(false);
        const message = err?.message || "Unable to reach the kitchen server.";
        setError(message);
        if (isInitial) toast.error("Failed to load kitchen data.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(false), AUTO_SYNC_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchData(false);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    playChime("tap");
    fetchData(false);
  }, [fetchData]);

  const handleSignOut = () => {
    localStorage.removeItem("kitchenAuth");
    localStorage.removeItem("adminAuth");
    window.dispatchEvent(new Event("authChanged"));
    unsubscribeFromPushNotifications().catch(() => {});
    toast.success("Signed out of Kitchen Portal");
    navigate("/login", { replace: true });
  };

  const handleExitToStore = () => {
    localStorage.removeItem("kitchenAuth");
    window.dispatchEvent(new Event("authChanged"));
    toast.info("Returned to customer storefront");
    navigate("/", { replace: true });
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    const known = toArray(orders).find((o) => String(o.id) === String(orderId));
    try {
      await update("orders", orderId, { status: newStatus });
      playChime(newStatus === "READY" ? "ready" : "ticket");
      toast.success(
        `Ticket #${known ? shortOrderNo(known) : orderId} → ${newStatus.replace(/_/g, " ")}`,
        { description: STATUS_LABEL[newStatus] ? "Board updated for every station." : undefined }
      );
      setSelectedOrder((prev) =>
        prev && String(prev.id) === String(orderId) ? { ...prev, status: newStatus } : prev
      );
      fetchData(false);
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const safeOrders = useMemo(() => toArray(orders), [orders]);
  const safeItems = useMemo(() => toArray(orderItems), [orderItems]);
  const safeProducts = useMemo(() => toArray(products), [products]);
  const safeCustomers = useMemo(() => toArray(customers), [customers]);
  const safeAddresses = useMemo(() => toArray(addresses), [addresses]);
  const safeHistory = useMemo(() => toArray(orderHistory), [orderHistory]);
  const safeReviews = useMemo(() => toArray(reviews), [reviews]);

  const activeOrders = useMemo(() => {
    const itemsByOrder = new Map();
    safeItems.forEach((item) => {
      const key = String(item.order_id);
      if (!itemsByOrder.has(key)) itemsByOrder.set(key, []);
      itemsByOrder.get(key).push(item);
    });
    const productById = new Map(safeProducts.map((p) => [String(p.id), p]));
    const customerById = new Map(safeCustomers.map((c) => [String(c.id), c]));
    const addressById = new Map(safeAddresses.map((a) => [String(a.id), a]));

    return safeOrders
      .filter((o) => ["PENDING", "CONFIRMED", "PREPARING", "READY"].includes(o.status))
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map((order) => {
        const customer = customerById.get(String(order.customer_id)) || null;
        return {
          ...order,
          customer_name: customer?.name || order.customer_name || null,
          customer_phone: customer?.phone || null,
          address: addressById.get(String(order.address_id)) || null,
          items: (itemsByOrder.get(String(order.id)) || []).map((item) => {
            const product = productById.get(String(item.product_id));
            return {
              ...item,
              product_name: product?.name || item.product_name,
              product_image: product?.image || null,
              product_spicy: product?.spicy || false,
              product_vegetarian: product?.vegetarian || false,
            };
          }),
        };
      });
  }, [safeOrders, safeItems, safeProducts, safeCustomers, safeAddresses]);

  const historyByOrder = useMemo(() => {
    const map = new Map();
    safeHistory.forEach((entry) => {
      const key = String(entry.order_id);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(entry);
    });
    map.forEach((entries) => entries.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
    return map;
  }, [safeHistory]);

  const filteredOrders = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return activeOrders;
    return activeOrders.filter((order) => {
      const haystack = [
        order.order_number,
        order.id,
        order.customer_name,
        order.notes,
        order.order_type,
        ...(order.items || []).map((item) => item.product_name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [activeOrders, query]);

  const pendingOrders = filteredOrders.filter((o) => o.status === "PENDING" || o.status === "CONFIRMED");
  const preparingOrders = filteredOrders.filter((o) => o.status === "PREPARING");
  const readyOrders = filteredOrders.filter((o) => o.status === "READY");

  const stats = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todays = safeOrders.filter((o) => new Date(o.created_at) >= todayStart);
    const completed = todays.filter((o) =>
      ["READY", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED"].includes(o.status)
    );
    const revenue = completed.reduce((sum, o) => sum + (parseFloat(o.total || o.total_amount) || 0), 0);
    const delayed = activeOrders.filter((o) => {
      if (!o.created_at) return false;
      return now - new Date(o.created_at).getTime() > prefs.targetPrepMinutes * 60000;
    }).length;

    return {
      totalOrdersToday: todays.length,
      completedToday: completed.length,
      revenue,
      delayed,
      active: pendingOrders.length + preparingOrders.length + readyOrders.length,
      queue: pendingOrders.length + preparingOrders.length,
    };
  }, [safeOrders, activeOrders, pendingOrders.length, preparingOrders.length, readyOrders.length, now, prefs.targetPrepMinutes]);

  useEffect(() => {
    if (loading || knownTickets.current === null) {
      knownTickets.current = new Set(activeOrders.map((o) => String(o.id)));
      return;
    }
    const fresh = activeOrders.filter((o) => !knownTickets.current.has(String(o.id)));
    if (fresh.length > 0) {
      fresh.forEach((o) => knownTickets.current.add(String(o.id)));
      playChime("ticket");
      const latest = fresh[fresh.length - 1];
      toast.info(`New ticket #${shortOrderNo(latest)} on the rail`, {
        description: `${latest.items?.length || 0} item(s) • ${latest.order_type || "DELIVERY"}`,
      });
    }
  }, [activeOrders, loading]);

  useEffect(() => {
    if (loading) return;
    const threshold = prefs.targetPrepMinutes * 60000;
    activeOrders.forEach((order) => {
      if (order.status === "READY" || !order.created_at) return;
      const waited = now - new Date(order.created_at).getTime();
      const key = String(order.id);
      if (waited > threshold && !alertedDelays.current.has(key)) {
        alertedDelays.current.add(key);
        playChime("alert");
        toast.warning(`Ticket #${shortOrderNo(order)} is running late`, {
          description: `Waiting ${Math.round(waited / 60000)} min — target is ${prefs.targetPrepMinutes} min.`,
        });
      }
      if (waited <= threshold) alertedDelays.current.delete(key);
    });
  }, [activeOrders, now, loading, prefs.targetPrepMinutes]);

  const selectView = useCallback((view) => {
    setActiveView(view);
    setQuery("");
  }, []);

  useEffect(() => {
    const onKey = (event) => {
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

      if (event.key === "Escape") {
        if (typing) target?.blur?.();
        else if (query) setQuery("");
        return;
      }
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;

      const key = event.key.toLowerCase();
      if (key === "r") {
        event.preventDefault();
        handleRefresh();
      } else if (key === "t") {
        event.preventDefault();
        toggleTheme();
      } else if (key === "m") {
        event.preventDefault();
        setKitchenPref("sound", !prefs.sound);
      } else if (key === "/" || key === "f") {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (key === "0") {
        setStageFilter("all");
      } else if (key === "1") {
        setActiveView("dashboard");
        setStageFilter("pending");
      } else if (key === "2") {
        setActiveView("dashboard");
        setStageFilter("preparing");
      } else if (key === "3") {
        setActiveView("dashboard");
        setStageFilter("ready");
      } else if (key === "b") {
        selectView("dashboard");
      } else if (key === "g") {
        selectView("customers");
      } else if (key === "p") {
        selectView("performance");
      } else if (key === "c") {
        selectView("chef-profile");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleRefresh, toggleTheme, prefs.sound, query, selectView]);

  if (!user) return null;

  const meta = VIEW_META[activeView] || VIEW_META.dashboard;
  const syncProgress = Math.min(1, (now - lastSync) / AUTO_SYNC_MS);
  const isBoard = ["dashboard", "orders", "preparing", "ready"].includes(activeView);

  return (
    <div className="relative flex h-[100dvh] max-h-[100dvh] overflow-hidden bg-background font-sans text-foreground selection:bg-primary/20">
      <div className="pointer-events-none absolute -top-32 right-10 -z-10 size-[500px] rounded-full bg-primary/[0.05] blur-3xl dark:bg-primary/[0.09]" />
      <div className="pointer-events-none absolute -bottom-32 left-10 -z-10 size-[500px] rounded-full bg-amber-500/[0.05] blur-3xl dark:bg-amber-500/[0.07]" />

      <KitchenSidebar
        activeView={activeView}
        setActiveView={selectView}
        user={user}
        activeOrdersCount={stats.queue}
        stageCounts={{
          pending: pendingOrders.length,
          preparing: preparingOrders.length,
          ready: readyOrders.length,
        }}
        onStageSelect={(stage) => {
          setActiveView("dashboard");
          setStageFilter(stage);
        }}
        onSignOut={handleSignOut}
      />

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-20 flex shrink-0 items-center justify-between gap-3 border-b border-border/70 bg-card/85 px-3.5 pt-[env(safe-area-inset-top,0px)] shadow-2xs backdrop-blur-2xl transition-colors dark:bg-zinc-950/85 sm:px-6 md:px-8">
          <div className="flex min-w-0 items-center gap-3 py-3 sm:gap-4">
            <div className="relative flex size-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-orange-500 to-amber-500 text-white shadow-warm ring-2 ring-primary/20 sm:size-11">
              <Flame className="size-5 animate-flicker fill-white/20" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate font-serif text-base font-bold capitalize leading-tight tracking-tight text-foreground sm:text-xl">
                  {meta.title}
                </h1>
                <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 shadow-2xs sm:inline-flex dark:text-emerald-400">
                  <StatusDot tone="emerald" />
                  Live Station
                </span>
              </div>
              <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] font-medium text-muted-foreground">
                <span className="font-bold text-foreground">{stats.queue}</span>
                <span className="hidden sm:inline">{stats.queue === 1 ? "ticket" : "tickets"} in queue</span>
                <span className="sm:hidden">in queue</span>
                <span className="text-border">•</span>
                <LiveClock className="text-[11px] font-bold text-foreground/80" showSeconds={false} />
                {!online && (
                  <span className="flex shrink-0 items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-1.5 py-px text-[9px] font-extrabold uppercase tracking-wide text-destructive sm:hidden">
                    <WifiOff className="size-2.5" /> offline
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 py-3 sm:gap-2.5">
            <div className="relative hidden md:block">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
              <Input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tickets…  ( / )"
                className="h-10 w-56 rounded-full border-border/70 bg-background/60 pl-10 pr-9 text-sm shadow-xs transition-all focus-visible:border-primary/50 focus-visible:ring-primary/25 lg:w-72"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <CountdownRing progress={syncProgress} className="hidden sm:flex" title="Auto-sync countdown">
              {online ? (
                <Wifi className="size-3.5 text-primary" />
              ) : (
                <WifiOff className="size-3.5 text-destructive" />
              )}
            </CountdownRing>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setKitchenPref("sound", !prefs.sound)}
              className="size-9 rounded-full border border-border/70 bg-card text-foreground shadow-xs transition-all hover:border-primary/40 hover:bg-secondary hover:text-primary active:scale-95 sm:size-10"
              title={prefs.sound ? "Mute station alerts (M)" : "Enable station alerts (M)"}
            >
              {prefs.sound ? <Volume2 className="size-4" /> : <VolumeX className="size-4 text-muted-foreground" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleTheme()}
              className="size-9 rounded-full text-foreground/80 hover:text-foreground hover:bg-secondary transition-colors cursor-pointer sm:size-10"
              title="Toggle theme (T)"
            >
              {theme === "dark" ? (
                <Sun className="size-4 sm:size-5 text-amber-500" />
              ) : (
                <Moon className="size-4 sm:size-5 text-indigo-400" />
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="hidden h-10 rounded-full border-border/70 bg-card px-4.5 font-serif text-xs font-bold text-foreground shadow-xs transition-all hover:border-primary/40 hover:bg-secondary hover:shadow-warm active:scale-95 sm:inline-flex"
              title="Sync now (R)"
            >
              <RefreshCw className={cn("size-3.5 mr-1.5", refreshing && "animate-spin text-primary")} />
              <span className="font-serif text-xs font-bold">Sync</span>
            </Button>

            <Button
              variant="outline"
              onClick={handleExitToStore}
              className="hidden h-10 rounded-full border-border/70 bg-card px-4 font-serif text-xs font-bold text-muted-foreground shadow-xs transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary active:scale-95 md:inline-flex"
              title="Exit to customer storefront"
            >
              <Store className="size-3.5 mr-1.5" />
              <span>Customer Store</span>
            </Button>

            <Button
              variant="outline"
              onClick={handleSignOut}
              className="hidden h-10 rounded-full border-border/70 bg-card px-4.5 font-serif text-xs font-bold text-muted-foreground shadow-xs transition-all hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive active:scale-95 sm:inline-flex"
              title="Sign out"
            >
              <LogOut className="size-3.5 mr-1.5" />
              <span className="font-serif text-xs font-bold">Sign Out</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9 rounded-full border border-border/70 bg-card text-foreground shadow-xs transition-all hover:border-primary/40 hover:bg-secondary active:scale-95 sm:hidden"
                  title="More actions"
                >
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="min-w-44 rounded-2xl border-border/70 bg-card p-1.5 shadow-warm-lg"
              >
                <DropdownMenuItem
                  onClick={handleExitToStore}
                  className="rounded-xl font-semibold"
                >
                  <Store className="size-4 text-primary" />
                  Customer Store
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="rounded-xl font-semibold"
                >
                  <RefreshCw className={cn("size-4 text-primary", refreshing && "animate-spin")} />
                  Sync now
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1 bg-border/60" />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="rounded-xl font-semibold text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {isBoard && (
          <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-border/50 bg-secondary/25 px-3.5 py-2 text-[11px] font-semibold text-muted-foreground no-scrollbar sm:overflow-visible sm:px-6 md:px-8">
            <span className="hidden shrink-0 truncate sm:inline">{meta.subtitle}</span>
            <span className="flex items-center gap-2.5 tabular-nums sm:ml-auto sm:gap-3">
              <span className="flex shrink-0 items-center gap-1.5">
                <StatusDot tone="amber" pulse={false} /> {pendingOrders.length} to prep
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                <StatusDot tone="flame" pulse={preparingOrders.length > 0} /> {preparingOrders.length} cooking
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                <StatusDot tone="emerald" pulse={false} /> {readyOrders.length} ready
              </span>
              {stats.delayed > 0 && (
                <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 font-bold text-destructive">
                  {stats.delayed} late
                </span>
              )}
            </span>
          </div>
        )}

        <main className="relative flex-1 overflow-hidden p-3 pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] sm:p-5 md:p-6 lg:pb-6">
          {loading ? (
            <KdsBoardSkeleton />
          ) : error && activeOrders.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <ErrorState
                title="Kitchen feed unavailable"
                description={error}
                onRetry={handleRefresh}
              />
            </div>
          ) : activeView === "customers" ? (
            <CustomersView customers={safeCustomers} orders={safeOrders} orderItems={safeItems} />
          ) : activeView === "performance" ? (
            <PerformanceView orders={safeOrders} reviews={safeReviews} targetPrepMinutes={prefs.targetPrepMinutes} />
          ) : activeView === "chef-profile" ? (
            <ChefProfileView
              user={user}
              stats={stats}
              revenueText={formatMoney(stats.revenue)}
              onRefresh={handleRefresh}
              onSignOut={handleSignOut}
            />
          ) : (
            <DashboardView
              pendingOrders={pendingOrders}
              preparingOrders={preparingOrders}
              readyOrders={readyOrders}
              updateOrderStatus={updateOrderStatus}
              onOrderClick={setSelectedOrder}
              stats={stats}
              revenue={stats.revenue}
              totalOrdersToday={stats.totalOrdersToday}
              stageFilter={stageFilter}
              onStageFilterChange={setStageFilter}
              query={query}
              onClearQuery={() => setQuery("")}
              onSearchMobile={() => searchRef.current?.focus()}
              targetPrepMinutes={prefs.targetPrepMinutes}
              density={prefs.density}
              showImages={prefs.showImages}
              syncing={refreshing}
              error={error}
            />
          )}
        </main>

        <div className="pointer-events-none fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))] z-[70] select-none sm:inset-x-6 lg:hidden">
          <nav
            className="pointer-events-auto mx-auto max-w-md rounded-full border border-black/[0.08] bg-card/85 p-1.5 shadow-warm-lg ring-1 ring-white/30 backdrop-blur-2xl backdrop-saturate-150 transition-all duration-300 dark:border-white/[0.12] dark:bg-zinc-900/85 dark:ring-white/5"
            aria-label="Kitchen Navigation Dock"
          >
            <div className="grid grid-cols-4 items-center gap-1">
              {DOCK_ITEMS.map((item) => {
                const isActive =
                  activeView === item.id || (item.id === "dashboard" && isBoard);
                const badgeCount = item.badge ? stats.queue : 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectView(item.id)}
                    aria-current={isActive ? "page" : undefined}
                    className="flex w-full cursor-pointer items-center justify-center touch-manipulation transition-transform duration-100 focus:outline-none active:scale-95"
                  >
                    <div
                      className={cn(
                        "relative flex w-full cursor-pointer flex-col items-center justify-center rounded-full px-1 py-1.5 transition-all duration-150 select-none touch-manipulation",
                        isActive
                          ? "bg-primary/12 font-bold text-primary shadow-2xs"
                          : "text-muted-foreground/80 hover:bg-foreground/5 hover:text-foreground active:scale-90"
                      )}
                    >
                      <div className="relative mb-0.5 flex size-6 items-center justify-center">
                        <item.icon
                          className={cn(
                            "size-5 transition-transform duration-150 ease-out",
                            isActive ? "scale-110 stroke-[2.3]" : "stroke-[1.8]"
                          )}
                        />
                        {badgeCount > 0 && (
                          <span className="absolute -top-1.5 -right-2.5 flex h-[17px] min-w-[17px] animate-in items-center justify-center rounded-full bg-gradient-to-r from-primary to-orange-500 px-1 text-[9px] font-extrabold text-white shadow-xs ring-2 ring-card zoom-in-75 duration-150">
                            {badgeCount}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] leading-none tracking-tight">{item.label}</span>
                      {isActive && (
                        <span className="absolute bottom-1 left-1/2 h-0.5 w-2.5 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_8px_oklch(0.55_0.22_28/0.8)]" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      </div>

      <OrderDetailsPanel
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        user={user}
        customers={safeCustomers}
        history={selectedOrder ? historyByOrder.get(String(selectedOrder.id)) || [] : []}
        updateOrderStatus={updateOrderStatus}
        targetPrepMinutes={prefs.targetPrepMinutes}
      />
    </div>
  );
}
