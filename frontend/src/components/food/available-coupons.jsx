import { useState, useEffect } from "react";
import { Ticket, Loader2, Sparkles, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { list } from "@/lib/api";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCart } from "@/lib/cart-store";
import { cn } from "@/lib/utils";
import {
  getCurrentAccount,
  getWonCoupons,
  formatWonVouchersAsCoupons,
  getPrizeIcon,
  TierBadge,
} from "./lucky-draw-modal.jsx";

export function AvailableCoupons({ 
  onSelectCoupon, 
  currentCoupon, 
  subtotal = 0, 
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen 
}) {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const [couponTab, setCouponTab] = useState("ALL"); // "ALL", "LUCKY", "PROMO"

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen : setInternalOpen;

  useEffect(() => {
    const handleGlobalOpen = () => setOpen(true);
    window.addEventListener("openAvailableCouponsModal", handleGlobalOpen);
    return () => window.removeEventListener("openAvailableCouponsModal", handleGlobalOpen);
  }, [setOpen]);

  useEffect(() => {
    if (open) {
      loadCoupons();
    }
  }, [open]);

  useEffect(() => {
    const handleCouponsChanged = () => {
      if (open) loadCoupons();
    };
    window.addEventListener("flame_coupons_updated", handleCouponsChanged);
    window.addEventListener("couponsChanged", handleCouponsChanged);
    return () => {
      window.removeEventListener("flame_coupons_updated", handleCouponsChanged);
      window.removeEventListener("couponsChanged", handleCouponsChanged);
    };
  }, [open]);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const data = await list("coupons");
      // Only show public promo codes from DB (codes without hyphens). Personal lucky draw vouchers contain '-' and are private to the winning account.
      let activeCoupons = data.filter(c => 
        c.active && 
        (c.usage_limit === null || c.used_count < c.usage_limit) &&
        !String(c.code).includes("-")
      );

      // Mark already used coupons for the current user instead of removing them
      try {
        const auth = localStorage.getItem("customerAuth");
        if (auth) {
          const customer = JSON.parse(auth);
          if (customer && customer.id) {
            const usages = await list("coupon_usages");
            const usedCouponIds = usages
              .filter(u => String(u.customer_id) === String(customer.id))
              .map(u => String(u.coupon_id));
            
            activeCoupons = activeCoupons.map(c => {
              if (usedCouponIds.includes(String(c.id))) {
                return { ...c, isUsed: true };
              }
              return c;
            });
          }
        }
      } catch(e) {
        console.warn("Failed to check coupon usages", e);
      }

      // Merge ONLY the CURRENT customer's won Lucky Draw vouchers
      try {
        const acc = getCurrentAccount();
        const rawWon = getWonCoupons(acc.storageKey);
        const luckyCoupons = formatWonVouchersAsCoupons(rawWon);

        const luckyCodes = new Set(luckyCoupons.map((lc) => lc.code.toUpperCase()));
        const remainingDbCoupons = activeCoupons.filter((c) => !luckyCodes.has(String(c.code).toUpperCase()));

        setCoupons([...luckyCoupons, ...remainingDbCoupons]);
      } catch (e) {
        setCoupons(activeCoupons);
      }
    } catch (err) {
      console.error(err);
      try {
        const acc = getCurrentAccount();
        const rawWon = getWonCoupons(acc.storageKey);
        setCoupons(formatWonVouchersAsCoupons(rawWon));
      } catch {
        toast.error("Failed to load coupons");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (coupon) => {
    const acc = getCurrentAccount();
    const couponWithAcc = {
      ...coupon,
      accountKey: acc.storageKey
    };
    if (typeof onSelectCoupon === "function") {
      onSelectCoupon(couponWithAcc);
    } else {
      try {
        useCart.getState().applyCoupon(couponWithAcc);
        toast.success(`Coupon "${coupon.code}" applied to cart!`);
        useCart.getState().openCart();
      } catch (e) {
        console.warn(e);
      }
    }
    setOpen(false);
  };

  const luckyCount = coupons.filter(c => c.isLuckyDraw || String(c.code).includes("-")).length;
  const promoCount = coupons.filter(c => !c.isLuckyDraw && !String(c.code).includes("-")).length;

  const displayedCoupons = coupons.filter(c => {
    const isLucky = c.isLuckyDraw || String(c.code).includes("-");
    if (couponTab === "LUCKY") return isLucky;
    if (couponTab === "PROMO") return !isLucky;
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      {!trigger && trigger !== null && !isControlled && (
        <DialogTrigger asChild>
          <button type="button" className="text-[12px] font-medium text-primary hover:underline flex items-center gap-1.5 cursor-pointer">
            <Ticket className="size-3.5" /> View Available Coupons
          </button>
        </DialogTrigger>
      )}
      <DialogContent className="w-[92vw] sm:max-w-md max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background rounded-3xl border border-border/80 z-[110]">
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/60 shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="font-serif text-lg sm:text-xl flex items-center gap-2">
              <Ticket className="size-5 text-primary" /> Available Coupons
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Select a promo code or Lucky Draw voucher to apply discount.
          </DialogDescription>

          {/* Filter tabs if both Lucky prizes & promos exist */}
          {luckyCount > 0 && promoCount > 0 && (
            <div className="flex items-center gap-1.5 pt-2">
              <button
                type="button"
                onClick={() => setCouponTab("ALL")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  couponTab === "ALL"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                All ({coupons.length})
              </button>
              <button
                type="button"
                onClick={() => setCouponTab("LUCKY")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer",
                  couponTab === "LUCKY"
                    ? "bg-amber-500 text-white shadow-2xs"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                <Sparkles className="size-3" /> Lucky Draw ({luckyCount})
              </button>
              <button
                type="button"
                onClick={() => setCouponTab("PROMO")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  couponTab === "PROMO"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                Store Promos ({promoCount})
              </button>
            </div>
          )}
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : displayedCoupons.length > 0 ? (
            <ScrollArea className="h-[380px]">
              <div className="p-3.5 sm:p-5 space-y-2.5">
                {displayedCoupons.map((coupon) => {
                  const Icon = getPrizeIcon(coupon);
                  const isExpired = coupon.expires_at && new Date(coupon.expires_at) <= new Date();
                  const minOrder = Number(coupon.min_order_amount || coupon.minOrder || 0);
                  const isMinOrderNotMet = subtotal > 0 && minOrder > 0 && subtotal < minOrder;
                  const isCurrentlyApplied = currentCoupon && currentCoupon.code === coupon.code;
                  const isUsed = coupon.isUsed;
                  const isDisabled = isExpired || isMinOrderNotMet || isUsed || isCurrentlyApplied;
                  const isLucky = coupon.isLuckyDraw || String(coupon.code).includes("-");
                  const bgGradient = coupon.bgGradient || (isLucky ? "from-orange-500 to-amber-500" : "from-emerald-600 to-teal-600");
                  const tier = coupon.tier || (isLucky ? "rare" : "common");

                  return (
                    <div 
                      key={coupon.id || coupon.code} 
                      className={cn(
                        "group border rounded-2xl transition-all relative overflow-hidden flex flex-col justify-between",
                        isCurrentlyApplied 
                          ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/30"
                          : (isUsed || isExpired || isMinOrderNotMet)
                            ? "border-border/40 bg-muted/20 opacity-75 cursor-not-allowed" 
                            : "border-amber-500/30 bg-card hover:border-amber-500/60 hover:shadow-md cursor-pointer"
                      )}
                      onClick={() => {
                        if (isCurrentlyApplied) return;
                        if (isUsed) {
                          toast.error("You have already used this coupon.");
                          return;
                        }
                        if (isExpired) {
                          toast.error("This coupon has expired.");
                          return;
                        }
                        if (isMinOrderNotMet) {
                          toast.error(`Order subtotal ($${subtotal.toFixed(2)}) must be at least $${minOrder.toFixed(2)} to use this coupon.`);
                          return;
                        }
                        handleSelect(coupon);
                      }}
                    >
                      {/* Left edge gradient bar */}
                      <div className={cn("absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b", bgGradient)} />

                      {/* Ticket Notch Cutouts */}
                      <div className="absolute -left-2 top-1/2 -translate-y-1/2 size-4 rounded-full bg-background border border-border/60" />
                      <div className="absolute -right-2 top-1/2 -translate-y-1/2 size-4 rounded-full bg-background border border-border/60" />

                      {/* Ticket Body Header */}
                      <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3 pl-5 sm:pl-6 relative z-10">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Prize Icon in Gradient Box */}
                          <div className={cn("size-10 sm:size-11 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-xs shrink-0 text-white", bgGradient)}>
                            <Icon className="size-5 sm:size-5.5" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <span className="font-serif text-sm sm:text-base font-bold text-foreground truncate">
                                {coupon.discount_type === 'PERCENTAGE' ? `${coupon.discount_value}% OFF` : 
                                 coupon.discount_type === 'FREE_DELIVERY' ? 'FREE DELIVERY' : 
                                 `$${coupon.discount_value} OFF`}
                              </span>
                              {isLucky && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[9px] font-bold rounded-full border border-amber-500/30 shrink-0">
                                  🎰 Lucky Draw
                                </span>
                              )}
                              <TierBadge tier={tier} />
                            </div>

                            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground">
                              <span className="font-mono font-bold text-amber-500 dark:text-amber-400">{coupon.code}</span>
                              {minOrder > 0 && (
                                <>
                                  <span>•</span>
                                  <span>Min. ${minOrder.toFixed(2)}</span>
                                </>
                              )}
                            </div>

                            {coupon.description && (
                              <p className="text-[10px] sm:text-[11px] text-muted-foreground/80 mt-0.5 truncate">
                                {coupon.description}
                              </p>
                            )}

                            {isMinOrderNotMet && (
                              <p className="text-[10px] sm:text-[11px] mt-0.5 text-amber-600 dark:text-amber-400 font-semibold">
                                Need ${(minOrder - subtotal).toFixed(2)} more to apply
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action Button */}
                        <div className="flex items-center shrink-0">
                          <Button 
                            type="button"
                            variant={isCurrentlyApplied ? "default" : (isUsed || isExpired || isMinOrderNotMet) ? "outline" : "default"} 
                            size="sm" 
                            disabled={isDisabled}
                            className={cn(
                              "rounded-full shrink-0 h-8 text-xs px-3 sm:px-4 font-bold transition-all shadow-xs",
                              isCurrentlyApplied 
                                ? "bg-emerald-600 hover:bg-emerald-600 text-white" 
                                : !isDisabled 
                                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 cursor-pointer active:scale-95" 
                                  : ""
                            )}
                          >
                            {isCurrentlyApplied ? "Applied ✓" : isUsed ? "Used" : isExpired ? "Expired" : isMinOrderNotMet ? "Unavailable" : "Apply"}
                          </Button>
                        </div>
                      </div>

                      {/* Ticket Dotted Divider & Expiration */}
                      {coupon.expires_at && (
                        <>
                          <div className="mx-4 border-t border-dashed border-border/50" />
                          <div className="px-5 py-1.5 pb-2 text-[10px] text-muted-foreground flex items-center justify-between">
                            <span className="flex items-center gap-1 text-muted-foreground/80 font-medium">
                              <Clock className="size-3 text-amber-500" />
                              {isExpired ? `Expired ${new Date(coupon.expires_at).toLocaleDateString()}` : `Expires ${new Date(coupon.expires_at).toLocaleDateString()}`}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center p-8 text-muted-foreground text-sm flex flex-col items-center justify-center gap-2">
              <Ticket className="size-10 opacity-30 text-muted-foreground" />
              <p className="font-semibold text-foreground">No coupons available right now</p>
              <p className="text-xs text-muted-foreground">Try your luck in Lucky Draw to win fresh vouchers!</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 rounded-full border-amber-500/40 text-amber-600 hover:bg-amber-500/10 cursor-pointer text-xs"
                onClick={() => {
                  setOpen(false);
                  window.dispatchEvent(new CustomEvent("openLuckyDraw"));
                }}
              >
                🎡 Spin Lucky Draw
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
