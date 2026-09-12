import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
  Grid,
  Disc3,
  PartyPopper
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
    value: 2,
    minOrder: 10,
    color: "#DC2626",
    colorLight: "#F87171",
    textColor: "#FFFFFF",
    bgGradient: "from-red-500 to-rose-600",
    icon: Zap,
    tier: "common",
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

export const DAILY_FREE_LIMIT = 1;
export const DAILY_SPIN_LIMIT = 3;
const SEGMENT_ANGLE = 360 / PRIZES.length;
const BULB_COUNT = 16;

// Clockwise layout order mapping for the 3x3 perimeter (8 positions)
// 0: top-left, 1: top-center, 2: top-right, 3: mid-right, 4: bot-right, 5: bot-center, 6: bot-left, 7: mid-left
const GRID_CELL_MAPPING = [
  { index: 0, row: 1, col: 1 },
  { index: 1, row: 1, col: 2 },
  { index: 2, row: 1, col: 3 },
  { index: 3, row: 2, col: 3 },
  { index: 4, row: 3, col: 3 },
  { index: 5, row: 3, col: 2 },
  { index: 6, row: 3, col: 1 },
  { index: 7, row: 2, col: 1 },
];

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
  let dailyUsed = 0;
  let lastSpinTime = 0;

  try {
    const raw = localStorage.getItem(`flame_lucky_spins_${storageKey}`);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && data.date === today) {
        dailyUsed = typeof data.used === "number" ? data.used : 0;
        lastSpinTime = data.lastSpinTime || 0;
      }
    }
  } catch {}

  let bonusEarned = 0;
  try {
    const rawBonus = localStorage.getItem(`flame_lucky_bonus_earned_${storageKey}`);
    if (rawBonus != null) {
      bonusEarned = parseInt(rawBonus, 10) || 0;
    }
  } catch {}

  let bonusUsed = 0;
  try {
    const rawBonusUsed = localStorage.getItem(`flame_lucky_bonus_used_${storageKey}`);
    if (rawBonusUsed != null) {
      bonusUsed = parseInt(rawBonusUsed, 10) || 0;
    }
  } catch {}

  const dailyRemaining = Math.max(0, DAILY_FREE_LIMIT - dailyUsed);
  const bonusRemaining = Math.max(0, bonusEarned - bonusUsed);
  const totalRemaining = dailyRemaining + bonusRemaining;

  return {
    date: today,
    used: dailyUsed,
    dailyUsed,
    dailyRemaining,
    bonusEarned,
    bonusUsed,
    bonusRemaining,
    totalRemaining,
    lastSpinTime,
  };
}

export function addBonusSpins(storageKey, count = 1) {
  try {
    const currentRaw = localStorage.getItem(`flame_lucky_bonus_earned_${storageKey}`);
    const current = currentRaw ? parseInt(currentRaw, 10) || 0 : 0;
    const updated = current + count;
    localStorage.setItem(`flame_lucky_bonus_earned_${storageKey}`, String(updated));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("flame_lucky_spins_updated", { detail: { storageKey, count } }));
    }
    return updated;
  } catch {
    return 0;
  }
}

export function recordSpinUsed(storageKey) {
  const data = getSpinsData(storageKey);
  const today = new Date().toISOString().slice(0, 10);
  const now = Date.now();

  if (data.dailyRemaining > 0) {
    const newDailyUsed = data.dailyUsed + 1;
    localStorage.setItem(
      `flame_lucky_spins_${storageKey}`,
      JSON.stringify({ date: today, used: newDailyUsed, lastSpinTime: now })
    );
  } else if (data.bonusRemaining > 0) {
    const newBonusUsed = data.bonusUsed + 1;
    localStorage.setItem(`flame_lucky_bonus_used_${storageKey}`, String(newBonusUsed));
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("flame_lucky_spins_updated", { detail: { storageKey } }));
  }
}

export function getSecondsUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.max(0, Math.ceil((midnight.getTime() - now.getTime()) / 1000));
}

export function getPrizeIcon(item) {
  if (!item) return Gift;
  const match = PRIZES.find((p) => p.id === item.id || p.code === item.code);
  if (
    match &&
    match.icon &&
    (typeof match.icon === "function" || (typeof match.icon === "object" && match.icon.$$typeof))
  ) {
    return match.icon;
  }
  if (
    item.icon &&
    (typeof item.icon === "function" || (typeof item.icon === "object" && item.icon.$$typeof))
  ) {
    return item.icon;
  }
  return Gift;
}

export function getWonCoupons(storageKey) {
  try {
    const keysToCheck = [
      storageKey ? `flame_lucky_draw_vouchers_${storageKey}` : null,
      "flame_lucky_draw_vouchers_guest",
      "flame_lucky_draw_vouchers",
    ].filter(Boolean);

    const all = [];
    const seen = new Set();

    for (const k of keysToCheck) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && typeof item === "object" && item.code) {
              const uniqueKey = item.code + (item.wonAt || item.id || "");
              if (!seen.has(uniqueKey)) {
                seen.add(uniqueKey);
                all.push(item);
              }
            }
          }
        }
      } catch {}
    }
    return all;
  } catch {
    return [];
  }
}

