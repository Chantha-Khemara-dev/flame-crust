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
      <div className="flex sm:grid overflow-x-auto sm:overflow-visible no-scrollbar grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3.5 mb-2.5 sm:mb-4 shrink-0 pb-0.5 sm:pb-0">
        <StatCard title="Today's Orders" value={totalOrdersToday} icon={ShoppingBag} color="blue" />
        <StatCard title="Preparing" value={preparingOrders.length} icon={Flame} color="orange" />
        <StatCard title="Ready" value={readyOrders.length} icon={CheckCircle2} color="green" />
        <StatCard title="Delayed (>15m)" value={delayedOrdersCount} icon={Clock} color={delayedOrdersCount > 0 ? "red" : "blue"} />
        <StatCard title="Avg Prep" value={avgPrepText} icon={Utensils} color="indigo" />
        <StatCard title="Revenue" value={`$${Number(todayRevenue || 0).toFixed(2)}`} icon={DollarSign} color="emerald" />
      </div>

      {/* Station / Column Segment Bar - 4-part segmented control for mobile */}
      <div className="grid grid-cols-4 p-1 bg-slate-200/60 dark:bg-zinc-900 rounded-2xl mb-3 shrink-0 gap-1 border border-slate-200/50 dark:border-white/5">
        <button
          onClick={() => setSelectedColumn('all')}
          className={cn(
            "py-1.5 px-1 rounded-xl text-xs font-bold transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5",
            selectedColumn === 'all'
              ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm font-black"
              : "text-slate-500 dark:text-zinc-400 hover:text-slate-900"
          )}
        >
          <span>All</span>
          <span className={cn(
            "text-[10px] px-1.5 py-0.2 rounded-full font-black",
            selectedColumn === 'all' ? "bg-slate-100 dark:bg-zinc-700 text-slate-800 dark:text-zinc-200" : "bg-slate-300/60 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400"
          )}>
            {totalActive}
          </span>
        </button>

        <button
          onClick={() => setSelectedColumn('pending')}
          className={cn(
            "py-1.5 px-1 rounded-xl text-xs font-bold transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5",
            selectedColumn === 'pending'
              ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm font-black"
              : "text-slate-500 dark:text-zinc-400 hover:text-slate-900"
          )}
        >
          <span className="hidden sm:inline"><Clock className="size-3" /></span>
          <span>Pending</span>
          <span className={cn(
            "text-[10px] px-1.5 py-0.2 rounded-full font-black",
            selectedColumn === 'pending' ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" : "bg-slate-300/60 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400"
          )}>
            {pendingOrders.length}
          </span>
        </button>

        <button
          onClick={() => setSelectedColumn('preparing')}
          className={cn(
            "py-1.5 px-1 rounded-xl text-xs font-bold transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5",
            selectedColumn === 'preparing'
              ? "bg-white dark:bg-zinc-800 text-orange-600 dark:text-orange-400 shadow-sm font-black"
              : "text-slate-500 dark:text-zinc-400 hover:text-slate-900"
          )}
        >
          <span className="hidden sm:inline"><Flame className="size-3" /></span>
          <span>Cooking</span>
          <span className={cn(
            "text-[10px] px-1.5 py-0.2 rounded-full font-black",
            selectedColumn === 'preparing' ? "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300" : "bg-slate-300/60 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400"
          )}>
            {preparingOrders.length}
          </span>
        </button>

        <button
          onClick={() => setSelectedColumn('ready')}
          className={cn(
            "py-1.5 px-1 rounded-xl text-xs font-bold transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5",
            selectedColumn === 'ready'
              ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm font-black"
              : "text-slate-500 dark:text-zinc-400 hover:text-slate-900"
          )}
        >
          <span className="hidden sm:inline"><CheckCircle2 className="size-3" /></span>
          <span>Ready</span>
          <span className={cn(
            "text-[10px] px-1.5 py-0.2 rounded-full font-black",
            selectedColumn === 'ready' ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" : "bg-slate-300/60 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400"
          )}>
            {readyOrders.length}
          </span>
        </button>
      </div>

      {/* Kanban Board Columns - Responsive Layout */}
      <div className={cn(
        "flex-1 overflow-hidden",
        selectedColumn === 'all' 
          ? "flex flex-col md:grid md:grid-cols-3 md:gap-6 gap-3 sm:gap-4 overflow-y-auto pb-4 md:pb-0" 
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
            colorClass="text-blue-500"
            bgClass="bg-blue-50/40 dark:bg-blue-900/10"
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
                    className="w-full h-10 sm:h-11 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black shadow-md shadow-orange-500/20 transition-transform active:scale-[0.98] text-xs sm:text-sm"
                  >
                    <Flame className="size-4 mr-1.5 sm:mr-2" /> Start Cooking
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
            title="Cooking" 
            count={preparingOrders.length} 
            icon={Flame} 
            colorClass="text-orange-500"
            bgClass="bg-orange-50/40 dark:bg-orange-900/10"
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
                    className="w-full h-10 sm:h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-black shadow-md shadow-emerald-500/20 transition-transform active:scale-[0.98] text-xs sm:text-sm"
                  >
                    <CheckCircle2 className="size-4 mr-1.5 sm:mr-2" /> Mark as Ready
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
            colorClass="text-emerald-500"
            bgClass="bg-emerald-50/40 dark:bg-emerald-900/10"
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
                  <div className="w-full h-10 sm:h-11 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-black text-xs sm:text-sm border border-emerald-500/20">
                    <ShoppingBag className="size-4 mr-1.5 text-emerald-500" /> Ready for Driver
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

function StatCard({ title, value, icon: Icon, color }) {
  const colorMap = {
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    orange: "text-orange-500 bg-orange-500/10 border-orange-500/20",
    green: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    red: "text-red-500 bg-red-500/10 border-red-500/20",
    indigo: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
    emerald: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
  };

  return (
    <div className="bg-white dark:bg-zinc-900/90 p-2.5 sm:p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow min-w-[115px] sm:min-w-0 shrink-0 sm:shrink">
      <div className="flex items-center justify-between gap-1.5 mb-1 sm:mb-2">
        <span className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider truncate">{title}</span>
        <div className={cn("p-1.5 rounded-xl border shrink-0", colorMap[color])}>
          <Icon className="size-3.5 sm:size-4" />
        </div>
      </div>
      <div className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">{value}</div>
    </div>
  );
}

function Column({ title, count, icon: Icon, colorClass, bgClass, emptyText, isAllViewOnMobile, children }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <div className={cn(
      "flex flex-col rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/10 overflow-hidden transition-colors",
      isAllViewOnMobile ? "min-h-[160px] md:h-full" : "h-full min-h-[260px]",
      bgClass
    )}>
      <div className="px-3.5 sm:px-5 py-2.5 sm:py-3.5 border-b border-slate-200/60 dark:border-white/5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md flex items-center justify-between shrink-0">
        <h2 className="font-black text-xs sm:text-base text-slate-900 dark:text-zinc-100 flex items-center gap-2">
          <Icon className={cn("size-4 sm:size-5", colorClass)} /> {title}
        </h2>
        <span className="bg-slate-200/80 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs sm:text-sm font-black px-2.5 py-0.5 rounded-full">
          {count}
        </span>
      </div>
      <div className={cn(
        "p-2 sm:p-3.5 custom-scrollbar flex flex-col gap-2.5 sm:gap-3.5",
        isAllViewOnMobile ? "max-h-[380px] md:max-h-none overflow-y-auto md:flex-1" : "flex-1 overflow-y-auto"
      )}>
        {hasChildren ? (
          children
        ) : (
          <div className="flex-1 min-h-[120px] flex flex-col items-center justify-center text-center p-4 sm:p-6 text-slate-400 dark:text-zinc-500">
            <Inbox className="size-7 sm:size-9 mb-1.5 opacity-30" />
            <p className="text-xs sm:text-sm font-bold">{emptyText || "No orders"}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order, onClick, action, showTimer, stage = "pending" }) {
  const isDelayed = stage === "pending" && order.created_at && (Date.now() - new Date(order.created_at).getTime()) > 15 * 60 * 1000;

  const stageBorder = {
    pending: isDelayed ? "border-l-4 border-l-red-500" : "border-l-4 border-l-blue-500",
    preparing: "border-l-4 border-l-orange-500",
    ready: "border-l-4 border-l-emerald-500"
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-white dark:bg-zinc-900 rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200/80 dark:border-white/5 cursor-pointer hover:shadow-md hover:border-orange-500/40 transition-all flex flex-col group",
        stageBorder[stage]
      )}
    >
      <div className="flex justify-between items-start mb-2.5 border-b border-slate-100 dark:border-white/5 pb-2">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ticket</span>
            {isDelayed && (
              <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 animate-pulse">
                Delayed
              </span>
            )}
          </div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-zinc-100 leading-tight">
            #{order.order_number ? (order.order_number.length > 8 ? order.order_number.slice(-6) : order.order_number) : order.id}
          </h3>
        </div>

        <div className="text-right flex flex-col items-end">
          {showTimer ? (
             <div className="flex items-center gap-1 bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-lg text-xs font-black border border-orange-500/20">
               <Flame className="size-3.5 animate-pulse text-orange-500" />
               <ElapsedTimer startTime={order.updated_at || order.created_at} />
             </div>
          ) : (
            <div className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded-lg">
              <Clock className="size-3 text-slate-400" />
              {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      </div>

      {showTimer && (
        <div className="mb-2.5">
           <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
             <div className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full w-[65%] relative overflow-hidden">
                <div className="absolute inset-0 bg-white/25 animate-pulse"></div>
             </div>
           </div>
        </div>
      )}

      {/* Order items list */}
      <div className="flex-1 space-y-1.5 mb-2.5 sm:mb-3">
        {order.notes && (
          <div className="px-2 py-1 bg-amber-500/10 border border-amber-500/25 rounded-xl text-[11px] font-bold text-amber-700 dark:text-amber-300 line-clamp-2">
            ⚠️ {order.notes}
          </div>
        )}
        {order.items?.map((item, idx) => (
          <div key={idx} className="flex gap-2 items-center text-xs">
            <span className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-black px-1.5 py-0.5 rounded text-[11px] min-w-[22px] text-center shrink-0">
              {item.quantity}x
            </span>
            <span className="font-bold text-slate-800 dark:text-zinc-200 truncate flex-1">{item.product_name}</span>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-1">
        {action}
      </div>
    </div>
  );
}
