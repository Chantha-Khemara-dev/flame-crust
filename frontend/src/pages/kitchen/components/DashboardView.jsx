import { useState, useEffect } from "react";
import { 
  Clock, 
  Flame, 
  CheckCircle2, 
  ShoppingBag, 
  TrendingUp, 
  DollarSign, 
  Utensils,
  Inbox
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Helper component for elapsed time
function ElapsedTimer({ startTime }) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const start = new Date(startTime);
      const diffInSecs = Math.max(0, Math.floor((now - start) / 1000));
      const m = Math.floor(diffInSecs / 60);
      const s = diffInSecs % 60;
      setElapsed(`${m}:${s.toString().padStart(2, '0')}`);
    };
    calc();
    const intv = setInterval(calc, 1000);
    return () => clearInterval(intv);
  }, [startTime]);

  return <span className="font-mono">{elapsed}</span>;
}

export function DashboardView({ 
  activeView = 'dashboard',
  setActiveView,
  pendingOrders = [], 
  preparingOrders = [], 
  readyOrders = [], 
  updateOrderStatus, 
  onOrderClick, 
  todayRevenue = 0, 
  totalOrdersToday = 0 
}) {
  const [selectedColumn, setSelectedColumn] = useState('all');

  const safePending = Array.isArray(pendingOrders) ? pendingOrders : [];
  const safePreparing = Array.isArray(preparingOrders) ? preparingOrders : [];
  const safeReady = Array.isArray(readyOrders) ? readyOrders : [];

  // Dynamic calculations
  const delayedOrdersCount = safePending.filter(o => {
    if (!o.created_at) return false;
    return (Date.now() - new Date(o.created_at).getTime()) > 15 * 60 * 1000;
  }).length;

  let totalPrepSecs = 0;
  let prepCount = 0;
  safeReady.forEach(o => {
    if (o.created_at && o.updated_at) {
      const diff = Math.floor((new Date(o.updated_at) - new Date(o.created_at)) / 1000);
      if (diff > 0 && diff < 7200) {
        totalPrepSecs += diff;
        prepCount++;
      }
    }
  });
  const avgPrepText = prepCount > 0 ? `${Math.round(totalPrepSecs / prepCount / 60)} min` : "12 min";
  const totalActive = safePending.length + safePreparing.length + safeReady.length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top Statistics Cards - Hero Theme Aesthetic */}
      <div className="flex sm:grid overflow-x-auto sm:overflow-visible no-scrollbar grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5 mb-3.5 sm:mb-4 shrink-0 pb-1 sm:pb-0">
        <StatCard 
          title="Today's Orders" 
          value={totalOrdersToday} 
          icon={ShoppingBag} 
          theme="amber"
        />
        <StatCard 
          title="In Oven" 
          value={safePreparing.length} 
          icon={Flame} 
          theme="flame"
          highlight={safePreparing.length > 0} 
        />
        <StatCard 
          title="Ready for Pickup" 
          value={safeReady.length} 
          icon={CheckCircle2} 
          theme="emerald"
        />
        <StatCard 
          title="Delayed (>15m)" 
          value={delayedOrdersCount} 
          icon={Clock} 
          theme="alert"
          isAlert={delayedOrdersCount > 0} 
        />
        <StatCard 
          title="Avg Prep Time" 
          value={avgPrepText} 
          icon={Utensils} 
          theme="orange"
        />
        <StatCard 
          title="Today's Revenue" 
          value={`$${Number(todayRevenue || 0).toFixed(2)}`} 
          icon={DollarSign} 
          theme="gold"
        />
      </div>

      {/* Station / Column Segment Bar - Sleek Frosted Floating Capsule */}
      <div className="grid grid-cols-4 p-1.5 bg-card/85 dark:bg-zinc-900/85 backdrop-blur-xl rounded-full mb-3.5 sm:mb-4 shrink-0 gap-1 border border-border/80 shadow-warm ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
        <button
          onClick={() => setSelectedColumn('all')}
          className={cn(
            "py-2 sm:py-2.5 px-1 sm:px-3 rounded-full text-xs transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 active:scale-95",
            selectedColumn === 'all'
              ? "bg-gradient-to-r from-primary via-orange-600 to-amber-600 text-white shadow-warm font-serif font-bold"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/70 font-semibold"
          )}
        >
          <span>All Stages</span>
          <span className={cn(
            "text-[10px] px-2 py-0.5 rounded-full font-bold font-sans",
            selectedColumn === 'all' ? "bg-white/25 text-white backdrop-blur-sm" : "bg-secondary text-muted-foreground border border-border/60"
          )}>
            {totalActive}
          </span>
        </button>

        <button
          onClick={() => setSelectedColumn('pending')}
          className={cn(
            "py-2 sm:py-2.5 px-1 sm:px-3 rounded-full text-xs transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 active:scale-95",
            selectedColumn === 'pending'
              ? "bg-gradient-to-r from-primary via-orange-600 to-amber-600 text-white shadow-warm font-serif font-bold"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/70 font-semibold"
          )}
        >
          <span className="hidden sm:inline"><Clock className="size-3.5" /></span>
          <span>To Prepare</span>
          <span className={cn(
            "text-[10px] px-2 py-0.5 rounded-full font-bold font-sans",
            selectedColumn === 'pending' ? "bg-white/25 text-white backdrop-blur-sm" : "bg-secondary text-muted-foreground border border-border/60"
          )}>
            {safePending.length}
          </span>
        </button>

        <button
          onClick={() => setSelectedColumn('preparing')}
          className={cn(
            "py-2 sm:py-2.5 px-1 sm:px-3 rounded-full text-xs transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 active:scale-95",
            selectedColumn === 'preparing'
              ? "bg-gradient-to-r from-primary via-orange-600 to-amber-600 text-white shadow-warm font-serif font-bold"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/70 font-semibold"
          )}
        >
          <span className="hidden sm:inline"><Flame className="size-3.5 animate-pulse" /></span>
          <span>Cooking</span>
          <span className={cn(
            "text-[10px] px-2 py-0.5 rounded-full font-bold font-sans",
            selectedColumn === 'preparing' ? "bg-white/25 text-white backdrop-blur-sm" : "bg-secondary text-muted-foreground border border-border/60"
          )}>
            {safePreparing.length}
          </span>
        </button>

        <button
          onClick={() => setSelectedColumn('ready')}
          className={cn(
            "py-2 sm:py-2.5 px-1 sm:px-3 rounded-full text-xs transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 active:scale-95",
            selectedColumn === 'ready'
              ? "bg-gradient-to-r from-primary via-orange-600 to-amber-600 text-white shadow-warm font-serif font-bold"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/70 font-semibold"
          )}
        >
          <span className="hidden sm:inline"><CheckCircle2 className="size-3.5" /></span>
          <span>Ready</span>
          <span className={cn(
            "text-[10px] px-2 py-0.5 rounded-full font-bold font-sans",
            selectedColumn === 'ready' ? "bg-white/25 text-white backdrop-blur-sm" : "bg-secondary text-muted-foreground border border-border/60"
          )}>
            {safeReady.length}
          </span>
        </button>
      </div>

      {/* Kanban Board Columns - Responsive Artisanal Layout */}
      <div className={cn(
        "flex-1 overflow-hidden",
        selectedColumn === 'all' 
          ? "flex flex-col md:grid md:grid-cols-3 md:gap-5 gap-3.5 overflow-y-auto pb-4 md:pb-0 custom-scrollbar" 
          : "flex flex-col"
      )}>
        
        {/* STATION 1: TO PREPARE */}
        <div className={cn(
          "h-full",
          selectedColumn !== 'all' && selectedColumn !== 'pending' && "hidden"
        )}>
          <Column 
            title="To Prepare" 
            subtitle="Station 1 • Prep & Dough"
            count={safePending.length} 
            icon={Clock}
            iconBg="bg-amber-500/15 text-amber-600 border-amber-500/25"
            emptyTitle="All Tickets Prepared"
            emptyText="No incoming tickets waiting in queue. Expediter is clear."
            isAllViewOnMobile={selectedColumn === 'all'}
          >
            {safePending.map(order => (
              <OrderCard 
                key={order.id} 
                order={order} 
                stage="pending"
                onClick={() => onOrderClick(order)}
                action={
                  <Button 
                    onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, "PREPARING"); }}
                    className="w-full h-11 sm:h-12 rounded-full bg-gradient-to-r from-primary via-orange-500 to-amber-500 hover:brightness-105 text-white font-serif font-bold shadow-warm transition-all active:scale-[0.98] text-xs sm:text-sm group"
                  >
                    <Flame className="size-4 mr-2 group-hover:scale-125 transition-transform" /> Start Cooking in Oven
                  </Button>
                }
              />
            ))}
          </Column>
        </div>

        {/* STATION 2: COOKING IN OVEN */}
        <div className={cn(
          "h-full",
          selectedColumn !== 'all' && selectedColumn !== 'preparing' && "hidden"
        )}>
          <Column 
            title="Cooking in Oven" 
            subtitle="Station 2 • Wood-Fired Stone Oven (800°F)"
            count={safePreparing.length} 
            icon={Flame} 
            iconBg="bg-gradient-to-br from-primary via-orange-500 to-amber-500 text-white shadow-warm ring-2 ring-primary/20"
            emptyTitle="Oven is Clear & Hot"
            emptyText="Stone oven is preheated at 800°F, ready for incoming artisan pizzas."
            isAllViewOnMobile={selectedColumn === 'all'}
          >
            {safePreparing.map(order => (
              <OrderCard 
                key={order.id} 
                order={order} 
                stage="preparing"
                onClick={() => onOrderClick(order)}
                showTimer
                action={
                  <Button 
                    onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, "READY"); }}
                    className="w-full h-11 sm:h-12 rounded-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:brightness-105 text-white font-serif font-bold shadow-warm transition-all active:scale-[0.98] text-xs sm:text-sm group"
                  >
                    <CheckCircle2 className="size-4 mr-2 group-hover:scale-125 transition-transform" /> Mark as Baked & Ready
                  </Button>
                }
              />
            ))}
          </Column>
        </div>

        {/* STATION 3: READY FOR PICKUP */}
        <div className={cn(
          "h-full",
          selectedColumn !== 'all' && selectedColumn !== 'ready' && "hidden"
        )}>
          <Column 
            title="Ready for Pickup" 
            subtitle="Station 3 • Expediter & Dispatch"
            count={safeReady.length} 
            icon={CheckCircle2} 
            iconBg="bg-emerald-500/15 text-emerald-600 border-emerald-500/25"
            emptyTitle="Pickup Station Clear"
            emptyText="All finished orders have been handed over to drivers or customers."
            isAllViewOnMobile={selectedColumn === 'all'}
          >
            {safeReady.map(order => (
              <OrderCard 
                key={order.id} 
                order={order} 
                stage="ready"
                onClick={() => onOrderClick(order)}
                action={
                  <div className="w-full h-11 sm:h-12 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-serif font-bold text-xs sm:text-sm border border-emerald-500/30 shadow-2xs">
                    <ShoppingBag className="size-4 mr-2 text-emerald-600 dark:text-emerald-400" /> Awaiting Driver Pickup
                  </div>
                }
              />
            ))}
          </Column>
        </div>

      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, theme = "amber", highlight = false, isAlert = false }) {
  const themeStyles = {
    amber: {
      card: "border-border/80 hover:border-amber-500/40 bg-gradient-to-br from-card via-card to-amber-500/[0.03]",
      icon: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
    },
    flame: {
      card: "border-primary/40 bg-gradient-to-br from-card via-card to-primary/[0.07] ring-1 ring-primary/15 hover:border-primary/70",
      icon: "bg-gradient-to-br from-primary via-orange-500 to-amber-500 text-white shadow-warm ring-2 ring-primary/20"
    },
    emerald: {
      card: "border-border/80 hover:border-emerald-500/40 bg-gradient-to-br from-card via-card to-emerald-500/[0.03]",
      icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
    },
    alert: {
      card: isAlert 
        ? "border-destructive/50 bg-destructive/5 ring-1 ring-destructive/20 animate-pulse" 
        : "border-border/80 hover:border-destructive/40 bg-gradient-to-br from-card via-card to-destructive/[0.02]",
      icon: isAlert 
        ? "bg-destructive/15 text-destructive border-destructive/30" 
        : "bg-secondary text-muted-foreground border-border/70"
    },
    orange: {
      card: "border-border/80 hover:border-orange-500/40 bg-gradient-to-br from-card via-card to-orange-500/[0.03]",
      icon: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
    },
    gold: {
      card: "border-border/80 hover:border-amber-500/40 bg-gradient-to-br from-card via-card to-amber-500/[0.04]",
      icon: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
    }
  };

  const currentTheme = themeStyles[theme] || themeStyles.amber;

  return (
    <div className={cn(
      "p-3.5 sm:p-4.5 rounded-3xl border shadow-warm hover:shadow-warm-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between min-w-[130px] sm:min-w-0 shrink-0 sm:shrink relative overflow-hidden backdrop-blur-xl group",
      currentTheme.card
    )}>
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider truncate">{title}</span>
        <div className={cn(
          "size-7 sm:size-8 rounded-xl flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover:scale-110",
          currentTheme.icon
        )}>
          <Icon className={cn("size-3.5 sm:size-4", theme === 'flame' && highlight && "animate-flicker")} />
        </div>
      </div>
      <div className="font-serif text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight truncate">{value}</div>
    </div>
  );
}

