import { 
  LayoutDashboard, 
  ChefHat, 
  Users, 
  LineChart, 
  Bell, 
  Settings,
  Flame,
  CheckCircle2,
  Clock,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'orders', label: 'Orders', icon: Clock },
  { id: 'preparing', label: 'Preparing', icon: Flame },
  { id: 'ready', label: 'Ready', icon: CheckCircle2 },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'chef-profile', label: 'Chef Profile', icon: ChefHat },
  { id: 'performance', label: 'Kitchen Performance', icon: LineChart },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
];

function SidebarContent({ activeView, onSelectView, user, onClose }) {
  return (
    <div className="flex flex-col h-full bg-slate-900 dark:bg-zinc-950 text-slate-300">
      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
            <ChefHat className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-tight leading-none">Flame & Crust</h1>
            <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mt-1">Kitchen Portal</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      {/* Navigation Items */}
      <div className="flex-1 py-4 px-3 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-3">Main Menu</div>
        {menuItems.slice(0, 4).map(item => (
          <button
            key={item.id}
            onClick={() => onSelectView(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 text-left",
              activeView === item.id 
                ? "bg-orange-500/10 text-orange-500" 
                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
            )}
          >
            <item.icon className={cn("size-5 shrink-0", activeView === item.id ? "text-orange-500" : "text-slate-500")} />
            <span className="truncate">{item.label}</span>
          </button>
        ))}

        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-5 mb-2 px-3">Management</div>
        {menuItems.slice(4).map(item => (
          <button
            key={item.id}
            onClick={() => onSelectView(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 text-left",
              activeView === item.id 
                ? "bg-blue-500/10 text-blue-400" 
                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
            )}
          >
            <item.icon className={cn("size-5 shrink-0", activeView === item.id ? "text-blue-400" : "text-slate-500")} />
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Staff Profile Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50 shrink-0">
        <div 
          onClick={() => onSelectView('chef-profile')}
          className="flex items-center gap-3 bg-slate-800/50 p-2.5 sm:p-3 rounded-2xl border border-slate-700/50 hover:border-slate-600 transition-colors cursor-pointer"
        >
          <div className="relative shrink-0">
            <div className="size-10 rounded-full bg-slate-700 border-2 border-slate-800 overflow-hidden flex items-center justify-center text-slate-300 font-bold">
               {user?.name?.charAt(0) || 'C'}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 size-3.5 bg-green-500 border-2 border-slate-800 rounded-full"></div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{user?.name || 'Staff'}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate flex items-center gap-1">
              {user?.role_title || user?.role || 'Staff'}
              <span className="text-green-500 ml-1">●</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function KitchenSidebar({ activeView, setActiveView, user, mobileOpen, onCloseMobile }) {
  const handleSelect = (viewId) => {
    setActiveView(viewId);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex w-64 h-[calc(100vh-env(safe-area-inset-top,0px))] border-r border-slate-800 transition-colors shrink-0 overflow-hidden">
        <SidebarContent 
          activeView={activeView} 
          onSelectView={handleSelect} 
          user={user} 
        />
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-300">
            <SidebarContent 
              activeView={activeView} 
              onSelectView={handleSelect} 
              user={user} 
              onClose={onCloseMobile}
            />
          </div>
        </div>
      )}
    </>
  );
}
