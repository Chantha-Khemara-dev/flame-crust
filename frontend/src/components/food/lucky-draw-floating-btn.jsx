import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Gift } from "lucide-react";
import { LuckyDrawModal } from "./lucky-draw-modal.jsx";

export function LuckyDrawFloatingButton() {
  const [modalOpen, setModalOpen] = useState(false);
  const [isScrolledPastHero, setIsScrolledPastHero] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleOpen = () => setModalOpen(true);
    window.addEventListener("openLuckyDraw", handleOpen);
    return () => window.removeEventListener("openLuckyDraw", handleOpen);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      // Hide once user scrolls down past the hero section (~450px)
      setIsScrolledPastHero(window.scrollY > 450);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ONLY show the floating button on the Hero / Home page ("/")
  const isHeroPage = location.pathname === "/";

  return (
    <>
      <AnimatePresence>
        {isHeroPage && !isScrolledPastHero && (
          <motion.div
            drag
            dragMomentum={false}
            dragElastic={0.1}
            initial={{ scale: 0, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -10 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed top-[calc(4.75rem+env(safe-area-inset-top))] right-2.5 sm:top-24 sm:right-6 z-30 select-none touch-none"
            whileTap={{ scale: 0.94 }}
          >
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="group relative flex items-center rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 p-[1.5px] shadow-[0_4px_14px_rgba(234,88,12,0.35)] hover:shadow-[0_6px_20px_rgba(234,88,12,0.55)] transition-all cursor-pointer border border-amber-300/50"
              aria-label="Open Lucky Draw Wheel"
            >
              {/* Mobile Compact View (Icon + Mini Label) */}
              <span className="flex sm:hidden items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-red-500 px-2 py-1 overflow-hidden">
                <span className="relative flex items-center justify-center size-5 rounded-full bg-white/20 ring-1 ring-white/30 shadow-inner shrink-0">
                  <motion.span
                    animate={{ rotate: [0, -10, 10, 0] }}
                    transition={{ repeat: Infinity, duration: 2.5, repeatDelay: 1.5 }}
                  >
                    <Gift className="size-3 text-white" />
                  </motion.span>
                </span>
                <span className="text-[10px] font-black text-white tracking-tight leading-none whitespace-nowrap pr-0.5">
                  Spin
                </span>
                <Sparkles className="size-2 text-amber-200 animate-pulse" />
              </span>

              {/* Desktop View (Full Pill with shimmer) */}
              <span className="hidden sm:flex items-center gap-1.5 w-full rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-red-500 px-2.5 py-1 overflow-hidden">
                <span className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent skew-x-[-20deg] group-hover:left-[110%] transition-all duration-700 ease-out pointer-events-none" />

                <span className="relative flex items-center justify-center size-5.5 rounded-full bg-white/20 ring-1 ring-white/30 shadow-inner shrink-0">
                  <motion.span
                    animate={{ rotate: [0, -10, 10, 0] }}
                    transition={{ repeat: Infinity, duration: 2.5, repeatDelay: 1.5 }}
                  >
                    <Gift className="size-3.5 text-white" />
                  </motion.span>
                </span>

                <span className="relative flex items-center gap-1 text-xs font-black text-white tracking-tight leading-none whitespace-nowrap">
                  <span>Spin &amp; Win</span>
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