function Column({ title, subtitle, count, icon: Icon, iconBg, emptyTitle, emptyText, isAllViewOnMobile, children }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <div className={cn(
      "flex flex-col rounded-3xl border border-border/80 bg-card/65 dark:bg-zinc-900/50 backdrop-blur-xl overflow-hidden transition-all shadow-warm ring-1 ring-black/[0.03] dark:ring-white/[0.04]",
      isAllViewOnMobile ? "min-h-[200px] md:h-full" : "h-full min-h-[300px]"
    )}>
      {/* Column Header */}
      <div className="px-4.5 sm:px-5 py-3.5 sm:py-4 border-b border-border/70 bg-card/85 dark:bg-card/45 backdrop-blur-xl flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn("size-8 sm:size-9 rounded-2xl flex items-center justify-center shrink-0 border", iconBg || "bg-primary/10 text-primary border-primary/20")}>
            <Icon className="size-4 sm:size-4.5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-serif font-bold text-sm sm:text-base text-foreground tracking-tight truncate leading-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <span className="bg-secondary/90 border border-border/80 text-xs sm:text-sm font-serif font-bold px-3 py-0.5 rounded-full text-foreground shadow-2xs shrink-0">
          {count}
        </span>
      </div>

      {/* Column Body */}
      <div className={cn(
        "p-3 sm:p-4 custom-scrollbar flex flex-col gap-3 sm:gap-4",
        isAllViewOnMobile ? "max-h-[440px] md:max-h-none overflow-y-auto md:flex-1" : "flex-1 overflow-y-auto"
      )}>
        {hasChildren ? (
          children
        ) : (
          <div className="flex-1 min-h-[170px] flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-border/60 rounded-3xl bg-secondary/20 dark:bg-zinc-900/20 my-auto">
            <div className="size-13 rounded-3xl bg-card border border-border/80 flex items-center justify-center mb-3 shadow-xs text-primary/80">
              <Icon className="size-6 opacity-75" />
            </div>
            <p className="font-serif text-sm font-bold text-foreground mb-1">{emptyTitle || "Station is Clear"}</p>
            <p className="text-xs font-medium text-muted-foreground max-w-xs">{emptyText || "No active tickets."}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order, onClick, action, showTimer, stage = "pending" }) {
  const isDelayed = stage === "pending" && order.created_at && (Date.now() - new Date(order.created_at).getTime()) > 15 * 60 * 1000;

  const stageAccent = {
    pending: isDelayed ? "border-destructive/60 bg-destructive/5" : "border-border/80 hover:border-amber-500/50",
    preparing: "border-primary/50 hover:border-primary/80 ring-1 ring-primary/20",
    ready: "border-emerald-500/40 hover:border-emerald-500/70"
  };

  const topStripe = {
    pending: isDelayed ? "bg-destructive" : "bg-gradient-to-r from-amber-500 to-orange-500",
    preparing: "bg-gradient-to-r from-primary via-orange-500 to-amber-500 animate-pulse",
    ready: "bg-gradient-to-r from-emerald-500 to-teal-500"
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-card dark:bg-zinc-900/90 rounded-3xl p-4.5 sm:p-5 shadow-warm hover:shadow-warm-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col group relative border overflow-hidden",
        stageAccent[stage]
      )}
    >
      {/* Artisanal Top Accent Stripe */}
      <div className={cn("absolute top-0 inset-x-0 h-1.5", topStripe[stage])} />

      {/* Header */}
      <div className="flex justify-between items-start mb-3 border-b border-border/60 pb-3 pt-1">
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">Ticket</span>
            {isDelayed && (
              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-destructive/15 text-destructive border border-destructive/25 animate-pulse">
                Delayed
              </span>
            )}
            {order.order_type && (
              <span className="text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-secondary text-foreground/80 border border-border/70">
                {order.order_type}
              </span>
            )}
          </div>
          <h3 className="font-serif text-lg sm:text-xl font-bold text-foreground leading-tight tracking-tight">
            #{order.order_number ? (order.order_number.length > 8 ? order.order_number.slice(-6) : order.order_number) : order.id}
          </h3>
        </div>

        <div className="text-right flex flex-col items-end">
          {showTimer ? (
             <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-serif font-bold border border-primary/25 shadow-2xs">
               <Flame className="size-3.5 animate-pulse text-primary fill-primary/20" />
               <ElapsedTimer startTime={order.updated_at || order.created_at} />
             </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground bg-secondary/80 px-2.5 py-1 rounded-full border border-border/60">
              <Clock className="size-3 text-muted-foreground" />
              {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      </div>

      {showTimer && (
        <div className="mb-3">
           <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
             <div className="h-full bg-gradient-to-r from-primary via-orange-500 to-amber-500 rounded-full w-[70%] relative overflow-hidden animate-pulse" />
           </div>
        </div>
      )}

      {/* Order items list */}
      <div className="flex-1 space-y-2 mb-3.5">
        {order.notes && (
          <div className="px-3 py-2 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 rounded-2xl text-xs font-medium text-amber-900 dark:text-amber-200 line-clamp-2">
            ⚠️ {order.notes}
          </div>
        )}
        {order.items?.map((item, idx) => (
          <div key={idx} className="flex gap-2.5 items-center text-xs">
            <span className="size-6 sm:size-6.5 rounded-xl bg-primary/10 text-primary font-serif font-bold flex items-center justify-center text-xs shrink-0 border border-primary/20 shadow-2xs">
              {item.quantity}x
            </span>
            <span className="font-semibold text-foreground truncate flex-1">{item.product_name}</span>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-1">
        {action}
      </div>
    </div>
  );
}
