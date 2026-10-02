import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { list, update } from "@/lib/api";
import { toast } from "sonner";
import {
  ChefHat,
  RefreshCw,
  Search,
  X,
  ExternalLink,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorState } from "@/components/shared/error-state";
import { cn } from "@/lib/utils";
import { DashboardView } from "./../kitchen/components/DashboardView";
import { OrderDetailsPanel } from "./../kitchen/components/OrderDetailsPanel";
import {
  KdsBoardSkeleton,
  StatusDot,
  formatMoney,
  shortOrderNo,
  useKitchenPrefs,
  useNow,
} from "./../kitchen/components/kitchen-ui";

let cachedKitchenProducts = [];

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.items)) return value.items;
  if (value && Array.isArray(value.content)) return value.content;
  if (value && Array.isArray(value.data)) return value.data;
  return [];
};

export default function AdminKitchenDashboard() {
  const prefs = useKitchenPrefs();
  const now = useNow();

  const [orders, setOrders] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  const [products, setProducts] = useState(() => cachedKitchenProducts);
  const [customers, setCustomers] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [stageFilter, setStageFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [adminUser, setAdminUser] = useState(null);

  const searchRef = useRef(null);

  useEffect(() => {
    try {
      setAdminUser(JSON.parse(localStorage.getItem("adminAuth") || "null"));
    } catch {
      setAdminUser(null);
    }
  }, []);

  const fetchData = useCallback(async (isInitial = false) => {
    try {
      const wanted = [
        ["orders", list("orders", { limit: 100, sort: "id", dir: "desc" })],
        ["order_items", list("order_items", { limit: 250, sort: "id", dir: "desc" })],
        ["order_status_history", list("order_status_history", { limit: 400, sort: "id", dir: "desc" })],
      ];
      if (isInitial) {
        wanted.push(["customers", list("customers", { limit: 100, sort: "id", dir: "desc" })]);
        wanted.push(["addresses", list("addresses", { limit: 200, sort: "id", dir: "desc" })]);
      }
      if (isInitial || cachedKitchenProducts.length === 0) {
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
      if (payload.products?.length > 0) {
        cachedKitchenProducts = payload.products;
        setProducts(payload.products);
      }
      setError(null);
    } catch (err) {
      setError(err?.message || "Unable to reach the kitchen server.");
      if (isInitial) toast.error("Failed to load kitchen data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(false), 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(false);
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    const known = toArray(orders).find((o) => String(o.id) === String(orderId));
    try {
      await update("orders", orderId, { status: newStatus });
      toast.success(
        `Ticket #${known ? shortOrderNo(known) : orderId} → ${newStatus.replace(/_/g, " ")}`
      );
      setSelectedOrder((prev) =>
        prev && String(prev.id) === String(orderId) ? { ...prev, status: newStatus } : prev
      );
      fetchData(false);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const safeOrders = useMemo(() => toArray(orders), [orders]);
  const safeItems = useMemo(() => toArray(orderItems), [orderItems]);
  const safeProducts = useMemo(() => toArray(products), [products]);
  const safeCustomers = useMemo(() => toArray(customers), [customers]);
  const safeAddresses = useMemo(() => toArray(addresses), [addresses]);
  const safeHistory = useMemo(() => toArray(orderHistory), [orderHistory]);

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
    return activeOrders.filter((order) =>
      [order.order_number, order.id, order.customer_name, order.notes, order.order_type, ...(order.items || []).map((i) => i.product_name)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
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
    const delayed = activeOrders.filter(
      (o) => o.created_at && now - new Date(o.created_at).getTime() > prefs.targetPrepMinutes * 60000
    ).length;

    return {
      totalOrdersToday: todays.length,
      completedToday: completed.length,
      revenue,
      delayed,
      queue: pendingOrders.length + preparingOrders.length,
    };
  }, [safeOrders, activeOrders, pendingOrders.length, preparingOrders.length, now, prefs.targetPrepMinutes]);

  return (
    <div className="flex w-full flex-col gap-4 sm:gap-5">
      <header className="flex flex-col gap-3 rounded-[28px] border border-border/70 bg-card/85 p-4 shadow-warm backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-orange-500 to-amber-500 text-white shadow-warm ring-2 ring-primary/20">
            <ChefHat className="size-5.5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate font-serif text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Kitchen KDS
              </h1>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <StatusDot tone="emerald" />
                Live queue
              </span>
            </div>
            <p className="mt-0.5 flex items-center gap-2 truncate text-xs font-semibold text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Flame className="size-3.5 text-primary" />
                {stats.queue} ticket{stats.queue === 1 ? "" : "s"} on the rail
              </span>
              {stats.delayed > 0 && (
                <span className="flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2 py-px text-[10px] font-extrabold text-destructive">
                  {stats.delayed} late
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <div className="relative order-last w-full md:order-none md:w-auto">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
            <Input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tickets…"
              className="h-10 w-full rounded-full border-border/70 bg-background/60 pl-10 pr-9 text-sm shadow-xs focus-visible:border-primary/50 focus-visible:ring-primary/25 md:w-52 lg:w-64"
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

          <Button
            variant="outline"
            onClick={() => window.open("/kitchen/dashboard", "_blank")}
            className="h-10 shrink-0 rounded-full border-border/70 bg-card px-3.5 font-serif text-xs font-bold text-foreground shadow-xs transition-all hover:border-primary/40 hover:bg-secondary hover:text-primary active:scale-95 sm:px-4 sm:text-sm"
          >
            <ExternalLink className="size-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Standalone KDS</span>
          </Button>

          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-10 shrink-0 rounded-full border-border/70 bg-card px-3.5 font-serif text-xs font-bold text-foreground shadow-xs transition-all hover:border-primary/40 hover:bg-secondary active:scale-95 sm:px-4 sm:text-sm"
          >
            <RefreshCw className={cn("size-3.5 sm:mr-1.5", refreshing && "animate-spin text-primary")} />
            <span className="hidden sm:inline">Sync</span>
          </Button>
        </div>
      </header>

      <div className="md:h-[calc(100dvh-16.5rem)] md:min-h-[560px]">
        {loading ? (
          <KdsBoardSkeleton />
        ) : error && activeOrders.length === 0 ? (
          <div className="flex h-full min-h-[320px] items-center justify-center rounded-[28px] border border-border/70 bg-card/70">
            <ErrorState title="Kitchen feed unavailable" description={error} onRetry={handleRefresh} />
          </div>
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
      </div>

      <OrderDetailsPanel
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        user={adminUser || { name: "Admin", role: "ADMIN" }}
        customers={safeCustomers}
        history={selectedOrder ? historyByOrder.get(String(selectedOrder.id)) || [] : []}
        updateOrderStatus={updateOrderStatus}
        targetPrepMinutes={prefs.targetPrepMinutes}
      />
    </div>
  );
}
