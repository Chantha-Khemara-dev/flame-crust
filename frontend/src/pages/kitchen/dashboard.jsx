import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { list, update } from "@/lib/api";
import { unsubscribeFromPushNotifications } from "@/lib/push-notifications";
import { toast } from "sonner";
import { 
  RefreshCw, 
  LogOut, 
  Sun, 
  Moon, 
  Menu, 
  LayoutDashboard, 
  Users, 
  LineChart, 
  ChefHat,
  Flame
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Import components
import { KitchenSidebar } from "./components/Sidebar";
import { DashboardView } from "./components/DashboardView";
import { CustomersView } from "./components/CustomersView";
import { PerformanceView } from "./components/PerformanceView";
import { OrderDetailsPanel } from "./components/OrderDetailsPanel";
import { ChefProfileView } from "./components/MiscViews";

let cachedStandaloneKitchenProducts = [];

export default function KitchenDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [products, setProducts] = useState(() => cachedStandaloneKitchenProducts);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  
  const [theme, setTheme] = useState(localStorage.getItem("kitchenTheme") || "light");
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  useEffect(() => {
    localStorage.setItem("kitchenTheme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

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

  const fetchData = async (isInitial = false) => {
    try {
      // Recent orders and items (limit 100/250) sorted by newest first for maximum speed
      const promises = [
        list("orders", { limit: 100, sort: "id", dir: "desc" }),
        list("order_items", { limit: 250, sort: "id", dir: "desc" }),
      ];

      // Customers only need to be fetched initially or on manual refresh
      if (isInitial || customers.length === 0) {
        promises.push(list("customers", { limit: 100, sort: "id", dir: "desc" }));
      }
      if (cachedStandaloneKitchenProducts.length === 0 || isInitial) {
        promises.push(list("products", { limit: 100 }));
      }
      
      const results = await Promise.all(promises);
      const toArray = (v) => {
        if (Array.isArray(v)) return v;
        if (v && Array.isArray(v.items)) return v.items;
        if (v && Array.isArray(v.content)) return v.content;
        if (v && Array.isArray(v.data)) return v.data;
        return [];
      };

      if (results[0]) setOrders(toArray(results[0]));
      if (results[1]) setOrderItems(toArray(results[1]));
      if (results[2] && (isInitial || customers.length === 0)) {
        setCustomers(toArray(results[2]));
      }
      const rawProd = results[3] || (results.length > 2 && cachedStandaloneKitchenProducts.length === 0 ? results[2] : null);
      if (rawProd) {
        const prodList = toArray(rawProd);
        if (prodList.length > 0) {
          cachedStandaloneKitchenProducts = prodList;
          setProducts(prodList);
        }
      }
    } catch (error) {
      if (isInitial) toast.error("Failed to load kitchen data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(false), 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleSignOut = async () => {
    try {
      await unsubscribeFromPushNotifications();
    } catch (e) {
      console.error("Failed to unsubscribe push:", e);
    }
    localStorage.removeItem("kitchenAuth");
    localStorage.removeItem("adminAuth");
    window.dispatchEvent(new Event("authChanged"));
    navigate("/login");
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await update("orders", orderId, { status: newStatus });
      toast.success(`Order #${orderId} moved to ${newStatus.replace(/_/g, " ")}`);
      fetchData();
      
      // If we have an order selected and we updated it, update the selected order too
      if (selectedOrder && String(selectedOrder.id) === String(orderId)) {
        setSelectedOrder(prev => ({...prev, status: newStatus}));
      }
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  // Filter and enrich orders
  const safeOrders = Array.isArray(orders) ? orders : (orders?.items || orders?.content || []);
  const safeOrderItems = Array.isArray(orderItems) ? orderItems : (orderItems?.items || orderItems?.content || []);
  const safeProducts = Array.isArray(products) ? products : (products?.items || products?.content || []);
  const safeCustomers = Array.isArray(customers) ? customers : (customers?.items || customers?.content || []);

  const activeOrders = safeOrders
    .filter(o => ["PENDING", "CONFIRMED", "PREPARING", "READY"].includes(o.status))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map(order => ({
      ...order,
      items: safeOrderItems.filter(item => String(item.order_id) === String(order.id)).map(item => {
        const product = safeProducts.find(p => String(p.id) === String(item.product_id));
        return {
          ...item,
          product_name: product?.name || item.product_name,
          product_image: product?.image || null
        };
      })
    }));

  const pendingOrders = activeOrders.filter(o => o.status === "PENDING" || o.status === "CONFIRMED");
  const preparingOrders = activeOrders.filter(o => o.status === "PREPARING");
  const readyOrders = activeOrders.filter(o => o.status === "READY");

  // Dynamic real revenue calculation
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todaysCompletedOrders = safeOrders.filter(o => 
    new Date(o.created_at) >= todayStart && 
    ['READY', 'COMPLETED', 'DELIVERED'].includes(o.status)
  );
  const totalOrdersToday = todaysCompletedOrders.length;
  const todayRevenue = todaysCompletedOrders.reduce((sum, o) => sum + (parseFloat(o.total || o.total_amount) || 0), 0);
  const activeOrdersCount = pendingOrders.length + preparingOrders.length;

  if (!user) return null;

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] overflow-hidden bg-background text-foreground font-sans selection:bg-primary/20 relative">
      {/* Ambient warm atmospheric glow matching hero page */}
      <div className="absolute -top-32 right-10 w-[500px] h-[500px] bg-primary/[0.04] dark:bg-primary/[0.08] rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute -bottom-32 left-10 w-[500px] h-[500px] bg-amber-500/[0.04] dark:bg-amber-500/[0.06] rounded-full blur-3xl pointer-events-none -z-10" />
      
      <KitchenSidebar 
        activeView={activeView} 
        setActiveView={setActiveView} 
        user={user} 
        activeOrdersCount={activeOrdersCount}
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header */}
        <header className="h-[calc(env(safe-area-inset-top,0px)+3.75rem)] sm:h-[calc(env(safe-area-inset-top,0px)+4.25rem)] pt-[env(safe-area-inset-top,0px)] border-b border-border/70 bg-card/85 dark:bg-zinc-950/85 backdrop-blur-2xl flex items-center justify-between px-3.5 sm:px-6 md:px-8 shrink-0 z-20 transition-colors shadow-2xs">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="size-9 sm:size-10 rounded-2xl bg-gradient-to-br from-primary via-orange-500 to-amber-500 flex items-center justify-center shadow-warm text-white shrink-0 ring-2 ring-primary/20">
              <Flame className="size-5 fill-white/20 animate-flicker" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-serif font-bold text-base sm:text-xl text-foreground tracking-tight capitalize leading-tight truncate">
                  {activeView === 'dashboard' ? 'Kitchen Board' : activeView.replace('-', ' ')}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shrink-0 shadow-2xs">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Station
                </span>
              </div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider truncate flex items-center gap-1.5 mt-0.5">
                <span className="font-bold text-foreground">{activeOrdersCount}</span>
                <span>{activeOrdersCount === 1 ? 'order in queue' : 'orders in queue'}</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button 
              onClick={toggleTheme}
              className="p-2.5 rounded-full bg-card hover:bg-secondary border border-border/80 text-foreground transition-all shadow-xs hover:border-primary/40 hover:scale-105 active:scale-95"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="size-4 sm:size-4.5 text-accent" /> : <Moon className="size-4 sm:size-4.5 text-foreground" />}
            </button>

            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={refreshing}
              className="rounded-full h-9 sm:h-10 px-3.5 sm:px-4.5 font-serif font-bold text-foreground bg-card hover:bg-secondary border-border/80 shadow-xs hover:border-primary/40 hover:shadow-warm transition-all active:scale-95"
              title="Refresh orders"
            >
              <RefreshCw className={cn("size-3.5 sm:mr-1.5", refreshing && "animate-spin text-primary")} />
              <span className="hidden sm:inline text-xs font-serif font-bold">Sync</span>
            </Button>

            <Button 
              variant="outline" 
              onClick={handleSignOut}
              className="rounded-full h-9 sm:h-10 px-3.5 sm:px-4.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 font-serif font-bold bg-card border-border/80 shadow-xs hover:shadow-warm transition-all active:scale-95"
              title="Sign Out"
            >
              <LogOut className="size-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline text-xs font-serif font-bold">Sign Out</span>
            </Button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden p-3 sm:p-5 md:p-6 pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] lg:pb-6 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="size-12 rounded-full border-4 border-border border-t-primary animate-spin" />
            </div>
          ) : (
            <>
              {activeView === 'dashboard' || activeView === 'orders' || activeView === 'preparing' || activeView === 'ready' ? (
                <DashboardView 
                  activeView={activeView}
                  setActiveView={setActiveView}
                  pendingOrders={pendingOrders}
                  preparingOrders={preparingOrders}
                  readyOrders={readyOrders}
                  updateOrderStatus={updateOrderStatus}
                  onOrderClick={setSelectedOrder}
                  totalOrdersToday={totalOrdersToday}
                  todayRevenue={todayRevenue}
                />
              ) : activeView === 'customers' ? (
                <CustomersView customers={safeCustomers} orders={safeOrders} />
              ) : activeView === 'performance' ? (
                <PerformanceView orders={safeOrders} />
              ) : activeView === 'chef-profile' ? (
                <ChefProfileView 
                  user={user} 
                  totalOrdersToday={totalOrdersToday} 
                  activeOrdersCount={activeOrdersCount} 
                  onRefresh={fetchData}
                  onSignOut={handleSignOut}
                />
              ) : (
                <DashboardView 
                  activeView="dashboard"
                  setActiveView={setActiveView}
                  pendingOrders={pendingOrders}
                  preparingOrders={preparingOrders}
                  readyOrders={readyOrders}
                  updateOrderStatus={updateOrderStatus}
                  onOrderClick={setSelectedOrder}
                  totalOrdersToday={totalOrdersToday}
                  todayRevenue={todayRevenue}
                />
              )}
            </>
          )}
        </main>

        {/* Authentic iOS Frosted Glass Mobile Bottom Capsule - Matching Customer Navigation */}
        <div className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))] inset-x-3 sm:inset-x-6 z-[70] lg:hidden select-none pointer-events-none">
          <nav
            className="pointer-events-auto mx-auto max-w-md bg-card/85 dark:bg-zinc-900/85 backdrop-blur-2xl backdrop-saturate-150 border border-black/[0.08] dark:border-white/[0.12] ring-1 ring-white/30 dark:ring-white/5 shadow-warm-lg rounded-full p-1.5 transition-all duration-300"
            aria-label="Kitchen Navigation Dock"
          >
            <div className="grid grid-cols-4 items-center gap-1">
              {/* Tab 1: Board */}
              <button
                type="button"
                onClick={() => setActiveView('dashboard')}
                className="w-full flex items-center justify-center focus:outline-none touch-manipulation cursor-pointer active:scale-95 transition-transform duration-100"
              >
                <div
                  className={cn(
                    "relative flex flex-col items-center justify-center py-1.5 px-1 rounded-full transition-all duration-150 cursor-pointer touch-manipulation select-none w-full",
                    activeView === 'dashboard'
                      ? "bg-primary/12 text-primary shadow-2xs font-bold"
                      : "text-muted-foreground/80 hover:text-foreground hover:bg-foreground/5 active:scale-90"
                  )}
                >
                  <div className="relative flex items-center justify-center size-6 mb-0.5">
                    <LayoutDashboard
                      className={cn(
                        "size-5 transition-transform duration-150 ease-out",
                        activeView === 'dashboard' ? "scale-110 stroke-[2.3]" : "stroke-[1.8]"
                      )}
                    />
                    {activeOrdersCount > 0 && (
                      <span className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] px-1 rounded-full bg-gradient-to-r from-primary to-orange-500 text-white text-[9px] font-extrabold flex items-center justify-center ring-2 ring-card shadow-xs animate-in zoom-in-75 duration-150">
                        {activeOrdersCount}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] tracking-tight leading-none">
                    Board
                  </span>
                  {activeView === 'dashboard' && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-0.5 rounded-full bg-primary shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                  )}
                </div>
              </button>

              {/* Tab 2: Customers */}
              <button
                type="button"
                onClick={() => setActiveView('customers')}
                className="w-full flex items-center justify-center focus:outline-none touch-manipulation cursor-pointer active:scale-95 transition-transform duration-100"
              >
                <div
                  className={cn(
                    "relative flex flex-col items-center justify-center py-1.5 px-1 rounded-full transition-all duration-150 cursor-pointer touch-manipulation select-none w-full",
                    activeView === 'customers'
                      ? "bg-primary/12 text-primary shadow-2xs font-bold"
                      : "text-muted-foreground/80 hover:text-foreground hover:bg-foreground/5 active:scale-90"
                  )}
                >
                  <div className="relative flex items-center justify-center size-6 mb-0.5">
                    <Users
                      className={cn(
                        "size-5 transition-transform duration-150 ease-out",
                        activeView === 'customers' ? "scale-110 stroke-[2.3]" : "stroke-[1.8]"
                      )}
                    />
                  </div>
                  <span className="text-[10px] tracking-tight leading-none">
                    Customers
                  </span>
                  {activeView === 'customers' && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-0.5 rounded-full bg-primary shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                  )}
                </div>
              </button>

              {/* Tab 3: Analytics */}
              <button
                type="button"
                onClick={() => setActiveView('performance')}
                className="w-full flex items-center justify-center focus:outline-none touch-manipulation cursor-pointer active:scale-95 transition-transform duration-100"
              >
                <div
                  className={cn(
                    "relative flex flex-col items-center justify-center py-1.5 px-1 rounded-full transition-all duration-150 cursor-pointer touch-manipulation select-none w-full",
                    activeView === 'performance'
                      ? "bg-primary/12 text-primary shadow-2xs font-bold"
                      : "text-muted-foreground/80 hover:text-foreground hover:bg-foreground/5 active:scale-90"
                  )}
                >
                  <div className="relative flex items-center justify-center size-6 mb-0.5">
                    <LineChart
                      className={cn(
                        "size-5 transition-transform duration-150 ease-out",
                        activeView === 'performance' ? "scale-110 stroke-[2.3]" : "stroke-[1.8]"
                      )}
                    />
                  </div>
                  <span className="text-[10px] tracking-tight leading-none">
                    Analytics
                  </span>
                  {activeView === 'performance' && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-0.5 rounded-full bg-primary shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                  )}
                </div>
              </button>

              {/* Tab 4: Profile */}
              <button
                type="button"
                onClick={() => setActiveView('chef-profile')}
                className="w-full flex items-center justify-center focus:outline-none touch-manipulation cursor-pointer active:scale-95 transition-transform duration-100"
              >
                <div
                  className={cn(
                    "relative flex flex-col items-center justify-center py-1.5 px-1 rounded-full transition-all duration-150 cursor-pointer touch-manipulation select-none w-full",
                    activeView === 'chef-profile'
                      ? "bg-primary/12 text-primary shadow-2xs font-bold"
                      : "text-muted-foreground/80 hover:text-foreground hover:bg-foreground/5 active:scale-90"
                  )}
                >
                  <div className="relative flex items-center justify-center size-6 mb-0.5">
                    <ChefHat
                      className={cn(
                        "size-5 transition-transform duration-150 ease-out",
                        activeView === 'chef-profile' ? "scale-110 stroke-[2.3]" : "stroke-[1.8]"
                      )}
                    />
                  </div>
                  <span className="text-[10px] tracking-tight leading-none">
                    Profile
                  </span>
                  {activeView === 'chef-profile' && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-0.5 rounded-full bg-primary shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                  )}
                </div>
              </button>
            </div>
          </nav>
        </div>
      </div>

      {/* Side Panel for Order Details */}
      <OrderDetailsPanel 
        order={selectedOrder} 
        onClose={() => setSelectedOrder(null)} 
        user={user}
        customers={customers}
        updateOrderStatus={updateOrderStatus}
      />
    </div>
  );
}
