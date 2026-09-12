import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bike,
  Package,
  ChevronRight,
  X,
  ChefHat,
  Clock,
  Flame,
  Layers,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { list, API_URL } from "@/lib/api";
import { cn, formatPrice } from "@/lib/utils";
import { useCart } from "@/lib/cart-store";

const HIDDEN_ROUTES = [
  "/admin",
  "/driver",
  "/kitchen",
  "/track",
  "/payment",
  "/checkout",
  "/order-confirmation",
  "/login",
  "/product",
  "/cart",
  "/review",
];

export function ActiveOrderWidget() {
  const { isOpen: isCartOpen } = useCart();
  const [activeOrders, setActiveOrders] = useState([]);
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return localStorage.getItem("flame_active_order_minimized") === "true";
    } catch (e) {
      return false;
    }
  });
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (HIDDEN_ROUTES.some((route) => location.pathname.startsWith(route))) {
      return;
    }

    const checkActiveOrders = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      try {
        const stored = localStorage.getItem("customerAuth");
        if (!stored) {
          setActiveOrders([]);
          return;
        }
        const customer = JSON.parse(stored);
        if (!customer || !customer.id) return;

        let orders = [];
        const res = await fetch(`${API_URL}/auth/customer-profile-data?customerId=${customer.id || ""}&phone=${encodeURIComponent(customer.phone || "")}&email=${encodeURIComponent(customer.email || "")}`).catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          orders = data.orders || [];
        }

        if (orders.length === 0) {
          const rawOrders = (await list("orders", { limit: 100, dir: "desc" }).catch(() => [])) || [];
          orders = Array.isArray(rawOrders) ? rawOrders : (rawOrders.items || rawOrders.content || []);
        }

        const activeList = orders
          .filter(
            (o) =>
              (String(o.customer_id) === String(customer.id) || (customer.phone && o.customer_phone === customer.phone) || (customer.email && o.customer_email === customer.email)) &&
              o.status !== "DELIVERED" &&
              o.status !== "CANCELLED"
          )
          .sort((a, b) => new Date(String(b.created_at || "").replace(" ", "T")) - new Date(String(a.created_at || "").replace(" ", "T")));

        setActiveOrders(activeList);
      } catch (e) {
        // silent fail
      }
    };

    checkActiveOrders();
    const interval = setInterval(checkActiveOrders, 10000);
    const handleVis = () => { if (document.visibilityState === "visible") checkActiveOrders(); };
    document.addEventListener("visibilitychange", handleVis);

    const handleOrderPlaced = () => {
      setIsDismissed(false);
      try {
        localStorage.setItem("flame_active_order_minimized", "false");
      } catch (e) { }
      checkActiveOrders();
    };

    window.addEventListener("orderPlaced", handleOrderPlaced);
    window.addEventListener("authChanged", checkActiveOrders);
    window.addEventListener("storage", checkActiveOrders);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVis);
      window.removeEventListener("orderPlaced", handleOrderPlaced);
      window.removeEventListener("authChanged", checkActiveOrders);
      window.removeEventListener("storage", checkActiveOrders);
    };
  }, [location.pathname]);

  useEffect(() => {
    const isHiddenRoute = HIDDEN_ROUTES.some((route) => location.pathname.startsWith(route));
    const isBig = !isHiddenRoute && !isCartOpen && activeOrders.length > 0 && !isDismissed && !modalOpen;
    try {
      sessionStorage.setItem("flame_time_driver_expanded", isBig ? "true" : "false");
    } catch {}
    window.dispatchEvent(new CustomEvent("timeDriverStateChange", { detail: { isExpanded: isBig } }));
  }, [location.pathname, isCartOpen, activeOrders.length, isDismissed, modalOpen]);

  useEffect(() => {
    return () => {
      try {
        sessionStorage.setItem("flame_time_driver_expanded", "false");
      } catch {}
      window.dispatchEvent(new CustomEvent("timeDriverStateChange", { detail: { isExpanded: false } }));
    };
  }, []);

  if (isCartOpen || HIDDEN_ROUTES.some((route) => location.pathname.startsWith(route))) {
    return null;
  }

  if (activeOrders.length === 0) return null;

  const isMultiple = activeOrders.length > 1;
  const currentOrder = activeOrders[0];

  const getStatusInfo = (status) => {
    switch (status?.toUpperCase()) {
      case "OUT_FOR_DELIVERY":
      case "ON_DELIVERY":
        return {
          title: "Driver on the way",
          sub: "Arriving in ~10-15 min",
          icon: Bike,
          badgeColor: "bg-emerald-500 text-white",
          dotColor: "bg-emerald-500",
          statusText: "On Delivery"
        };
      case "COOKING":
      case "PREPARING":
        return {
          title: "Baking in Wood Oven",
          sub: "Hot & fresh in ~15-20 min",
          icon: ChefHat,
          badgeColor: "bg-amber-500 text-white",
          dotColor: "bg-amber-500",
          statusText: "Baking"
        };
      case "READY":
        return {
          title: "Order Ready",
          sub: "Waiting for rider pickup",
          icon: Package,
          badgeColor: "bg-blue-500 text-white",
          dotColor: "bg-blue-500",
          statusText: "Ready"
        };
      default:
        return {
          title: "Order Confirmed",
          sub: "Kitchen preparing pizza",
          icon: Clock,
          badgeColor: "bg-primary text-white",
          dotColor: "bg-primary",
          statusText: "Confirmed"
        };
    }
  };

  const statusInfo = getStatusInfo(currentOrder.status);
  const StatusIcon = statusInfo.icon;

  const handleWidgetClick = () => {
    if (isMultiple) {
      setModalOpen(true);
    } else {
      navigate(`/track/${currentOrder.id}`);
    }
  };

  return (
    <>
      <AnimatePresence>
        {!modalOpen && (
          isDismissed ? (
            <motion.div
              key="minimized-pill"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => {
                setIsDismissed(false);
                try {
                  localStorage.setItem("flame_active_order_minimized", "false");
                } catch (err) { }
              }}
              className="fixed z-30 bottom-[calc(max(0.75rem,env(safe-area-inset-bottom,0px))+5.25rem)] right-3 md:bottom-6 md:right-6 select-none cursor-pointer"
              title="Open Live Order Tracking"
            >
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-card/95 backdrop-blur-xl border border-primary/40 shadow-xl text-xs font-bold text-foreground hover:scale-105 active:scale-95 transition-all whitespace-nowrap">
                <span className="size-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                <StatusIcon className="size-4 text-primary animate-pulse shrink-0" />
                <span className="whitespace-nowrap font-bold">{isMultiple ? "Orders" : "Order"}</span>
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-md bg-secondary text-foreground/80 border border-border/50 shrink-0">
                  {activeOrders.length || 1}
                </span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={isMultiple ? `multi-orders-${activeOrders.length}` : `active-order-${currentOrder.id}`}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="fixed z-30 bottom-[calc(max(0.75rem,env(safe-area-inset-bottom,0px))+5.25rem)] inset-x-3 max-w-md mx-auto md:bottom-6 md:right-6 md:left-auto md:mx-0 md:max-w-sm md:w-full select-none"
            >
              <div
                onClick={handleWidgetClick}
                className="relative overflow-hidden bg-card/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-primary/35 rounded-2xl p-2.5 sm:p-3 shadow-2xl shadow-primary/10 hover:border-primary/60 transition-all cursor-pointer group flex items-center justify-between gap-2.5"
              >
                {/* Ambient Glow */}
                <div className="absolute -right-8 -top-8 size-24 rounded-full bg-primary/10 blur-xl pointer-events-none" />

                {/* Left Icon with Live Pulse */}
                <div className="relative shrink-0 flex items-center justify-center">
                  {isMultiple ? (
                    <div className="size-9 sm:size-10 rounded-xl bg-gradient-to-tr from-primary to-amber-500 flex items-center justify-center text-white shadow-md">
                      <Layers className="size-4.5 sm:size-5 animate-pulse" />
                    </div>
                  ) : (
                    <div className={cn("size-9 sm:size-10 rounded-xl flex items-center justify-center shadow-md text-white", statusInfo.badgeColor)}>
                      <StatusIcon className="size-4.5 sm:size-5 animate-pulse" />
                    </div>
                  )}
                  <span className={cn("absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background animate-ping", statusInfo.dotColor)} />
                  <span className={cn("absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background", statusInfo.dotColor)} />
                </div>

                {/* Middle Details */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  {isMultiple ? (
                    <>
                      <div className="flex items-center gap-1.5 flex-nowrap min-w-0">
                        <span className="font-serif font-bold text-xs sm:text-sm text-foreground tracking-tight whitespace-nowrap">
                          {activeOrders.length} Active Orders
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-primary/15 text-primary border border-primary/25 shrink-0">
                          Live
                        </span>
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium truncate mt-0.5 leading-tight">
                        Tap to track all ongoing deliveries
                      </p>
                    </>
                  ) : (
                    <>
                      {/* Top Row: Full Title without cut-off */}
                      <div className="flex items-center gap-1.5 flex-nowrap min-w-0">
                        <span className="font-serif font-bold text-xs sm:text-sm text-foreground tracking-tight whitespace-nowrap">
                          {statusInfo.title}
                        </span>
                        <span className={cn("size-1.5 rounded-full shrink-0", statusInfo.dotColor)} />
                      </div>
                      {/* Bottom Row: Code (never wraps) + Subtext */}
                      <div className="flex items-center gap-1.5 mt-0.5 flex-nowrap min-w-0">
                        <span className="text-[9px] sm:text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-secondary text-foreground/90 border border-border/70 whitespace-nowrap shrink-0 leading-tight">
                          {String(currentOrder.order_number || currentOrder.id).startsWith("#")
                            ? currentOrder.order_number || currentOrder.id
                            : `#${currentOrder.order_number || currentOrder.id}`}
                        </span>
                        <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium truncate leading-tight">
                          • {statusInfo.sub}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Right Action Button & Dismiss */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleWidgetClick();
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs group-hover:bg-primary/90 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                  >
                    <span>{isMultiple ? `View (${activeOrders.length})` : "Track"}</span>
                    <ChevronRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDismissed(true);
                      try {
                        localStorage.setItem("flame_active_order_minimized", "true");
                      } catch (err) { }
                    }}
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
                    title="Minimize"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )
        )}
      </AnimatePresence>

      {/* Multi-Order Live Tracking Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent showCloseButton={false} className="w-[calc(100%-2rem)] max-w-lg p-0 overflow-hidden rounded-[28px] bg-card border border-border/80 shadow-2xl z-50 max-h-[85vh] flex flex-col mx-auto">
          <DialogHeader className="p-5 pb-3.5 border-b border-border/60 bg-secondary/30 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Package className="size-5" />
                </div>
                <div>
                  <DialogTitle className="font-serif text-lg font-bold text-foreground">
                    Active Orders ({activeOrders.length})
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground font-medium mt-0.5">
                    Track your orders in real-time
                  </DialogDescription>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setModalOpen(false)}
                className="size-8.5 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Close"
              >
                <X className="size-4" />
              </button>
            </div>
          </DialogHeader>

          <div className="p-4 space-y-2.5 flex-1 overflow-y-auto custom-scrollbar pb-6">
            {activeOrders.map((order) => {
              const info = getStatusInfo(order.status);
              const Icon = info.icon;
              return (
                <div
                  key={order.id}
                  className="p-3 sm:p-3.5 rounded-2xl bg-secondary/25 hover:bg-secondary/50 border border-border/50 transition-colors flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={cn("size-10 sm:size-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs", info.badgeColor)}>
                      <Icon className="size-5 sm:size-5.5 animate-pulse" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-foreground font-mono">
                          Order #{order.order_number || order.id}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-foreground/90 border border-border/60 whitespace-nowrap shrink-0">
                          {info.statusText}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5 font-medium">
                        {formatPrice(order.total || order.total_amount || 0)}{" "}
                        {order.delivery_address ? `• ${order.delivery_address}` : ""}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setModalOpen(false);
                      navigate(`/track/${order.id}`);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shrink-0 cursor-pointer shadow-xs active:scale-95"
                  >
                    <span>Track</span>
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
