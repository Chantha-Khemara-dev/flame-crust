import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from "react-router-dom";
import { Menu as MenuIcon, X, Sun, Moon, Store, ShieldCheck, ChevronRight, KeyRound, LogOut, PanelLeftClose, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider.jsx";
import AdminSidebar from "./sidebar.jsx";
import AdminResourcePage from "./resource-page.jsx";
import AdminDashboard from "./dashboard.jsx";
import KitchenDashboard from "./kitchen-dashboard.jsx";
import AdminChangePasswordDialog from "./change-password-dialog.jsx";

const adminResources = [
  "products",
  "product_options",
  "product_variants",
  "categories",
  "customers",
  "orders",
  "payments",
  "drivers",
  "coupons",
  "users",
  "roles",
  "reviews",
  "audit_logs",
  "kitchen_staff",
  "inventory",
  "ingredients",
  "ingredient_stock",
  "product_recipes",
];

function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved !== null ? saved === "true" : false; // Default expanded for modern visibility!
  });
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", isCollapsed);
  }, [isCollapsed]);

  const [adminAuth, setAdminAuth] = useState(() => {
    try {
      const auth = localStorage.getItem("adminAuth");
      return auth ? JSON.parse(auth) : null;
    } catch {
      return null;
    }
  });

  const isAuthorized = adminAuth && (adminAuth.role || "").toUpperCase() === "ADMIN";

  const currentPath = location.pathname.replace("/admin/", "").replace("/admin", "") || "dashboard";

  const handleSignOut = () => {
    localStorage.removeItem("adminAuth");
    navigate("/login", { replace: true });
  };

  if (!isAuthorized) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  const getPageTitle = () => {
    if (currentPath === "dashboard") return "Dashboard Overview";
    return currentPath.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="h-screen overflow-hidden flex bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-full shrink-0">
        <AdminSidebar isCollapsed={isCollapsed} toggleCollapse={() => setIsCollapsed(!isCollapsed)} />
      </div>

      {/* Mobile Sidebar Overlay Drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileOpen(false)}
            aria-label="Close backdrop"
          />
          <div className="fixed inset-y-0 left-0 z-50 w-[240px] max-w-[80vw] lg:hidden shadow-2xl animate-in slide-in-from-left duration-200 flex flex-col">
            <AdminSidebar onNavigate={() => setMobileOpen(false)} isCollapsed={false} />
          </div>
        </>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-secondary/15 dark:bg-zinc-950/90 relative overflow-hidden transition-colors">
        {/* Subtle Ambient Light Orbs for Depth */}
        <div className="absolute -top-24 right-1/4 size-96 bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl pointer-events-none -z-0" />
        <div className="absolute top-1/3 -left-20 size-80 bg-amber-500/5 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none -z-0" />

        {/* Admin Top Header */}
        <header className="h-[calc(env(safe-area-inset-top)+3.5rem)] sm:h-[calc(env(safe-area-inset-top)+4.25rem)] pt-[env(safe-area-inset-top)] border-b border-border/50 bg-card/70 dark:bg-zinc-900/60 backdrop-blur-2xl px-3 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            {/* Mobile menu trigger */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden size-9 rounded-xl border-border/80"
              aria-label="Open menu"
            >
              <MenuIcon className="size-4" />
            </Button>

            {/* Breadcrumb / Page Title */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-bold uppercase tracking-wider ml-1">
              <span className="hidden sm:inline bg-secondary/80 text-foreground/80 px-2.5 py-1 rounded-lg text-[11px] font-black tracking-widest">ADMIN BASE</span>
              <ChevronRight className="size-3.5 hidden sm:inline opacity-40" />
              <span className="text-foreground font-extrabold tracking-tight text-sm sm:text-base capitalize">
                {getPageTitle()}
              </span>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2.5">
            {/* Theme Toggle with Spring Morph Animation */}
            <Button
              variant="outline"
              size="icon"
              className="size-9 rounded-xl border-border/70 text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-all cursor-pointer relative overflow-hidden group shadow-2xs hover:shadow-warm active:scale-95"
              onClick={(e) => setTheme(theme === "dark" ? "light" : "dark", e)}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Light Mode" : "Dark Mode"}
            >
              <div className="relative size-4 flex items-center justify-center">
                <Sun className={cn(
                  "size-4 text-amber-500 transition-all duration-500 absolute",
                  theme === "dark" 
                    ? "-rotate-90 scale-0 opacity-0" 
                    : "rotate-0 scale-100 opacity-100 animate-theme-spin drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                )} />
                <Moon className={cn(
                  "size-4 text-indigo-400 transition-all duration-500 absolute",
                  theme === "dark" 
                    ? "rotate-0 scale-100 opacity-100 animate-theme-spin drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]" 
                    : "rotate-90 scale-0 opacity-0"
                )} />
              </div>
            </Button>

            {/* Sign Out Button */}
            <Button
              variant="outline"
              size="icon"
              className="size-9 rounded-xl border-border/60 text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 transition-colors cursor-pointer"
              onClick={handleSignOut}
              aria-label="Sign out"
              title="Sign Out"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </header>

        {/* Change Password Dialog */}
        <AdminChangePasswordDialog
          open={changePasswordOpen}
          onOpenChange={setChangePasswordOpen}
        />

        {/* Dynamic Page Routes */}
        <main className="flex-1 overflow-y-auto px-2 py-2.5 sm:px-6 sm:py-6 lg:p-8 w-full no-scrollbar">
          <div className="w-full max-w-[1600px] mx-auto">
            <Routes>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="kitchen" element={<KitchenDashboard />} />
              {adminResources.map((key) => (
                <Route
                  key={key}
                  path={key}
                  element={<AdminResourcePage resource={key} />}
                />
              ))}
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
