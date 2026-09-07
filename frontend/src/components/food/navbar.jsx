"use client";
import { useEffect, useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Search, Menu as MenuIcon, X, Moon, Sun, User, MapPin, Ticket, LogOut, ShieldCheck, LayoutDashboard, Clock, Package, Bike, ArrowLeft, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OrderChatModal } from "@/components/food/order-chat-modal";
import { useCart } from "@/lib/cart-store";
import { list, get, getOrderMessages, getActiveCall } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider.jsx";
import { SearchModal } from "./search-modal";
import { fetchCategories } from "@/lib/food-api";


let cachedActiveOrders = [];
try {
  const stored = localStorage.getItem("flame_active_orders_cache");
  if (stored) cachedActiveOrders = JSON.parse(stored);
} catch (e) { }

let cachedCategories = [];
try {
  const stored = localStorage.getItem("flame_categories_cache");
  if (stored) cachedCategories = JSON.parse(stored);
} catch (e) { }

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [categories, setCategories] = useState(cachedCategories);
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
      const adminAuth = localStorage.getItem("adminAuth");
      return adminAuth ? JSON.parse(adminAuth) : null;
    } catch (e) {
      return null;
    }
  });
  const [isAdmin, setIsAdmin] = useState(() => {
    try {
      const adminAuth = localStorage.getItem("adminAuth");
      if (!adminAuth) return false;
      const a = JSON.parse(adminAuth);
      return (a.role || "").toUpperCase() === "ADMIN";
    } catch (e) {
      return false;
    }
  });
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const count = useCart((s) => s.lines.reduce((acc, l) => acc + l.qty, 0));
  const openCart = useCart((s) => s.openCart);

  const [activeOrders, setActiveOrders] = useState(cachedActiveOrders);
  const [ordersModalOpen, setOrdersModalOpen] = useState(false);
  const [chatListModalOpen, setChatListModalOpen] = useState(false);
  const [selectedChatOrder, setSelectedChatOrder] = useState(null);
  const [orderConversations, setOrderConversations] = useState([]);

  // Fetch drivers & last messages for all active orders, grouped by Driver
  useEffect(() => {
    if (activeOrders.length === 0) {
      setOrderConversations([]);
      return;
    }

    const loadAllConversations = async () => {
      try {
        const allDrivers = (await list("drivers").catch(() => [])) || [];

        const rawConvos = await Promise.all(
          activeOrders.map(async (ord) => {
            const driverId = ord.driverId || ord.driver_id;
            let driver = null;
            if (driverId) {
              driver = allDrivers.find(d => String(d.id) === String(driverId)) || (await get("drivers", driverId).catch(() => null));
            }
            if (!driver && (ord.status === "ON_DELIVERY" || ord.status === "OUT_FOR_DELIVERY")) {
              driver = allDrivers.find(d => d.status === "ACTIVE" || d.status === "DELIVERING") || allDrivers[0] || null;
            }

            let msgs = [];
            try {
              msgs = await getOrderMessages(ord.id);
            } catch (e) { }

            const lastMsg = Array.isArray(msgs) && msgs.length > 0 ? msgs[msgs.length - 1] : null;
            const unreadCount = Array.isArray(msgs)
              ? msgs.filter(m => m.sender_type !== "CUSTOMER" && !m.is_read).length
              : 0;

            return {
              order: ord,
              driver: driver || { id: "store", name: "Flame & Crust Courier", vehicleInfo: "Delivery Partner" },
              lastMessage: lastMsg,
              unreadCount
            };
          })
        );

        // Group by unique Driver so 1 person has 1 conversation card (មនុស្សម្នាក់ដាក់តែមួយ)
        const driverMap = new Map();
        for (const item of rawConvos) {
          const driverKey = item.driver?.id ? String(item.driver.id) : (item.driver?.name || "driver");
          if (!driverMap.has(driverKey)) {
            driverMap.set(driverKey, {
              driver: item.driver,
              order: item.order,
              orders: [item.order],
              lastMessage: item.lastMessage,
              unreadCount: item.unreadCount || 0
            });
          } else {
            const existing = driverMap.get(driverKey);
            existing.orders.push(item.order);
            existing.unreadCount += (item.unreadCount || 0);
            if (item.lastMessage) {
              if (!existing.lastMessage || new Date(item.lastMessage.created_at || 0) > new Date(existing.lastMessage.created_at || 0)) {
                existing.lastMessage = item.lastMessage;
                existing.order = item.order;
              }
            }
          }
        }

        const uniqueConvos = Array.from(driverMap.values());
        setOrderConversations(uniqueConvos);

        // Auto-detect incoming call from driver for any active order
        for (const convo of uniqueConvos) {
          try {
            const callRes = await getActiveCall(convo.order.id);
            if (callRes.active && callRes.call?.status === "RINGING" && callRes.call?.receiver_type === "CUSTOMER") {
              if (!selectedChatOrder || String(selectedChatOrder.order.id) !== String(convo.order.id)) {
                setSelectedChatOrder(convo);
              }
            }
          } catch (e) { }
        }
      } catch (e) { }
    };

    loadAllConversations();
    const chatPoll = setInterval(loadAllConversations, 3000);
    return () => clearInterval(chatPoll);
  }, [activeOrders]);

  const totalUnreadChats = orderConversations.reduce((acc, curr) => acc + (curr.unreadCount || 0), 0);
  const latestActiveOrder = activeOrders.length > 0 ? activeOrders[0] : null;

  useEffect(() => {
    const checkActiveOrders = async () => {
      try {
        const stored = localStorage.getItem("customerAuth");
        if (!stored) {
          cachedActiveOrders = [];
          localStorage.removeItem("flame_active_orders_cache");
          setActiveOrders([]);
          return;
        }
        const c = JSON.parse(stored);
        const orders = (await list("orders").catch(() => [])) || [];
        const activeList = orders
          .filter(o => String(o.customer_id) === String(c.id) && o.status !== "DELIVERED" && o.status !== "CANCELLED")
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        cachedActiveOrders = activeList;
        try {
          localStorage.setItem("flame_active_orders_cache", JSON.stringify(activeList));
        } catch (e) { }
        setActiveOrders(activeList);
      } catch (e) {
        // preserve cached if network error
      }
    };

    checkActiveOrders();
    const interval = setInterval(checkActiveOrders, 15000);
    window.addEventListener("orderPlaced", checkActiveOrders);
    window.addEventListener("authChanged", checkActiveOrders);
    return () => {
      clearInterval(interval);
      window.removeEventListener("orderPlaced", checkActiveOrders);
      window.removeEventListener("authChanged", checkActiveOrders);
    };
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const { getProducts } = await import("@/lib/api");
        const data = await getProducts();
        setAllProducts(Array.isArray(data) ? data : (data.products || []));
      } catch (e) { }
    };
    loadProducts();
  }, []);

  useEffect(() => {
    const handleFocusSearch = () => {
      setSearchFocused(true);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    };
    const handleKeyDown = (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleFocusSearch();
      }
      if (e.key === "Escape") {
        setSearchFocused(false);
      }
    };
    window.addEventListener("focusNavbarSearch", handleFocusSearch);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("focusNavbarSearch", handleFocusSearch);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredProducts = searchQuery.trim().length > 0
    ? allProducts.filter(p =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (Array.isArray(p.tags) ? p.tags : (typeof p.tags === 'string' && p.tags ? p.tags.split(',').map(s => s.trim()) : [])).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    : [];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const handleAuthChange = () => {
      try {
        const auth = localStorage.getItem("customerAuth");
        const adminAuth = localStorage.getItem("adminAuth");
        const c = auth ? JSON.parse(auth) : null;
        const a = adminAuth ? JSON.parse(adminAuth) : null;
        setCustomer(c);
        setAdminUser(a);
        if (a) {
          setIsAdmin((a.role || "").toUpperCase() === "ADMIN");
        } else {
          setIsAdmin(false);
        }
      } catch (e) {
        setCustomer(null);
        setAdminUser(null);
        setIsAdmin(false);
      }
    };
    window.addEventListener("storage", handleAuthChange);
    window.addEventListener("authChanged", handleAuthChange);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("storage", handleAuthChange);
      window.removeEventListener("authChanged", handleAuthChange);
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetchCategories()
      .then((data) => {
        if (active && Array.isArray(data) && data.length > 0) {
          cachedCategories = data;
          try {
            localStorage.setItem("flame_categories_cache", JSON.stringify(data));
          } catch (e) { }
          setCategories(data);
        }
      })
      .catch(() => { });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setOrdersModalOpen(false);
    setSearchFocused(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handleCloseModals = () => {
      setMobileOpen(false);
      setOrdersModalOpen(false);
      setSearchFocused(false);
    };
    window.addEventListener("closeNavbarModals", handleCloseModals);
    return () => window.removeEventListener("closeNavbarModals", handleCloseModals);
  }, []);

  const navLinks = [
    { label: "Menu", href: "/menu", icon: "🍽️" },
    ...(categories.length > 0
      ? categories.map((c) => ({
        label: c.name,
        href: `/menu?category=${c.slug}`,
        icon: c.icon || null,
      }))
      : [
        { label: "Pizza", href: "/menu?category=pizza", icon: "🍕" },
        { label: "Pizza Bagels", href: "/menu?category=pizza-bagels", icon: "🥯" },
        { label: "Burgers", href: "/menu?category=burgers", icon: "🍔" },
        { label: "Sides", href: "/menu?category=sides", icon: "🍟" },
      ]),
  ];

  const isLinkActive = (l) => {
    if (!location.pathname.startsWith("/menu")) return false;

    const searchParams = new URLSearchParams(location.search);
    const currentCategory = searchParams.get("category") || "all";

    const linkCategory = l.href.includes("?category=")
      ? new URLSearchParams(l.href.split("?")[1]).get("category")
      : "all";

    return currentCategory === linkCategory;
  };

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-40 transition-colors duration-200 pt-[env(safe-area-inset-top)]",
        mobileOpen
          ? "bg-background border-b border-border/40 shadow-xs"
          : "bg-transparent border-transparent shadow-none",
        scrolled && "lg:bg-background lg:border-b lg:border-border/40 lg:shadow-xs"
      )}
      style={{ backdropFilter: "none", WebkitBackdropFilter: "none" }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-20 gap-2 sm:gap-4">
          <div className="flex items-center justify-start shrink-0 gap-1.5 sm:gap-2">


            <Link to="/" className="flex items-center group" onClick={() => setMobileOpen(false)}>
              <img
                src="/images/library/logo.jpg"
                alt="Flame & Crust logo"
                className="h-10 sm:h-16 w-auto object-contain"
              />
            </Link>
          </div>

          {/* Mobile Page Titles in Top Navbar (Hidden when menu open or search focused) */}
          {(location.pathname === "/cart" || location.pathname === "/checkout") && !searchFocused && !mobileOpen && (
            <div
              key={location.pathname}
              className="sm:hidden flex-1 flex items-center justify-center text-center pointer-events-none px-2"
            >
              <span className="font-serif font-bold text-base sm:text-lg text-foreground tracking-tight truncate">
                {location.pathname === "/cart" ? "Your Cart" : "Checkout"}
              </span>
            </div>
          )}

          {/* Centered Top Navbar Search Input (Shown only when triggered/searchFocused) */}
          <AnimatePresence>
            {searchFocused && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                ref={searchContainerRef}
                className="flex-1 max-w-sm sm:max-w-md mx-2 relative z-50"
              >
                <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-background border border-primary ring-2 ring-primary/20 shadow-lg">
                  <Search className="size-4 text-primary shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search pizza, burgers..."
                    className="w-full bg-transparent text-xs sm:text-sm font-medium text-foreground placeholder:text-muted-foreground outline-none border-none p-0"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSearchFocused(false);
                    }}
                    className="text-muted-foreground hover:text-foreground shrink-0 p-0.5"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Dropdown Search Results */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-card rounded-2xl shadow-2xl border border-border/60 p-2 sm:p-3 max-h-[60vh] overflow-y-auto z-50 flex flex-col gap-1.5 min-w-[260px] sm:min-w-[340px]"
                >
                  {searchQuery.trim().length === 0 ? (
                    <div className="p-3 text-center">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Popular Searches</p>
                      <div className="flex flex-wrap gap-1.5 justify-center">
                        {["Pepperoni", "Margherita", "Burgers", "Bagels", "Spicy"].map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setSearchQuery(tag)}
                            className="px-2.5 py-1 rounded-full bg-secondary text-[11px] font-semibold hover:bg-primary/10 hover:text-primary border border-border/40 transition-colors"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No items found for "{searchQuery}"
                    </div>
                  ) : (
                    filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        onClick={() => {
                          setSearchFocused(false);
                          setSearchQuery("");
                          navigate(`/product/${product.id}`);
                        }}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/70 cursor-pointer transition-colors"
                      >
                        <img
                          src={product.image}
                          alt={product.name}
                          className="size-10 sm:size-12 rounded-lg object-cover bg-secondary shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-xs sm:text-sm text-foreground truncate">{product.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{product.description}</p>
                        </div>
                        <span className="font-bold text-xs sm:text-sm text-primary shrink-0">
                          ${Number(product.price).toFixed(2)}
                        </span>
                      </div>
                    ))
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <nav className="hidden md:flex items-center justify-center gap-1 shrink-0 overflow-x-auto no-scrollbar scroll-smooth">
            {navLinks.map((l) => (
              <Link
                key={l.label}
                to={l.href}
                className={cn(
                  "px-3.5 py-2 text-sm font-semibold transition-colors duration-200 rounded-full border-2 border-transparent shrink-0 whitespace-nowrap",
                  isLinkActive(l)
                    ? "text-primary bg-primary/10 border-primary/20"
                    : "text-foreground/80 hover:text-primary hover:bg-secondary/60"
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:inline-flex size-10 sm:size-11 shrink-0 rounded-full text-foreground/70 hover:text-primary hover:bg-secondary/60 transition-colors"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
            >
              <Search className="size-4 sm:size-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:inline-flex size-10 sm:size-11 shrink-0 rounded-full text-foreground/70 hover:text-primary"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="size-4 sm:size-5" /> : <Moon className="size-4 sm:size-5" />}
            </Button>



            {customer ? (
              <button
                type="button"
                className="hidden sm:flex shrink-0 items-center gap-2 p-0.5 rounded-full border border-border/60 hover:border-primary/60 bg-secondary/40 transition-all cursor-pointer"
                onClick={() => {
                  setMobileOpen(false);
                  navigate("/profile");
                }}
                aria-label="User Profile"
              >
                <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden shrink-0 border border-primary/30">
                  {customer.avatar ? (
                    <img src={customer.avatar} alt="Profile" className="size-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="size-4 text-primary" />
                  )}
                </div>
                <span className="hidden md:inline text-xs font-semibold pr-2.5 truncate max-w-[100px]">{customer.name || customer.phone}</span>
              </button>
            ) : adminUser ? (
              <button
                type="button"
                className="hidden sm:flex shrink-0 items-center gap-2 p-0.5 pr-3 rounded-full border border-border/60 hover:border-primary/50 bg-secondary/60 hover:bg-secondary transition-all cursor-pointer shadow-sm"
                onClick={() => {
                  setMobileOpen(false);
                  navigate("/admin/dashboard", { replace: true });
                }}
                aria-label="Admin Dashboard"
              >
                <div className="size-9 rounded-full bg-gradient-to-tr from-primary/80 to-amber-500/80 flex items-center justify-center overflow-hidden shrink-0 border border-primary/20 shadow-inner">
                  <span className="font-black text-xs text-white tracking-wider">
                    {adminUser.name ? adminUser.name.slice(0, 2).toUpperCase() : "AD"}
                  </span>
                </div>
                <span className="hidden md:inline text-[13px] font-bold truncate max-w-[110px] text-foreground">
                  {adminUser.name || "Admin"}
                </span>
              </button>
            ) : location.pathname !== "/login" ? (
              <Button
                className="hidden sm:flex rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-9 sm:h-11 px-4 sm:px-6 font-semibold text-xs sm:text-sm transition-all shadow-warm"
                onClick={() => {
                  setMobileOpen(false);
                  navigate("/login");
                }}
              >
                Sign In
              </Button>
            ) : null}

            {/* Compact Chat Button for Active Ongoing Orders */}
            {activeOrders.length > 0 && (
              <div className="relative flex items-center justify-center size-10 sm:size-11 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (orderConversations.length === 1) {
                      const convo = orderConversations[0];
                      convo.unreadCount = 0;
                      setSelectedChatOrder(convo);
                    } else {
                      setChatListModalOpen(true);
                    }
                  }}
                  className="relative size-full rounded-full bg-secondary/80 hover:bg-secondary border border-border/70 hover:border-primary text-foreground flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                  title="Messages & Driver Chats"
                  aria-label="Messages & Driver Chats"
                >
                  <MessageSquare className="size-4.5 sm:size-5 text-primary" />
                  {totalUnreadChats > 0 ? (
                    <span className="absolute -top-1 -right-1 min-w-4.5 sm:min-w-5 h-4.5 sm:h-5 px-1 rounded-full bg-red-600 text-white text-[10px] sm:text-[11px] font-black flex items-center justify-center ring-2 ring-background animate-bounce shadow-md">
                      {totalUnreadChats}
                    </span>
                  ) : (
                    <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-emerald-500 ring-1.5 ring-background animate-pulse" />
                  )}
                </button>
              </div>
            )}

            <div id="cart-icon-wrapper" className={cn("relative items-center justify-center size-10 sm:size-11 shrink-0", location.pathname.startsWith("/product") ? "flex" : "hidden sm:flex")}>
              <motion.button
                id="cart-icon"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.94 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                onClick={() => navigate("/cart")}
                className="relative size-full aspect-square rounded-full bg-gradient-to-tr from-primary to-amber-500 text-white shadow-[0_4px_14px_rgba(239,68,68,0.3)] hover:shadow-[0_6px_20px_rgba(239,68,68,0.4)] flex items-center justify-center cursor-pointer transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring border-none"
                aria-label="Open cart"
              >
                <ShoppingBag className="size-4 sm:size-5 drop-shadow-sm" />
                <AnimatePresence>
                  {count > 0 && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      className="absolute -top-1 -right-1 min-w-4 sm:min-w-5 h-4 sm:h-5 px-1 sm:px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] sm:text-[11px] font-bold flex items-center justify-center ring-2 ring-background pointer-events-none"
                    >
                      {count}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden size-10 shrink-0 rounded-full text-foreground hover:bg-secondary/60"
              onClick={() => setMobileOpen((s) => !s)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="size-6" /> : <MenuIcon className="size-6" />}
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="md:hidden overflow-hidden border-t border-border/60"
            >
              <div className="flex flex-col py-3 px-2 gap-1.5 max-h-[75vh] overflow-y-auto no-scrollbar">
                {/* Mobile User Card */}
                {customer ? (
                  <div
                    onClick={() => { setMobileOpen(false); navigate("/profile"); }}
                    className="p-3 mb-1 rounded-2xl bg-secondary/60 hover:bg-secondary border border-border/50 flex items-center justify-between cursor-pointer transition-all active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-11 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border-2 border-primary/30 shrink-0">
                        {customer.avatar ? (
                          <img src={customer.avatar} alt="Profile" className="size-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <User className="size-5 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">{customer.name || "Customer"}</p>
                        <p className="text-xs text-muted-foreground truncate">{customer.phone || customer.email}</p>
                      </div>
                    </div>
                    <span className="text-xs text-primary font-semibold px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 shrink-0">
                      Settings
                    </span>
                  </div>
                ) : adminUser ? (
                  <div
                    onClick={() => { setMobileOpen(false); navigate("/admin/dashboard"); }}
                    className="p-3 mb-1 rounded-2xl bg-primary/10 hover:bg-primary/15 border border-primary/30 flex items-center justify-between cursor-pointer transition-all active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-11 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border-2 border-primary/40 shrink-0 font-bold text-sm text-primary">
                        {adminUser.name ? adminUser.name.slice(0, 2).toUpperCase() : "AD"}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">{adminUser.name || "Administrator"}</p>
                        <p className="text-xs text-primary font-semibold truncate flex items-center gap-1">
                          <ShieldCheck className="size-3 text-primary" /> {adminUser.email || "Admin Account"}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-primary-foreground font-semibold px-2.5 py-1 rounded-full bg-primary shrink-0 shadow-xs">
                      Dashboard
                    </span>
                  </div>
                ) : location.pathname !== "/login" ? (
                  <div className="p-3 mb-1 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-foreground">Welcome to Flame & Crust</p>
                      <p className="text-xs text-muted-foreground">Sign in to manage orders</p>
                    </div>
                    <Button
                      size="sm"
                      className="rounded-full bg-primary text-primary-foreground font-semibold text-xs px-4"
                      onClick={() => { setMobileOpen(false); navigate("/login"); }}
                    >
                      Sign In
                    </Button>
                  </div>
                ) : null}

                {isAdmin && (
                  <Link
                    to="/admin/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <LayoutDashboard className="size-4 text-primary" />
                      <span>Admin Dashboard</span>
                    </div>
                    <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold">
                      Backend
                    </span>
                  </Link>
                )}

                <div className="space-y-0.5">
                  {navLinks.map((l) => (
                    <Link
                      key={l.label}
                      to={l.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "px-4 py-2.5 text-sm font-medium rounded-xl transition-colors flex items-center justify-between",
                        isLinkActive(l)
                          ? "text-primary bg-primary/10 font-semibold"
                          : "text-foreground/80 hover:text-primary hover:bg-secondary/60"
                      )}
                    >
                      <span className="flex items-center gap-2.5">
                        {l.icon && <span className="text-base">{l.icon}</span>}
                        <span>{l.label}</span>
                      </span>
                      {isLinkActive(l) && <div className="size-1.5 rounded-full bg-primary" />}
                    </Link>
                  ))}
                </div>

                <div className="h-px bg-border/60 my-1 mx-2" />

                {/* Theme Switcher in Mobile Drawer */}
                <button
                  type="button"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="px-4 py-2.5 text-sm font-medium rounded-xl transition-colors text-foreground/80 hover:text-primary hover:bg-secondary/60 flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    {theme === "dark" ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4 text-indigo-400" />}
                    <span>{theme === "dark" ? "Dark Mode" : "Light Mode"}</span>
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">{theme} mode</span>
                </button>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
      {/* Active Orders List Modal */}
      <Dialog open={ordersModalOpen} onOpenChange={setOrdersModalOpen}>
        <DialogContent className="max-w-md w-[92vw] rounded-3xl p-5 border-border/60">
          <DialogHeader className="pb-3 border-b border-border/60">
            <DialogTitle className="font-serif text-xl font-bold flex items-center gap-2">
              <Package className="size-5 text-primary" /> Active Orders ({activeOrders.length})
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Track your current active orders and delivery status.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2 max-h-[60vh] overflow-y-auto no-scrollbar">
            {activeOrders.map((order, idx) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2, delay: idx * 0.06 }}
                whileTap={{ scale: 0.98 }}
                className="p-4 rounded-2xl bg-secondary/40 border border-border/60 flex flex-col gap-2.5 hover:bg-secondary/70 hover:border-primary/40 transition-all shadow-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-foreground font-mono">Order #{order.order_number || order.id}</span>
                    <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 shrink-0">
                      {order.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-primary shrink-0">${Number(order.total).toFixed(2)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Time: {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <Button
                  size="sm"
                  className="rounded-full w-full mt-1 bg-primary text-primary-foreground font-semibold gap-1.5 h-9.5 hover:bg-primary/90 transition-all"
                  onClick={() => {
                    setOrdersModalOpen(false);
                    navigate(`/track/${order.id}`);
                  }}
                >
                  <Bike className="size-4 animate-bounce" /> Track Order Status
                </Button>
              </motion.div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <SearchModal isOpen={searchOpen} onClose={setSearchOpen} />

      {/* Active Order Chats List Modal (shows who chatted and for which order) */}
      <Dialog open={chatListModalOpen} onOpenChange={setChatListModalOpen}>
        <DialogContent className="max-w-md w-[92vw] rounded-3xl p-5 border-border/60 z-[99]">
          <DialogHeader className="pb-3 border-b border-border/60">
            <DialogTitle className="font-serif text-lg sm:text-xl font-bold flex items-center gap-2">
              <MessageSquare className="size-5 text-primary" /> Active Delivery Chats ({orderConversations.length})
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select an ongoing delivery order to chat directly with your courier partner.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2.5 py-2 max-h-[60vh] overflow-y-auto no-scrollbar">
            {orderConversations.map((convo, idx) => {
              const driverName = convo.driver?.name || "Courier Partner";
              const driverPhoto = convo.driver?.profilePhoto || convo.driver?.profile_photo;
              const orderNum = convo.order?.order_number || convo.order?.id;
              const hasLastMsg = Boolean(convo.lastMessage);

              return (
                <div
                  key={convo.order.id}
                  onClick={() => {
                    convo.unreadCount = 0;
                    setSelectedChatOrder(convo);
                    setChatListModalOpen(false);
                  }}
                  className="p-3.5 rounded-2xl bg-secondary/30 hover:bg-secondary/60 border border-border/60 hover:border-primary/50 transition-all cursor-pointer flex items-center justify-between gap-3 group active:scale-98"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      {driverPhoto ? (
                        <img
                          src={driverPhoto}
                          alt={driverName}
                          className="size-11 rounded-full object-cover border-2 border-primary/50"
                        />
                      ) : (
                        <div className="size-11 rounded-full bg-gradient-to-tr from-amber-500 to-red-600 text-white flex items-center justify-center font-bold">
                          <Bike className="size-5" />
                        </div>
                      )}
                      <span className="absolute bottom-0 right-0 size-3 rounded-full bg-emerald-500 ring-2 ring-background" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <h4 className="font-bold text-xs sm:text-sm text-foreground truncate group-hover:text-primary transition-colors">
                          {driverName}
                        </h4>
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-md bg-secondary text-primary border border-border/60 shrink-0">
                          #{orderNum}{convo.orders?.length > 1 ? ` (+${convo.orders.length - 1} more)` : ""}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {hasLastMsg ? (
                          <span className={cn(convo.unreadCount > 0 ? "font-bold text-foreground" : "")}>
                            {convo.lastMessage.sender_type === "CUSTOMER" ? "You: " : `${driverName.split(" ")[0]}: `}
                            {convo.lastMessage.message === "[DELETED]"
                              ? "🚫 Removed a message"
                              : convo.lastMessage.message.startsWith("[IMG]:")
                                ? "📷 Photo"
                                : convo.lastMessage.message}
                          </span>
                        ) : (
                          <span className="italic text-muted-foreground/80">Tap to start chatting with {driverName.split(" ")[0]}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {convo.unreadCount > 0 && (
                      <span className="min-w-5 h-5 px-1.5 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center shadow-xs animate-pulse">
                        {convo.unreadCount}
                      </span>
                    )}
                    <Button
                      size="sm"
                      className="rounded-full h-8 px-3 text-xs font-semibold bg-primary text-primary-foreground pointer-events-none"
                    >
                      Chat
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Live Order Chat Modal for Selected Order */}
      {selectedChatOrder && (
        <OrderChatModal
          open={Boolean(selectedChatOrder)}
          onOpenChange={(open) => {
            if (!open) setSelectedChatOrder(null);
          }}
          orderId={selectedChatOrder.order.id}
          orderNumber={selectedChatOrder.order.order_number || selectedChatOrder.order.id}
          currentUser={{
            type: "CUSTOMER",
            name: customer?.name || customer?.phone || "Customer"
          }}
          recipient={{
            name: selectedChatOrder.driver?.name || "Delivery Partner",
            photo: selectedChatOrder.driver?.profilePhoto || selectedChatOrder.driver?.profile_photo,
            role: selectedChatOrder.driver?.vehicleInfo || selectedChatOrder.driver?.vehicle_info || "Delivery Partner",
            phone: selectedChatOrder.driver?.phone || "0965755963"
          }}
        />
      )}
    </header>
  );
}

export { Navbar };
