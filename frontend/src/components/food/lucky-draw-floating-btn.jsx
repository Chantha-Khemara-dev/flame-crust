import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Gift } from "lucide-react";
import { LuckyDrawModal } from "./lucky-draw-modal.jsx";

export function LuckyDrawFloatingButton() {
  const [modalOpen, setModalOpen] = useState(false);
  const location = useLocation();

  // Listen for global trigger events from navbar, hero, profile, etc.
  useEffect(() => {
    const handleOpen = () => setModalOpen(true);
    window.addEventListener("openLuckyDraw", handleOpen);
    return () => window.removeEventListener("openLuckyDraw", handleOpen);
  }, []);

  // Do not show floating button on admin, kitchen, or driver portals
  const isHiddenRoute =
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/kitchen") ||
    location.pathname.startsWith("/driver") ||
    location.pathname.startsWith("/login");

  if (isHiddenRoute) return null;

  return (
    <>
      {/* Floating Lucky Wheel Launcher (Positioned bottom-left on mobile & desktop so it doesn't block cart/checkout buttons) */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ delay: 1, type: "spring", damping: 15 }}
        className="fixed bottom-20 left-4 sm:bottom-6 sm:left-6 z-40 select-none"
      >
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="group relative flex items-center gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-red-500 text-white shadow-[0_8px_25px_rgba(234,88,12,0.45)] hover:shadow-[0_12px_32px_rgba(234,88,12,0.6)] border-2 border-white/40 hover:scale-105 active:scale-95 transition-all cursor-pointer backdrop-blur-md"
          aria-label="Open Lucky Draw Wheel"
        >
          {/* Subtle Ambient Pulse Ring */}
          <span className="absolute -inset-1 rounded-full bg-orange-500/30 animate-ping pointer-events-none" />

          <div className="relative flex items-center justify-center size-7 sm:size-8 rounded-full bg-white/20 shadow-inner">
            <span className="text-base sm:text-lg animate-bounce">🎡</span>
          </div>

          <div className="flex flex-col items-start pr-1">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-amber-100 flex items-center gap-1 leading-none">
              <Sparkles className="size-2.5 text-yellow-200" /> Spin & Win
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-white leading-tight">
              Lucky Draw
            </span>
          </div>
        </button>
      </motion.div>

      {/* Lucky Draw Modal */}
      <LuckyDrawModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}

export default LuckyDrawFloatingButton;
