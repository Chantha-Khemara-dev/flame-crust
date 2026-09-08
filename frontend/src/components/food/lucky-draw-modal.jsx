import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Sparkles,
  Gift,
  Copy,
  Check,
  Clock,
  ChevronRight,
  Flame,
  Ticket,
  Volume2,
  VolumeX,
  X,
  ShoppingBag,
  History,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useCart } from "@/lib/cart-store";
import { cn } from "@/lib/utils";

// 8 Carefully calibrated prize segments matching backend coupons
export const PRIZES = [
  {
    id: "pizza10",
    label: "10% OFF",
    subtext: "Min. $15",
    code: "PIZZA10",
    type: "PERCENTAGE",
    value: 10,
    minOrder: 15,
    color: "#EA580C", // Warm Flame Orange
    textColor: "#FFFFFF",
    bgGradient: "from-orange-500 to-amber-600",
  },
  {
    id: "freedelivery",
    label: "FREE SHIP",
    subtext: "Free Delivery",
    code: "FREEDELIVERY",
    type: "FREE_DELIVERY",
    value: 20,
    minOrder: 20,
    color: "#DC2626", // Crimson Red
    textColor: "#FFFFFF",
    bgGradient: "from-red-600 to-rose-600",
  },
  {
    id: "crust3",
    label: "$3.00 OFF",
    subtext: "Min. $12",
    code: "CRUST3",
    type: "FIXED",
    value: 3,
    minOrder: 12,
    color: "#B45309", // Woodfire Bronze
    textColor: "#FFFFFF",
    bgGradient: "from-amber-600 to-yellow-600",
  },
  {
    id: "flame20",
    label: "20% OFF",
    subtext: "Mega Crust $30+",
    code: "FLAME20",
    type: "PERCENTAGE",
    value: 20,
    minOrder: 30,
    color: "#7C3AED", // Royal Violet (Grand Prize)
    textColor: "#FFFFFF",
    bgGradient: "from-purple-600 to-indigo-600",
  },
  {
    id: "snack15",
    label: "$1.50 OFF",
    subtext: "Min. $10",
    code: "SNACK15",
    type: "FIXED",
    value: 1.5,
    minOrder: 10,
    color: "#D97706", // Gold
    textColor: "#FFFFFF",
    bgGradient: "from-amber-500 to-orange-500",
  },
  {
    id: "feast5",
    label: "$5.00 OFF",
    subtext: "Big Feast $25+",
    code: "FEAST5",
    type: "FIXED",
    value: 5,
    minOrder: 25,
    color: "#059669", // Emerald Green
    textColor: "#FFFFFF",
    bgGradient: "from-emerald-600 to-teal-600",
  },
  {
    id: "weekend15",
    label: "15% OFF",
    subtext: "Min. $20",
    code: "WEEKEND15",
    type: "PERCENTAGE",
    value: 15,
    minOrder: 20,
    color: "#2563EB", // Sapphire Blue
    textColor: "#FFFFFF",
    bgGradient: "from-blue-600 to-indigo-600",
  },
  {
    id: "freedrink",
    label: "FREE DRINK",
    subtext: "Code: NEWUSER1",
    code: "NEWUSER1",
    type: "FREE_DELIVERY",
    value: 2,
    minOrder: 10,
    color: "#E11D48", // Rose Red
    textColor: "#FFFFFF",
    bgGradient: "from-rose-500 to-red-600",
  },
];

const SPIN_COOLDOWN_HOURS = 24;

// Synthesized click sounds via Web Audio API (Zero external audio file latency)
function playTickSound(audioCtxRef) {
  try {
    const ctx = audioCtxRef.current || (typeof window !== "undefined" && new (window.AudioContext || window.webkitAudioContext)());
    if (!ctx) return;
    audioCtxRef.current = ctx;
    if (ctx.state === "suspended") ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.035);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  } catch {}
}

