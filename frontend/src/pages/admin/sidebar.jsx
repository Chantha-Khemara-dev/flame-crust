import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Boxes,
  SlidersHorizontal,
  ClipboardList,
  CreditCard,
  Truck,
  Ticket,
  Users,
  UserCheck,
  Shield,
  Star,
  ScrollText,
  Store,
  LogOut,
  ChevronRight,
  ShieldCheck,
  ChefHat,
  Warehouse,
  Carrot,
  Scale,
  UtensilsCrossed,
  KeyRound,
  PanelLeft,
  PanelLeftClose,
  X,
  Sun,
  Moon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider.jsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AdminChangePasswordDialog from "./change-password-dialog.jsx";
import { unsubscribeFromPushNotifications } from "@/lib/push-notifications";

const iconMap = {
  dashboard: LayoutDashboard,
  kitchen: ChefHat,
  kitchen_staff: ChefHat,
  products: Package,
  categories: FolderTree,
  product_variants: Boxes,
  product_options: SlidersHorizontal,
  orders: ClipboardList,
  payments: CreditCard,
  drivers: Truck,
  coupons: Ticket,
  customers: Users,
  users: UserCheck,
  roles: Shield,
  reviews: Star,
  audit_logs: ScrollText,
  inventory: Warehouse,
  ingredients: Carrot,
  ingredient_stock: Scale,
  product_recipes: UtensilsCrossed,
};

const navGroups = [
  {
    title: "Overview",
    items: [{ key: "dashboard", label: "Dashboard" }]
  },
  {
    title: "Catalog",
    items: [
      { key: "products", label: "Products" },
      { key: "categories", label: "Categories" },
      { key: "product_variants", label: "Variants" },
      { key: "product_options", label: "Options" },
    ]
  },
  {
    title: "Operations",
    items: [
      { key: "orders", label: "Orders" },
      { key: "kitchen", label: "Kitchen (KDS)" },
      { key: "payments", label: "Payments" },
      { key: "drivers", label: "Drivers" },
      { key: "coupons", label: "Coupons" },
    ]
  },
  {
    title: "Inventory",
    items: [
      { key: "inventory", label: "Inventory" },
      { key: "ingredients", label: "Ingredients" },
      { key: "ingredient_stock", label: "Ingredient Stock" },
      { key: "product_recipes", label: "Product Recipes" },
    ]
  },
  {
    title: "System",
    items: [
      { key: "customers", label: "Customers" },
      { key: "kitchen_staff", label: "Kitchen Staff" },
      { key: "users", label: "System Users" },
      { key: "roles", label: "Roles & Access" },
      { key: "reviews", label: "Reviews" },
      { key: "audit_logs", label: "Audit Logs" },
    ]
  }
];

