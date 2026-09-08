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
        <h2 className="text-xl sm:text-2xl font-serif font-bold text-foreground flex items-center gap-2.5 sm:gap-3">
          <span className="p-1.5 rounded-xl bg-primary/10 text-primary shadow-xs">
            <ChefHat className="size-5 sm:size-6" />
          </span>
          Chef Profile & Station
        </h2>
        <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-1">Manage your active kitchen shift and status</p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-6">
        <div className="bg-card rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-border/70 shadow-warm max-w-3xl space-y-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-6">
            <div className="size-20 sm:size-24 rounded-2xl bg-gradient-to-br from-primary via-orange-500 to-amber-500 flex items-center justify-center shadow-warm text-3xl sm:text-4xl font-serif font-bold text-white shrink-0">
              {staffName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-center sm:justify-start gap-2.5 mb-1 flex-wrap">
                <h3 className="text-2xl sm:text-3xl font-serif font-bold text-foreground truncate">{staffName}</h3>
                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-emerald-500/20 shadow-xs">
                  On Duty
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-widest">{staffRole}</p>
              
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-3 sm:mt-4 text-xs sm:text-sm font-medium text-muted-foreground items-center sm:items-start">
                <span className="flex items-center gap-1.5"><Mail className="size-3.5 sm:size-4 text-primary/70" /> {staffEmail}</span>
                <span className="flex items-center gap-1.5"><Phone className="size-3.5 sm:size-4 text-primary/70" /> {staffPhone}</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 pt-4 border-t border-border/60">
            <div className="bg-secondary/40 rounded-2xl p-3.5 sm:p-4 border border-border/60 shadow-xs">
              <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Completed Today</span>
              <div className="text-xl sm:text-2xl font-serif font-bold text-foreground flex items-center gap-2">
                <CheckCircle className="size-4 sm:size-5 text-emerald-600" /> {totalOrdersToday}
              </div>
            </div>
            <div className="bg-secondary/40 rounded-2xl p-3.5 sm:p-4 border border-border/60 shadow-xs">
              <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Active in Kitchen</span>
              <div className="text-xl sm:text-2xl font-serif font-bold text-foreground flex items-center gap-2">
                <Flame className="size-4 sm:size-5 text-primary" /> {activeOrdersCount}
              </div>
            </div>
            <div className="bg-secondary/40 rounded-2xl p-3.5 sm:p-4 border border-border/60 shadow-xs col-span-2 sm:col-span-1">
              <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Kitchen Rating</span>
              <div className="text-xl sm:text-2xl font-serif font-bold text-foreground flex items-center gap-2">
                <Star className="size-4 sm:size-5 text-amber-500 fill-amber-500" /> 4.9 <span className="text-xs text-muted-foreground font-sans font-medium">/ 5.0</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/60">
            <div>
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2.5">Today's Shift Schedule</h4>
              <div className="bg-secondary/40 rounded-2xl p-4 border border-border/60 flex items-center gap-3 shadow-xs">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Clock className="size-5" />
                </div>
                <div>
                  <span className="block font-serif font-bold text-sm sm:text-base text-foreground">Active Duty • 08:00 AM - Close</span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Station Live & Receiving Tickets</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2.5">Station Actions</h4>
              <div className="flex gap-2">
                {onRefresh && (
                  <Button 
                    variant="outline" 
                    onClick={onRefresh} 
                    className="flex-1 h-12 rounded-full border-border hover:bg-secondary/80 font-bold shadow-xs transition-all"
                  >
                    <RefreshCw className="size-4 mr-2 text-primary" /> Sync Data
                  </Button>
                )}
                {onSignOut && (
                  <Button 
                    variant="outline" 
                    onClick={onSignOut} 
                    className="flex-1 h-12 rounded-full border-red-500/30 text-red-600 hover:bg-red-500/10 font-bold shadow-xs transition-all"
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
