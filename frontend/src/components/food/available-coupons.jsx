import { useState, useEffect } from "react";
import { Ticket, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { list } from "@/lib/api";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getCurrentAccount,
  getWonCoupons,
  formatWonVouchersAsCoupons,
} from "./lucky-draw-modal.jsx";

export function AvailableCoupons({ onSelectCoupon, currentCoupon, subtotal = 0 }) {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && coupons.length === 0) {
      loadCoupons();
    }
  }, [open, coupons.length]);

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
    onSelectCoupon({
      ...coupon,
      accountKey: acc.storageKey
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="text-[12px] font-medium text-primary hover:underline flex items-center gap-1.5 mt-3">
          <Ticket className="size-3.5" /> View Available Coupons
        </button>
      </DialogTrigger>
      <DialogContent className="w-[92vw] sm:max-w-md max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background rounded-3xl border border-border/80">
        <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-border/60">
          <DialogTitle className="font-serif text-lg sm:text-xl">Available Coupons</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Select a coupon code or voucher to apply discount.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : coupons.length > 0 ? (
            <ScrollArea className="h-[360px]">
              <div className="p-3.5 sm:p-5 space-y-2.5">
                {coupons.map((coupon) => {
                  const isExpired = coupon.expires_at && new Date(coupon.expires_at) <= new Date();
                  const minOrder = Number(coupon.min_order_amount || 0);
                  const isMinOrderNotMet = subtotal > 0 && minOrder > 0 && subtotal < minOrder;
                  const isCurrentlyApplied = currentCoupon && currentCoupon.code === coupon.code;
                  const isUsed = coupon.isUsed;
                  const isDisabled = isExpired || isMinOrderNotMet || isUsed || isCurrentlyApplied;

                  return (
                    <div 
                      key={coupon.id} 
                      className={`group border rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-2 transition-colors ${
                        isCurrentlyApplied 
                          ? "border-primary bg-primary/5"
                          : (isUsed || isExpired || isMinOrderNotMet)
                            ? "border-border/40 bg-muted/20 opacity-75 cursor-not-allowed" 
                            : "border-border/60 bg-card hover:border-primary/50 cursor-pointer hover:shadow-xs"
                      }`}
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
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="flex size-6 sm:size-7 rounded-full bg-primary/10 items-center justify-center shrink-0">
                            <Ticket className="size-3 sm:size-3.5 text-primary" />
                          </span>
                          <span className="font-bold text-foreground text-sm sm:text-base truncate">{coupon.code}</span>
                          {coupon.isLuckyDraw && (
                            <span className="text-[9px] sm:text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full font-bold uppercase shrink-0">
                              ✨ Lucky Prize
                            </span>
                          )}
                          {isExpired && (
                            <span className="text-[9px] sm:text-[10px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded-full font-semibold shrink-0">Expired</span>
                          )}
                          {isMinOrderNotMet && !isExpired && (
                            <span className="text-[9px] sm:text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-semibold shrink-0">Min ${minOrder}</span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 font-medium leading-tight">
                          {coupon.discount_type === "FREE_DELIVERY" 
                            ? "Free Delivery on your order!" 
                            : coupon.discount_type === "PERCENTAGE" 
                              ? `${coupon.discount_value}% OFF your total`
                              : `$${coupon.discount_value} OFF your total`}
                        </p>
                        {minOrder > 0 && (
                          <p className={`text-[10px] sm:text-[11px] mt-1 ${isMinOrderNotMet ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-muted-foreground/70"}`}>
                            Min. order: ${minOrder} {isMinOrderNotMet && `(Need $${(minOrder - subtotal).toFixed(2)} more)`}
                          </p>
                        )}
                      </div>
                      <Button 
                        type="button"
                        variant={isCurrentlyApplied ? "default" : (isUsed || isExpired || isMinOrderNotMet) ? "outline" : "secondary"} 
                        size="sm" 
                        disabled={isDisabled}
                        className={`rounded-full shrink-0 h-7 sm:h-8 text-xs px-2.5 sm:px-3.5 ${
                          isCurrentlyApplied 
                            ? "bg-[#6BCF8E] hover:bg-[#5bb87a] text-white" 
                            : !isDisabled ? "group-hover:bg-primary group-hover:text-primary-foreground" : ""
                        } transition-colors`}
                      >
                        {isCurrentlyApplied ? "Applied ✓" : isUsed ? "Used" : (isExpired || isMinOrderNotMet) ? "Unavailable" : "Apply"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center p-8 text-muted-foreground text-sm">
              No active coupons available right now.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