function AdminSidebar({ onNavigate, isCollapsed, toggleCollapse }) {
  const { theme, setTheme } = useTheme();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [adminAuth, setAdminAuth] = useState(() => {
    try {
      const auth = localStorage.getItem("adminAuth");
      return auth ? JSON.parse(auth) : null;
    } catch {
      return null;
    }
  });
  const location = useLocation();
  const currentPath = location.pathname.replace("/admin/", "").replace("/admin", "") || "dashboard";

  const handleNav = () => onNavigate?.();

  const handleSignOut = async () => {
    try {
      await unsubscribeFromPushNotifications();
    } catch (e) {
      console.error("Failed to unsubscribe push:", e);
    }
    localStorage.removeItem("adminAuth");
    localStorage.removeItem("customerAuth");
    window.location.href = "/login";
  };

  return (
    <TooltipProvider delayDuration={100}>
      <aside 
        className={cn(
          "h-full bg-card/85 dark:bg-zinc-900/90 backdrop-blur-2xl border-r border-border/50 flex flex-col transition-[width] duration-300 ease-in-out relative shadow-sm select-none z-20 overflow-hidden pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]",
          isCollapsed ? "w-[60px]" : "w-[240px]"
        )}
      >
        {/* Brand Header */}
        <div className="h-12 border-b border-border/50 px-2.5 flex items-center justify-between shrink-0 overflow-hidden relative">
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleCollapse}
                  className="size-8 rounded-lg bg-gradient-to-tr from-primary via-orange-500 to-amber-500 text-white hover:opacity-90 shadow-xs shadow-primary/25 flex items-center justify-center group mx-auto cursor-pointer"
                >
                  <PanelLeft className="size-3.5 transition-transform group-hover:scale-110" />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                sideOffset={14}
                className="bg-zinc-950/95 text-zinc-100 border border-primary/30 shadow-[0_12px_32px_rgba(0,0,0,0.6),0_0_16px_rgba(239,68,68,0.2)] backdrop-blur-xl rounded-xl px-3 py-1.5 text-xs font-bold select-none z-[100]"
              >
                🔥 Expand Sidebar
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="w-full flex items-center justify-between px-0.5">
              <Link to="/admin" onClick={handleNav} className="flex items-center gap-2 overflow-hidden min-w-0 group">
                <div className="size-7 shrink-0 rounded-lg bg-gradient-to-tr from-primary via-orange-500 to-amber-400 text-white flex items-center justify-center font-black text-xs shadow-xs shadow-primary/25 group-hover:scale-105 transition-transform">
                  🔥
                </div>
                <div className="flex flex-col justify-center min-w-0">
                  <h2 className="font-serif text-xs font-extrabold text-foreground tracking-tight group-hover:text-primary transition-colors truncate leading-tight">
                    Flame & Crust
                  </h2>
                  <p className="text-[8px] text-muted-foreground flex items-center gap-1 font-black tracking-wider uppercase">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Command
                  </p>
                </div>
              </Link>

              {onNavigate ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onNavigate}
                  className="size-7.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/70 shrink-0 cursor-pointer"
                  title="Close Sidebar"
                  aria-label="Close Sidebar"
                >
                  <X className="size-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleCollapse}
                  className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/70 shrink-0 cursor-pointer"
                  title="Collapse Sidebar"
                >
                  <PanelLeftClose className="size-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto no-scrollbar flex flex-col justify-start">
          {navGroups.map((group, groupIdx) => (
            <div key={group.title} className="space-y-0.5 relative">
              {/* Group header maintains identical height in both collapsed and expanded states to prevent any vertical icon shifting */}
              <div className="h-4 flex items-center px-2 mt-1 mb-0.5 first:mt-0 relative overflow-hidden">
                <span
                  className={cn(
                    "text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground/60 whitespace-nowrap transition-opacity duration-200",
                    isCollapsed ? "opacity-0 pointer-events-none w-0" : "opacity-100"
                  )}
                >
                  {group.title}
                </span>
                {isCollapsed && groupIdx > 0 && (
                  <div className="w-4 h-px bg-border/40 mx-auto rounded-full" />
                )}
              </div>

              <div className="space-y-0.5 relative z-10">
                {group.items.map(({ key, label }) => {
                  const IconComponent = iconMap[key] || LayoutDashboard;
                  const isActive = currentPath === key || currentPath.startsWith(key + "/");

                  // Specific badges for key operational links
                  const badgeText = key === "kitchen" ? "KDS" : key === "orders" ? "LIVE" : null;
                  const badgeColor = key === "kitchen" 
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20" 
                    : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";

                  return (
                    <Tooltip key={key}>
                      <TooltipTrigger asChild>
                        <Link
                          to={`/admin/${key}`}
                          onClick={handleNav}
                          className={cn(
                            "flex items-center h-[30px] w-full rounded-lg transition-colors duration-150 group relative overflow-hidden px-2.5",
                            isActive
                              ? "bg-primary/15 text-primary font-bold border border-primary/25 shadow-xs shadow-primary/5"
                              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60 font-medium"
                          )}
                        >
                          <IconComponent
                            className={cn(
                              "size-3.5 shrink-0 transition-transform duration-150 group-hover:scale-110",
                              isActive ? "text-primary" : "opacity-80 group-hover:opacity-100 group-hover:text-primary"
                            )}
                          />

                          {/* Text Label & Badge (Identical spacing as expanded mode, smoothly fades on collapse) */}
                          <div
                            className={cn(
                              "flex items-center justify-between flex-1 min-w-0 ml-2.5 transition-opacity duration-200 overflow-hidden",
                              isCollapsed ? "opacity-0 pointer-events-none w-0" : "opacity-100"
                            )}
                          >
                            <span className="truncate whitespace-nowrap text-[12px] font-medium tracking-tight">
                              {label}
                            </span>
                            {badgeText && !isActive && (
                              <span className={cn("ml-auto text-[8px] font-black px-1.5 py-0.5 rounded border shrink-0", badgeColor)}>
                                {badgeText}
                              </span>
                            )}
                            {isActive && (
                              <div className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(239,68,68,0.9)] ml-auto shrink-0 animate-pulse" />
                            )}
                          </div>
                        </Link>
                      </TooltipTrigger>

                      {/* Ultra-Premium Glassmorphism Tooltip for Collapsed State */}
                      {isCollapsed && (
                        <TooltipContent
                          side="right"
                          sideOffset={14}
                          className="bg-zinc-950/95 text-zinc-100 border border-primary/30 shadow-[0_12px_32px_rgba(0,0,0,0.6),0_0_16px_rgba(239,68,68,0.2)] backdrop-blur-xl rounded-xl px-3.5 py-2 flex items-center gap-2.5 select-none animate-in fade-in-0 zoom-in-95 data-[side=right]:slide-in-from-left-2 z-[100]"
                        >
                          <span
                            className={cn(
                              "size-2 rounded-full shrink-0 shadow-sm",
                              isActive ? "bg-primary shadow-[0_0_8px_rgba(239,68,68,1)] animate-pulse" : "bg-zinc-600"
                            )}
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-xs tracking-tight text-zinc-100 leading-tight">
                              {label}
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/80">
                              {group.title}
                            </span>
                          </div>
                          {badgeText && (
                            <span className={cn("text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded-md border shadow-xs shrink-0 ml-1", badgeColor)}>
                              {badgeText}
                            </span>
                          )}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Quick Actions (Storefront) */}
        <div className="px-2 pt-1 mt-auto shrink-0 flex justify-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                asChild
                className="w-full h-8 px-2.5 flex items-center justify-start bg-primary/10 border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground transition-colors duration-200 rounded-lg overflow-hidden cursor-pointer"
              >
                <Link to="/" replace onClick={handleNav}>
                  <Store className="size-3.5 shrink-0" />
                  <span
                    className={cn(
                      "font-bold text-[10.5px] uppercase tracking-wider overflow-hidden whitespace-nowrap ml-2.5 transition-opacity duration-200",
                      isCollapsed ? "opacity-0 pointer-events-none w-0" : "opacity-100 flex-1"
                    )}
                  >
                    Storefront
                  </span>
                </Link>
              </Button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent
                side="right"
                sideOffset={14}
                className="bg-zinc-950/95 text-zinc-100 border border-primary/30 shadow-[0_12px_32px_rgba(0,0,0,0.6),0_0_16px_rgba(239,68,68,0.2)] backdrop-blur-xl rounded-xl px-3.5 py-2 flex items-center gap-2 select-none z-[100]"
              >
                <Store className="size-3.5 text-primary shrink-0" />
                <div className="flex flex-col">
                  <span className="font-bold text-xs text-zinc-100">Live Storefront</span>
                  <span className="text-[9px] text-muted-foreground">Customer Menu View</span>
                </div>
              </TooltipContent>
            )}
          </Tooltip>
        </div>

        {/* Admin Account Footer */}
        <div className="p-2 border-t border-border/40 bg-transparent shrink-0 flex justify-center pb-2">
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="w-full h-8 px-1.5 flex items-center justify-start rounded-lg hover:bg-secondary/50 outline-none transition-colors duration-150 overflow-hidden cursor-pointer"
                  >
                    <div className="size-6.5 shrink-0 rounded-md bg-primary/10 text-primary flex items-center justify-center font-black text-[10px] shadow-[inset_0_0_0_1px_rgba(var(--primary),0.2)]">
                      {adminAuth?.name ? adminAuth.name.slice(0, 2).toUpperCase() : "AD"}
                    </div>
                    <div
                      className={cn(
                        "ml-2 flex flex-col items-start min-w-0 flex-1 overflow-hidden transition-opacity duration-200 pr-1",
                        isCollapsed ? "opacity-0 pointer-events-none w-0" : "opacity-100"
                      )}
                    >
                      <p className="text-[11px] font-bold text-foreground truncate group-hover:text-primary transition-colors whitespace-nowrap leading-tight">
                        {adminAuth?.name || "Administrator"}
                      </p>
                      <p className="text-[8px] font-black tracking-wider text-muted-foreground uppercase flex items-center gap-1 mt-0.5 whitespace-nowrap">
                        <KeyRound className="size-2 text-primary shrink-0" /> {adminAuth?.role || "ADMIN"}
                      </p>
                    </div>
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent
                  side="right"
                  sideOffset={14}
                  className="bg-zinc-950/95 text-zinc-100 border border-primary/30 shadow-[0_12px_32px_rgba(0,0,0,0.6),0_0_16px_rgba(239,68,68,0.2)] backdrop-blur-xl rounded-xl px-3.5 py-2 flex items-center gap-2.5 select-none z-[100]"
                >
                  <div className="size-6 rounded-md bg-primary/20 text-primary flex items-center justify-center font-black text-[10px]">
                    {adminAuth?.name ? adminAuth.name.slice(0, 2).toUpperCase() : "AD"}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-xs text-zinc-100">{adminAuth?.name || "Administrator"}</span>
                    <span className="text-[9px] text-muted-foreground flex items-center gap-1 font-semibold uppercase">
                      <KeyRound className="size-2.5 text-primary" /> {adminAuth?.role || "ADMIN"}
                    </span>
                  </div>
                </TooltipContent>
              )}
            </Tooltip>

            <DropdownMenuContent align={isCollapsed ? "start" : "center"} side={isCollapsed ? "right" : "top"} sideOffset={12} className="w-56 rounded-xl border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl p-2 z-[100]">
              <DropdownMenuLabel className="font-bold flex flex-col gap-1 p-2">
                <span className="text-sm">{adminAuth?.name || "Administrator"}</span>
                <span className="text-xs text-muted-foreground font-normal">{adminAuth?.email || "admin@flamecrust.com"}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem 
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")} 
                className="rounded-lg cursor-pointer font-bold focus:bg-primary/10 focus:text-primary transition-colors flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  {theme === "dark" ? (
                    <Sun className="size-4 text-amber-500" />
                  ) : (
                    <Moon className="size-4 text-indigo-400" />
                  )}
                  <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                </span>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/60">
                  {theme}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-lg cursor-pointer font-bold focus:bg-primary/10 focus:text-primary transition-colors">
                <Link to="/" replace>
                  <Store className="size-4 mr-2" /> Live Storefront
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setChangePasswordOpen(true)} className="rounded-lg cursor-pointer font-bold focus:bg-primary/10 focus:text-primary transition-colors">
                <KeyRound className="size-4 mr-2" /> Change Password
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem onClick={handleSignOut} className="rounded-lg cursor-pointer font-bold text-destructive focus:bg-destructive/10 focus:text-destructive transition-colors">
                <LogOut className="size-4 mr-2" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <AdminChangePasswordDialog
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
      />
    </TooltipProvider>
  );
}

export default AdminSidebar;
