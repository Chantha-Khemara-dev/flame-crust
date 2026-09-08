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
  ChefHat 
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  useEffect(() => {
    localStorage.setItem("kitchenTheme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.body.style.backgroundColor = '#09090b';
    } else {
      document.documentElement.classList.remove("dark");
      document.body.style.backgroundColor = '#f8fafc';
    }
    return () => {
      document.body.style.backgroundColor = '';
      document.documentElement.classList.remove("dark");
    };
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
      const promises = [
        list("orders"),
        list("order_items"),
        list("customers")
      ];
      if (cachedStandaloneKitchenProducts.length === 0 || isInitial) {
        promises.push(list("products"));
      }
      
      const results = await Promise.all(promises);
      setOrders(results[0] || []);
      setOrderItems(results[1] || []);
      setCustomers(results[2] || []);
      if (results[3]) {
        cachedStandaloneKitchenProducts = results[3];
        setProducts(results[3]);
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
  const activeOrders = orders
    .filter(o => ["PENDING", "CONFIRMED", "PREPARING", "READY"].includes(o.status))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map(order => ({
      ...order,
      items: orderItems.filter(item => String(item.order_id) === String(order.id)).map(item => {
        const product = products.find(p => String(p.id) === String(item.product_id));
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
  const todaysCompletedOrders = orders.filter(o => 
    new Date(o.created_at) >= todayStart && 
    ['READY', 'COMPLETED', 'DELIVERED'].includes(o.status)
  );
  const totalOrdersToday = todaysCompletedOrders.length;
  const todayRevenue = todaysCompletedOrders.reduce((sum, o) => sum + (parseFloat(o.total || o.total_amount) || 0), 0);
  const activeOrdersCount = pendingOrders.length + preparingOrders.length;

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 font-sans selection:bg-orange-100 dark:selection:bg-orange-500/30">
      
      <KitchenSidebar 
        activeView={activeView} 
        setActiveView={setActiveView} 
        user={user} 
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        activeOrdersCount={activeOrdersCount}
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header */}
        <header className="h-[calc(env(safe-area-inset-top)+4.25rem)] pt-[env(safe-area-inset-top)] border-b border-slate-200/60 dark:border-white/10 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md flex items-center justify-between px-3 sm:px-6 md:px-8 shrink-0 z-20 transition-colors">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-white dark:bg-zinc-800 shadow-sm border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 transition-colors"
              aria-label="Open kitchen menu"
            >
              <Menu className="size-5" />
            </button>
            <div>
              <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-zinc-100 tracking-tight capitalize leading-tight">
                {activeView === 'dashboard' ? 'Kitchen Board' : activeView.replace('-', ' ')}
              </h1>
              <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mt-0.5">
                Live Kitchen Status
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={toggleTheme}
              className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-zinc-800 shadow-sm border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 transition-colors"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="size-4 sm:size-5" /> : <Moon className="size-4 sm:size-5" />}
            </button>

            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={refreshing}
              className="rounded-xl h-9 sm:h-11 px-2.5 sm:px-4 font-bold text-slate-600 dark:text-zinc-300 bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 shadow-sm hover:bg-slate-50 dark:hover:bg-zinc-700"
              title="Refresh orders"
            >
              <RefreshCw className={cn("size-4 sm:mr-2", refreshing && "animate-spin text-blue-600")} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            <Button 
              variant="outline" 
              onClick={handleSignOut}
              className="rounded-xl h-9 sm:h-11 px-2.5 sm:px-4 text-slate-600 dark:text-zinc-300 font-bold bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 shadow-sm hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200"
              title="Sign Out"
            >
              <LogOut className="size-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden p-3 sm:p-5 md:p-6 pb-20 lg:pb-6 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="size-12 rounded-full border-4 border-slate-200 dark:border-zinc-800 border-t-orange-500 animate-spin" />
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
                <CustomersView customers={customers} orders={orders} />
              ) : activeView === 'performance' ? (
                <PerformanceView orders={orders} />
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

        {/* Mobile Bottom Quick Navigation Bar */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-white/10 px-2 py-1.5 flex items-center justify-around shadow-lg">
          <button
            onClick={() => setActiveView('dashboard')}
            className={cn(
              "flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[11px] font-bold transition-colors min-w-[56px] relative",
              activeView === 'dashboard' ? "text-orange-500 font-black" : "text-slate-500 dark:text-zinc-400"
            )}
          >
            <div className="relative">
              <LayoutDashboard className="size-5 mb-0.5" />
              {activeOrdersCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-orange-500 text-white text-[9px] font-black size-4 rounded-full flex items-center justify-center shadow-sm">
                  {activeOrdersCount}
                </span>
              )}
            </div>
            <span>Board</span>
          </button>
          <button
            onClick={() => setActiveView('customers')}
            className={cn(
              "flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[11px] font-bold transition-colors min-w-[56px]",
              activeView === 'customers' ? "text-blue-500 font-black" : "text-slate-500 dark:text-zinc-400"
            )}
          >
            <Users className="size-5 mb-0.5" />
            <span>Customers</span>
          </button>
          <button
            onClick={() => setActiveView('performance')}
            className={cn(
              "flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[11px] font-bold transition-colors min-w-[56px]",
              activeView === 'performance' ? "text-purple-500 font-black" : "text-slate-500 dark:text-zinc-400"
            )}
          >
            <LineChart className="size-5 mb-0.5" />
            <span>Analytics</span>
          </button>
          <button
            onClick={() => setActiveView('chef-profile')}
            className={cn(
              "flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[11px] font-bold transition-colors min-w-[56px]",
              activeView === 'chef-profile' ? "text-emerald-500 font-black" : "text-slate-500 dark:text-zinc-400"
            )}
          >
            <ChefHat className="size-5 mb-0.5" />
            <span>Profile</span>
          </button>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[11px] font-bold text-slate-500 dark:text-zinc-400 min-w-[56px]"
          >
            <Menu className="size-5 mb-0.5" />
            <span>Menu</span>
          </button>
        </nav>
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
