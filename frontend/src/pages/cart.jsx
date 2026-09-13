"use client";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Tag,
  Ticket,
  X,
  Loader2,
} from "lucide-react";
import { AvailableCoupons } from "@/components/food/available-coupons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/food/navbar";
import { Footer } from "@/components/food/footer";
import { EmptyState } from "@/components/shared/empty-state";
import { PageTransition } from "@/components/shared/page-transition";
import { useCart } from "@/lib/cart-store";
import { list } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DELIVERY_FEE = 3.99;

function CartPage() {
  const navigate = useNavigate();
  const { 
    lines, 
    increment, 
    decrement, 
    removeItem, 
    clear, 
    closeCart,
    coupon,
    applyCoupon,
    clearCoupon
  } = useCart();

  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    closeCart();
  }, [closeCart]);

  const grossSubtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const itemCount = lines.reduce((s, l) => s + l.qty, 0);
  const isCouponValid = coupon && (!coupon.min_order_amount || grossSubtotal >= Number(coupon.min_order_amount));
  const discount = isCouponValid
    ? coupon.discount_type === "PERCENTAGE"
      ? Math.min(grossSubtotal, (grossSubtotal * Number(coupon.discount_value)) / 100)
      : coupon.discount_type === "FREE_DELIVERY"
        ? 0
        : Math.min(grossSubtotal, Number(coupon.discount_value))
    : 0;
  const subtotal = grossSubtotal - discount;
  const total = subtotal;

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setIsApplying(true);
    setCouponError("");
    try {
      const targetCode = couponCode.trim().toUpperCase();

      // Check won Lucky Draw vouchers first
      try {
        const { getCurrentAccount, getWonCoupons, formatWonVouchersAsCoupons } = await import("@/components/food/lucky-draw-modal.jsx");
        const acc = getCurrentAccount();
        const rawWon = getWonCoupons(acc.storageKey);
        const wonCouponsList = formatWonVouchersAsCoupons(rawWon);
        const wonMatch = wonCouponsList.find((v) => v.code === targetCode);

        if (wonMatch) {
          if (wonMatch.isUsed) {
            setCouponError("You have already used this Lucky Draw voucher.");
            return;
          }
          if (wonMatch.isExpired) {
            setCouponError("This Lucky Draw voucher has expired.");
            return;
          }
          const minOrder = Number(wonMatch.min_order_amount || 0);
          if (minOrder > 0 && grossSubtotal < minOrder) {
            setCouponError(`Minimum order amount is $${minOrder.toFixed(2)}`);
            return;
          }

          applyCoupon(wonMatch, acc.storageKey);
          setCouponCode("");
          toast.success(`🎉 Lucky Draw voucher "${wonMatch.code}" applied!`);
          return;
        }
      } catch (e) {}

      if (targetCode.includes("-")) {
        setCouponError("This voucher belongs to another account or is invalid.");
        return;
      }

      const { list } = await import("@/lib/api");
      const coupons = await list("coupons");
      const found = coupons.find(c => c.code.toUpperCase() === targetCode);
      if (!found || !found.active) {
        setCouponError("Invalid or inactive promo code.");
      } else if (found.min_order_amount && grossSubtotal < Number(found.min_order_amount)) {
        setCouponError(`Minimum order amount is $${Number(found.min_order_amount).toFixed(2)}`);
      } else {
        const { getCurrentAccount } = await import("@/components/food/lucky-draw-modal.jsx");
        const acc = getCurrentAccount();
        applyCoupon(found, acc?.storageKey || "guest");
        setCouponCode("");
        toast.success(`Promo code "${found.code}" applied!`);
      }
    } catch {
      setCouponError("Failed to apply code.");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1 pt-[calc(3.75rem+env(safe-area-inset-top))] sm:pt-24 pb-52 sm:pb-16">
        <PageTransition>
          <div className="mx-auto max-w-3xl px-3 sm:px-6 lg:px-8 py-2 sm:py-6">
            {/* Top Title (Mobile) */}
            <div className="flex sm:hidden items-center gap-3 mb-4">
              <button
                onClick={() => navigate("/menu")}
                className="size-9 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
                aria-label="Back to menu"
              >
                <ArrowLeft className="size-5" />
              </button>
              <h1 className="font-serif text-xl font-bold text-foreground">Your Cart</h1>
              <span className="ml-auto text-xs text-muted-foreground font-medium">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </span>
            </div>
            {/* Top Title (Desktop) */}
            <div className="hidden sm:flex items-center justify-between border-b border-border/40 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate("/menu")}
                  className="size-9 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
                  aria-label="Back to menu"
                >
                  <ArrowLeft className="size-5" />
                </button>
                <h1 className="font-serif text-3xl font-bold text-foreground">Your Cart</h1>
              </div>
              <span className="text-sm text-muted-foreground font-medium">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </span>
            </div>

            {lines.length === 0 ? (
              <EmptyState
                icon={ShoppingBag}
                title="Your cart is empty"
                description="Looks like you haven't added anything yet. Let's fix that — your cravings are waiting."
                actionLabel="Browse Menu"
                onAction={() => navigate("/menu")}
                className="py-16"
              />
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {/* 1. Cart Items List */}
                <div className="bg-card/70 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-border/70 p-3 sm:p-5 divide-y divide-border/40 shadow-xs">
                  <div className="flex items-center justify-between pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                    <span>Selected Items ({itemCount})</span>
                    <button
                      onClick={() => {
                        clear();
                        toast.info("Cart cleared");
                      }}
                      className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="size-3" /> Clear all
                    </button>
                  </div>

                  <AnimatePresence initial={false}>
                    {lines.map((line) => (
                      <motion.div
                        key={line.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        className="py-3 sm:py-4 flex items-center gap-3 sm:gap-4"
                      >
                        {/* Food Image */}
                        <Link
                          to={`/product/${line.originalId || line.id}`}
                          className="size-16 sm:size-20 rounded-xl sm:rounded-2xl overflow-hidden flex-shrink-0 bg-secondary border border-border/50"
                        >
                          <img
                            src={line.image}
                            alt={line.name}
                            className="w-full h-full object-cover"
                          />
                        </Link>

                        {/* Title & Options */}
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/product/${line.originalId || line.id}`}
                            className="font-bold text-xs sm:text-sm text-foreground hover:text-primary transition-colors truncate block"
                          >
                            {line.name}
                          </Link>
                          {line.description && (
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                              {line.description}
                            </p>
                          )}
                          <p className="font-serif font-bold text-xs sm:text-sm text-primary mt-1">
                            ${Number(line.price).toFixed(2)}
                          </p>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                          <div className="flex items-center rounded-full bg-secondary/80 border border-border/60 p-0.5">
                            <button
                              onClick={() => decrement(line.id)}
                              className="size-7 rounded-full bg-background hover:bg-primary hover:text-white text-foreground flex items-center justify-center transition-colors shadow-xs"
                              aria-label="Decrease"
                            >
                              <Minus className="size-3" />
                            </button>
                            <span className="min-w-6 text-center font-bold text-xs text-foreground">
                              {line.qty}
                            </span>
                            <button
                              onClick={() => increment(line.id)}
                              className="size-7 rounded-full bg-background hover:bg-primary hover:text-white text-foreground flex items-center justify-center transition-colors shadow-xs"
                              aria-label="Increase"
                            >
                              <Plus className="size-3" />
                            </button>
                          </div>

                          <button
                            onClick={() => removeItem(line.id)}
                            className="p-1 text-muted-foreground hover:text-destructive transition-colors rounded-full hover:bg-destructive/10"
                            aria-label={`Remove ${line.name}`}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* 2. Coupon & Promo Section */}
                {coupon && (
                  <div className="bg-card/70 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-border/70 p-3 sm:p-5 shadow-xs space-y-3">
                    <div className={cn(
                      "p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3",
                      isCouponValid 
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100" 
                        : "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100"
                    )}>
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={cn(
                          "size-9 rounded-xl flex items-center justify-center shrink-0",
                          isCouponValid ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                        )}>
                          <Ticket className="size-4.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-sm tracking-wider uppercase">{coupon.code}</span>
                            {coupon.isLuckyDraw && (
                              <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold">
                                ✨ Lucky Prize
                              </span>
                            )}
                            {isCouponValid && (
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                                Applied
                              </span>
                            )}
                          </div>
                          <p className="text-xs opacity-80 mt-0.5 truncate font-medium">
                            {coupon.discount_type === "FREE_DELIVERY"
                              ? "Free Delivery on your order"
                              : coupon.discount_type === "PERCENTAGE"
                                ? `${coupon.discount_value}% OFF (-$${discount.toFixed(2)})`
                                : `$${coupon.discount_value} OFF (-$${discount.toFixed(2)})`}
                          </p>
                          {!isCouponValid && coupon.min_order_amount && (
                            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                              Need ${(Number(coupon.min_order_amount) - grossSubtotal).toFixed(2)} more for min. order (${coupon.min_order_amount})
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <AvailableCoupons
                          onSelectCoupon={(c) => applyCoupon(c)}
                          currentCoupon={coupon}
                          subtotal={grossSubtotal}
                          trigger={
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-full text-xs h-7 px-3 border-primary/30 text-primary hover:bg-primary/10 font-semibold cursor-pointer"
                            >
                              Change
                            </Button>
                          }
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof clearCoupon === "function") clearCoupon();
                            toast.info("Coupon removed");
                          }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                          title="Remove Coupon"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Desktop Checkout Button (Hidden on Mobile) */}
                <div className="hidden sm:block pt-2">
                  <Button
                    onClick={() => navigate("/checkout")}
                    className="w-full h-12 rounded-full bg-gradient-to-r from-primary to-orange-500 text-white font-bold text-base shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-98 transition-all"
                  >
                    Proceed to Checkout (${total.toFixed(2)})
                    <ArrowRight className="size-5 ml-1.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </PageTransition>
      </main>

      {/* Sticky Bottom Floating Checkout Card for Mobile (Floating seamlessly above mobile bottom nav) */}
      {lines.length > 0 && (
        <div className="sm:hidden fixed bottom-[calc(max(0.75rem,env(safe-area-inset-bottom,0px))+4.75rem)] inset-x-3 z-30 pointer-events-none select-none">
          <div className="pointer-events-auto max-w-md mx-auto bg-card/90 dark:bg-card/95 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.12] ring-1 ring-white/30 dark:ring-white/5 shadow-[0_10px_35px_rgba(0,0,0,0.15)] rounded-2xl p-2.5 px-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                Total ({itemCount} {itemCount === 1 ? "item" : "items"})
              </p>
              <p className="font-serif text-2xl font-bold text-foreground leading-tight">
                ${total.toFixed(2)}
              </p>
            </div>
            <Button
              onClick={() => navigate("/checkout")}
              className="h-11 px-6 rounded-xl bg-gradient-to-r from-primary to-orange-500 text-white font-bold text-sm shadow-md shadow-primary/30 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Checkout</span>
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CartPage;
