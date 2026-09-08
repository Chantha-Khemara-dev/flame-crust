import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Sparkles,
  Gift,
  Copy,
  Check,
  Clock,
  Flame,
  Ticket,
  Volume2,
  VolumeX,
  X,
  ShoppingBag,
  History,
  RotateCw,
  Star,
  Crown,
  Zap,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useCart } from "@/lib/cart-store";
import { cn } from "@/lib/utils";

export const PRIZES = [
  {
    id: "pizza10",
    label: "10% OFF",
    subtext: "Min. $15",
    code: "PIZZA10",
    type: "PERCENTAGE",
    value: 10,
    minOrder: 15,
    color: "#EA580C",
    colorLight: "#FB923C",
    textColor: "#FFFFFF",
    bgGradient: "from-orange-500 to-amber-600",
    icon: Flame,
    tier: "common",
  },
  {
    id: "freedelivery",
    label: "FREE SHIP",
    subtext: "Free Delivery",
    code: "FREEDELIVERY",
    type: "FREE_DELIVERY",
    value: 20,
    minOrder: 20,
    color: "#DC2626",
    colorLight: "#F87171",
    textColor: "#FFFFFF",
    bgGradient: "from-red-600 to-rose-600",
    icon: Zap,
    tier: "rare",
  },
  {
    id: "crust3",
    label: "$3.00 OFF",
    subtext: "Min. $12",
    code: "CRUST3",
    type: "FIXED",
    value: 3,
    minOrder: 12,
    color: "#B45309",
    colorLight: "#D97706",
    textColor: "#FFFFFF",
    bgGradient: "from-amber-600 to-yellow-600",
    icon: Star,
    tier: "common",
  },
  {
    id: "flame20",
    label: "20% OFF",
    subtext: "Mega Crust $30+",
    code: "FLAME20",
    type: "PERCENTAGE",
    value: 20,
    minOrder: 30,
    color: "#7C3AED",
    colorLight: "#A78BFA",
    textColor: "#FFFFFF",
    bgGradient: "from-purple-600 to-indigo-600",
    icon: Crown,
    tier: "legendary",
  },
  {
    id: "snack15",
    label: "$1.50 OFF",
    subtext: "Min. $10",
    code: "SNACK15",
    type: "FIXED",
    value: 1.5,
    minOrder: 10,
    color: "#D97706",
    colorLight: "#FBBF24",
    textColor: "#FFFFFF",
    bgGradient: "from-amber-500 to-orange-500",
    icon: Star,
    tier: "common",
  },
  {
    id: "feast5",
    label: "$5.00 OFF",
    subtext: "Big Feast $25+",
    code: "FEAST5",
    type: "FIXED",
    value: 5,
    minOrder: 25,
    color: "#059669",
    colorLight: "#34D399",
    textColor: "#FFFFFF",
    bgGradient: "from-emerald-600 to-teal-600",
    icon: Gift,
    tier: "rare",
  },
  {
    id: "weekend15",
    label: "15% OFF",
    subtext: "Min. $20",
    code: "WEEKEND15",
    type: "PERCENTAGE",
    value: 15,
    minOrder: 20,
    color: "#2563EB",
    colorLight: "#60A5FA",
    textColor: "#FFFFFF",
    bgGradient: "from-blue-600 to-indigo-600",
    icon: Sparkles,
    tier: "rare",
  },
  {
    id: "freedrink",
    label: "FREE DRINK",
    subtext: "Code: NEWUSER1",
    code: "NEWUSER1",
    type: "FREE_DELIVERY",
    value: 2,
    minOrder: 10,
    color: "#E11D48",
    colorLight: "#FB7185",
    textColor: "#FFFFFF",
    bgGradient: "from-rose-500 to-red-600",
    icon: Gift,
    tier: "common",
  },
];

export const DAILY_SPIN_LIMIT = 3;
const SEGMENT_ANGLE = 360 / PRIZES.length;
const BULB_COUNT = 16;