export function markWonCouponUsed(storageKey, couponCode) {
  if (!couponCode) return;
  const targetCode = String(couponCode).toUpperCase().trim();
  const keysToCheck = [
    storageKey ? `flame_lucky_draw_vouchers_${storageKey}` : null,
    "flame_lucky_draw_vouchers_guest",
    "flame_lucky_draw_vouchers",
  ].filter(Boolean);

  for (const k of keysToCheck) {
    const raw = localStorage.getItem(k);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        let changed = false;
        const updated = parsed.map((v) => {
          if (v && v.code && String(v.code).toUpperCase().trim() === targetCode && !v.used) {
            changed = true;
            return { ...v, used: true, usedAt: new Date().toISOString() };
          }
          return v;
        });
        if (changed) {
          localStorage.setItem(k, JSON.stringify(updated));
        }
      }
    } catch {}
  }
}

export function formatWonVouchersAsCoupons(wonVouchers) {
  if (!Array.isArray(wonVouchers)) return [];
  return wonVouchers
    .filter((v) => v && v.code)
    .map((v, idx) => {
      const isExpired = v.expiresAt && new Date(v.expiresAt) < new Date();
      const isUsed = Boolean(v.used);
      return {
        id: `lucky_${v.code}_${v.wonAt || idx}`,
        code: String(v.code).toUpperCase(),
        discount_type: v.type || "FIXED",
        discount_value: Number(v.value || 0),
        min_order_amount: Number(v.minOrder || 0),
        description: `Won from Lucky Draw (${v.label || v.code})`,
        isLuckyDraw: true,
        tier: v.tier || "rare",
        isUsed: isUsed || isExpired,
        isExpired,
        active: !isUsed && !isExpired,
        wonAt: v.wonAt,
        expiresAt: v.expiresAt,
        label: v.label,
        bgGradient: v.bgGradient,
      };
    });
}

// Synthesize high-tech step tick sound
function playTickSound(audioCtxRef) {
  try {
    const ctx = audioCtxRef.current || (typeof window !== "undefined" && new (window.AudioContext || window.webkitAudioContext)());
    if (!ctx) return;
    audioCtxRef.current = ctx;
    if (ctx.state === "suspended") ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(560, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.035);
  } catch {}
}

// Synthesize victory chime arpeggio
function playWinSound(audioCtxRef) {
  try {
    const ctx = audioCtxRef.current || (typeof window !== "undefined" && new (window.AudioContext || window.webkitAudioContext)());
    if (!ctx) return;
    audioCtxRef.current = ctx;
    if (ctx.state === "suspended") ctx.resume();

    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

      gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.38);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.08);
      osc.stop(ctx.currentTime + idx * 0.08 + 0.4);
    });
  } catch {}
}

function TierBadge({ tier, className }) {
  const config = {
    common: { label: "Common", color: "text-slate-400 bg-slate-500/10 border-slate-500/25" },
    rare: { label: "Rare", color: "text-sky-400 bg-sky-500/10 border-sky-500/25" },
    legendary: { label: "Legendary", color: "text-amber-400 bg-amber-500/10 border-amber-500/30 shadow-[0_0_8px_rgba(251,191,36,0.3)]" },
  };
  const c = config[tier] || config.common;
  return (
    <span className={cn("text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-full border", c.color, className)}>
      {c.label}
    </span>
  );
}

