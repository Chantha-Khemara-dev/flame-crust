import { useEffect, useState } from "react";
import { list, update } from "@/lib/api";
import { toast } from "sonner";
import { 
  ChefHat, 
  Clock, 
  CheckCircle2, 
  ShoppingBag,
  RefreshCw,
  Flame,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

let cachedKitchenProducts = [];

export default function KitchenDashboard() {
  const [orders, setOrders] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [products, setProducts] = useState(() => cachedKitchenProducts);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mobileTab, setMobileTab] = useState("all");

  const fetchData = async (isInitial = false) => {
    try {
      const promises = [
        list("orders"),
        list("order_items")
      ];
      if (cachedKitchenProducts.length === 0 || isInitial) {
        promises.push(list("products"));
      }
      
      const results = await Promise.all(promises);
      setOrders(results[0] || []);
      setOrderItems(results[1] || []);
      if (results[2]) {
        cachedKitchenProducts = results[2];
        setProducts(results[2]);
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

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await update("orders", orderId, { status: newStatus });
      toast.success(`Order #${orderId} moved to ${newStatus.replace(/_/g, " ")}`);
      fetchData();
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
          image: product?.image || null,
        };
      })
    }));

  const pendingOrders = activeOrders.filter(o => o.status === "PENDING" || o.status === "CONFIRMED");
  const preparingOrders = activeOrders.filter(o => o.status === "PREPARING");
  const readyOrders = activeOrders.filter(o => o.status === "READY");

  const OrderCard = ({ order }) => (
    <div className="group bg-card/80 backdrop-blur-2xl rounded-3xl p-5 shadow-sm border border-border/50 hover:shadow-lg hover:border-primary/40 transition-all duration-300 flex flex-col relative overflow-hidden">
      {/* Glow Effect */}
      <div className="absolute -right-8 -top-8 size-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors pointer-events-none" />
      
      <div className="flex items-start justify-between mb-4 border-b border-border/50 pb-4 relative z-10">
        <div>
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1">
            Order Tag
          </span>
          <h3 className="text-2xl font-black text-foreground tracking-tight leading-none group-hover:text-primary transition-colors">
            #{order.order_number ? (order.order_number.length > 8 ? order.order_number.slice(-6) : order.order_number) : order.id}
          </h3>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1">
            Time In
          </span>
          <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-foreground bg-secondary/80 px-2.5 py-1 rounded-xl">
            <Clock className="size-3.5 text-primary" />
            {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[300px] mb-5 space-y-4 custom-scrollbar pr-2 relative z-10">
        {order.items.map((item, idx) => (
          <div key={idx} className="flex gap-3.5 items-center">
            {item.image ? (
              <div className="relative size-12 shrink-0 rounded-2xl overflow-hidden border border-border/50 shadow-sm">
                <img src={item.image} alt={item.product_name} className="w-full h-full object-cover" />
                <div className="absolute top-0 right-0 bg-primary/90 text-primary-foreground text-[10px] font-black px-1.5 py-0.5 rounded-bl-lg">
                  {item.quantity}x
                </div>
              </div>
            ) : (
              <div className="bg-primary/10 text-primary px-3 py-2 rounded-2xl font-black text-lg min-w-[48px] text-center shrink-0 border border-primary/20 shadow-sm shadow-primary/5 group-hover:scale-105 transition-transform">
                {item.quantity}x
              </div>
            )}
            <div className="flex-1 leading-tight">
              <span className="font-bold text-sm sm:text-base text-foreground line-clamp-1">{item.product_name}</span>
              {item.options && item.options !== "{}" && (
                <div className="text-xs font-semibold text-muted-foreground mt-1.5 flex flex-wrap gap-1.5">
                  {(() => {
                    try {
                      return Object.values(JSON.parse(item.options)).map((opt, i) => (
                         <span key={i} className="bg-secondary/60 px-2 py-0.5 rounded-md border border-border/50">{opt}</span>
                      ));
                    } catch (e) {
                      return <span className="bg-secondary/60 px-2 py-0.5 rounded-md border border-border/50">{String(item.options)}</span>;
                    }
                  })()}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-4 border-t border-border/50 relative z-10">
        {order.status === "PENDING" && (
          <Button 
            onClick={() => updateOrderStatus(order.id, "CONFIRMED")}
            className="w-full h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-all font-bold border border-blue-500/20 group/btn"
          >
            Confirm Ticket <ArrowRight className="size-4 ml-2 opacity-50 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all" />
          </Button>
        )}
        {order.status === "CONFIRMED" && (
          <Button 
            onClick={() => updateOrderStatus(order.id, "PREPARING")}
            className="w-full h-12 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 transition-all font-bold border border-orange-500/20 group/btn"
          >
            <Flame className="size-4 mr-2 opacity-70 group-hover/btn:scale-110 group-hover/btn:text-orange-500 transition-all" />
            Start Preparing
          </Button>
        )}
        {order.status === "PREPARING" && (
          <Button 
            onClick={() => updateOrderStatus(order.id, "READY")}
            className="w-full h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 transition-all font-bold text-base group/btn"
          >
            <CheckCircle2 className="size-5 mr-2 group-hover/btn:scale-110 transition-transform" />
            Mark as Ready
          </Button>
        )}
        {order.status === "READY" && (
          <div className="w-full h-12 rounded-2xl bg-secondary/50 text-muted-foreground text-sm font-bold flex items-center justify-center gap-2 border border-border/50">
            <ShoppingBag className="size-4 opacity-70" />
            Waiting for Dispatch
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)] w-full transition-colors relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-1">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-black flex items-center gap-2 text-foreground tracking-tight">
            <ChefHat className="size-8 text-primary" /> Kitchen KDS
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-muted-foreground mt-1 tracking-wide">
            LIVE ORDER PREPARATION QUEUE
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button 
            variant="outline" 
            onClick={() => window.open("/kitchen/dashboard", "_blank")}
            className="rounded-xl shrink-0 h-10 sm:h-11 px-3 sm:px-4 border-border/50 hover:bg-primary/5 text-foreground hover:text-primary font-bold shadow-sm transition-all text-xs sm:text-sm"
          >
            <ChefHat className="size-4 mr-1.5 sm:mr-2 opacity-70" />
            Standalone KDS
          </Button>
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-xl shrink-0 h-10 sm:h-11 px-3 sm:px-4 font-bold border-border/50 bg-secondary/30 hover:bg-secondary/80 transition-all text-xs sm:text-sm"
          >
            <RefreshCw className={cn("size-4 mr-1.5 sm:mr-2 opacity-70", refreshing && "animate-spin text-primary opacity-100")} />
            Sync
          </Button>
        </div>
      </div>

      {/* Mobile Column Tab Switcher */}
      <div className="md:hidden flex items-center gap-1 p-1 bg-secondary/40 rounded-2xl shrink-0">
        <button
          onClick={() => setMobileTab('all')}
          className={cn(
            "flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center",
            mobileTab === 'all'
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          All ({pendingOrders.length + preparingOrders.length + readyOrders.length})
        </button>
        <button
          onClick={() => setMobileTab('pending')}
          className={cn(
            "flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center",
            mobileTab === 'pending'
              ? "bg-card text-blue-600 dark:text-blue-400 shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          To Prepare ({pendingOrders.length})
        </button>
        <button
          onClick={() => setMobileTab('preparing')}
          className={cn(
            "flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center",
            mobileTab === 'preparing'
              ? "bg-card text-orange-600 dark:text-orange-400 shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Cooking ({preparingOrders.length})
        </button>
        <button
          onClick={() => setMobileTab('ready')}
          className={cn(
            "flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center",
            mobileTab === 'ready'
              ? "bg-card text-green-600 dark:text-green-400 shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Ready ({readyOrders.length})
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="size-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
        </div>
      ) : (
        <div className={cn(
          "flex-1 overflow-hidden pb-4",
          "md:grid md:grid-cols-3 md:gap-6",
          mobileTab === 'all' ? "flex flex-col gap-4 overflow-y-auto" : "flex flex-col"
        )}>
          
          {/* New / Confirmed Column */}
          <div className={cn(
            "flex flex-col bg-card/40 backdrop-blur-3xl rounded-[32px] border border-border/40 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.04)] relative h-full min-h-[260px]",
            mobileTab !== 'all' && mobileTab !== 'pending' && "hidden md:flex"
          )}>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-80" />
            <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-border/50 bg-secondary/20 flex items-center justify-between backdrop-blur-md shrink-0">
              <h2 className="font-black text-base sm:text-lg text-foreground flex items-center gap-2.5">
                <Clock className="size-4 sm:size-5 text-blue-500" /> To Prepare
              </h2>
              <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs sm:text-sm font-black px-3 py-0.5 sm:py-1 rounded-full shadow-sm">
                {pendingOrders.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-5 custom-scrollbar">
              {pendingOrders.length === 0 ? (
                <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-muted-foreground/60 space-y-3">
                  <Clock className="size-8 sm:size-10 opacity-20" />
                  <p className="text-xs sm:text-sm font-bold tracking-wide">Queue is empty</p>
                </div>
              ) : (
                pendingOrders.map(order => <OrderCard key={order.id} order={order} />)
              )}
            </div>
          </div>

          {/* Preparing Column */}
          <div className={cn(
            "flex flex-col bg-card/40 backdrop-blur-3xl rounded-[32px] border border-border/40 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.04)] relative h-full min-h-[260px]",
            mobileTab !== 'all' && mobileTab !== 'preparing' && "hidden md:flex"
          )}>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 to-amber-500 opacity-80" />
            <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-border/50 bg-secondary/20 flex items-center justify-between backdrop-blur-md shrink-0">
              <h2 className="font-black text-base sm:text-lg text-foreground flex items-center gap-2.5">
                <Flame className="size-4 sm:size-5 text-orange-500" /> Preparing
              </h2>
              <span className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 text-xs sm:text-sm font-black px-3 py-0.5 sm:py-1 rounded-full shadow-sm">
                {preparingOrders.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-5 custom-scrollbar">
              {preparingOrders.length === 0 ? (
                <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-muted-foreground/60 space-y-3">
                  <Flame className="size-8 sm:size-10 opacity-20" />
                  <p className="text-xs sm:text-sm font-bold tracking-wide">No active fires</p>
                </div>
              ) : (
                preparingOrders.map(order => <OrderCard key={order.id} order={order} />)
              )}
            </div>
          </div>

          {/* Ready Column */}
          <div className={cn(
            "flex flex-col bg-card/40 backdrop-blur-3xl rounded-[32px] border border-border/40 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.04)] relative h-full min-h-[260px]",
            mobileTab !== 'all' && mobileTab !== 'ready' && "hidden md:flex"
          )}>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500 opacity-80" />
            <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-border/50 bg-secondary/20 flex items-center justify-between backdrop-blur-md shrink-0">
              <h2 className="font-black text-base sm:text-lg text-foreground flex items-center gap-2.5">
                <CheckCircle2 className="size-4 sm:size-5 text-emerald-500" /> Ready
              </h2>
              <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs sm:text-sm font-black px-3 py-0.5 sm:py-1 rounded-full shadow-sm">
                {readyOrders.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-5 custom-scrollbar">
              {readyOrders.length === 0 ? (
                <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-muted-foreground/60 space-y-3">
                  <CheckCircle2 className="size-8 sm:size-10 opacity-20" />
                  <p className="text-xs sm:text-sm font-bold tracking-wide">All clear</p>
                </div>
              ) : (
                readyOrders.map(order => <OrderCard key={order.id} order={order} />)
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