export function LuckyDrawModal({ open, onOpenChange }) {
  const { applyCoupon, openCart } = useCart();
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winningPrize, setWinningPrize] = useState(null);
  const [hasCopied, setHasCopied] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [viewHistory, setViewHistory] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [wonCoupons, setWonCoupons] = useState(() => {
    try {
      const stored = localStorage.getItem("flame_lucky_draw_vouchers");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const audioCtxRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Check Spin Quota (1 spin per 24 hours)
  const checkCooldown = useCallback(() => {
    try {
      const lastSpin = localStorage.getItem("flame_lucky_last_spin");
      if (!lastSpin) {
        setCooldownRemaining(0);
        return;
      }
      const lastSpinTime = parseInt(lastSpin, 10);
      const now = Date.now();
      const diffMs = now - lastSpinTime;
      const cooldownMs = SPIN_COOLDOWN_HOURS * 60 * 60 * 1000;
      if (diffMs < cooldownMs) {
        setCooldownRemaining(Math.ceil((cooldownMs - diffMs) / 1000));
      } else {
        setCooldownRemaining(0);
      }
    } catch {
      setCooldownRemaining(0);
    }
  }, []);

  useEffect(() => {
    if (open) {
      checkCooldown();
      const timer = setInterval(checkCooldown, 1000);
      return () => clearInterval(timer);
    }
  }, [open, checkCooldown]);

  // Format seconds into HH:MM:SS
  const formatCooldown = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
  };

  // Perform Spin
  const handleSpin = () => {
    if (isSpinning || cooldownRemaining > 0) return;

    setIsSpinning(true);
    setWinningPrize(null);
    setHasCopied(false);

    // Pick random winning prize index (0 to 7)
    const prizeIndex = Math.floor(Math.random() * PRIZES.length);
    const targetPrize = PRIZES[prizeIndex];

    const segmentAngle = 360 / PRIZES.length; // 45 degrees per segment
    // Pointer is at the top (0 / 360 degrees).
    // Segment i starts at i * 45 and centers at i * 45 + 22.5.
    // To land on segment i at top, rotation modulo 360 must place segment center at 270 or 360 - center.
    const segmentCenter = prizeIndex * segmentAngle + segmentAngle / 2;
    const targetOffset = 360 - segmentCenter;

    // Minimum 6 full revolutions (2160 deg) for suspense + target offset
    const currentBase = Math.floor(rotation / 360) * 360;
    const nextRotation = currentBase + 360 * 6 + targetOffset;

    setRotation(nextRotation);

    // Simulate audio tick clicks during rotation
    if (soundEnabled) {
      let tickCount = 0;
      const totalTicks = 45;
      const start = Date.now();
      const duration = 4500;

      const scheduleTick = () => {
        const elapsed = Date.now() - start;
        if (elapsed < duration) {
          playTickSound(audioCtxRef);
          tickCount++;
          // Progressive deceleration interval
          const nextInterval = 40 + Math.pow(elapsed / duration, 2.5) * 220;
          setTimeout(scheduleTick, nextInterval);
        }
      };
      scheduleTick();
    }

    // Spin animation duration is 4.5 seconds
    setTimeout(() => {
      setIsSpinning(false);
      setWinningPrize(targetPrize);

      // Record last spin timestamp
      const now = Date.now();
      localStorage.setItem("flame_lucky_last_spin", String(now));
      checkCooldown();

      // Save won voucher to history
      const newVoucher = {
        ...targetPrize,
        wonAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
      setWonCoupons((prev) => {
        const updated = [newVoucher, ...prev.slice(0, 19)];
        localStorage.setItem("flame_lucky_draw_vouchers", JSON.stringify(updated));
        return updated;
      });

      // Launch victory confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#EA580C", "#F59E0B", "#DC2626", "#10B981", "#6366F1"],
      });

      toast.success(`🎉 Congratulations! You won ${targetPrize.label}!`);
    }, 4500);
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setHasCopied(true);
    toast.success(`Promo code "${code}" copied to clipboard!`);
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleApplyToCart = (prize) => {
    applyCoupon({
      id: prize.id,
      code: prize.code,
      discount_type: prize.type,
      discount_value: prize.value,
      min_order_amount: prize.minOrder,
      active: true,
    });
    toast.success(`Voucher "${prize.code}" applied to cart!`);
    onOpenChange(false);
    openCart();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !isSpinning && onOpenChange(false)}
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-[480px] rounded-3xl bg-card border border-border/80 shadow-2xl overflow-hidden p-5 sm:p-6 my-auto z-10 select-none text-foreground"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <span className="size-8 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-xs">
                <Sparkles className="size-4 animate-spin-slow" />
              </span>
              <div>
                <h3 className="font-extrabold text-base sm:text-lg tracking-tight flex items-center gap-1.5">
                  Flame Lucky Wheel
                  <Badge variant="outline" className="border-amber-500/40 text-amber-500 bg-amber-500/10 text-[10px] font-black uppercase px-1.5 py-0">
                    Daily
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground">Spin daily to win exclusive crust discounts</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="size-8 rounded-full text-muted-foreground hover:text-foreground"
                title={soundEnabled ? "Mute audio" : "Enable audio"}
              >
                {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={isSpinning}
                onClick={() => onOpenChange(false)}
                className="size-8 rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>

          {/* Toggle between Wheel & Won Vouchers */}
          <div className="flex items-center justify-center gap-2 my-3">
            <button
              type="button"
              onClick={() => setViewHistory(false)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                !viewHistory
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground"
              )}
            >
              <RotateCw className="size-3.5" /> Lucky Wheel
            </button>
            <button
              type="button"
              onClick={() => setViewHistory(true)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                viewHistory
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground"
              )}
            >
              <History className="size-3.5" /> My Won Vouchers ({wonCoupons.length})
            </button>
          </div>

          {!viewHistory ? (
            <>
              {/* Wheel Container */}
              <div className="relative flex flex-col items-center justify-center py-4">
                {/* Pointer Needle (Top Center) */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                  <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[22px] border-t-amber-400" />
                  <div className="size-3.5 rounded-full bg-amber-400 -mt-2 ring-2 ring-amber-600" />
                </div>

                {/* SVG Rotating Wheel */}
                <div className="relative size-64 sm:size-72 rounded-full p-2 bg-gradient-to-tr from-amber-600 via-orange-500 to-red-600 shadow-[0_12px_40px_rgba(234,88,12,0.35)] border-4 border-amber-300">
                  <svg
                    viewBox="0 0 400 400"
                    className="size-full rounded-full transition-transform"
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      transitionDuration: isSpinning ? "4500ms" : "0ms",
                      transitionTimingFunction: "cubic-bezier(0.12, 0.98, 0.22, 1)",
                    }}
                  >
                    <defs>
                      <filter id="sliceShadow" x="-10%" y="-10%" width="120%" height="120%">
                        <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3" />
                      </filter>
                    </defs>

                    {PRIZES.map((prize, idx) => {
                      const angle = 360 / PRIZES.length;
                      const startAngle = idx * angle;
                      const endAngle = (idx + 1) * angle;

                      // Convert polar to cartesian coordinates
                      const r = 196;
                      const cx = 200;
                      const cy = 200;

                      const startRad = ((startAngle - 90) * Math.PI) / 180;
                      const endRad = ((endAngle - 90) * Math.PI) / 180;

                      const x1 = cx + r * Math.cos(startRad);
                      const y1 = cy + r * Math.sin(startRad);
                      const x2 = cx + r * Math.cos(endRad);
                      const y2 = cy + r * Math.sin(endRad);

                      const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;
                      const midAngle = startAngle + angle / 2;

                      return (
                        <g key={prize.id}>
                          <path
                            d={pathData}
                            fill={prize.color}
                            stroke="#FEF3C7"
                            strokeWidth="2.5"
                          />
                          {/* Label Text Rotated towards center */}
                          <text
                            x={cx}
                            y={cy - 120}
                            fill={prize.textColor}
                            fontSize="17"
                            fontWeight="900"
                            textAnchor="middle"
                            dominantBaseline="central"
                            transform={`rotate(${midAngle}, ${cx}, ${cy})`}
                            style={{ textShadow: "0 2px 4px rgba(0,0,0,0.6)" }}
                          >
                            {prize.label}
                          </text>
                          <text
                            x={cx}
                            y={cy - 96}
                            fill="rgba(255,255,255,0.85)"
                            fontSize="10"
                            fontWeight="700"
                            textAnchor="middle"
                            dominantBaseline="central"
                            transform={`rotate(${midAngle}, ${cx}, ${cy})`}
                          >
                            {prize.subtext}
                          </text>
                        </g>
                      );
                    })}
                  </svg>

                  {/* Wheel Center Flame Crust Hub Button */}
                  <button
                    type="button"
                    onClick={handleSpin}
                    disabled={isSpinning || cooldownRemaining > 0}
                    className="absolute inset-0 m-auto size-20 sm:size-22 rounded-full bg-gradient-to-tr from-zinc-950 via-zinc-900 to-zinc-800 border-4 border-amber-400 text-amber-400 flex flex-col items-center justify-center shadow-2xl cursor-pointer hover:scale-105 active:scale-95 transition-all disabled:opacity-80 disabled:cursor-not-allowed group z-10"
                  >
                    <Flame className="size-6 text-orange-500 animate-pulse group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-black tracking-wider uppercase text-amber-300">
                      {isSpinning ? "SPINNING" : "SPIN"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Status / Winner Box */}
              {winningPrize ? (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="mt-2 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-primary/15 border border-amber-500/30 text-center"
                >
                  <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                    <Gift className="size-3.5" /> Prize Unlocked!
                  </p>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="font-extrabold text-xl sm:text-2xl text-foreground">
                      {winningPrize.label}
                    </span>
                    <Badge className="bg-primary text-white font-mono font-bold text-xs tracking-wider px-2 py-0.5">
                      {winningPrize.code}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Valid for 7 days on orders over ${winningPrize.minOrder}.
                  </p>

                  <div className="flex items-center gap-2 justify-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyCode(winningPrize.code)}
                      className="rounded-xl border-border/80 text-xs font-bold gap-1.5"
                    >
                      {hasCopied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                      {hasCopied ? "Copied" : "Copy Code"}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApplyToCart(winningPrize)}
                      className="rounded-xl bg-primary text-white hover:bg-primary/90 text-xs font-bold gap-1.5 shadow-warm"
                    >
                      <ShoppingBag className="size-3.5" /> Apply to Cart
                    </Button>
                  </div>
                </motion.div>
              ) : cooldownRemaining > 0 ? (
                <div className="mt-2 p-3 rounded-2xl bg-secondary/50 border border-border/60 text-center flex items-center justify-center gap-2 text-muted-foreground text-xs font-semibold">
                  <Clock className="size-4 text-amber-500 shrink-0" />
                  <span>Next free daily spin in:</span>
                  <span className="font-mono font-bold text-foreground">{formatCooldown(cooldownRemaining)}</span>
                </div>
              ) : (
                <div className="mt-2 text-center">
                  <Button
                    onClick={handleSpin}
                    disabled={isSpinning}
                    className="w-full h-11 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm shadow-warm active:scale-95 transition-all"
                  >
                    <Sparkles className="size-4 mr-2" />
                    SPIN THE FLAME WHEEL (FREE)
                  </Button>
                </div>
              )}
            </>
          ) : (
            /* Won Vouchers History Tab */
            <div className="py-2">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
                Your Claimed Vouchers
              </h4>
              {wonCoupons.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-border/70 text-muted-foreground text-xs">
                  <Gift className="size-8 mx-auto mb-2 opacity-40" />
                  You have not won any vouchers yet. Spin the wheel to win your first discount!
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1 no-scrollbar">
                  {wonCoupons.map((voucher, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-2xl border border-border/60 bg-secondary/40 flex items-center justify-between gap-2 hover:border-primary/40 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-sm text-foreground">{voucher.label}</span>
                          <span className="font-mono text-[10px] bg-primary/10 text-primary font-extrabold px-1.5 py-0.5 rounded">
                            {voucher.code}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Min. ${voucher.minOrder} • Exp: {new Date(voucher.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopyCode(voucher.code)}
                          className="size-8 p-0 rounded-lg"
                          title="Copy Code"
                        >
                          <Copy className="size-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApplyToCart(voucher)}
                          className="h-7 px-2.5 rounded-lg text-xs font-bold bg-primary text-white"
                        >
                          Apply
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default LuckyDrawModal;