export function getCurrentAccount() {
  try {
    const raw = localStorage.getItem("customerAuth");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.id != null || parsed.email || parsed.phone)) {
        const accountId = parsed.id != null ? String(parsed.id) : String(parsed.email || parsed.phone);
        return {
          isLoggedIn: true,
          id: accountId,
          name: parsed.name || parsed.email || "Customer",
          email: parsed.email || "",
          storageKey: `user_${accountId}`,
        };
      }
    }
  } catch {}
  return {
    isLoggedIn: false,
    id: "guest",
    name: "Guest",
    email: "",
    storageKey: "guest",
  };
}

export function getSpinsData(storageKey) {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const raw = localStorage.getItem(`flame_lucky_spins_${storageKey}`);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && data.date === today) {
        return {
          date: today,
          used: typeof data.used === "number" ? data.used : 0,
          lastSpinTime: data.lastSpinTime || 0,
        };
      }
    }
  } catch {}
  return { date: today, used: 0, lastSpinTime: 0 };
}

export function getSecondsUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.max(0, Math.ceil((midnight.getTime() - now.getTime()) / 1000));
}

export function getWonCoupons(storageKey) {
  try {
    const stored = localStorage.getItem(`flame_lucky_draw_vouchers_${storageKey}`);
    if (stored) return JSON.parse(stored);

    // Fallback/migrate legacy vouchers if present and user has no vouchers yet
    const legacy = localStorage.getItem("flame_lucky_draw_vouchers");
    if (legacy) {
      const parsedLegacy = JSON.parse(legacy);
      if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
        localStorage.setItem(`flame_lucky_draw_vouchers_${storageKey}`, legacy);
        return parsedLegacy;
      }
    }
  } catch {}
  return [];
}

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

