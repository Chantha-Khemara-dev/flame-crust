import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, ChevronLeft, ChevronRight } from "lucide-react";
import { LuckyDrawModal, getCurrentAccount, getSpinsData } from "./lucky-draw-modal.jsx";
import { useCart } from "@/lib/cart-store";

const HIDE_ROUTES = [
  "/admin",
  "/driver",
  "/kitchen",
  "/track",
  "/payment",
  "/checkout",
  "/order-confirmation",
  "/login",
  "/register",
  "/product",
  "/cart",
  "/review"
];

export function LuckyDrawFloatingButton() {
  const { isOpen: isCartOpen } = useCart();
  const [modalOpen, setModalOpen] = useState(false);
  const [spinsRemaining, setSpinsRemaining] = useState(1);
  const [isMobile, setIsMobile] = useState(() => {
    return typeof window !== "undefined" ? window.innerWidth < 768 : false;
  });
  const [isMinimized, setIsMinimized] = useState(() => {
    try {
      const stored = localStorage.getItem("flame_lucky_draw_minimized");
      if (stored !== null) return stored === "true";
      return typeof window !== "undefined" ? window.innerWidth < 768 : false;
    } catch {
      return false;
    }
  });
  const [isTimeDriverExpanded, setIsTimeDriverExpanded] = useState(() => {
    try {
      return sessionStorage.getItem("flame_time_driver_expanded") === "true";
    } catch {
      return false;
    }
  });
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const updateSpins = useCallback(() => {
    try {
      const acc = getCurrentAccount();
      const spins = getSpinsData(acc.storageKey);
      setSpinsRemaining(spins.totalRemaining);
    } catch {
      setSpinsRemaining(1);
    }
  }, []);

  useEffect(() => {
    updateSpins();
    const handleOpen = () => setModalOpen(true);
    const handleSpinsUpdated = () => updateSpins();
    const handleTimeDriverState = (e) => {
      setIsTimeDriverExpanded(Boolean(e?.detail?.isExpanded));
    };

    window.addEventListener("openLuckyDraw", handleOpen);
    window.addEventListener("flame_lucky_spins_updated", handleSpinsUpdated);
    window.addEventListener("authChanged", updateSpins);
    window.addEventListener("timeDriverStateChange", handleTimeDriverState);

    return () => {
      window.removeEventListener("openLuckyDraw", handleOpen);
      window.removeEventListener("flame_lucky_spins_updated", handleSpinsUpdated);
      window.removeEventListener("authChanged", updateSpins);
      window.removeEventListener("timeDriverStateChange", handleTimeDriverState);
    };
  }, [updateSpins]);

  // Hide on admin/driver/checkout/cart screens or when Cart drawer is open, exactly like Time Order widget
  const isHidden = isCartOpen || HIDE_ROUTES.some((route) => location.pathname.startsWith(route));

  // Only hide the spin button on mobile phone screens when time driver is expanded.
  // On tablet and laptop (screens >= 768px), time driver is on bottom-right and spin is on bottom-left, so both stay visible.
  const shouldHideForTimeDriver = isMobile && isTimeDriverExpanded;
  const shouldShow = !isHidden && !shouldHideForTimeDriver;

  return (
    <>
      <AnimatePresence mode="wait">
        {shouldShow && (
          isMinimized ? (
            <motion.div
              key="compact-flame"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 350, damping: 26 }}
              className="fixed z-30 bottom-[calc(max(0.75rem,env(safe-area-inset-bottom,0px))+5.25rem)] left-3 md:bottom-6 md:left-6 select-none touch-manipulation group"
            >
              <div className="relative flex items-center">
                {/* Compact Round Button: Only Flame Logo */}
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="relative flex items-center justify-center size-10 sm:size-11 rounded-full bg-card/95 backdrop-blur-xl border border-amber-500/50 shadow-xl text-foreground hover:scale-110 active:scale-95 transition-all cursor-pointer ring-2 ring-amber-500/20"
                  title="Open Lucky Draw"
                  aria-label="Open Lucky Draw"
                >
                  <div className="absolute -inset-1 rounded-full bg-amber-500/10 blur-[4px] pointer-events-none" />
                  <Flame className="size-5 text-amber-500 animate-pulse shrink-0 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                  {spinsRemaining > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-gradient-to-r from-amber-500 to-red-500 text-white text-[9px] font-extrabold flex items-center justify-center ring-2 ring-card shadow-xs animate-in zoom-in-75 duration-150">
                      {spinsRemaining}
                    </span>
                  )}
                </button>

                {/* Small expand toggle on side */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMinimized(false);
                    try {
                      localStorage.setItem("flame_lucky_draw_minimized", "false");
                    } catch (err) {}
                  }}
                  className="absolute -right-2 -bottom-1 size-5 rounded-full bg-secondary border border-border/80 text-muted-foreground hover:text-foreground flex items-center justify-center shadow-xs cursor-pointer md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                  title="Expand Lucky Draw pill"
                  aria-label="Expand"
                >
                  <ChevronRight className="size-3" />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="expanded-pill"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 350, damping: 26 }}
              className="fixed z-30 bottom-[calc(max(0.75rem,env(safe-area-inset-bottom,0px))+5.25rem)] left-3 md:bottom-6 md:left-6 select-none touch-manipulation"
            >
              <div className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 rounded-full bg-card/95 backdrop-blur-xl border border-amber-500/50 shadow-xl text-xs font-bold text-foreground hover:scale-105 active:scale-95 transition-all whitespace-nowrap ring-2 ring-amber-500/20">
                {/* Main clickable area */}
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="flex items-center gap-1.5 cursor-pointer text-left focus:outline-none"
                  title="Open Lucky Draw"
                >
                  <span className="size-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                  <Flame className="size-4 text-amber-500 animate-pulse shrink-0" />
                  <span className="whitespace-nowrap font-bold">Lucky Draw</span>
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-md bg-secondary text-foreground/80 border border-border/50 shrink-0">
                    {spinsRemaining > 0 ? `${spinsRemaining} Left` : "0 Left"}
                  </span>
                </button>

                {/* Collapse button: click to shrink to flame icon */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMinimized(true);
                    try {
                      localStorage.setItem("flame_lucky_draw_minimized", "true");
                    } catch (err) {}
                  }}
                  className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors ml-0.5 cursor-pointer"
                  title="Shrink to Flame icon"
                  aria-label="Minimize"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
              </div>
            </motion.div>
          )
        )}
      </AnimatePresence>

      <LuckyDrawModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}

export default LuckyDrawFloatingButton;
