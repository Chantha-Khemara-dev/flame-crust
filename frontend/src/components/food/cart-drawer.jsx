"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  X,
  ArrowRight,
  Sparkles,
  Ticket,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PaymentForm } from "./payment-form.jsx";
import { AvailableCoupons } from "./available-coupons.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import { triggerFoodRefresh } from "@/lib/food-api";

const DELIVERY_FEE = 3.99;

export function CartDrawer() {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    isOpen, 
    closeCart, 
    lines, 
    increment, 
    decrement, 
    removeItem, 
    clear, 
    coupon, 
    applyCoupon, 
    clearCoupon 
  } = useCart();
  
  const [mounted, setMounted] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Validate coupon belongs to currently active account
  useEffect(() => {
    if (coupon && coupon.accountKey) {
      import("@/lib/cart-store").then(({ getCurrentAccountKey }) => {
        if (coupon.accountKey !== getCurrentAccountKey()) {
          if (typeof clearCoupon === "function") clearCoupon();
        }
      });
    }
  }, [isOpen, coupon]);

  // Reset payment view when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setPaymentOpen(false);
    }
  }, [isOpen]);

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
  const deliveryFee = (isCouponValid && coupon.discount_type === "FREE_DELIVERY") ? 0 : (subtotal === 0 ? 0 : DELIVERY_FEE);
  const total = subtotal + deliveryFee;

  const handleCheckout = () => {
    const stored = localStorage.getItem("customerAuth");
    if (!stored) {
      toast.error("Please sign in before completing your order.");
      closeCart();
      navigate("/login");
      return;
    }
    setPaymentOpen(true);
  };

  const handlePaymentSuccess = async (paymentDetails) => {
    try {
      const { create } = await import("@/lib/api");
      let customer = null;
      try {
        const stored = localStorage.getItem("customerAuth");
        if (stored) customer = JSON.parse(stored);
      } catch (e) {}

      let customerId = customer?.id;
      if (!customerId) {
        toast.error("Please sign in to place order.");
        navigate("/login");
        return;
      }

      let addressId = null;
      try {
        const addressRes = await create("addresses", {
          customer_id: customerId,
          label: "Delivery",
          address_line: paymentDetails.address || "Phnom Penh",
          city: paymentDetails.city || "Phnom Penh",
          notes: paymentDetails.notes || null,
          is_default: true
        });
        addressId = addressRes?.id;
      } catch (e) {
        console.warn("Address create warning:", e);
      }

      const isDigitalPaid = ["CARD", "KHQR", "ABA_PAY"].includes(paymentDetails.method);
      const orderStatus = isDigitalPaid ? "CONFIRMED" : "PENDING";
      const paymentStatus = isDigitalPaid ? "PAID" : "PENDING";

      const orderNumber = `FC-${Date.now()}`;
      const orderRes = await create("orders", {
        order_number: orderNumber,
        customer_id: customerId,
        address_id: addressId,
        coupon_id: coupon?.id || null,
        status: orderStatus,
        order_type: "DELIVERY",
        subtotal: Number(subtotal.toFixed(2)),
        discount_amount: Number(discount.toFixed(2)),
        delivery_fee: Number(deliveryFee.toFixed(2)),
        driver_commission: 0,
        total: Number(total.toFixed(2)),
        notes: paymentDetails.notes || `Payment: ${paymentDetails.method}`
      });

      const targetOrderId = orderRes.id;

      await Promise.all(
        lines.map((line) =>
          create("order_items", {
            order_id: targetOrderId,
            product_id: Number(line.originalId || line.id) || 1,
            product_name: line.name,
            quantity: line.qty,
            unit_price: Number(line.price.toFixed(2)),
            line_total: Number((line.price * line.qty).toFixed(2)),
            status: "PENDING",
            options: line.selectedOptions ? JSON.stringify(line.selectedOptions) : null
          })
        )
      );

      // Trigger real-time auto-update of trending scores and rankings across active tabs
      try {
        triggerFoodRefresh();
      } catch (e) {
        console.warn("Error triggering food refresh:", e);
      }

      const dbMethod = ["CASH", "CARD", "ABA_PAY", "WING"].includes(paymentDetails.method) ? paymentDetails.method : "KHQR";

      await create("payments", {
        order_id: targetOrderId,
        method: dbMethod,
        status: paymentStatus,
        amount: Number(total.toFixed(2)),
        transaction_id: isDigitalPaid ? `TXN-${Date.now()}` : null
      });

      const confirmationState = {
        orderId: targetOrderId,
        total: Number(total.toFixed(2)),
        itemCount,
        paymentMethod: paymentDetails.method,
        address: `${paymentDetails.address}, ${paymentDetails.city || "Phnom Penh"}`
      };

      setPaymentOpen(false);
      closeCart();
      clear();
      if (typeof clearCoupon === "function") clearCoupon();

      toast.success("Order Placed Successfully!");
      window.dispatchEvent(new CustomEvent("orderPlaced"));

      navigate("/order-confirmation", {
        replace: true,
        state: confirmationState
      });
    } catch (error) {
      console.error("Payment submission failed:", error);
      toast.error("Failed to place order: " + (error.message || "Unknown error"));
    }
  };

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setIsApplying(true);
    setCouponError("");
    try {
      const targetCode = couponCode.trim().toUpperCase();

      // Check won Lucky Draw vouchers first
      try {
        const { getCurrentAccount, getWonCoupons, formatWonVouchersAsCoupons } = await import("./lucky-draw-modal.jsx");
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

      // Reject hyphenated personal vouchers not belonging to this account
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
        const { getCurrentAccount } = await import("./lucky-draw-modal.jsx");
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

  if (!mounted) return null;
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "linear" }}
            onClick={closeCart}
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs touch-none overscroll-contain"
          />

          {/* Slide-out Side Drawer on Laptop */}
          <motion.aside
            initial={{ x: isMobile ? 0 : "100%", y: isMobile ? "100%" : 0 }}
            animate={{ x: 0, y: 0 }}
            exit={{ x: isMobile ? 0 : "100%", y: isMobile ? "100%" : 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full sm:max-w-md lg:max-w-lg bg-card shadow-2xl sm:border-l border-border/70 flex flex-col will-change-transform transform-gpu rounded-t-[2rem] sm:rounded-t-none sm:rounded-l-[2rem] overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 pt-5 pb-4 border-b border-border/60 shrink-0 bg-card">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center size-10 rounded-full bg-primary/15 text-primary">
                  <ShoppingBag className="size-5" />
                </span>
                <div>
                  <h3 className="font-serif text-xl font-bold text-foreground tracking-tight">Your Order</h3>
                  <p className="text-xs font-semibold text-primary">
                    {itemCount} {itemCount === 1 ? "item" : "items"} in cart
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {lines.length > 0 && !paymentOpen && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      clear();
                      toast.info("Cart cleared");
                    }}
                    className="text-muted-foreground hover:text-destructive text-xs cursor-pointer"
                  >
                    <Trash2 className="size-4 mr-1" />
                    Clear
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeCart}
                  className="rounded-full hover:bg-secondary cursor-pointer"
                >
                  <X className="size-5" />
                </Button>
              </div>
            </div>

            {/* Embedded Payment View */}
            {paymentOpen ? (
              <PaymentForm
                lines={lines}
                grossSubtotal={grossSubtotal}
                discount={discount}
                deliveryFee={deliveryFee}
                total={total}
                coupon={coupon}
                onApplyCoupon={(c) => applyCoupon(c)}
                onRemoveCoupon={() => typeof clearCoupon === "function" && clearCoupon()}
                onBack={() => setPaymentOpen(false)}
                onSuccess={handlePaymentSuccess}
              />
            ) : lines.length === 0 ? (
              /* Empty State */
              <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4 pb-12">
                <div className="relative">
                  <div className="size-24 rounded-full bg-secondary flex items-center justify-center">
                    <ShoppingBag className="size-10 text-muted-foreground" />
                  </div>
                  <div className="absolute -top-1 -right-1 size-7 rounded-full bg-primary flex items-center justify-center text-white">
                    <Sparkles className="size-3.5" />
                  </div>
                </div>
                <h4 className="font-serif text-2xl font-bold text-foreground">Your cart is empty</h4>
                <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                  Looks like you haven't added any pizza yet. Your delicious cravings are waiting.
                </p>
                <Button
                  onClick={() => {
                    closeCart();
                    navigate("/menu");
                  }}
                  className="mt-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-6 font-bold text-sm shadow-md cursor-pointer"
                >
                  Browse Menu
                  <ArrowRight className="size-4 ml-1.5" />
                </Button>
              </div>
            ) : (
              /* Items List + Summary */
              <>
                <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-3 no-scrollbar">
                  <AnimatePresence initial={false}>
                    {lines.map((line) => (
                      <motion.div
                        key={line.id}
                        layout="position"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex gap-3.5 p-3.5 rounded-2xl bg-secondary/30 border border-border/50 hover:border-primary/20 transition-all group shadow-2xs"
                      >
                        <div className="size-16 rounded-xl overflow-hidden flex-shrink-0 bg-secondary border border-border/40">
                          <img
                            src={line.image}
                            alt={line.name}
                            className="size-full object-cover"
                          />
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div className="flex justify-between items-start gap-1">
                            <h4 className="font-bold text-foreground text-xs sm:text-sm leading-snug truncate">{line.name}</h4>
                            <button
                              onClick={() => removeItem(line.id)}
                              className="text-muted-foreground hover:text-destructive transition-colors p-1 -m-1 cursor-pointer"
                              aria-label={`Remove ${line.name}`}
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>

                          {line.description && (
                            <p className="text-[11px] text-muted-foreground truncate">{line.description}</p>
                          )}

                          <div className="flex items-center justify-between pt-1 mt-1 border-t border-border/30">
                            <div className="flex items-center gap-1 rounded-full bg-secondary border border-border/60 p-0.5">
                              <button
                                onClick={() => decrement(line.id)}
                                className="size-6 rounded-full bg-background hover:bg-primary hover:text-white text-foreground flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="size-3" />
                              </button>
                              <span className="min-w-5 text-center font-bold text-xs text-foreground">
                                {line.qty}
                              </span>
                              <button
                                onClick={() => increment(line.id)}
                                className="size-6 rounded-full bg-background hover:bg-primary hover:text-white text-foreground flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                                aria-label="Increase quantity"
                              >
                                <Plus className="size-3" />
                              </button>
                            </div>

                            <span className="font-serif font-bold text-xs sm:text-sm text-primary">
                              ${(line.price * line.qty).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Coupon & Promo Section */}
                  {coupon ? (
                    <div className={cn(
                      "mt-3.5 p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 shadow-2xs",
                      isCouponValid 
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100" 
                        : "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100"
                    )}>
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className={cn(
                          "size-8 rounded-xl flex items-center justify-center shrink-0",
                          isCouponValid ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                        )}>
                          <Ticket className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-xs sm:text-sm tracking-wider uppercase">{coupon.code}</span>
                            {coupon.isLuckyDraw && (
                              <span className="text-[9px] bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.2 rounded-full font-bold">
                                ✨ Lucky
                              </span>
                            )}
                            {isCouponValid && (
                              <span className="text-[9px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded-full font-bold">
                                Applied
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] opacity-80 mt-0.5 truncate font-medium">
                            {coupon.discount_type === "FREE_DELIVERY"
                              ? "Free Delivery on your order"
                              : coupon.discount_type === "PERCENTAGE"
                                ? `${coupon.discount_value}% OFF (-$${discount.toFixed(2)})`
                                : `$${coupon.discount_value} OFF (-$${discount.toFixed(2)})`}
                          </p>
                          {!isCouponValid && coupon.min_order_amount && (
                            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                              Need ${(Number(coupon.min_order_amount) - grossSubtotal).toFixed(2)} more for min. order (${coupon.min_order_amount})
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <AvailableCoupons
                          onSelectCoupon={(c) => applyCoupon(c)}
                          currentCoupon={coupon}
                          subtotal={grossSubtotal}
                          trigger={
                            <button
                              type="button"
                              className="text-[11px] font-semibold text-primary hover:underline px-2 py-1 rounded-md hover:bg-primary/5 transition-colors cursor-pointer"
                            >
                              Change
                            </button>
                          }
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof clearCoupon === "function") clearCoupon();
                            toast.info("Coupon removed");
                          }}
                          className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                          title="Remove Coupon"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Section in Drawer */}
                <div className="border-t border-border/60 px-5 sm:px-6 pt-3.5 pb-6 bg-card space-y-3">
                  {/* Price Breakdown */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-muted-foreground font-medium">
                      <span>Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})</span>
                      <span className="font-semibold text-foreground">${grossSubtotal.toFixed(2)}</span>
                    </div>

                    {discount > 0 && (
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                        <span className="flex items-center gap-1">
                          <Ticket className="size-3" /> Coupon ({coupon?.code})
                        </span>
                        <span>-${discount.toFixed(2)}</span>
                      </div>
                    )}

                    {coupon?.discount_type === "FREE_DELIVERY" && (
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                        <span>Delivery</span>
                        <span className="uppercase text-[10px] bg-emerald-500/15 px-1.5 py-0.5 rounded-md font-bold">FREE</span>
                      </div>
                    )}

                    <div className="flex justify-between items-baseline font-bold text-sm pt-2 border-t border-border/40">
                      <span className="text-foreground">Total</span>
                      <span className="font-serif text-2xl font-bold text-primary">${subtotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Proceed to Payment in Drawer */}
                  <Button
                    onClick={handleCheckout}
                    className="w-full h-12 rounded-full bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 text-white font-bold text-sm shadow-md shadow-primary/20 cursor-pointer active:scale-98 transition-all"
                  >
                    Proceed to Payment (${subtotal.toFixed(2)})
                    <ArrowRight className="size-4 ml-1.5" />
                  </Button>

                  <p className="text-center text-[10px] text-muted-foreground">
                    🔒 Secure checkout · Hot delivery in 25–35 min
                  </p>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export default CartDrawer;
