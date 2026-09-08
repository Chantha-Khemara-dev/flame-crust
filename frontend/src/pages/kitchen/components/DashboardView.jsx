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

  // Dynamic calculations
  const delayedOrdersCount = pendingOrders.filter(o => {
    if (!o.created_at) return false;
    return (Date.now() - new Date(o.created_at).getTime()) > 15 * 60 * 1000;
  }).length;

  let totalPrepSecs = 0;
  let prepCount = 0;
  readyOrders.forEach(o => {
    if (o.created_at && o.updated_at) {
      const diff = Math.floor((new Date(o.updated_at) - new Date(o.created_at)) / 1000);
      if (diff > 0 && diff < 7200) {
        totalPrepSecs += diff;
        prepCount++;
      }
    }
  });
  const avgPrepText = prepCount > 0 ? `${Math.round(totalPrepSecs / prepCount / 60)} min` : "12 min";
  const totalActive = pendingOrders.length + preparingOrders.length + readyOrders.length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top Statistics Cards - Horizontal scroll on mobile, grid on sm+ */}
      <div className="flex sm:grid overflow-x-auto sm:overflow-visible no-scrollbar grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5 mb-3 sm:mb-4 shrink-0 pb-0.5 sm:pb-0">
        <StatCard title="Today's Orders" value={totalOrdersToday} icon={ShoppingBag} />
        <StatCard title="Preparing" value={preparingOrders.length} icon={Flame} highlight={preparingOrders.length > 0} />
        <StatCard title="Ready" value={readyOrders.length} icon={CheckCircle2} />
        <StatCard title="Delayed (>15m)" value={delayedOrdersCount} icon={Clock} isAlert={delayedOrdersCount > 0} />
        <StatCard title="Avg Prep" value={avgPrepText} icon={Utensils} />
        <StatCard title="Revenue" value={`$${Number(todayRevenue || 0).toFixed(2)}`} icon={DollarSign} />
      </div>

      {/* Station / Column Segment Bar - 4-part segmented control matching project style */}
      <div className="grid grid-cols-4 p-1.5 bg-secondary/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl sm:rounded-full mb-3.5 shrink-0 gap-1 border border-border/60 shadow-xs">
        <button
          onClick={() => setSelectedColumn('all')}
          className={cn(
            "py-2 px-1 rounded-xl sm:rounded-full text-xs transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2",
            selectedColumn === 'all'
              ? "bg-primary text-primary-foreground shadow-warm font-serif font-bold"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/80 font-medium"
          )}
        >
          <span>All Stages</span>
          <span className={cn(
            "text-[10px] px-2 py-0.2 rounded-full font-bold font-sans",
            selectedColumn === 'all' ? "bg-white/25 text-white" : "bg-card border border-border/70 text-muted-foreground"
          )}>
            {totalActive}
          </span>
        </button>

        <button
          onClick={() => setSelectedColumn('pending')}
          className={cn(
            "py-2 px-1 rounded-xl sm:rounded-full text-xs transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2",
            selectedColumn === 'pending'
              ? "bg-primary text-primary-foreground shadow-warm font-serif font-bold"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/80 font-medium"
          )}
        >
          <span className="hidden sm:inline"><Clock className="size-3.5" /></span>
          <span>Pending</span>
          <span className={cn(
            "text-[10px] px-2 py-0.2 rounded-full font-bold font-sans",
            selectedColumn === 'pending' ? "bg-white/25 text-white" : "bg-card border border-border/70 text-muted-foreground"
          )}>
            {pendingOrders.length}
          </span>
        </button>

        <button
          onClick={() => setSelectedColumn('preparing')}
          className={cn(
            "py-2 px-1 rounded-xl sm:rounded-full text-xs transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2",
            selectedColumn === 'preparing'
              ? "bg-primary text-primary-foreground shadow-warm font-serif font-bold"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/80 font-medium"
          )}
        >
          <span className="hidden sm:inline"><Flame className="size-3.5" /></span>
          <span>Cooking</span>
          <span className={cn(
            "text-[10px] px-2 py-0.2 rounded-full font-bold font-sans",
            selectedColumn === 'preparing' ? "bg-white/25 text-white" : "bg-card border border-border/70 text-muted-foreground"
          )}>
            {preparingOrders.length}
          </span>
        </button>

        <button
          onClick={() => setSelectedColumn('ready')}
          className={cn(
            "py-2 px-1 rounded-xl sm:rounded-full text-xs transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2",
            selectedColumn === 'ready'
              ? "bg-primary text-primary-foreground shadow-warm font-serif font-bold"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/80 font-medium"
          )}
        >
          <span className="hidden sm:inline"><CheckCircle2 className="size-3.5" /></span>
          <span>Ready</span>
          <span className={cn(
            "text-[10px] px-2 py-0.2 rounded-full font-bold font-sans",
            selectedColumn === 'ready' ? "bg-white/25 text-white" : "bg-card border border-border/70 text-muted-foreground"
          )}>
            {readyOrders.length}
          </span>
        </button>
      </div>

      {/* Kanban Board Columns - Responsive Layout */}
      <div className={cn(
        "flex-1 overflow-hidden",
        selectedColumn === 'all' 
          ? "flex flex-col md:grid md:grid-cols-3 md:gap-5 gap-3.5 overflow-y-auto pb-4 md:pb-0" 
          : "flex flex-col"
      )}>
        
        {/* NEW / TO PREPARE */}
        <div className={cn(
          "h-full",
          selectedColumn !== 'all' && selectedColumn !== 'pending' && "hidden"
        )}>
          <Column 
            title="To Prepare" 
            count={pendingOrders.length} 
            icon={Clock} 
            emptyText="No pending tickets in queue"
            isAllViewOnMobile={selectedColumn === 'all'}
          >
            {pendingOrders.map(order => (
              <OrderCard 
                key={order.id} 
                order={order} 
                stage="pending"
                onClick={() => onOrderClick(order)}
                action={
                  <Button 
                    onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, "PREPARING"); }}
                    className="w-full h-11 rounded-full bg-gradient-to-r from-primary via-orange-500 to-amber-500 hover:opacity-95 text-primary-foreground font-serif font-bold shadow-warm transition-transform active:scale-[0.98] text-xs sm:text-sm"
                  >
                    <Flame className="size-4 mr-2" /> Start Cooking
                  </Button>
                }
              />
            ))}
          </Column>
        </div>

        {/* PREPARING */}
        <div className={cn(
          "h-full",
          selectedColumn !== 'all' && selectedColumn !== 'preparing' && "hidden"
        )}>
          <Column 
            title="Cooking in Oven" 
            count={preparingOrders.length} 
            icon={Flame} 
            emptyText="No active cooking tickets"
            isAllViewOnMobile={selectedColumn === 'all'}
          >
            {preparingOrders.map(order => (
              <OrderCard 
                key={order.id} 
                order={order} 
                stage="preparing"
                onClick={() => onOrderClick(order)}
                showTimer
                action={
                  <Button 
                    onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, "READY"); }}
                    className="w-full h-11 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-serif font-bold shadow-warm transition-transform active:scale-[0.98] text-xs sm:text-sm"
                  >
                    <CheckCircle2 className="size-4 mr-2" /> Mark as Ready
                  </Button>
                }
              />
            ))}
          </Column>
        </div>

        {/* READY */}
        <div className={cn(
          "h-full",
          selectedColumn !== 'all' && selectedColumn !== 'ready' && "hidden"
        )}>
          <Column 
            title="Ready for Pickup" 
            count={readyOrders.length} 
            icon={CheckCircle2} 
            emptyText="No orders waiting for pickup"
            isAllViewOnMobile={selectedColumn === 'all'}
          >
            {readyOrders.map(order => (
              <OrderCard 
                key={order.id} 
                order={order} 
                stage="ready"
                onClick={() => onOrderClick(order)}
                action={
                  <div className="w-full h-11 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-serif font-bold text-xs sm:text-sm border border-emerald-500/30">
                    <ShoppingBag className="size-4 mr-2 text-emerald-600 dark:text-emerald-400" /> Ready for Driver
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

function StatCard({ title, value, icon: Icon, highlight = false, isAlert = false }) {
  return (
    <div className={cn(
      "bg-card/90 dark:bg-card/40 backdrop-blur-md p-3 sm:p-4 rounded-2xl sm:rounded-3xl border shadow-warm hover:shadow-warm-lg transition-all flex flex-col justify-between min-w-[120px] sm:min-w-0 shrink-0 sm:shrink",
      isAlert ? "border-destructive/40 bg-destructive/5" : (highlight ? "border-primary/40 bg-primary/5" : "border-border/70")
    )}>
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">{title}</span>
        <div className={cn(
          "size-7 sm:size-8 rounded-xl flex items-center justify-center shrink-0 border",
          isAlert 
            ? "bg-destructive/10 text-destructive border-destructive/20" 
            : (highlight 
                ? "bg-primary/10 text-primary border-primary/20" 
                : "bg-secondary text-muted-foreground border-border/70")
        )}>
          <Icon className="size-3.5 sm:size-4" />
        </div>
      </div>
      <div className="font-serif text-lg sm:text-2xl font-bold text-foreground tracking-tight truncate">{value}</div>
    </div>
  );
}

function Column({ title, count, icon: Icon, emptyText, isAllViewOnMobile, children }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <div className={cn(
      "flex flex-col rounded-3xl border border-border/60 bg-secondary/30 dark:bg-zinc-900/30 backdrop-blur-sm overflow-hidden transition-all",
      isAllViewOnMobile ? "min-h-[170px] md:h-full" : "h-full min-h-[280px]"
    )}>
      <div className="px-4 sm:px-5 py-3 sm:py-3.5 border-b border-border/60 bg-card/75 dark:bg-card/35 backdrop-blur-md flex items-center justify-between shrink-0">
        <h2 className="font-serif font-bold text-sm sm:text-base text-foreground flex items-center gap-2.5">
          <Icon className="size-4 sm:size-4.5 text-primary" /> {title}
        </h2>
        <span className="bg-primary/10 text-primary border border-primary/20 text-xs sm:text-sm font-serif font-bold px-2.5 py-0.5 rounded-full">
          {count}
        </span>
      </div>
      <div className={cn(
        "p-3 sm:p-4 custom-scrollbar flex flex-col gap-3 sm:gap-4",
        isAllViewOnMobile ? "max-h-[400px] md:max-h-none overflow-y-auto md:flex-1" : "flex-1 overflow-y-auto"
      )}>
        {hasChildren ? (
          children
        ) : (
          <div className="flex-1 min-h-[140px] flex flex-col items-center justify-center text-center p-6 text-muted-foreground/60">
            <div className="size-12 rounded-2xl bg-secondary/80 border border-border/60 flex items-center justify-center mb-2">
              <Inbox className="size-6 opacity-50 text-muted-foreground" />
            </div>
            <p className="font-serif text-xs sm:text-sm font-medium text-muted-foreground">{emptyText || "No orders"}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order, onClick, action, showTimer, stage = "pending" }) {
  const isDelayed = stage === "pending" && order.created_at && (Date.now() - new Date(order.created_at).getTime()) > 15 * 60 * 1000;

  const stageAccent = {
    pending: isDelayed ? "border-destructive/60 bg-destructive/5" : "border-border/80 hover:border-primary/40",
    preparing: "border-primary/50 hover:border-primary",
    ready: "border-emerald-500/40 hover:border-emerald-500/60"
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-card rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-warm hover:shadow-warm-lg transition-all duration-200 cursor-pointer flex flex-col group relative border",
        stageAccent[stage]
      )}
    >
      <div className="flex justify-between items-start mb-3 border-b border-border/50 pb-2.5">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ticket</span>
            {isDelayed && (
              <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 animate-pulse">
                Delayed
              </span>
            )}
            {order.order_type && (
              <span className="text-[9px] font-medium uppercase px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/50">
                {order.order_type}
              </span>
            )}
          </div>
          <h3 className="font-serif text-lg sm:text-xl font-bold text-foreground leading-tight">
            #{order.order_number ? (order.order_number.length > 8 ? order.order_number.slice(-6) : order.order_number) : order.id}
          </h3>
        </div>

        <div className="text-right flex flex-col items-end">
          {showTimer ? (
             <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1 rounded-full text-xs font-serif font-bold border border-primary/20">
               <Flame className="size-3.5 animate-pulse text-primary fill-primary/20" />
               <ElapsedTimer startTime={order.updated_at || order.created_at} />
             </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground bg-secondary/80 px-2.5 py-1 rounded-full border border-border/50">
              <Clock className="size-3 text-muted-foreground" />
              {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      </div>

      {showTimer && (
        <div className="mb-3">
           <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
             <div className="h-full bg-gradient-to-r from-primary via-orange-500 to-amber-500 rounded-full w-[65%] relative overflow-hidden animate-pulse" />
           </div>
        </div>
      )}

      {/* Order items list */}
      <div className="flex-1 space-y-2 mb-3.5">
        {order.notes && (
          <div className="px-3 py-2 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 rounded-2xl text-xs font-medium text-amber-900 dark:text-amber-200 line-clamp-2">
            ⚠️ {order.notes}
          </div>
        )}
        {order.items?.map((item, idx) => (
          <div key={idx} className="flex gap-2.5 items-center text-xs">
            <span className="size-6 rounded-lg bg-primary/10 text-primary font-serif font-bold flex items-center justify-center text-xs shrink-0 border border-primary/20">
              {item.quantity}x
            </span>
            <span className="font-medium text-foreground truncate flex-1">{item.product_name}</span>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-1">
        {action}
      </div>
    </div>
  );
}
