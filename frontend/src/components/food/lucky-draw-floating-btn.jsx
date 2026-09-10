import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Gift } from "lucide-react";
import { LuckyDrawModal } from "./lucky-draw-modal.jsx";

export function LuckyDrawFloatingButton() {
  const [modalOpen, setModalOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleOpen = () => setModalOpen(true);
    window.addEventListener("openLuckyDraw", handleOpen);
    return () => window.removeEventListener("openLuckyDraw", handleOpen);
  }, []);

  const isHiddenRoute =
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/kitchen") ||
    location.pathname.startsWith("/driver") ||
    location.pathname.startsWith("/login");

  if (isHiddenRoute) return null;

  return (
    <>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: "spring", damping: 15 }}
        className="fixed bottom-28 left-4 sm:bottom-6 sm:left-6 z-40 select-none"
      >
        <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-orange-500/40 via-amber-400/40 to-red-500/40 blur-md animate-pulse pointer-events-none" />

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="group relative flex items-center gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-full bg-[conic-gradient(from_210deg,#FDE68A,#F59E0B,#B45309,#FBBF24,#FDE68A)] p-[2px] shadow-[0_8px_25px_rgba(234,88,12,0.45)] hover:shadow-[0_12px_32px_rgba(234,88,12,0.6)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
          aria-label="Open Lucky Draw Wheel"
        >
          <span className="relative flex items-center gap-2.5 w-full rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-red-500 px-2.5 py-1.5 sm:px-3.5 sm:py-2 overflow-hidden">
            <span className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent skew-x-[-20deg] group-hover:left-[110%] transition-all duration-700 ease-out pointer-events-none" />

            <span className="relative flex items-center justify-center size-7 sm:size-8 rounded-full bg-white/20 ring-1 ring-white/30 shadow-inner shrink-0">
              <motion.span
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ repeat: Infinity, duration: 3, repeatDelay: 2 }}
              >
                <Gift className="size-4 sm:size-5 text-white" />
              </motion.span>
            </span>

            <span className="relative flex flex-col items-start pr-1">
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-amber-100 flex items-center gap-1 leading-none">
                <Sparkles className="size-2.5 text-yellow-200" /> Spin &amp; Win
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-white leading-tight">Lucky Draw</span>
            </span>
          </span>
        </button>
      </motion.div>

      <LuckyDrawModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}

export default LuckyDrawFloatingButton;
