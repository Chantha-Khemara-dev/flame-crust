import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Flame } from "lucide-react";
import { LuckyDrawModal, getCurrentAccount, getSpinsData } from "./lucky-draw-modal.jsx";

const HIDE_ROUTES = [
  "/admin",
  "/driver",
  "/kitchen",
  "/checkout",
  "/payment",
  "/order-confirmation",
  "/track",
  "/login",
  "/register"
];

export function LuckyDrawFloatingButton() {
  const [modalOpen, setModalOpen] = useState(false);
  const [spinsRemaining, setSpinsRemaining] = useState(1);
  const location = useLocation();

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

    window.addEventListener("openLuckyDraw", handleOpen);
    window.addEventListener("flame_lucky_spins_updated", handleSpinsUpdated);
    window.addEventListener("authChanged", updateSpins);

    return () => {
      window.removeEventListener("openLuckyDraw", handleOpen);
      window.removeEventListener("flame_lucky_spins_updated", handleSpinsUpdated);
      window.removeEventListener("authChanged", updateSpins);
    };
  }, [updateSpins]);

  // Hide on admin/driver/checkout screens where clutter should be minimized
  const isHidden = HIDE_ROUTES.some((route) => location.pathname.startsWith(route));

  return (
    <>
      <AnimatePresence>
        {!isHidden && (
          <motion.div
            drag
            dragMomentum={false}
            dragElastic={0.12}
            initial={{ scale: 0, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 15 }}
            transition={{ type: "spring", stiffness: 360, damping: 26 }}
            className="fixed bottom-[calc(max(0.75rem,env(safe-area-inset-bottom,0px))+5.25rem)] left-3.5 sm:bottom-6 sm:left-6 z-30 select-none touch-none"
            whileTap={{ scale: 0.93 }}
          >
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="group relative flex items-center rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 p-[1.5px] shadow-[0_6px_20px_rgba(234,88,12,0.4)] hover:shadow-[0_8px_26px_rgba(234,88,12,0.6)] transition-all cursor-pointer border border-amber-300/60 active:scale-95"
              aria-label="Open Lucky Draw"
              title="Lucky Draw (Spin & Win)"
            >
              {/* Pulsing ambient glow */}
              <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-orange-500/30 via-amber-400/30 to-red-500/30 blur-md animate-pulse pointer-events-none" />

              {/* Mobile Compact View (Icon + Spin Label + Live Badge) */}
              <span className="flex sm:hidden items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-red-500 px-2.5 py-1.5 overflow-hidden">
                <span className="relative flex items-center justify-center size-5 rounded-full bg-white/20 ring-1 ring-white/40 shadow-inner shrink-0">
                  <motion.span
                    animate={{ rotate: [0, -12, 12, 0] }}
                    transition={{ repeat: Infinity, duration: 2.2, repeatDelay: 1 }}
                  >
                    <Flame className="size-3.5 text-white" />
                  </motion.span>
                </span>
                <span className="text-[11px] font-black text-white tracking-tight leading-none whitespace-nowrap">
                  Spin
                </span>
                <span className="text-[9px] font-black bg-white/25 text-yellow-100 px-1.5 py-0.2 rounded-full border border-white/30">
                  {spinsRemaining > 0 ? spinsRemaining : "0"}
                </span>
              </span>

              {/* Desktop View (Full Capsule with Shimmer) */}
              <span className="hidden sm:flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-red-500 px-3.5 py-1.5 overflow-hidden">
                <span className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-20deg] group-hover:left-[110%] transition-all duration-700 ease-out pointer-events-none" />

                <span className="relative flex items-center justify-center size-6 rounded-full bg-white/20 ring-1 ring-white/40 shadow-inner shrink-0">
                  <motion.span
                    animate={{ rotate: [0, -12, 12, 0] }}
                    transition={{ repeat: Infinity, duration: 2.2, repeatDelay: 1 }}
                  >
                    <Flame className="size-4 text-white" />
                  </motion.span>
                </span>

                <span className="relative flex items-center gap-1.5 text-xs font-black text-white tracking-tight leading-none whitespace-nowrap">
                  <span>Lucky Draw</span>
                  <span className="text-[10px] font-black bg-white/25 text-yellow-100 px-2 py-0.5 rounded-full border border-white/30 shadow-xs">
                    {spinsRemaining > 0 ? `${spinsRemaining} Free` : "0 Left"}
                  </span>
                  <Sparkles className="size-3 text-amber-200 animate-pulse" />
                </span>
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <LuckyDrawModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}

export default LuckyDrawFloatingButton;