// 1. Modern 9-Grid Fortune Matrix Component
function FortuneGrid({ activeIndex, isSpinning, onDraw, disabled, spinsRemaining = 0 }) {
  return (
    <div className="relative w-full max-w-[330px] sm:max-w-[360px] mx-auto p-2 sm:p-2.5 rounded-2xl bg-zinc-950/80 border border-amber-500/25 shadow-[0_12px_40px_rgba(0,0,0,0.6),inset_0_1px_3px_rgba(255,255,255,0.1)] backdrop-blur-md">
      {/* Ambient background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-orange-500/10 rounded-2xl pointer-events-none" />

      <div className="grid grid-cols-3 grid-rows-3 gap-2 sm:gap-2.5 relative z-10 aspect-square">
        {/* Render 8 Perimeter Prize Cards */}
        {GRID_CELL_MAPPING.map(({ index, row, col }) => {
          const prize = PRIZES[index];
          const Icon = getPrizeIcon(prize);
          const isActive = activeIndex === index;
          const isLegendary = prize.tier === "legendary";
          const isRare = prize.tier === "rare";

          return (
            <motion.div
              key={prize.id}
              style={{
                gridRowStart: row,
                gridColumnStart: col,
              }}
              animate={isActive ? { scale: 1.05 } : { scale: 1 }}
              transition={{ duration: 0.12 }}
              className={cn(
                "relative rounded-xl p-1.5 sm:p-2 flex flex-col items-center justify-center text-center transition-all duration-150 overflow-hidden select-none border",
                isActive
                  ? "bg-gradient-to-b from-amber-500/30 to-orange-600/30 border-amber-300 ring-2 ring-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.85)] z-20"
                  : isLegendary
                  ? "bg-zinc-900/90 border-purple-500/30 hover:border-purple-500/60"
                  : isRare
                  ? "bg-zinc-900/90 border-sky-500/25 hover:border-sky-500/50"
                  : "bg-zinc-900/80 border-border/50 hover:border-amber-500/30"
              )}
            >
              {/* Active kinetic glow tracer beam */}
              {isActive && (
                <span className="absolute inset-0 bg-amber-400/20 animate-pulse pointer-events-none" />
              )}

              {/* Tier indicator dot */}
              <span
                className={cn(
                  "absolute top-1 right-1 size-1.5 rounded-full",
                  isLegendary ? "bg-amber-400 animate-ping" : isRare ? "bg-sky-400" : "bg-zinc-600"
                )}
              />

              <div
                className={cn(
                  "size-7 sm:size-8 rounded-lg flex items-center justify-center mb-1 shadow-sm shrink-0",
                  prize.bgGradient ? `bg-gradient-to-br ${prize.bgGradient}` : "bg-orange-500"
                )}
              >
                <Icon className="size-3.5 sm:size-4 text-white" />
              </div>

              <span className="font-serif font-black text-xs sm:text-sm text-foreground tracking-tight leading-tight">
                {prize.label}
              </span>

              <span className="text-[9px] font-semibold text-muted-foreground mt-0.5 leading-none">
                {prize.subtext}
              </span>
            </motion.div>
          );
        })}

        {/* Center Draw Action Core Button (Row 2, Col 2) */}
        <div style={{ gridRowStart: 2, gridColumnStart: 2 }} className="relative flex items-center justify-center">
          <motion.button
            type="button"
            onClick={onDraw}
            disabled={disabled}
            whileHover={disabled ? undefined : { scale: 1.05 }}
            whileTap={disabled ? undefined : { scale: 0.94 }}
            className={cn(
              "relative size-full rounded-xl flex flex-col items-center justify-center p-1 cursor-pointer transition-all shadow-lg border overflow-hidden group",
              disabled
                ? "bg-zinc-900/90 border-zinc-800 text-zinc-500 cursor-not-allowed"
                : "bg-gradient-to-br from-amber-500 via-orange-500 to-red-600 border-amber-300 text-white shadow-orange-500/40 hover:shadow-orange-500/60"
            )}
          >
            {/* Gloss reflection shimmer */}
            {!disabled && (
              <span className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/25 to-transparent pointer-events-none" />
            )}

            <Flame
              className={cn(
                "size-5 sm:size-6 transition-transform",
                isSpinning ? "animate-bounce text-yellow-200" : disabled ? "text-zinc-600" : "text-white group-hover:scale-110"
              )}
            />

            <span className="font-black text-[10px] sm:text-xs tracking-wider uppercase mt-0.5">
              {isSpinning ? "ROLLING" : disabled ? "NO SPINS" : "DRAW"}
            </span>

            <span className={cn("text-[8px] font-extrabold uppercase", disabled ? "text-zinc-500" : "text-amber-100/80")}>
              {isSpinning ? "..." : disabled ? "0 Left" : `${spinsRemaining} Left`}
            </span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}

// 2. Futuristic Cyber Wheel Component (Secondary Mode)
function CyberWheel({ rotation, isSpinning, onSpin, disabled, spinsRemaining = 0 }) {
  const r = 188;
  const cx = 200;
  const cy = 200;

  return (
    <div className="relative flex items-center justify-center">
      <motion.div
        animate={isSpinning ? { scale: [1, 1.02, 1] } : { scale: 1 }}
        transition={isSpinning ? { repeat: Infinity, duration: 0.8 } : { duration: 0.3 }}
        className="absolute size-[230px] xs:size-[250px] sm:size-[310px] rounded-full bg-gradient-to-br from-orange-500/30 via-amber-400/20 to-red-500/30 blur-2xl pointer-events-none"
      />

      <div className="relative size-[218px] xs:size-[240px] sm:size-[296px] rounded-full bg-gradient-to-br from-amber-400 via-orange-600 to-zinc-900 p-[7px] sm:p-[9px] shadow-[0_16px_50px_rgba(234,88,12,0.45),inset_0_2px_6px_rgba(255,255,255,0.6)]">
        <div className="relative size-full rounded-full bg-zinc-950 p-[4px] sm:p-[6px] shadow-[inset_0_4px_14px_rgba(0,0,0,0.7)]">
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
              <radialGradient id="hubCyber" cx="35%" cy="30%" r="80%">
                <stop offset="0%" stopColor="#FEF3C7" />
                <stop offset="55%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#92400E" />
              </radialGradient>
            </defs>

            <circle cx={cx} cy={cy} r={r + 6} fill="#121215" />

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
                  <path d={pathData} fill={`url(#grad-${prize.id})`} stroke="#FEF3C7" strokeWidth="1.8" />
                  <g transform={`rotate(${midAngle}, ${cx}, ${cy})`}>
                    <text
                      x={cx}
                      y={cy - 146}
                      fill={prize.textColor}
                      fontSize="17"
                      fontWeight="900"
                      textAnchor="middle"
                      dominantBaseline="central"
                      style={{ textShadow: "0 2px 4px rgba(0,0,0,0.6)" }}
                    >
                      {prize.label}
                    </text>
                    <text
                      x={cx}
                      y={cy - 125}
                      fill="rgba(255,255,255,0.85)"
                      fontSize="10"
                      fontWeight="700"
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      {prize.subtext}
                    </text>
                  </g>
                </g>
              );
            })}

            <circle cx={cx} cy={cy} r={78} fill="url(#hubCyber)" />
          </svg>

          <motion.button
            type="button"
            onClick={onSpin}
            disabled={disabled}
            whileHover={disabled ? undefined : { scale: 1.06 }}
            whileTap={disabled ? undefined : { scale: 0.94 }}
            className="absolute inset-0 m-auto size-[68px] xs:size-[74px] sm:size-22 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-950 border-[2.5px] border-amber-400 flex flex-col items-center justify-center shadow-lg cursor-pointer disabled:cursor-not-allowed z-30 group"
          >
            <Flame className={cn("size-4 sm:size-5 transition-transform", isSpinning ? "text-amber-400" : disabled ? "text-zinc-500" : "text-orange-500 group-hover:scale-110")} />
            <span className={cn("text-[9px] sm:text-[10px] font-black uppercase mt-0.5", disabled ? "text-zinc-400" : "text-amber-300")}>
              {isSpinning ? "SPIN" : disabled ? "DONE" : "SPIN"}
            </span>
            <span className="text-[7px] sm:text-[8px] font-bold text-amber-200/60 uppercase">
              {isSpinning ? "..." : disabled ? "0 Left" : `${spinsRemaining} Left`}
            </span>
          </motion.button>
        </div>
      </div>

      {/* Top pointer pin */}
      <div className="absolute -top-1 sm:-top-1.5 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center pointer-events-none">
        <motion.div
          animate={isSpinning ? { rotate: [0, -8, 6, 0] } : { rotate: 0 }}
          transition={isSpinning ? { repeat: Infinity, duration: 0.45 } : { duration: 0.2 }}
          style={{ originY: 0.15 }}
          className="flex flex-col items-center"
        >
          <div className="size-4 rounded-full bg-amber-400 ring-2 ring-amber-200/80 shadow-md" />
          <svg viewBox="0 0 30 30" className="w-5 h-5 -mt-1">
            <path d="M15 29 L4.5 8 Q15 12.5 25.5 8 Z" fill="#F59E0B" stroke="#78350F" strokeWidth="1" strokeLinejoin="round" />
          </svg>
        </motion.div>
      </div>
    </div>
  );
}

