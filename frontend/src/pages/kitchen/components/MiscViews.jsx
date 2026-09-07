import { ChefHat, Mail, Phone, MapPin, Star, Clock } from "lucide-react";

export function ChefProfileView({ user }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="mb-4 sm:mb-6 shrink-0">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5 sm:gap-3">
          <ChefHat className="size-5 sm:size-6 text-orange-500" /> Chef Profile
        </h2>
        <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-zinc-400 mt-0.5">Manage your kitchen profile and schedule</p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-200 dark:border-white/5 shadow-sm max-w-3xl">
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="size-20 sm:size-24 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg text-3xl sm:text-4xl font-black text-white shrink-0">
              {user?.name?.charAt(0) || 'C'}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-1 truncate">{user?.name || 'Kitchen Staff'}</h3>
              <p className="text-xs sm:text-sm font-bold text-orange-500 uppercase tracking-widest">{user?.role_title || user?.role || 'Head Chef'}</p>
              
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-3 sm:mt-4 text-xs sm:text-sm font-bold text-slate-500 dark:text-zinc-400 items-center sm:items-start">
                <span className="flex items-center gap-1.5"><Mail className="size-3.5 sm:size-4" /> {user?.email || 'staff@flamecrust.com'}</span>
                <span className="flex items-center gap-1.5"><Phone className="size-3.5 sm:size-4" /> {user?.phone || '+855 12 345 678'}</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-6 border-t border-slate-100 dark:border-white/5">
            <div>
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2.5">Today's Shift</h4>
              <div className="bg-slate-50 dark:bg-zinc-950 rounded-2xl p-4 border border-slate-100 dark:border-white/5 flex items-center gap-3">
                <Clock className="size-5 text-blue-500 shrink-0" />
                <div>
                  <span className="block font-black text-sm sm:text-base text-slate-900 dark:text-white">08:00 AM - 05:00 PM</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Regular Shift</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2.5">Performance</h4>
              <div className="bg-slate-50 dark:bg-zinc-950 rounded-2xl p-4 border border-slate-100 dark:border-white/5 flex items-center gap-3">
                <Star className="size-5 text-orange-500 shrink-0" />
                <div>
                  <span className="block font-black text-sm sm:text-base text-slate-900 dark:text-white">4.9 / 5.0 Rating</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Top 10% this month</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotificationsView() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="mb-6 shrink-0">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
          Kitchen Notifications
        </h2>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-500 font-bold">No new notifications</p>
      </div>
    </div>
  );
}

export function SettingsView() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="mb-6 shrink-0">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
          Kitchen Settings
        </h2>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-500 font-bold">Settings panel coming soon.</p>
      </div>
    </div>
  );
}