function TierBadge({ tier, className }) {
  const config = {
    common: { label: "Common", color: "text-slate-400 bg-slate-500/10 border-slate-500/25" },
    rare: { label: "Rare", color: "text-sky-400 bg-sky-500/10 border-sky-500/25" },
    legendary: { label: "Legendary", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  };
  const c = config[tier] || config.common;
  return (
    <span className={cn("text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border", c.color, className)}>
      {c.label}
    </span>
  );
}

function WheelBulbs({ spinning }) {
  return (
    <div className="absolute inset-0 rounded-full pointer-events-none z-20">
      {Array.from({ length: BULB_COUNT }).map((_, i) => (
        <span key={i} className="absolute inset-0" style={{ transform: `rotate(${(360 / BULB_COUNT) * i}deg)` }}>
          <span
            className={cn(
              "absolute top-[2px] left-1/2 -translate-x-1/2 block size-[7px] rounded-full border border-amber-200/60 shadow-[0_0_6px_2px_rgba(253,224,71,0.5)]",
              spinning ? "bg-yellow-200 animate-pulse" : i % 2 === 0 ? "bg-yellow-300" : "bg-amber-400/80"
            )}
            style={spinning ? { animationDelay: `${(i % 4) * 90}ms`, animationDuration: "350ms" } : undefined}
          />
        </span>
      ))}
    </div>
  );
}

function Wheel({ rotation, isSpinning, onSpin, disabled, spinsRemaining = 0 }) {
  const r = 188;
  const cx = 200;
  const cy = 200;

  return (
    <div className="relative flex items-center justify-center">
      <motion.div
        animate={isSpinning ? { scale: [1, 1.015, 1] } : { scale: 1 }}
        transition={isSpinning ? { repeat: Infinity, duration: 0.9 } : { duration: 0.3 }}
        className="absolute size-[290px] sm:size-[326px] rounded-full bg-gradient-to-br from-orange-500/35 via-amber-400/20 to-red-500/35 blur-2xl pointer-events-none"
      />

      <div className="relative size-[268px] sm:size-[300px] rounded-full bg-[conic-gradient(from_0deg,#FDE68A,#F59E0B,#B45309,#FBBF24,#FDE68A)] p-[10px] shadow-[0_24px_70px_rgba(234,88,12,0.45),inset_0_2px_6px_rgba(255,255,255,0.6)]">
        <div className="absolute inset-[5px] rounded-full border-2 border-amber-900/25 pointer-events-none z-20" />
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/35 via-transparent to-black/25 pointer-events-none z-20" />

        <WheelBulbs spinning={isSpinning} />

        <div className="relative size-full rounded-full bg-zinc-950 p-[6px] shadow-[inset_0_4px_14px_rgba(0,0,0,0.65)]">
          <svg
            viewBox="0 0 400 400"
            className="size-full rounded-full transition-transform will-change-transform"
            style={{
              transform: `rotate(${rotation}deg)`,
              transitionDuration: isSpinning ? "4500ms" : "0ms",
              transitionTimingFunction: "cubic-bezier(0.12, 0.98, 0.22, 1)",
            }}
          >
            <defs>
              {PRIZES.map((prize) => (
                <radialGradient key={prize.id} id={`grad-${prize.id}`} cx="50%" cy="50%" r="75%">
                  <stop offset="0%" stopColor={prize.colorLight} />
                  <stop offset="62%" stopColor={prize.color} />
                  <stop offset="100%" stopColor={prize.color} stopOpacity="0.92" />
                </radialGradient>
              ))}
              <radialGradient id="hubGold" cx="35%" cy="30%" r="80%">
                <stop offset="0%" stopColor="#FEF3C7" />
                <stop offset="55%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#92400E" />
              </radialGradient>
              <filter id="sliceShadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.35" />
              </filter>
            </defs>

            <circle cx={cx} cy={cy} r={r + 6} fill="#18181B" />

            {PRIZES.map((prize, idx) => {
              const startAngle = idx * SEGMENT_ANGLE;
              const endAngle = (idx + 1) * SEGMENT_ANGLE;

              const startRad = ((startAngle - 90) * Math.PI) / 180;
              const endRad = ((endAngle - 90) * Math.PI) / 180;

              const x1 = cx + r * Math.cos(startRad);
              const y1 = cy + r * Math.sin(startRad);
              const x2 = cx + r * Math.cos(endRad);
              const y2 = cy + r * Math.sin(endRad);

              const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;
              const midAngle = startAngle + SEGMENT_ANGLE / 2;

              return (
                <g key={prize.id}>
                  <path d={pathData} fill={`url(#grad-${prize.id})`} stroke="#FEF3C7" strokeWidth="2" filter="url(#sliceShadow)" />
                  <g transform={`rotate(${midAngle}, ${cx}, ${cy})`}>
                    <text
                      x={cx}
                      y={cy - 148}
                      fill={prize.textColor}
                      fontSize="17"
                      fontWeight="900"
                      textAnchor="middle"
                      dominantBaseline="central"
                      style={{ textShadow: "0 2px 4px rgba(0,0,0,0.55)", letterSpacing: "0.02em" }}
                    >
                      {prize.label}
                    </text>
                    <text
                      x={cx}
                      y={cy - 126}
                      fill="rgba(255,255,255,0.82)"
                      fontSize="10"
                      fontWeight="700"
                      textAnchor="middle"
                      dominantBaseline="central"
                      style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}
                    >
                      {prize.subtext}
                    </text>
                    <circle cx={cx} cy={cy - 170} r="3.4" fill="#FEF3C7" opacity="0.9" />
                  </g>
                </g>
              );
            })}

            <circle cx={cx} cy={cy} r={80} fill="url(#hubGold)" />
            <circle cx={cx} cy={cy} r={70} fill="none" stroke="#78350F" strokeWidth="2" opacity="0.45" />
          </svg>

          <motion.button
            type="button"
            onClick={onSpin}
            disabled={disabled}
            whileHover={disabled ? undefined : { scale: 1.06 }}
            whileTap={disabled ? undefined : { scale: 0.94 }}
            className="absolute inset-0 m-auto size-[84px] sm:size-24 rounded-full bg-[radial-gradient(circle_at_32%_28%,#3F3F46,#18181B_70%)] border-[3px] border-amber-400 flex flex-col items-center justify-center shadow-[0_10px_28px_rgba(0,0,0,0.55)] cursor-pointer disabled:cursor-not-allowed z-30 group"
          >
            {!disabled && (
              <motion.span
                animate={{ opacity: [0.35, 0.85, 0.35] }}
                transition={{ repeat: Infinity, duration: 1.8 }}
                className="absolute inset-0 rounded-full ring-4 ring-amber-400/40 pointer-events-none"
              />
            )}
            <Flame className={cn("size-6 transition-transform", isSpinning ? "text-amber-400" : disabled ? "text-zinc-500" : "text-orange-500 group-hover:scale-110")} />
            <span className={cn("text-[11px] font-black tracking-[0.14em] uppercase mt-1", disabled ? "text-zinc-400" : "text-amber-300")}>
              {isSpinning ? "LUCKY" : disabled ? "DONE" : "SPIN"}
            </span>
            <span className="text-[8px] font-bold text-amber-200/60 uppercase tracking-wider">
              {isSpinning ? "..." : disabled ? "0 Left" : `${spinsRemaining} Left`}
            </span>
          </motion.button>
        </div>
      </div>

      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center">
        <motion.div
          animate={isSpinning ? { rotate: [0, -9, 7, 0] } : { rotate: 0 }}
          transition={isSpinning ? { repeat: Infinity, duration: 0.45 } : { duration: 0.2 }}
          style={{ originY: 0.15 }}
          className="flex flex-col items-center drop-shadow-[0_5px_7px_rgba(0,0,0,0.45)]"
        >
          <div className="size-5 rounded-full bg-[radial-gradient(circle_at_35%_30%,#FEF3C7,#F59E0B_65%,#92400E)] ring-2 ring-amber-200/70 shadow-md" />
          <svg width="30" height="30" viewBox="0 0 30 30" className="-mt-1.5">
            <defs>
              <linearGradient id="pointerGold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FDE68A" />
                <stop offset="55%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#B45309" />
              </linearGradient>
            </defs>
            <path d="M15 29 L4.5 8 Q15 12.5 25.5 8 Z" fill="url(#pointerGold)" stroke="#78350F" strokeWidth="1" strokeLinejoin="round" />
          </svg>
        </motion.div>
      </div>
    </div>
  );
}

