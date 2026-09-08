import { ChefHat, Mail, Phone, Star, Clock, ShoppingBag, Flame, RefreshCw, LogOut, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ChefProfileView({ 
  user, 
  totalOrdersToday = 0, 
  activeOrdersCount = 0,
  onRefresh,
  onSignOut 
}) {
  const staffName = user?.name || 'Kitchen Staff';
  const staffRole = user?.role_title || user?.role || 'Head Chef';
  const staffEmail = user?.email || 'staff@flamecrust.com';
  const staffPhone = user?.phone || '+855 12 345 678';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="mb-4 sm:mb-6 shrink-0">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5 sm:gap-3">
          <ChefHat className="size-5 sm:size-6 text-orange-500" /> Chef Profile & Station
        </h2>
        <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-zinc-400 mt-0.5">Manage your active kitchen shift and status</p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-6">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-200 dark:border-white/5 shadow-sm max-w-3xl space-y-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-6">
            <div className="size-20 sm:size-24 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg text-3xl sm:text-4xl font-black text-white shrink-0">
              {staffName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white truncate">{staffName}</h3>
                <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/30">
                  On Duty
                </span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-orange-500 uppercase tracking-widest">{staffRole}</p>
              
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-3 sm:mt-4 text-xs sm:text-sm font-bold text-slate-500 dark:text-zinc-400 items-center sm:items-start">
                <span className="flex items-center gap-1.5"><Mail className="size-3.5 sm:size-4" /> {staffEmail}</span>
                <span className="flex items-center gap-1.5"><Phone className="size-3.5 sm:size-4" /> {staffPhone}</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 pt-4 border-t border-slate-100 dark:border-white/5">
            <div className="bg-slate-50 dark:bg-zinc-950 p-3.5 sm:p-4 rounded-2xl border border-slate-100 dark:border-white/5">
              <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Completed Today</span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <CheckCircle className="size-4 sm:size-5 text-green-500" /> {totalOrdersToday}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-zinc-950 p-3.5 sm:p-4 rounded-2xl border border-slate-100 dark:border-white/5">
              <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Active in Kitchen</span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Flame className="size-4 sm:size-5 text-orange-500" /> {activeOrdersCount}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-zinc-950 p-3.5 sm:p-4 rounded-2xl border border-slate-100 dark:border-white/5 col-span-2 sm:col-span-1">
              <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Kitchen Rating</span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Star className="size-4 sm:size-5 text-amber-500 fill-amber-500" /> 4.9 <span className="text-xs text-slate-400 font-bold">/ 5.0</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-white/5">
            <div>
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2.5">Today's Shift Schedule</h4>
              <div className="bg-slate-50 dark:bg-zinc-950 rounded-2xl p-4 border border-slate-100 dark:border-white/5 flex items-center gap-3">
                <Clock className="size-5 text-blue-500 shrink-0" />
                <div>
                  <span className="block font-black text-sm sm:text-base text-slate-900 dark:text-white">Active Duty • 08:00 AM - Close</span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Station Live & Receiving Tickets</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2.5">Station Actions</h4>
              <div className="flex gap-2">
                {onRefresh && (
                  <Button 
                    variant="outline" 
                    onClick={onRefresh} 
                    className="flex-1 h-12 rounded-2xl border-slate-200 dark:border-zinc-700 font-bold"
                  >
                    <RefreshCw className="size-4 mr-2" /> Sync Data
                  </Button>
                )}
                {onSignOut && (
                  <Button 
                    variant="outline" 
                    onClick={onSignOut} 
                    className="flex-1 h-12 rounded-2xl border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 font-bold"
                  >
                    <LogOut className="size-4 mr-2" /> Sign Out
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
