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
  const [mobileTab, setMobileTab] = useState(() => {
    if (activeView === 'orders') return 'pending';
    if (activeView === 'preparing') return 'preparing';
    if (activeView === 'ready') return 'ready';
    return 'all';
  });

  useEffect(() => {
    if (activeView === 'orders') setMobileTab('pending');
    else if (activeView === 'preparing') setMobileTab('preparing');
    else if (activeView === 'ready') setMobileTab('ready');
  }, [activeView]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top Statistics Cards - Horizontal scroll on mobile, grid on sm+ */}
      <div className="flex sm:grid overflow-x-auto sm:overflow-visible no-scrollbar grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-4 mb-3 sm:mb-6 shrink-0 pb-1 sm:pb-0">
        <StatCard title="Today's Orders" value={totalOrdersToday} icon={ShoppingBag} color="blue" />
        <StatCard title="Preparing" value={preparingOrders.length} icon={Flame} color="orange" />
        <StatCard title="Ready" value={readyOrders.length} icon={CheckCircle2} color="green" />
        <StatCard title="Delayed" value="0" icon={Clock} color="red" />
        <StatCard title="Avg Prep Time" value="14 min" icon={Utensils} color="indigo" />
        <StatCard title="Revenue Today" value={`$${Number(todayRevenue || 0).toFixed(2)}`} icon={DollarSign} color="emerald" />
      </div>

      {/* Mobile Column Switcher (Visible on small screens) */}
      <div className="md:hidden flex items-center gap-1 p-1 bg-slate-200/80 dark:bg-zinc-900 rounded-2xl mb-3 shrink-0">
        <button
          onClick={() => setMobileTab('all')}
          className={cn(
            "flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center",
            mobileTab === 'all'
              ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
          )}
        >
          All ({pendingOrders.length + preparingOrders.length + readyOrders.length})
        </button>
        <button
          onClick={() => setMobileTab('pending')}
          className={cn(
            "flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center",
            mobileTab === 'pending'
              ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
          )}
        >
          New ({pendingOrders.length})
        </button>
        <button
          onClick={() => setMobileTab('preparing')}
          className={cn(
            "flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center",
            mobileTab === 'preparing'
              ? "bg-white dark:bg-zinc-800 text-orange-600 dark:text-orange-400 shadow-sm"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
          )}
        >
          Cooking ({preparingOrders.length})
        </button>
        <button
          onClick={() => setMobileTab('ready')}
          className={cn(
            "flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center",
            mobileTab === 'ready'
              ? "bg-white dark:bg-zinc-800 text-green-600 dark:text-green-400 shadow-sm"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900"
          )}
        >
          Ready ({readyOrders.length})
        </button>
      </div>

      {/* Kanban Board Columns - Responsive Layout */}
      <div className={cn(
        "flex-1 overflow-hidden",
        "md:grid md:grid-cols-3 md:gap-6",
        mobileTab === 'all' ? "flex flex-col gap-4 overflow-y-auto pb-4 md:pb-0" : "flex flex-col"
      )}>
        
        {/* NEW / TO PREPARE */}
        <div className={cn(
          "h-full",
          mobileTab !== 'all' && mobileTab !== 'pending' && "hidden md:block"
        )}>
          <Column 
            title="To Prepare" 
            count={pendingOrders.length} 
            icon={Clock} 
            colorClass="text-blue-500"
            bgClass="bg-blue-50/50 dark:bg-blue-900/10"
            emptyText="No pending tickets in queue"
          >
            {pendingOrders.map(order => (
              <OrderCard 
                key={order.id} 
                order={order} 
                onClick={() => onOrderClick(order)}
                action={
                  <Button 
                    onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, "PREPARING"); }}
                    className="w-full h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-sm transition-transform active:scale-[0.99]"
                  >
                    <Flame className="size-4 mr-2" /> Start Preparing
                  </Button>
                }
              />
            ))}
          </Column>
        </div>

        {/* PREPARING */}
        <div className={cn(
          "h-full",
          mobileTab !== 'all' && mobileTab !== 'preparing' && "hidden md:block"
        )}>
          <Column 
            title="Preparing" 
            count={preparingOrders.length} 
            icon={Flame} 
            colorClass="text-orange-500"
            bgClass="bg-orange-50/50 dark:bg-orange-900/10"
            emptyText="No active cooking tickets"
          >
            {preparingOrders.map(order => (
              <OrderCard 
                key={order.id} 
                order={order} 
                onClick={() => onOrderClick(order)}
                showTimer
                action={
                  <Button 
                    onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, "READY"); }}
                    className="w-full h-11 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold shadow-sm transition-transform active:scale-[0.99]"
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
          mobileTab !== 'all' && mobileTab !== 'ready' && "hidden md:block"
        )}>
          <Column 
            title="Ready" 
            count={readyOrders.length} 
            icon={CheckCircle2} 
            colorClass="text-green-500"
            bgClass="bg-green-50/50 dark:bg-green-900/10"
            emptyText="No orders ready for pickup"
          >
            {readyOrders.map(order => (
              <OrderCard 
                key={order.id} 
                order={order} 
                onClick={() => onOrderClick(order)}
                action={
                  <div className="w-full h-11 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 flex items-center justify-center font-bold text-xs sm:text-sm border border-slate-200/80 dark:border-zinc-700">
                    <ShoppingBag className="size-4 mr-2 text-green-500" /> Waiting for Driver
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
    blue: "text-blue-500 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400 border-blue-100 dark:border-blue-500/20",
    orange: "text-orange-500 bg-orange-50 dark:bg-orange-500/10 dark:text-orange-400 border-orange-100 dark:border-orange-500/20",
    green: "text-green-600 bg-green-50 dark:bg-green-500/10 dark:text-green-400 border-green-100 dark:border-green-500/20",
    red: "text-red-500 bg-red-50 dark:bg-red-500/10 dark:text-red-400 border-red-100 dark:border-red-500/20",
    indigo: "text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20",
    emerald: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20",
  };

  return (
    <div className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow min-w-[135px] sm:min-w-0 shrink-0 sm:shrink">
      <div className="flex items-center justify-between gap-2 mb-1.5 sm:mb-2">
        <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider truncate">{title}</span>
        <div className={cn("p-1.5 rounded-lg border shrink-0", colorMap[color])}>
          <Icon className="size-3.5 sm:size-4" />
        </div>
      </div>
      <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</div>
    </div>
  );
}

function Column({ title, count, icon: Icon, colorClass, bgClass, emptyText, children }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <div className={cn("flex flex-col rounded-3xl border border-slate-200/80 dark:border-white/10 overflow-hidden transition-colors h-full min-h-[260px]", bgClass)}>
      <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-200/60 dark:border-white/5 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md flex items-center justify-between shrink-0">
        <h2 className="font-bold text-base sm:text-lg text-slate-900 dark:text-zinc-100 flex items-center gap-2">
          <Icon className={cn("size-4 sm:size-5", colorClass)} /> {title}
        </h2>
        <span className="bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs sm:text-sm font-black px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full">
          {count}
        </span>
      </div>
      <div className="flex-1 p-3 sm:p-4 overflow-y-auto custom-scrollbar flex flex-col gap-3 sm:gap-4">
        {hasChildren ? (
          children
        ) : (
          <div className="flex-1 min-h-[140px] flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-zinc-500">
            <Inbox className="size-8 sm:size-10 mb-2 opacity-40" />
            <p className="text-xs sm:text-sm font-bold">{emptyText || "No orders"}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order, onClick, action, showTimer }) {
  return (
    <div 
      onClick={onClick}
      className="bg-white dark:bg-zinc-900 rounded-2xl p-3.5 sm:p-4 shadow-sm border border-slate-200/80 dark:border-white/5 cursor-pointer hover:shadow-md hover:border-orange-500/50 transition-all flex flex-col group"
    >
      <div className="flex justify-between items-start mb-3 border-b border-slate-100 dark:border-white/5 pb-2.5">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Order</span>
          <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-zinc-100 leading-none">
            #{order.order_number ? (order.order_number.length > 8 ? order.order_number.slice(-6) : order.order_number) : order.id}
          </h3>
        </div>
        <div className="text-right flex flex-col items-end">
          {showTimer ? (
             <div className="flex items-center gap-1.5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-1 rounded-lg text-xs sm:text-sm font-bold border border-orange-200 dark:border-orange-500/20">
               <Flame className="size-3.5 animate-pulse text-orange-500" />
               <ElapsedTimer startTime={order.updated_at || order.created_at} />
             </div>
          ) : (
            <>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Time</span>
              <div className="flex items-center gap-1 text-xs sm:text-sm font-bold text-slate-700 dark:text-zinc-300">
                <Clock className="size-3.5" />
                {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </>
          )}
        </div>
      </div>

      {showTimer && (
        <div className="mb-3">
           <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
             <div className="h-full bg-orange-500 rounded-full w-[60%] relative overflow-hidden">
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
             </div>
           </div>
           <div className="flex justify-between items-center mt-1.5">
              <span className="text-xs font-bold text-slate-500">Preparing...</span>
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400">
                 <div className="size-4 rounded-full bg-slate-200 dark:bg-zinc-700 flex items-center justify-center text-[8px] text-slate-600 font-bold">C</div>
                 Chef
              </div>
           </div>
        </div>
      )}

      <div className="flex-1 space-y-2 mb-3 sm:mb-4">
        {order.items?.map((item, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <div className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 px-1.5 py-0.5 rounded text-xs font-black min-w-[24px] text-center shrink-0">
              {item.quantity}x
            </div>
            <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-zinc-200 truncate">{item.product_name}</span>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-1">
        {action}
      </div>
    </div>
  );
}
