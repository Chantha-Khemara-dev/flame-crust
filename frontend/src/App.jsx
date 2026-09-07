import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster } from "@/components/ui/sonner.jsx";
import { ScrollToTop } from "@/components/shared/scroll-to-top.jsx";
import { ActiveOrderWidget } from "@/components/food/active-order-widget.jsx";
import { FlyToCart } from "@/components/shared/fly-to-cart.jsx";
import { MobileBottomNav } from "@/components/food/mobile-bottom-nav.jsx";
import { SplashScreen } from "@/components/shared/splash-screen.jsx";
import { API_URL } from "@/lib/api";

const Home = lazy(() => import("./pages/home.jsx"));
const MenuPage = lazy(() => import("./pages/menu.jsx"));
const ProductDetailPage = lazy(() => import("./pages/product-detail.jsx"));
const CartPage = lazy(() => import("./pages/cart.jsx"));
const CheckoutPage = lazy(() => import("./pages/checkout.jsx"));
const PaymentGatewayPage = lazy(() => import("./pages/payment.jsx"));
const OrderConfirmationPage = lazy(() => import("./pages/order-confirmation.jsx"));
const AdminLayout = lazy(() => import("./pages/admin/layout.jsx"));
const LeaveReviewPage = lazy(() => import("./pages/leave-review.jsx"));
const LoginPage = lazy(() => import("./pages/login.jsx"));
const OrderTrackingPage = lazy(() => import("./pages/order-tracking.jsx"));
const DriverLoginPage = lazy(() => import("./pages/driver/login.jsx"));
const DriverDashboardPage = lazy(() => import("./pages/driver/dashboard.jsx"));
const DriverProfilePage = lazy(() => import("./pages/driver/profile.jsx"));
const KitchenDashboardPage = lazy(() => import("./pages/kitchen/dashboard.jsx"));
const ProfilePage = lazy(() => import("./pages/profile.jsx"));

// Pre-fetch primary route chunks in background for instant smooth page transitions
import("./pages/home.jsx");
import("./pages/menu.jsx");
import("./pages/product-detail.jsx");
import("./pages/cart.jsx");
import("./pages/profile.jsx");
import("./pages/admin/layout.jsx");

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="size-10 rounded-full border-3 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground font-medium">Loading...</p>
      </div>
    </div>
  );
}

function RoleRedirectGuard({ children }) {
  const location = useLocation();
  const driverAuth = localStorage.getItem("driverAuth");
  const adminAuth = localStorage.getItem("adminAuth");
  const kitchenAuth = localStorage.getItem("kitchenAuth");

  // If driver is logged in, strictly enforce driver dashboard / profile only
  if (driverAuth) {
    if (!location.pathname.startsWith("/driver")) {
      return <Navigate to="/driver/dashboard" replace />;
    }
  }

  // If admin is logged in and visits /login, redirect to admin dashboard
  if (adminAuth && location.pathname === "/login") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // If kitchen staff is logged in, strictly enforce kitchen dashboard
  if (kitchenAuth) {
    if (!location.pathname.startsWith("/kitchen") && !location.pathname.startsWith("/admin/kitchen-dashboard")) {
      return <Navigate to="/kitchen/dashboard" replace />;
    }
  }

  return children;
}

function RequireAuth({ children }) {
  const customerAuth = localStorage.getItem("customerAuth");
  const adminAuth = localStorage.getItem("adminAuth");
  const kitchenAuth = localStorage.getItem("kitchenAuth");
  const driverAuth = localStorage.getItem("driverAuth");
  const location = useLocation();

  if (!customerAuth && !adminAuth && !kitchenAuth && !driverAuth) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  return children;
}

export default function App() {
  const location = useLocation();

  // Background real-time profile & cover photo sync across devices
  useEffect(() => {
    const syncLatestCustomerProfile = async () => {
      try {
        const stored = localStorage.getItem("customerAuth");
        if (!stored) return;
        const c = JSON.parse(stored);
        if (!c.id && !c.email && !c.phone) return;

        const params = new URLSearchParams();
        if (c.id) params.set("customerId", String(c.id));
        if (c.phone) params.set("phone", String(c.phone));
        if (c.email) params.set("email", String(c.email));

        const res = await fetch(`${API_URL}/auth/customer-profile-data?${params.toString()}`).catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          if (data && data.customer) {
            const dbCustomer = data.customer;
            let changed = false;

            const updatedAuth = { ...c };
            if (dbCustomer.cover_photo !== undefined && dbCustomer.cover_photo !== c.cover_photo) {
              updatedAuth.cover_photo = dbCustomer.cover_photo || undefined;
              changed = true;
            }
            if (dbCustomer.avatar && dbCustomer.avatar !== c.avatar) {
              updatedAuth.avatar = dbCustomer.avatar;
              changed = true;
            }
            if (dbCustomer.name && dbCustomer.name !== c.name) {
              updatedAuth.name = dbCustomer.name;
              changed = true;
            }
            if (dbCustomer.phone && dbCustomer.phone !== c.phone) {
              updatedAuth.phone = dbCustomer.phone;
              changed = true;
            }

            if (changed) {
              localStorage.setItem("customerAuth", JSON.stringify(updatedAuth));
              window.dispatchEvent(new Event("authChanged"));
            }
          }
        }
      } catch (e) {
        // silent catch on network issues
      }
    };

    syncLatestCustomerProfile();
    window.addEventListener("focus", syncLatestCustomerProfile);
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") syncLatestCustomerProfile();
    });

    return () => {
      window.removeEventListener("focus", syncLatestCustomerProfile);
    };
  }, []);

  const isDriver = Boolean(localStorage.getItem("driverAuth"));
  const isAdmin = Boolean(localStorage.getItem("adminAuth"));
  const isKitchen = Boolean(localStorage.getItem("kitchenAuth"));
  const isStaff = isDriver || isAdmin || isKitchen;

  return (
    <Suspense fallback={<PageLoader />}>
      <SplashScreen />
      <ScrollToTop />
      <Toaster position="top-center" richColors closeButton />
      {!isStaff && <ActiveOrderWidget />}
      {!isStaff && <FlyToCart />}
      <MobileBottomNav />
      <RoleRedirectGuard>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<RequireAuth><CheckoutPage /></RequireAuth>} />
          <Route path="/payment" element={<PaymentGatewayPage />} />
          <Route path="/payment/:orderId" element={<PaymentGatewayPage />} />
          <Route path="/order-confirmation" element={<OrderConfirmationPage />} />
          <Route path="/track/:orderId" element={<OrderTrackingPage />} />
          <Route path="/review/:productId" element={<RequireAuth><LeaveReviewPage /></RequireAuth>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
          <Route path="/admin/login" element={<Navigate to="/login" replace />} />
          <Route path="/admin/*" element={<AdminLayout />} />
          <Route path="/driver/login" element={<Navigate to="/driver/dashboard" replace />} />
          <Route path="/driver/dashboard" element={<DriverDashboardPage />} />
          <Route path="/driver/profile" element={<DriverProfilePage />} />
          <Route path="/kitchen/login" element={<Navigate to="/login" replace />} />
          <Route path="/kitchen/dashboard" element={<KitchenDashboardPage />} />
        </Routes>
      </RoleRedirectGuard>
    </Suspense>
  );
}
