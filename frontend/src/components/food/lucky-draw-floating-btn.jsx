import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Flame } from "lucide-react";
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
  "/review",
  "/profile"
];

export function LuckyDrawFloatingButton() {
  const { isOpen: isCartOpen } = useCart();
  const [modalOpen, setModalOpen] = useState(false);
  const [spinsRemaining, setSpinsRemaining] = useState(1);
  const [isMobile, setIsMobile] = useState(() => {
    return typeof window !== "undefined" ? window.innerWidth < 768 : false;
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
  const shouldHideForTimeDriver = isMobile && isTimeDriverExpanded;
  const shouldShow = !isHidden && !shouldHideForTimeDriver;

  return (
    <>
      <AnimatePresence>
        {shouldShow && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: "spring", stiffness: 350, damping: 26 }}
            className="fixed z-30 bottom-[calc(max(0.75rem,env(safe-area-inset-bottom,0px))+5.25rem)] left-3 md:bottom-6 md:left-6 select-none cursor-pointer touch-manipulation"
            title="Open Lucky Draw"
            onClick={() => setModalOpen(true)}
          >
            {/* Sleek, compact pill perfectly proportional to Track Order */}
            <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-full bg-card/95 backdrop-blur-xl border border-amber-500/40 shadow-xl text-xs font-bold text-foreground hover:scale-105 active:scale-95 transition-all whitespace-nowrap">
              <span className="size-2 rounded-full bg-amber-500 animate-ping shrink-0" />
              <Flame className="size-4 text-amber-500 animate-pulse shrink-0" />
              <span className="hidden md:inline font-bold">Lucky Draw</span>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-md bg-secondary text-foreground/80 border border-border/50 shrink-0">
                {spinsRemaining > 0 ? (isMobile ? `${spinsRemaining}` : `${spinsRemaining} Left`) : "0"}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <LuckyDrawModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}

export default LuckyDrawFloatingButton;
