import { LineChart, BarChart, Clock, CheckCircle2, TrendingUp, AlertTriangle } from "lucide-react";

export function PerformanceView({ orders = [] }) {
  // Calculate real performance metrics
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todaysOrders = orders.filter(o => new Date(o.created_at) >= todayStart);
  const completedToday = todaysOrders.filter(o => ['READY', 'COMPLETED', 'DELIVERED'].includes(o.status));
  const delayedOrders = todaysOrders.filter(o => o.status === 'PENDING' && (new Date() - new Date(o.created_at)) > 15 * 60 * 1000); // Pending > 15 mins

  // Avg Prep Time (difference between created_at and updated_at for READY orders)
  let totalPrepSeconds = 0;
  let validPrepOrders = 0;
  completedToday.forEach(o => {
    if (o.created_at && o.updated_at) {
       const diff = Math.floor((new Date(o.updated_at) - new Date(o.created_at)) / 1000);
       if (diff > 0 && diff < 3600) { // sanity check: less than 1 hour prep time
         totalPrepSeconds += diff;
         validPrepOrders++;
       }
    }
  });

  const avgPrepMins = validPrepOrders > 0 ? Math.floor((totalPrepSeconds / validPrepOrders) / 60) : 0;
  const avgPrepSecs = validPrepOrders > 0 ? Math.floor((totalPrepSeconds / validPrepOrders) % 60) : 0;

  // Orders per hour (since start of day)
  const currentHour = new Date().getHours() || 1;
  const ordersPerHour = Math.round(todaysOrders.length / (currentHour - todayStart.getHours() || 1));

  // Dynamic week graph (simplified to last 7 days count)
  const weekData = Array(7).fill(0);
  orders.forEach(o => {
    const d = new Date(o.created_at);
    const dayIndex = (d.getDay() + 6) % 7; // Monday = 0
    if ((new Date() - d) < 7 * 24 * 60 * 60 * 1000) {
      weekData[dayIndex]++;
    }
  });
  const maxDay = Math.max(...weekData, 1);
  const weekPercentages = weekData.map(v => Math.round((v / maxDay) * 100));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="mb-4 sm:mb-6 shrink-0">
        <h2 className="text-xl sm:text-2xl font-serif font-bold text-foreground flex items-center gap-2.5 sm:gap-3">
          <span className="p-1.5 rounded-xl bg-primary/10 text-primary shadow-xs">
            <LineChart className="size-5 sm:size-6" />
          </span>
          Kitchen Performance Analytics
        </h2>
        <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-1">Monitor efficiency, prep speed, and overall kitchen rating</p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 mb-4 sm:mb-6">
          <StatCard title="Orders Completed" value={completedToday.length} icon={CheckCircle2} color="green" />
          <StatCard title="Avg Prep Time" value={`${avgPrepMins}m ${avgPrepSecs}s`} icon={Clock} color="blue" />
          <StatCard title="Orders per Hour" value={ordersPerHour} icon={TrendingUp} color="orange" />
          <StatCard title="Delayed Orders" value={delayedOrders.length} icon={AlertTriangle} color="red" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-border/70 shadow-warm">
            <h3 className="font-serif font-bold text-base sm:text-lg text-foreground mb-4 sm:mb-6">Completion Rate vs Goal</h3>
            <div className="h-48 sm:h-64 flex items-end justify-between gap-1.5 sm:gap-2">
              {weekPercentages.map((val, i) => (
                <div key={i} className="w-full bg-secondary/70 rounded-t-xl relative group">
                  <div 
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary to-orange-500 rounded-t-xl transition-all duration-1000 shadow-warm" 
                    style={{ height: `${val}%` }}
                  />
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">{val}%</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
            </div>
          </div>

          <div className="bg-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-border/70 shadow-warm flex flex-col justify-between">
            <div>
              <h3 className="font-serif font-bold text-base sm:text-lg text-foreground mb-1">Customer Rating</h3>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Based on artisan food quality and prep time</p>
            </div>
            <div className="flex items-center justify-center py-6 sm:py-10">
              <div className="relative size-36 sm:size-48 rounded-full border-[12px] sm:border-[16px] border-secondary flex items-center justify-center overflow-hidden">
                <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 192 192">
                  <circle cx="96" cy="96" r="80" fill="none" stroke="currentColor" strokeWidth="16" className="text-primary" strokeDasharray="502" strokeDashoffset="25" strokeLinecap="round" />
                </svg>
                <div className="text-center">
                  <span className="text-3xl sm:text-5xl font-serif font-bold text-foreground block">4.9</span>
                  <span className="text-xs sm:text-sm font-bold text-amber-500">★★★★★</span>
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-8 pt-2 border-t border-border/50">
              <div className="text-center">
                <div className="text-lg sm:text-xl font-serif font-bold text-foreground">98%</div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Positive</div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-xl font-serif font-bold text-foreground">2%</div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Negative</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  const colorMap = {
    blue: "text-sky-600 bg-sky-500/10 border-sky-500/20",
    orange: "text-primary bg-primary/10 border-primary/20",
    green: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
    red: "text-red-600 bg-red-500/10 border-red-500/20",
  };

  return (
    <div className="bg-card p-3 sm:p-5 rounded-2xl sm:rounded-3xl border border-border/70 shadow-warm hover:shadow-warm-lg transition-all">
      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
        <div className={`p-2 rounded-xl border shrink-0 ${colorMap[color]}`}>
          <Icon className="size-4 sm:size-5" />
        </div>
        <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider leading-tight truncate">{title}</span>
      </div>
      <div className="text-xl sm:text-3xl font-serif font-bold text-foreground tracking-tight truncate">{value}</div>
    </div>
  );
}