export function LuckyDrawModal({ open, onOpenChange }) {
  const { applyCoupon, openCart } = useCart();
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winningPrize, setWinningPrize] = useState(null);
  const [hasCopied, setHasCopied] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [viewHistory, setViewHistory] = useState(false);
  const [account, setAccount] = useState(getCurrentAccount);
  const [spinsUsed, setSpinsUsed] = useState(() => getSpinsData(getCurrentAccount().storageKey).used);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [wonCoupons, setWonCoupons] = useState(() => getWonCoupons(getCurrentAccount().storageKey));

  const audioCtxRef = useRef(null);

  // Clean legacy single-account lockout on mount
  useEffect(() => {
    try {
      localStorage.removeItem("flame_lucky_last_spin");
    } catch {}
  }, []);

  const reloadAccountData = useCallback(() => {
    const acc = getCurrentAccount();
    setAccount(acc);
    const spins = getSpinsData(acc.storageKey);
    setSpinsUsed(spins.used);
    setWonCoupons(getWonCoupons(acc.storageKey));

    const left = Math.max(0, DAILY_SPIN_LIMIT - spins.used);
    if (left <= 0) {
      setCooldownRemaining(getSecondsUntilMidnight());
    } else {
      setCooldownRemaining(0);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    reloadAccountData();

    const interval = setInterval(() => {
      const acc = getCurrentAccount();
      const spins = getSpinsData(acc.storageKey);
      const left = Math.max(0, DAILY_SPIN_LIMIT - spins.used);
      if (left <= 0) {
        setCooldownRemaining(getSecondsUntilMidnight());
      } else {
        setCooldownRemaining(0);
      }
    }, 1000);

    const handleAuth = () => {
      reloadAccountData();
      setWinningPrize(null);
    };
    window.addEventListener("authChanged", handleAuth);

    return () => {
      clearInterval(interval);
      window.removeEventListener("authChanged", handleAuth);
    };
  }, [open, reloadAccountData]);

  const spinsRemaining = Math.max(0, DAILY_SPIN_LIMIT - spinsUsed);

  const formatCooldown = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
  };

  const handleSpin = () => {
    if (isSpinning || spinsRemaining <= 0) return;

    setIsSpinning(true);
    setWinningPrize(null);
    setHasCopied(false);

    const prizeIndex = Math.floor(Math.random() * PRIZES.length);
    const targetPrize = PRIZES[prizeIndex];

    const segmentCenter = prizeIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
    const targetOffset = 360 - segmentCenter;

    const currentBase = Math.floor(rotation / 360) * 360;
    const nextRotation = currentBase + 360 * 6 + targetOffset;

    setRotation(nextRotation);

    if (soundEnabled) {
      const start = Date.now();
      const duration = 4500;

      const scheduleTick = () => {
        const elapsed = Date.now() - start;
        if (elapsed < duration) {
          playTickSound(audioCtxRef);
          const nextInterval = 40 + Math.pow(elapsed / duration, 2.5) * 220;
          setTimeout(scheduleTick, nextInterval);
        }
      };
      scheduleTick();
    }

    setTimeout(() => {
      setIsSpinning(false);
      setWinningPrize(targetPrize);

      const currentAcc = getCurrentAccount();
      const currentSpins = getSpinsData(currentAcc.storageKey);
      const newUsed = currentSpins.used + 1;
      const today = new Date().toISOString().slice(0, 10);
      const now = Date.now();

      localStorage.setItem(
        `flame_lucky_spins_${currentAcc.storageKey}`,
        JSON.stringify({ date: today, used: newUsed, lastSpinTime: now })
      );
      setSpinsUsed(newUsed);

      const newRemaining = Math.max(0, DAILY_SPIN_LIMIT - newUsed);
      if (newRemaining <= 0) {
        setCooldownRemaining(getSecondsUntilMidnight());
      }

      const newVoucher = {
        ...targetPrize,
        account: currentAcc.name,
        wonAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
      setWonCoupons((prev) => {
        const updated = [newVoucher, ...prev.slice(0, 29)];
        localStorage.setItem(`flame_lucky_draw_vouchers_${currentAcc.storageKey}`, JSON.stringify(updated));
        return updated;
      });

      confetti({
        particleCount: 140,
        spread: 85,
        origin: { y: 0.6 },
        colors: ["#EA580C", "#F59E0B", "#DC2626", "#10B981", "#6366F1", "#A855F7"],
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

  const WinIcon = winningPrize?.icon || Gift;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !isSpinning && onOpenChange(false)}
          className="fixed inset-0 bg-gradient-to-br from-black/90 via-zinc-950/85 to-black/90 backdrop-blur-xl"
        />

        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 24 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-[480px] rounded-[32px] bg-card border border-amber-500/25 shadow-[0_30px_90px_rgba(0,0,0,0.6),0_0_0_1px_rgba(245,158,11,0.08)] overflow-hidden my-auto z-10 select-none text-foreground"
        >
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-orange-500 via-amber-400 to-red-500" />
          <div className="absolute -top-28 -right-28 size-72 bg-gradient-to-br from-orange-500/25 to-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-28 -left-28 size-72 bg-gradient-to-br from-primary/20 to-rose-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative p-5 sm:p-6">
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="size-11 rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/35 ring-1 ring-amber-300/40">
                    <Sparkles className="size-5 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 size-3 rounded-full bg-emerald-500 border-2 border-card animate-pulse" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold tracking-tight flex items-center gap-2">
                    Flame Lucky Wheel
                    <Badge className="border border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-[9px] font-black uppercase px-1.5 py-0 rounded-full">
                      3 Spins Daily
                    </Badge>
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px]",
                        account.isLoggedIn
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
                          : "bg-secondary text-muted-foreground border border-border/60"
                      )}
                    >
                      <span className={cn("size-1.5 rounded-full", account.isLoggedIn ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground")} />
                      {account.isLoggedIn ? account.name : "Guest"}
                    </span>
                    <span>•</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 text-[11px]">
                      {spinsRemaining > 0 ? `${spinsRemaining} left today` : "Reset at 00:00"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="size-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary"
                  title={soundEnabled ? "Mute audio" : "Enable audio"}
                >
                  {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isSpinning}
                  onClick={() => onOpenChange(false)}
                  className="size-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-center my-4">
              <div className="inline-flex items-center gap-1 p-1 rounded-full bg-secondary/70 border border-border/60">
                <button
                  type="button"
                  onClick={() => setViewHistory(false)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                    !viewHistory
                      ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/30"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <RotateCw className="size-3.5" /> Lucky Wheel
                </button>
                <button
                  type="button"
                  onClick={() => setViewHistory(true)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                    viewHistory
                      ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/30"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <History className="size-3.5" /> My Vouchers
                  {wonCoupons.length > 0 && (
                    <span
                      className={cn(
                        "min-w-4.5 h-4.5 px-1 rounded-full text-[9px] font-black flex items-center justify-center",
                        viewHistory ? "bg-white/25 text-white" : "bg-primary/15 text-primary"
                      )}
                    >
                      {wonCoupons.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {!viewHistory ? (
              <>
                <div className="flex flex-col items-center justify-center py-3">
                  <Wheel rotation={rotation} isSpinning={isSpinning} onSpin={handleSpin} disabled={isSpinning || spinsRemaining <= 0} spinsRemaining={spinsRemaining} />
                </div>

                <AnimatePresence mode="wait">
                  {winningPrize ? (
                    <motion.div
                      key="win"
                      initial={{ scale: 0.9, opacity: 0, y: 12 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      transition={{ type: "spring", damping: 20, stiffness: 280 }}
                      className="mt-5"
                    >
                      <div className="relative rounded-2xl bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-primary/10 border border-amber-500/35 overflow-hidden">
                        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-400/70 to-transparent" />
                        <div className="absolute -top-8 -right-8 size-24 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />

                        <div className="p-4">
                          <div className="flex items-center justify-center gap-2 mb-3">
                            <motion.div
                              animate={{ rotate: [0, -12, 12, 0], scale: [1, 1.15, 1] }}
                              transition={{ duration: 0.7, delay: 0.15 }}
                            >
                              <Gift className="size-4 text-amber-500" />
                            </motion.div>
                            <p className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-[0.2em]">
                              Prize Unlocked
                            </p>
                          </div>

                          <div className="flex items-center justify-center gap-3 mb-1.5">
                            <div className={cn("size-11 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg shrink-0", winningPrize.bgGradient)}>
                              <WinIcon className="size-5 text-white" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap justify-center">
                                <span className="font-serif text-xl font-bold text-foreground leading-none">{winningPrize.label}</span>
                                <TierBadge tier={winningPrize.tier} />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopyCode(winningPrize.code)}
                                className="mt-1.5 inline-flex items-center gap-1.5 font-mono text-xs font-bold text-primary hover:text-orange-600 transition-colors cursor-pointer group"
                                title="Copy code"
                              >
                                {winningPrize.code}
                                {hasCopied ? (
                                  <Check className="size-3 text-emerald-500" />
                                ) : (
                                  <Copy className="size-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                                )}
                              </button>
                            </div>
                          </div>

                          <p className="text-[11px] text-muted-foreground mb-3.5 text-center">
                            Valid for 7 days on orders over ${winningPrize.minOrder}.
                          </p>

                          <div className="flex items-center gap-2 justify-center flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopyCode(winningPrize.code)}
                              className="rounded-xl border-border/80 text-xs font-bold gap-1.5 hover:bg-secondary"
                            >
                              {hasCopied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                              {hasCopied ? "Copied" : "Copy Code"}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleApplyToCart(winningPrize)}
                              className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 text-xs font-bold gap-1.5 shadow-lg shadow-orange-500/30"
                            >
                              <ShoppingBag className="size-3.5" /> Apply to Cart
                            </Button>
                            {spinsRemaining > 0 && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setWinningPrize(null)}
                                className="rounded-xl border border-amber-500/30 text-xs font-bold gap-1.5 hover:bg-amber-500/15"
                              >
                                <RotateCw className="size-3.5 text-amber-500" />
                                Spin Again ({spinsRemaining} left)
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ) : spinsRemaining <= 0 ? (
                    <motion.div
                      key="cooldown"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-5 w-full p-3.5 rounded-2xl bg-secondary/50 border border-border/60 flex flex-col items-center justify-center gap-1.5 text-center"
                    >
                      <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs font-semibold">
                        <Clock className="size-4 text-amber-500 shrink-0" />
                        <span>Daily limit ({DAILY_SPIN_LIMIT}/{DAILY_SPIN_LIMIT} used). Reset in:</span>
                        <span className="font-mono font-bold text-foreground tabular-nums">{formatCooldown(cooldownRemaining)}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {account.isLoggedIn
                          ? `Each account gets 3 free spins daily. Switch account or wait for midnight!`
                          : `Each account gets 3 free spins daily! Log in with an account to get separate daily spins.`}
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div key="cta" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-5 w-full">
                      <Button
                        onClick={handleSpin}
                        disabled={isSpinning}
                        className="group relative w-full h-12 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-red-500 hover:from-orange-600 hover:via-amber-600 hover:to-red-600 text-white font-bold text-sm shadow-lg shadow-orange-500/35 active:scale-[0.98] transition-all gap-2 overflow-hidden"
                      >
                        <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 pointer-events-none" />
                        <Sparkles className="size-4" />
                        {`SPIN THE WHEEL (${spinsRemaining}/${DAILY_SPIN_LIMIT} FREE LEFT)`}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="py-2">
                <h4 className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Ticket className="size-3.5" />
                    Your Won Vouchers
                  </span>
                  <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    {account.name}
                  </span>
                </h4>
                {wonCoupons.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border-2 border-dashed border-border/60 bg-secondary/20">
                    <div className="relative inline-block mb-3">
                      <Gift className="size-10 mx-auto text-muted-foreground/40" />
                      <Sparkles className="size-4 absolute -top-1 -right-2 text-amber-500/40" />
                    </div>
                    <p className="text-xs font-semibold text-muted-foreground">
                      No vouchers yet for {account.name}. Spin the wheel to win your first discount!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                    {wonCoupons.map((voucher, i) => {
                      const Icon = voucher.icon || Gift;
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.05, 0.3) }}
                          className="relative rounded-2xl border border-border/60 bg-gradient-to-br from-secondary/50 to-secondary/20 hover:border-amber-500/40 hover:shadow-md hover:shadow-orange-500/5 transition-all group overflow-hidden"
                        >
                          <div className={cn("absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b", voucher.bgGradient)} />
                          <div className="absolute -left-2 top-1/2 -translate-y-1/2 size-4 rounded-full bg-card border border-border/60" />
                          <div className="absolute -right-2 top-1/2 -translate-y-1/2 size-4 rounded-full bg-card border border-border/60" />

                          <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2.5">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className={cn("size-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm shrink-0", voucher.bgGradient)}>
                                <Icon className="size-5 text-white" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="font-serif text-sm font-bold text-foreground truncate">{voucher.label}</span>
                                  <TierBadge tier={voucher.tier} />
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                  <span className="font-mono font-bold text-primary">{voucher.code}</span>
                                  <span>•</span>
                                  <span>Min. ${voucher.minOrder}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleCopyCode(voucher.code)}
                                className="size-8 rounded-lg hover:bg-secondary"
                                title="Copy Code"
                              >
                                <Copy className="size-3.5 text-muted-foreground" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleApplyToCart(voucher)}
                                className="h-8 px-3 rounded-lg text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 shadow-sm"
                              >
                                Apply
                              </Button>
                            </div>
                          </div>

                          <div className="mx-4 border-t border-dashed border-border/60" />
                          <div className="px-4 py-2 text-[10px] text-muted-foreground flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              Won {new Date(voucher.wonAt).toLocaleDateString()}
                            </span>
                            <span className="font-semibold">Expires {new Date(voucher.expiresAt).toLocaleDateString()}</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default LuckyDrawModal;
