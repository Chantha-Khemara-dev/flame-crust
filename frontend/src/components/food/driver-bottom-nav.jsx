import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Package, Map, TrendingUp, User, Bike } from "lucide-react";
import { cn } from "@/lib/utils";
import { list } from "@/lib/api";

export function DriverBottomNav({
  mobileView,
  onSelectMobileView,
  currentTab,
  onTabSelect,
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const [driver, setDriver] = useState(() => {
    try {
      const auth = localStorage.getItem("driverAuth");
      return auth ? JSON.parse(auth) : null;
    } catch {
      return null;
    }
  });

  const [activeOrdersCount, setActiveOrdersCount] = useState(0);

  useEffect(() => {
    const handleAuthChange = () => {
      try {
        const auth = localStorage.getItem("driverAuth");
        setDriver(auth ? JSON.parse(auth) : null);
      } catch {
        setDriver(null);
      }
    };
    window.addEventListener("storage", handleAuthChange);
    window.addEventListener("authChanged", handleAuthChange);

    const fetchActiveOrders = async () => {
      try {
        const auth = localStorage.getItem("driverAuth");
        if (!auth) return;
        const d = JSON.parse(auth);
        const orders = await list("orders");
        const count = orders.filter(
          (o) =>
            (String(o.driver_id) === String(d.id) || String(o.driverId) === String(d.id)) &&
            (o.status === "OUT_FOR_DELIVERY" || o.status === "ON_DELIVERY" || o.status === "ACCEPTED" || o.status === "PREPARING")
        ).length;
        setActiveOrdersCount(count);
      } catch {}
    };

    fetchActiveOrders();
    const interval = setInterval(fetchActiveOrders, 10000);

    return () => {
      window.removeEventListener("storage", handleAuthChange);
      window.removeEventListener("authChanged", handleAuthChange);
      clearInterval(interval);
    };
  }, []);

  const isProfilePage = location.pathname.startsWith("/driver/profile");
  const isDashboardPage = location.pathname.startsWith("/driver/dashboard");

  // Determine active states
  const isOrdersActive = isDashboardPage && (!mobileView || mobileView === "list");
  const isMapActive = isDashboardPage && mobileView === "map";
  const isEarningsActive = isProfilePage && currentTab === "PERFORMANCE";
  const isProfileActive = isProfilePage && currentTab !== "PERFORMANCE";

  const handleNavClick = (target) => {
    if (target === "orders") {
      if (isDashboardPage && onSelectMobileView) {
        onSelectMobileView("list");
      } else {
        navigate("/driver/dashboard");
      }
    } else if (target === "map") {
      if (isDashboardPage && onSelectMobileView) {
        onSelectMobileView("map");
      } else {
        navigate("/driver/dashboard?view=map");
      }
    } else if (target === "earnings") {
      if (isProfilePage && onTabSelect) {
        onTabSelect("PERFORMANCE");
      } else {
        navigate("/driver/profile?tab=PERFORMANCE");
      }
    } else if (target === "profile") {
      if (isProfilePage && onTabSelect) {
        onTabSelect("MENU");
      } else {
        navigate("/driver/profile");
      }
    }
  };

  const navItems = [
    {
      id: "orders",
      label: "Orders",
      isActive: isOrdersActive,
      icon: Package,
      badge: activeOrdersCount,
      target: "orders",
    },
    {
      id: "map",
      label: "Live Map",
      isActive: isMapActive,
      icon: Map,
      target: "map",
    },
    {
      id: "earnings",
      label: "Earnings",
      isActive: isEarningsActive,
      icon: TrendingUp,
      target: "earnings",
    },
    {
      id: "profile",
      label: "Profile",
      isActive: isProfileActive,
      icon: User,
      avatar: driver?.profile_photo || driver?.avatar,
      target: "profile",
    },
  ];

  return (
    <div className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))] inset-x-3 sm:inset-x-6 z-[70] md:hidden select-none">
      <nav
        className="mx-auto max-w-md bg-background/80 dark:bg-zinc-900/85 backdrop-blur-2xl backdrop-saturate-150 border border-black/[0.08] dark:border-white/[0.12] ring-1 ring-white/30 dark:ring-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.14)] rounded-full p-1.5 transition-all duration-300"
        aria-label="Driver Mobile Dock"
      >
        <div className="grid grid-cols-4 items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.target)}
                className="w-full flex items-center justify-center focus:outline-none touch-manipulation cursor-pointer active:scale-95 transition-transform duration-100"
              >
                <div
                  className={cn(
                    "relative flex flex-col items-center justify-center py-1.5 px-1 rounded-full transition-all duration-150 select-none w-full",
                    item.isActive
                      ? "bg-primary/12 text-primary shadow-2xs"
                      : "text-muted-foreground/75 hover:text-foreground hover:bg-foreground/5 active:scale-90"
                  )}
                >
                  {/* Icon or Avatar */}
                  <div className="relative flex items-center justify-center size-6 mb-0.5">
                    {item.avatar ? (
                      <div
                        className={cn(
                          "size-5.5 rounded-full overflow-hidden border transition-all duration-150",
                          item.isActive
                            ? "border-primary ring-2 ring-primary/40 scale-110 shadow-xs"
                            : "border-border/70 opacity-90"
                        )}
                      >
                        <img src={item.avatar} alt="Driver" className="size-full object-cover" />
                      </div>
                    ) : (
                      <Icon
                        className={cn(
                          "size-5 transition-transform duration-150 ease-out",
                          item.isActive ? "scale-110 stroke-[2.3]" : "stroke-[1.8]"
                        )}
                      />
                    )}

                    {/* Badge */}
                    {item.badge > 0 && (
                      <span className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] px-1 rounded-full bg-gradient-to-r from-red-600 to-amber-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-background shadow-xs animate-in zoom-in-75 duration-150">
                        {item.badge}
                      </span>
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className={cn(
                      "text-[10px] tracking-tight leading-none transition-colors duration-150",
                      item.isActive ? "font-bold text-primary" : "font-medium"
                    )}
                  >
                    {item.label}
                  </span>

                  {/* Active Indicator Glow */}
                  {item.isActive && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-0.5 rounded-full bg-primary shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default DriverBottomNav;