export function LuckyDrawModal({ open, onOpenChange }) {
  const navigate = useNavigate();
  const { applyCoupon, openCart } = useCart();
  const [isSpinning, setIsSpinning] = useState(false);
  const [activeGridIndex, setActiveGridIndex] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [drawMode, setDrawMode] = useState("grid"); // "grid" (default) or "wheel"
  const [winningPrize, setWinningPrize] = useState(null);
  const [hasCopied, setHasCopied] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [viewHistory, setViewHistory] = useState(false);
  const [account, setAccount] = useState(getCurrentAccount);
  const [spinsData, setSpinsData] = useState(() => getSpinsData(getCurrentAccount().storageKey));
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [wonCoupons, setWonCoupons] = useState(() => getWonCoupons(getCurrentAccount().storageKey));

  const audioCtxRef = useRef(null);
  const animTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
    };
  }, []);

  const reloadAccountData = useCallback(async () => {
    const acc = getCurrentAccount();
    setAccount(acc);

    if (acc.isLoggedIn && acc.id && acc.id !== "guest") {
      try {
        const { list } = await import("@/lib/api");
        const orders = await list("orders");
        const myOrders = orders.filter((o) => String(o.customer_id) === String(acc.id));
        if (myOrders.length > 0) {
          const storedEarned = localStorage.getItem(`flame_lucky_bonus_earned_${acc.storageKey}`);
          const currentEarned = storedEarned != null ? parseInt(storedEarned, 10) || 0 : 0;
          if (myOrders.length > currentEarned) {
            localStorage.setItem(`flame_lucky_bonus_earned_${acc.storageKey}`, String(myOrders.length));
          }
        }
      } catch {}
    }

    const spins = getSpinsData(acc.storageKey);
    setSpinsData(spins);
    setWonCoupons(getWonCoupons(acc.storageKey));

    if (spins.totalRemaining <= 0) {
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
      if (spins.totalRemaining <= 0) {
        setCooldownRemaining(getSecondsUntilMidnight());
      } else {
        setCooldownRemaining(0);
      }
    }, 1000);

    const handleAuth = () => {
      reloadAccountData();
      setWinningPrize(null);
    };
    const handleSpinsUpdated = () => {
      reloadAccountData();
    };
    window.addEventListener("authChanged", handleAuth);
    window.addEventListener("flame_lucky_spins_updated", handleSpinsUpdated);

    return () => {
      clearInterval(interval);
      window.removeEventListener("authChanged", handleAuth);
      window.removeEventListener("flame_lucky_spins_updated", handleSpinsUpdated);
    };
  }, [open, reloadAccountData]);

  const spinsRemaining = spinsData.totalRemaining;

  const formatCooldown = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
  };

  const finalizeWin = (targetPrize) => {
    setIsSpinning(false);
    setWinningPrize(targetPrize);

    const currentAcc = getCurrentAccount();
    recordSpinUsed(currentAcc.storageKey);
    const updatedSpins = getSpinsData(currentAcc.storageKey);
    setSpinsData(updatedSpins);

    if (updatedSpins.totalRemaining <= 0) {
      setCooldownRemaining(getSecondsUntilMidnight());
    }

    const { icon: _omittedIcon, ...safePrize } = targetPrize;
    const newVoucher = {
      ...safePrize,
      account: currentAcc.name,
      wonAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    setWonCoupons((prev) => {
      const updated = [newVoucher, ...prev.slice(0, 29)];
      localStorage.setItem(`flame_lucky_draw_vouchers_${currentAcc.storageKey}`, JSON.stringify(updated));
      return updated;
    });

    if (soundEnabled) {
      playWinSound(audioCtxRef);
    }

    confetti({
      particleCount: 140,
      spread: 85,
      origin: { y: 0.6 },
      colors: ["#EA580C", "#F59E0B", "#DC2626", "#10B981", "#6366F1", "#A855F7"],
    });

    toast.success(`🎉 Congratulations! You won ${targetPrize.label}!`);
  };

  // Kinetic draw handler for 9-Grid Fortune Matrix
  const handleGridDraw = () => {
    if (isSpinning || spinsRemaining <= 0) return;

    setIsSpinning(true);
    setWinningPrize(null);
    setHasCopied(false);

    const prizeIndex = Math.floor(Math.random() * PRIZES.length);
    const targetPrize = PRIZES[prizeIndex];

    const totalLaps = 4;
    const stepsToTarget = ((prizeIndex - activeGridIndex) % 8 + 8) % 8;
    const totalSteps = totalLaps * 8 + stepsToTarget;

    let currentStep = 0;
    let currentIndex = activeGridIndex;

    const runStep = () => {
      currentStep++;
      currentIndex = (currentIndex + 1) % 8;
      setActiveGridIndex(currentIndex);

      if (soundEnabled) {
        playTickSound(audioCtxRef);
      }

      if (currentStep >= totalSteps) {
        finalizeWin(targetPrize);
        return;
      }

      // Dynamic easing delay progression
      let delay = 45;
      const remainingSteps = totalSteps - currentStep;
      if (currentStep < 5) {
        delay = 140 - currentStep * 18;
      } else if (remainingSteps <= 10) {
        const decelerateDelays = [65, 85, 115, 155, 210, 280, 370, 480, 620, 780];
        const decelIdx = 10 - remainingSteps;
        delay = decelerateDelays[decelIdx] || 500;
      }

      animTimeoutRef.current = setTimeout(runStep, delay);
    };

    animTimeoutRef.current = setTimeout(runStep, 100);
  };

  // Wheel draw handler for Cyber Wheel mode
  const handleWheelDraw = () => {
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
      finalizeWin(targetPrize);
    }, 4500);
  };

  const handleDraw = () => {
    if (drawMode === "grid") {
      handleGridDraw();
    } else {
      handleWheelDraw();
    }
  };

  const handleCopyCode = async (code) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const el = document.createElement("textarea");
        el.value = code;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      setHasCopied(true);
      toast.success(`Promo code "${code}" copied to clipboard!`);
      setTimeout(() => setHasCopied(false), 2000);
    } catch {
      toast.info(`Promo code: ${code}`);
    }
  };

  const handleApplyToCart = (prize) => {
    applyCoupon({
      id: `lucky_${prize.code}_${prize.wonAt || Date.now()}`,
      code: prize.code,
      discount_type: prize.type,
      discount_value: prize.value,
      min_order_amount: prize.minOrder,
      description: `Won from Lucky Draw (${prize.label})`,
      isLuckyDraw: true,
      active: true,
    });
    toast.success(`Voucher "${prize.code}" applied to cart!`);
    onOpenChange(false);
    openCart();
  };

  if (!open) return null;

  const WinIcon = getPrizeIcon(winningPrize);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-start sm:justify-center p-2.5 sm:p-4 overflow-y-auto custom-scrollbar pt-[max(0.75rem,env(safe-area-inset-top,0.75rem))] pb-[max(1.75rem,env(safe-area-inset-bottom,1.75rem))]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !isSpinning && onOpenChange(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md touch-none"
        />

        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 12 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className="relative w-full max-w-[425px] max-h-[92vh] flex flex-col rounded-3xl bg-card border border-amber-500/30 shadow-[0_20px_60px_rgba(234,88,12,0.25)] text-card-foreground z-10 overflow-hidden my-auto"
        >
          {/* Pinned Sticky Header with Account and Controls */}
          <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-xl px-3.5 sm:px-5 pt-3.5 pb-2.5 border-b border-border/60 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="size-9 sm:size-10 rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-red-500 flex items-center justify-center text-white shadow-md shadow-orange-500/30 shrink-0">
                  <Sparkles className="size-4.5 sm:size-5" />
                </div>
                <div>
                  <h3 className="font-serif text-base sm:text-lg font-black text-foreground flex items-center gap-1.5">
                    Flame Lucky Draw
                    <Badge className="border border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-[8px] sm:text-[9px] font-black uppercase px-1.5 py-0 rounded-full">
                      +1 Spin/Order 🍕
                    </Badge>
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[10px] sm:text-xs text-muted-foreground">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.2 rounded-full font-bold text-[9px] sm:text-[10px]",
                        account.isLoggedIn
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
                          : "bg-secondary text-muted-foreground border border-border/60"
                      )}
                    >
                      <span className={cn("size-1.5 rounded-full", account.isLoggedIn ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground")} />
                      {account.isLoggedIn ? account.name : "Guest"}
                    </span>
                    <span>•</span>
                    <span className="font-extrabold text-amber-600 dark:text-amber-400 text-[10px] sm:text-[11px]">
                      {spinsRemaining > 0 ? `${spinsRemaining} spins left` : "0 spins left"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="size-8 sm:size-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary"
                  title={soundEnabled ? "Mute audio" : "Enable audio"}
                >
                  {soundEnabled ? <Volume2 className="size-3.5 sm:size-4" /> : <VolumeX className="size-3.5 sm:size-4 text-muted-foreground/50" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isSpinning}
                  onClick={() => onOpenChange(false)}
                  className="size-8 sm:size-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Modal Content Arena with Stable Fixed Height */}
          <div className="p-3.5 sm:p-5 pt-2 pb-4 h-[475px] sm:h-[495px] flex flex-col overflow-hidden">
            {/* Top ambient lighting glows */}
            <div className="absolute top-0 right-1/4 w-36 h-36 bg-gradient-to-br from-orange-500/15 to-transparent rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 w-36 h-36 bg-gradient-to-tr from-amber-500/15 to-transparent rounded-full blur-2xl pointer-events-none" />

            <div className="relative flex-1 flex flex-col min-h-0">
              {/* Navigation Tabs (Lucky Draw vs My Vouchers) */}
              <div className="flex items-center justify-between my-2.5 sm:my-3 gap-2">
              <div className="inline-flex items-center gap-1 p-0.5 rounded-full bg-secondary/70 border border-border/60">
                <button
                  type="button"
                  onClick={() => setViewHistory(false)}
                  className={cn(
                    "px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                    !viewHistory
                      ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Sparkles className="size-3" /> Lucky Draw
                </button>
                <button
                  type="button"
                  onClick={() => setViewHistory(true)}
                  className={cn(
                    "px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                    viewHistory
                      ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <History className="size-3" /> My Vouchers
                  {wonCoupons.length > 0 && (
                    <span
                      className={cn(
                        "min-w-4 h-4 px-1 rounded-full text-[8px] sm:text-[9px] font-black flex items-center justify-center",
                        viewHistory ? "bg-white/25 text-white" : "bg-primary/15 text-primary"
                      )}
                    >
                      {wonCoupons.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Mode Switcher: Fortune Grid vs Cyber Wheel */}
              {!viewHistory && (
                <div className="inline-flex items-center gap-1 p-0.5 rounded-full bg-secondary/50 border border-border/60">
                  <button
                    type="button"
                    onClick={() => setDrawMode("grid")}
                    disabled={isSpinning}
                    className={cn(
                      "px-2 sm:px-2.5 py-1 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer",
                      drawMode === "grid"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    title="3x3 Fortune Grid"
                  >
                    <Grid className="size-3" /> Grid
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrawMode("wheel")}
                    disabled={isSpinning}
                    className={cn(
                      "px-2 sm:px-2.5 py-1 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer",
                      drawMode === "wheel"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    title="Cyber Wheel"
                  >
                    <Disc3 className="size-3" /> Wheel
                  </button>
                </div>
              )}
            </div>

            {/* Order to earn bonus spins banner */}
            {!viewHistory && (
              <div className="w-full mb-2 sm:mb-2.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent border border-amber-500/25 flex items-center justify-between gap-1.5 text-[10px] sm:text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm shrink-0">🍕</span>
                  <span className="text-[10px] sm:text-[11px] font-medium text-amber-900 dark:text-amber-200 truncate">
                    Order to earn spins! <strong className="text-amber-600 dark:text-amber-400">+1 Spin/order</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[9px] sm:text-[10px] bg-secondary px-1.5 py-0.5 rounded-full border border-border/60 text-muted-foreground">
                    {spinsData.dailyRemaining} Free
                  </span>
                  <span className="text-[9px] sm:text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full border border-amber-500/30 font-bold">
                    +{spinsData.bonusRemaining} Orders
                  </span>
                </div>
              </div>
            )}

            {!viewHistory ? (
              <>
                {/* Main Interactive Draw Arena */}
                <div className="flex flex-col items-center justify-center py-1 sm:py-2">
                  {drawMode === "grid" ? (
                    <FortuneGrid
                      activeIndex={activeGridIndex}
                      isSpinning={isSpinning}
                      onDraw={handleDraw}
                      disabled={isSpinning || spinsRemaining <= 0}
                      spinsRemaining={spinsRemaining}
                    />
                  ) : (
                    <CyberWheel
                      rotation={rotation}
                      isSpinning={isSpinning}
                      onSpin={handleDraw}
                      disabled={isSpinning || spinsRemaining <= 0}
                      spinsRemaining={spinsRemaining}
                    />
                  )}
                </div>

                {/* Bottom CTA state: Cooldown or Draw button */}
                <div className="mt-2 shrink-0">
                  {spinsRemaining <= 0 ? (
                    <div className="w-full p-2.5 sm:p-3 rounded-2xl bg-secondary/60 border border-border/80 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xl shrink-0">🍕</span>
                        <div className="min-w-0">
                          <p className="font-bold text-[11px] text-foreground truncate">
                            Order pizzas to get +1 Bonus Draw!
                          </p>
                          <p className="text-[9px] text-muted-foreground truncate">
                            Free daily resets in: <span className="font-mono font-bold text-amber-500">{formatCooldown(cooldownRemaining)}</span>
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          onOpenChange(false);
                          navigate("/menu");
                        }}
                        className="h-8 px-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shrink-0 cursor-pointer shadow-sm"
                      >
                        Order Now
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={handleDraw}
                      disabled={isSpinning}
                      className="group relative w-full h-10 sm:h-11 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-red-500 hover:from-orange-600 hover:via-amber-600 hover:to-red-600 text-white font-black text-xs sm:text-sm shadow-lg shadow-orange-500/30 active:scale-[0.98] transition-all gap-2 overflow-hidden cursor-pointer"
                    >
                      <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 pointer-events-none" />
                      <Sparkles className="size-4" />
                      {drawMode === "grid" ? `DRAW NOW (${spinsRemaining} SPINS)` : `SPIN WHEEL (${spinsRemaining} SPINS)`}
                    </Button>
                  )}
                </div>

                {/* Win Celebration Full Overlay Page ("ពេល win វាចេញមួយ page ជាន់ពីលើទៀត កុំឲវាចុះក្រោម") */}
                <AnimatePresence>
                  {winningPrize && (
                    <motion.div
                      key="win-overlay"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-40 bg-zinc-950/85 backdrop-blur-md rounded-2xl flex items-center justify-center p-2.5 sm:p-4"
                    >
                      <motion.div
                        initial={{ scale: 0.85, opacity: 0, y: 16 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.88, opacity: 0, y: 12 }}
                        transition={{ type: "spring", damping: 22, stiffness: 320 }}
                        className="relative w-full max-w-sm rounded-2xl border-2 border-amber-500/50 bg-gradient-to-br from-zinc-900 via-amber-950/30 to-zinc-900 p-3.5 sm:p-4 shadow-2xl shadow-orange-500/30 text-center overflow-hidden"
                      >
                        {/* Notch cutouts */}
                        <div className="absolute -left-3 top-1/2 -translate-y-1/2 size-5 rounded-full bg-card border border-amber-500/40" />
                        <div className="absolute -right-3 top-1/2 -translate-y-1/2 size-5 rounded-full bg-card border border-amber-500/40" />

                        {/* Close button on top-right of Win Card */}
                        <button
                          type="button"
                          onClick={() => setWinningPrize(null)}
                          className="absolute top-2.5 right-2.5 size-7 rounded-full bg-secondary/80 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer z-10"
                          title="Close"
                        >
                          <X className="size-3.5" />
                        </button>

                        <div className="flex flex-col items-center text-center">
                          <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30 mb-2">
                            <PartyPopper className="size-3 text-amber-400" />
                            Congratulations!
                          </div>

                          <div className={cn("size-11 sm:size-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg mb-2", winningPrize.bgGradient)}>
                            <WinIcon className="size-5 sm:size-6 text-white" />
                          </div>

                          <TierBadge tier={winningPrize.tier} className="mb-1" />
                          <h4 className="font-serif text-lg sm:text-xl font-black text-foreground tracking-tight mb-1">
                            {winningPrize.label}
                          </h4>

                          <div className="my-1.5 px-3 py-1.5 rounded-xl bg-background/90 border border-border/80 flex items-center justify-center gap-2">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Promo Code:</span>
                            <span className="font-mono font-black text-sm sm:text-base text-primary tracking-wider select-all">
                              {winningPrize.code}
                            </span>
                          </div>

                          <p className="text-[10px] sm:text-[11px] text-muted-foreground mb-2.5">
                            Valid for 7 days on orders over ${winningPrize.minOrder}.
                          </p>

                          <div className="w-full space-y-2 mt-1">
                            <Button
                              size="sm"
                              onClick={() => handleApplyToCart(winningPrize)}
                              className="w-full h-9 sm:h-10 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs sm:text-sm font-black gap-1.5 shadow-md shadow-orange-500/25 cursor-pointer"
                            >
                              <ShoppingBag className="size-4" /> Apply Coupon to Cart Now
                            </Button>
                            <div className="grid grid-cols-2 gap-2 w-full">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCopyCode(winningPrize.code)}
                                className="h-8 sm:h-9 rounded-xl border-border/80 text-xs font-bold gap-1.5 hover:bg-secondary cursor-pointer"
                              >
                                {hasCopied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                                {hasCopied ? "Copied" : "Copy Code"}
                              </Button>
                              {spinsRemaining > 0 ? (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => setWinningPrize(null)}
                                  className="h-8 sm:h-9 rounded-xl border border-amber-500/30 text-xs font-bold gap-1.5 hover:bg-amber-500/15 cursor-pointer"
                                >
                                  <RotateCw className="size-3.5 text-amber-500" />
                                  Draw Again ({spinsRemaining})
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => onOpenChange(false)}
                                  className="h-8 sm:h-9 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
                                >
                                  Close
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              /* My Vouchers List Tab */
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col min-h-0 h-full py-1">
                <h4 className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center justify-between shrink-0">
                  <span className="flex items-center gap-1.5">
                    <Ticket className="size-3.5" />
                    Your Won Vouchers
                  </span>
                  <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    {wonCoupons.length} total • {account.name}
                  </span>
                </h4>
                {wonCoupons.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border-2 border-dashed border-border/60 bg-secondary/20 flex-1 flex flex-col items-center justify-center">
                    <div className="relative inline-block mb-3">
                      <Gift className="size-10 mx-auto text-muted-foreground/40" />
                      <Sparkles className="size-4 absolute -top-1 -right-2 text-amber-500/40" />
                    </div>
                    <p className="text-xs font-semibold text-muted-foreground">
                      No vouchers yet for {account.name}. Tap Draw to win your first pizza discount!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-0">
                    {wonCoupons.map((voucher, i) => {
                      const Icon = getPrizeIcon(voucher);
                      const wonDate = voucher?.wonAt ? new Date(voucher.wonAt) : null;
                      const expDate = voucher?.expiresAt ? new Date(voucher.expiresAt) : null;
                      const wonStr = wonDate && !isNaN(wonDate.getTime()) ? wonDate.toLocaleDateString() : null;
                      const expStr = expDate && !isNaN(expDate.getTime()) ? expDate.toLocaleDateString() : "Valid 7 days";

                      return (
                        <motion.div
                          key={`${voucher?.code || 'v'}-${voucher?.wonAt || i}-${i}`}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.05, 0.3) }}
                          className="relative rounded-2xl border border-border/60 bg-gradient-to-br from-secondary/50 to-secondary/20 hover:border-amber-500/40 hover:shadow-md hover:shadow-orange-500/5 transition-all group overflow-hidden"
                        >
                          <div className={cn("absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b", voucher?.bgGradient || "from-orange-500 to-amber-500")} />
                          <div className="absolute -left-2 top-1/2 -translate-y-1/2 size-4 rounded-full bg-card border border-border/60" />
                          <div className="absolute -right-2 top-1/2 -translate-y-1/2 size-4 rounded-full bg-card border border-border/60" />

                          <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2.5">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className={cn("size-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm shrink-0", voucher?.bgGradient || "from-orange-500 to-amber-500")}>
                                <Icon className="size-5 text-white" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="font-serif text-sm font-bold text-foreground truncate">{voucher?.label || "Prize Voucher"}</span>
                                  <TierBadge tier={voucher?.tier} />
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                  <span className="font-mono font-bold text-primary">{voucher?.code}</span>
                                  {voucher?.minOrder && (
                                    <>
                                      <span>•</span>
                                      <span>Min. ${voucher.minOrder}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleCopyCode(voucher?.code)}
                                className="size-8 rounded-lg hover:bg-secondary cursor-pointer"
                                title="Copy Code"
                              >
                                <Copy className="size-3.5 text-muted-foreground" />
                              </Button>
                              <Button
                                size="sm"
                                disabled={Boolean(voucher?.used)}
                                onClick={() => handleApplyToCart(voucher)}
                                className={cn(
                                  "h-8 px-3 rounded-lg text-xs font-bold shadow-sm cursor-pointer",
                                  voucher?.used
                                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                                    : "bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600"
                                )}
                              >
                                {voucher?.used ? "Used" : "Apply"}
                              </Button>
                            </div>
                          </div>

                          <div className="mx-4 border-t border-dashed border-border/60" />
                          <div className="px-4 py-2 text-[10px] text-muted-foreground flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              {wonStr ? `Won ${wonStr}` : "Won Recently"}
                            </span>
                            <span className="font-semibold">Expires {expStr}</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  </AnimatePresence>
  );
}

export default LuckyDrawModal;
