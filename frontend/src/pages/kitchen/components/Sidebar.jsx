import { 
  LayoutDashboard, 
  ChefHat, 
  Users, 
  LineChart, 
  Flame,
  CheckCircle2,
  Clock,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { id: 'dashboard', label: 'Kitchen Board', icon: LayoutDashboard, badgeKey: 'orders' },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'performance', label: 'Performance', icon: LineChart },
  { id: 'chef-profile', label: 'Chef Profile', icon: ChefHat },
];

function SidebarContent({ activeView, onSelectView, user, activeOrdersCount = 0 }) {
  return (
    <div className="flex flex-col h-full bg-card/85 dark:bg-zinc-950/85 backdrop-blur-xl text-foreground border-r border-border/60">
      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-border/60 flex items-center justify-between pt-[max(1.25rem,calc(env(safe-area-inset-top,0px)+0.75rem))]">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-2xl bg-gradient-to-br from-primary via-orange-500 to-amber-500 flex items-center justify-center shadow-warm text-white shrink-0">
            <Flame className="size-6 fill-white/20" />
          </div>
          <div>
            <h1 className="font-serif text-xl font-bold tracking-tight text-foreground leading-none">Flame & Crust</h1>
            <p className="text-[10px] font-bold text-primary dark:text-accent uppercase tracking-widest mt-1">Kitchen Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 py-5 px-3.5 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar">
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 px-3">Navigation</div>
        {menuItems.map(item => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={cn(
                "w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 text-left",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-warm font-bold" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/70"
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <item.icon className={cn("size-5 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badgeKey === 'orders' && activeOrdersCount > 0 && (
                <span className={cn(
                  "text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 shadow-xs",
                  isActive ? "bg-white/25 text-white" : "bg-primary text-primary-foreground"
                )}>
                  {activeOrdersCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Staff Profile Footer */}
      <div className="p-4 border-t border-border/60 bg-secondary/30 dark:bg-zinc-900/30 shrink-0 pb-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))]">
        <div 
          onClick={() => onSelectView('chef-profile')}
          className={cn(
            "flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer shadow-xs",
            activeView === 'chef-profile'
              ? "bg-primary/10 border-primary/30"
              : "bg-card border-border/70 hover:border-primary/30 hover:bg-secondary/50"
          )}
        >
          <div className="relative shrink-0">
            <div className="size-10 rounded-full bg-primary/10 text-primary border border-primary/20 overflow-hidden flex items-center justify-center font-serif font-bold text-base">
               {user?.name?.charAt(0) || 'C'}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 size-3.5 bg-emerald-500 border-2 border-card rounded-full"></div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-serif text-sm font-bold text-foreground truncate">{user?.name || 'Staff'}</p>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate flex items-center gap-1">
              {user?.role_title || user?.role || 'Chef'}
              <span className="text-emerald-500 ml-0.5 font-bold">● On Duty</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function KitchenSidebar({ activeView, setActiveView, user, activeOrdersCount = 0 }) {
  const handleSelect = (viewId) => {
    setActiveView(viewId);
  };

  return (
    <aside className="hidden lg:flex w-64 h-[calc(100vh-env(safe-area-inset-top,0px))] border-r border-border/60 transition-colors shrink-0 overflow-hidden">
      <SidebarContent 
        activeView={activeView} 
        onSelectView={handleSelect} 
        user={user} 
        activeOrdersCount={activeOrdersCount}
      />
    </aside>
  );
}
