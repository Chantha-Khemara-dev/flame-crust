import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { UtensilsCrossed, Store, Search, ShoppingBag, User, ShieldCheck, ChefHat } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { SearchModal } from "./search-modal";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);

  const [customer, setCustomer] = useState(() => {
    try {
      const auth = localStorage.getItem("customerAuth");
      return auth ? JSON.parse(auth) : null;
    } catch (e) {
      return null;
    }
  });

  const [adminUser, setAdminUser] = useState(() => {
    try {
      const auth = localStorage.getItem("adminAuth");
      return auth ? JSON.parse(auth) : null;
    } catch (e) {
      return null;
    }
  });

  const [hasKitchenAuth, setHasKitchenAuth] = useState(() => {
    try {
      return Boolean(localStorage.getItem("kitchenAuth"));
    } catch (e) {
      return false;
    }
  });

  const count = useCart((s) => s.lines.reduce((acc, l) => acc + l.qty, 0));
  const closeCart = useCart((s) => s.closeCart);

  useEffect(() => {
    const handleAuthChange = () => {
      try {
        const auth = localStorage.getItem("customerAuth");
        const adminAuth = localStorage.getItem("adminAuth");
        const kitchenAuth = localStorage.getItem("kitchenAuth");
        setCustomer(auth ? JSON.parse(auth) : null);
        setAdminUser(adminAuth ? JSON.parse(adminAuth) : null);
        setHasKitchenAuth(Boolean(kitchenAuth));
      } catch (e) {
        setCustomer(null);
        setAdminUser(null);
        setHasKitchenAuth(false);
      }
    };
    window.addEventListener("storage", handleAuthChange);
    window.addEventListener("authChanged", handleAuthChange);
    return () => {
      window.removeEventListener("storage", handleAuthChange);
      window.removeEventListener("authChanged", handleAuthChange);
    };
  }, []);

  // Hide on admin, driver, kitchen, login, product detail, and checkout/payment flow routes
  const hidePaths = ["/admin", "/driver", "/kitchen", "/login", "/checkout", "/payment", "/order-confirmation", "/track", "/product"];
  if (hidePaths.some((p) => location.pathname.startsWith(p))) {
    return null;
  }

  const isHome = location.pathname === "/";
  const isMenu = location.pathname.startsWith("/menu");
  const isCart = location.pathname === "/cart";
  const isProfile = location.pathname.startsWith("/profile");

  const handleTabClick = () => {
    closeCart();
    window.dispatchEvent(new Event("closeNavbarModals"));
  };

  const navItems = [
    {
      id: "food",
      label: "Food",
      to: "/",
      replace: true,
      isActive: isHome,
      icon: UtensilsCrossed,
    },
    {
      id: "menu",
      label: "Menu",
      to: "/menu",
      replace: true,
      isActive: isMenu,
      icon: Store,
    },
    {
      id: "search",
      label: "Search",
      isAction: true,
      onClick: () => {
        handleTabClick();
        window.dispatchEvent(new Event("focusNavbarSearch"));
      },
      icon: Search,
    },
    {
      id: "cart",
      label: "Cart",
      to: "/cart",
      replace: true,
      isActive: isCart,
      icon: ShoppingBag,
      badge: count,
    },
    {
      id: "account",
      label: hasKitchenAuth && !customer ? "Kitchen" : (customer ? "Account" : (adminUser ? "Admin" : "Account")),
      to: hasKitchenAuth && !customer ? "/kitchen/dashboard" : (customer ? "/profile" : (adminUser ? "/admin/dashboard" : "/login")),
      replace: true,
      isActive:
        isProfile ||
        (hasKitchenAuth && location.pathname.startsWith("/kitchen")) ||
        (Boolean(adminUser) && location.pathname.startsWith("/admin")),
      icon: hasKitchenAuth && !customer ? ChefHat : (adminUser && !customer ? ShieldCheck : User),
      avatar: customer?.avatar,
      onClick: () => {
        if (hasKitchenAuth) {
          sessionStorage.removeItem("kitchen_store_preview");
        }
      },
    },
  ];

  return (
    <>
      {/* Authentic iOS Frosted Glass Mobile Bottom Capsule */}
      <div className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))] inset-x-3 sm:inset-x-6 z-[70] md:hidden select-none">
        <nav
          className="mx-auto max-w-md bg-background/80 dark:bg-zinc-900/80 backdrop-blur-2xl backdrop-saturate-150 border border-black/[0.08] dark:border-white/[0.12] ring-1 ring-white/30 dark:ring-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-full p-1.5 transition-all duration-200"
          aria-label="Mobile Navigation Dock"
        >
          <div className="grid grid-cols-5 items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const content = (
                <div
                  className={cn(
                    "relative flex flex-col items-center justify-center py-1.5 px-1 rounded-full transition-colors duration-150 cursor-pointer touch-manipulation select-none w-full",
                    item.isActive
                      ? "bg-primary/12 text-primary shadow-2xs font-bold"
                      : "text-muted-foreground/75 hover:text-foreground hover:bg-foreground/5"
                  )}
                >
                  {/* Icon Wrapper */}
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
                        <img src={item.avatar} alt="Account" className="size-full object-cover" />
                      </div>
                    ) : (
                      <Icon
                        className={cn(
                          "size-5 transition-transform duration-150 ease-out",
                          item.isActive ? "scale-110 stroke-[2.3]" : "stroke-[1.8]"
                        )}
                      />
                    )}

                    {/* Cart Counter Badge */}
                    {item.badge > 0 && (
                      <span className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] px-1 rounded-full bg-gradient-to-r from-primary to-orange-500 text-white text-[9px] font-extrabold flex items-center justify-center ring-2 ring-background shadow-xs animate-in zoom-in-75 duration-150">
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
                </div>
              );

              if (item.isAction) {
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.onClick}
                    className="w-full flex items-center justify-center focus:outline-none touch-manipulation cursor-pointer active:opacity-75 transition-opacity duration-100"
                  >
                    {content}
                  </button>
                );
              }

              return (
                <Link
                  key={item.id}
                  to={item.to}
                  replace={item.replace || false}
                  onClick={() => {
                    if (item.onClick) item.onClick();
                    handleTabClick();
                  }}
                  className="w-full flex items-center justify-center focus:outline-none touch-manipulation cursor-pointer active:opacity-75 transition-opacity duration-100"
                >
                  {content}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      <SearchModal isOpen={searchOpen} onClose={setSearchOpen} />
    </>
  );
}

export default MobileBottomNav;
