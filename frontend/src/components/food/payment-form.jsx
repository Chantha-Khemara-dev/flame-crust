"use client";
import { useState, useEffect, useRef } from "react";
import { 
  ArrowLeft, 
  CheckCircle2, 
  CreditCard, 
  Landmark, 
  QrCode, 
  Wallet, 
  LocateFixed, 
  MapPin, 
  Truck, 
  X, 
  ChevronDown, 
  ChevronUp,
  Ticket, 
  Loader2, 
  ShieldCheck, 
  Download, 
  Copy, 
  Check, 
  Sparkles,
  ShoppingBag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { QRCodeCanvas } from "qrcode.react";
import { BakongKHQR, IndividualInfo } from "bakong-khqr";
import ImageUpload from "@/components/ImageUpload";
import { MapPicker } from "./map-picker";
import { motion, AnimatePresence } from "framer-motion";
import { list, API_URL } from "@/lib/api";
import { cn } from "@/lib/utils";
import { getImageUrl } from "@/lib/food-api";
import {
  getCurrentAccount,
  getWonCoupons,
  formatWonVouchersAsCoupons,
} from "./lucky-draw-modal.jsx";

const PAYMENT_METHODS = [
  { id: "KHQR", label: "KHQR", sublabel: "All Cambodian Banks", badge: "POPULAR", icon: QrCode },
  { id: "ABA_PAY", label: "ABA Pay", sublabel: "ABA Mobile App", badge: null, icon: Wallet },
  { id: "CARD", label: "Credit/Debit", sublabel: "Visa, Mastercard", badge: null, icon: CreditCard },
  { id: "CASH", label: "Cash", sublabel: "Pay on delivery", badge: null, icon: Landmark },
];

export function PaymentForm({ 
  lines = [], 
  grossSubtotal = 0, 
  discount = 0, 
  deliveryFee = 0, 
  total = 0, 
  coupon = null, 
  onApplyCoupon, 
  onRemoveCoupon, 
  onBack, 
  onSuccess 
}) {
  const [method, setMethod] = useState("KHQR");
  const [card, setCard] = useState({ name: "", number: "", expiry: "", cvv: "" });
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Phnom Penh");
  const [addressNote, setAddressNote] = useState("");
  const [showAddressEdit, setShowAddressEdit] = useState(false);
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [qrCodeString, setQrCodeString] = useState("");
  const [showQRModal, setShowQRModal] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [paymentSlip, setPaymentSlip] = useState("");
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [timeLeft, setTimeLeft] = useState(300);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manualChecksCount, setManualChecksCount] = useState(0);
  const [isVerifyingBakong, setIsVerifyingBakong] = useState(false);
  const qrCreatedAtRef = useRef(0);
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [couponError, setCouponError] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [allCoupons, setAllCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [customer, setCustomer] = useState(null);

  const itemCount = lines.reduce((s, l) => s + l.qty, 0);
  const itemsSummaryText = lines.map(l => `${l.qty}x ${l.name}`).join(", ");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("customerAuth");
      if (stored) {
        const c = JSON.parse(stored);
        setCustomer(c);
        if (c?.name) setCard(prev => ({ ...prev, name: c.name }));
      }
      // Check if current coupon belongs to another account
      const acc = getCurrentAccount();
      if (coupon && coupon.accountKey && coupon.accountKey !== acc.storageKey) {
        if (typeof onRemoveCoupon === "function") onRemoveCoupon();
      }
    } catch (e) {}
  }, [coupon]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Load available coupons
  const fetchAvailableCoupons = async () => {
    try {
      setLoadingCoupons(true);
      let active = [];
      try {
        const data = await list("coupons");
        // Only include public promo codes (without hyphen). Personal lucky draw codes contain '-' and belong to specific accounts.
        active = data.filter(c => c.active && !String(c.code).includes("-"));
      } catch (e) {
        console.warn("Failed to load db coupons", e);
      }

      // Load ONLY the current customer's won Lucky Draw vouchers
      try {
        const acc = getCurrentAccount();
        const rawWon = getWonCoupons(acc.storageKey);
        const luckyCoupons = formatWonVouchersAsCoupons(rawWon);

        const luckyCodes = new Set(luckyCoupons.map((lc) => lc.code.toUpperCase()));
        const remainingDbCoupons = active.filter((c) => !luckyCodes.has(String(c.code).toUpperCase()));

        setAllCoupons([...luckyCoupons, ...remainingDbCoupons]);
      } catch (e) {
        setAllCoupons(active);
      }
    } catch (e) {
      console.error("Failed to load coupons", e);
    } finally {
      setLoadingCoupons(false);
    }
  };

  const handleOpenCouponModal = () => {
    setShowCouponModal(true);
    fetchAvailableCoupons();
  };

  // Generate KHQR when user clicks confirm for KHQR
  const generateQR = (amountToUse = total) => {
    qrCreatedAtRef.current = Date.now();
    setManualChecksCount(0);
    try {
      const accountId = import.meta.env.VITE_BAKONG_ACCOUNT_ID || "khemara_chantha1@bkrt";
      const merchantName = import.meta.env.VITE_BAKONG_MERCHANT_NAME || "Flame Crust";
      const qrInfo = new IndividualInfo(
        accountId,
        merchantName,
        "Phnom Penh",
        {
          currency: "840", // USD
          amount: Number(Number(amountToUse || 0).toFixed(2)),
          storeLabel: "FlameCrust",
          terminalLabel: "T1"
        }
      );
      const khqr = new BakongKHQR();
      const res = khqr.generateIndividual(qrInfo);
      if (res && res.data && res.data.qr) {
        setQrCodeString(res.data.qr);
      } else {
        throw new Error(res?.status?.message || "Invalid QR response");
      }
    } catch (e) {
      console.warn("KHQR fallback generation:", e);
      setQrCodeString(`https://bakong.nbc.gov.kh/pay?account=khemara_chantha1@bkrt&amount=${Number(amountToUse || 0).toFixed(2)}&currency=USD`);
    }
  };

  const handleManualVerifyBakong = async () => {
    if (isVerifyingBakong || isSubmitting) return;
    if (manualChecksCount >= 2) {
      toast.info("អ្នកបានចុចផ្ទៀងផ្ទាត់គ្រប់ ២ ដងហើយ។ សូមរង់ចាំការពិនិត្យស្វ័យប្រវត្តិ ឬជ្រើសរើសប្តូរវិធីទូទាត់។");
      return;
    }
    setManualChecksCount(prev => prev + 1);
    setIsVerifyingBakong(true);
    try {
      const res = await fetch(`${API_URL}/payments/verify-khqr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qr_code_string: qrCodeString || "dummy",
          qr_created_at: qrCreatedAtRef.current
        })
      });
      const data = await res.json();
      if (data.status === "SUCCESS") {
        toast.success("Payment verified! ទទួលបានការផ្ទេរប្រាក់ជោគជ័យ");
        await handleFinalSubmit();
        return;
      } else {
        const remaining = Math.max(0, 2 - (manualChecksCount + 1));
        toast.warning(
          `មិនទាន់ទទួលបានការផ្ទេរប្រាក់ទេ។ សូមរង់ចាំបន្តិច ឬពិនិត្យក្នុង App ធនាគាររបស់អ្នកម្ដងទៀត។${remaining > 0 ? ` (នៅសល់សិទ្ធិចុច ${remaining} ដង)` : " (អស់សិទ្ធិចុចផ្ទៀងផ្ទាត់ហើយ)"}`,
          { duration: 5000 }
        );
      }
    } catch (e) {
      console.warn("Bakong verification error:", e);
      toast.error("មិនអាចទាក់ទងទៅប្រព័ន្ធ Bakong បានទេនៅពេលនេះ។ សូមរង់ចាំបន្តិចទៀត។");
    } finally {
      setIsVerifyingBakong(false);
    }
  };

  useEffect(() => {
    if (!showQRModal || !qrCodeString) return;
    setTimeLeft(300);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          toast.error("KHQR session expired. Please generate a new code.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showQRModal, qrCodeString]);

  // Fetch saved customer addresses
  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        const stored = localStorage.getItem("customerAuth");
        if (!stored) return;
        const c = JSON.parse(stored);
        const addresses = await list("addresses");
        const myAddresses = addresses.filter(a => String(a.customer_id) === String(c.id));
        setSavedAddresses(myAddresses);
        
        if (myAddresses.length > 0 && !address) {
          const defaultAddr = myAddresses.find(a => a.is_default) || myAddresses[0];
          setAddress(defaultAddr.address_line);
          setCity(defaultAddr.city || "Phnom Penh");
        }
      } catch (e) {
        console.error("Failed to fetch addresses:", e);
      }
    };
    fetchAddresses();
  }, []);

  const handleAutoLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        const data = await res.json();

        if (data && data.address) {
          const addr = data.address;
          const cityMatch = ["Phnom Penh", "Kandal", "Siem Reap", "Sihanoukville", "Battambang", "Kampong Cham"].find(
            c => addr.city?.includes(c) || addr.state?.includes(c) || addr.province?.includes(c)
          );

          setAddress(data.display_name);
          setCity(cityMatch || "Phnom Penh");
          toast.success("Location auto-detected!");
        }
      } catch (err) {
        toast.error("Failed to get location address");
      } finally {
        setIsLocating(false);
      }
    }, () => {
      toast.error("Please allow location permissions");
      setIsLocating(false);
    });
  };

  const handleApplyCouponCode = async (e) => {
    if (e) e.preventDefault();
    if (!couponCodeInput.trim()) return;
    setIsApplyingCoupon(true);
    setCouponError("");
    try {
      const targetCode = couponCodeInput.trim().toUpperCase();
      const acc = getCurrentAccount();

      // 1. Check won Lucky Draw vouchers for current account
      try {
        const rawWon = getWonCoupons(acc.storageKey);
        const wonCouponsList = formatWonVouchersAsCoupons(rawWon);
        const wonMatch = wonCouponsList.find((v) => v.code === targetCode);

        if (wonMatch) {
          if (wonMatch.isUsed) {
            setCouponError("You have already used this Lucky Draw voucher");
            return;
          }
          if (wonMatch.isExpired) {
            setCouponError("This Lucky Draw voucher has expired");
            return;
          }
          const minOrder = Number(wonMatch.min_order_amount || 0);
          if (minOrder > 0 && grossSubtotal < minOrder) {
            setCouponError(`Minimum order amount is $${minOrder.toFixed(2)}`);
            return;
          }

          if (typeof onApplyCoupon === "function") {
            onApplyCoupon({ ...wonMatch, accountKey: acc.storageKey });
          }
          setCouponCodeInput("");
          toast.success(`🎉 Lucky Draw voucher "${wonMatch.code}" applied!`);
          return;
        }
      } catch (err) {}

      // If code has a hyphen, it is a personal lucky draw voucher.
      // Since it wasn't found in current user's won list, reject it!
      if (targetCode.includes("-")) {
        setCouponError("This voucher belongs to another account or is invalid.");
        return;
      }

      // 2. Check public DB coupons
      const coupons = await list("coupons");
      const found = coupons.find(c => c.code.toUpperCase() === targetCode);
      if (!found) {
        setCouponError("Invalid promo code");
      } else if (!found.active) {
        setCouponError("This code is no longer active");
      } else if (found.min_order_amount && grossSubtotal < Number(found.min_order_amount)) {
        setCouponError(`Minimum order amount is $${Number(found.min_order_amount).toFixed(2)}`);
      } else {
        if (typeof onApplyCoupon === "function") {
          onApplyCoupon({ ...found, accountKey: acc.storageKey });
        }
        setCouponCodeInput("");
        toast.success(`Promo code "${found.code}" applied!`);
      }
    } catch (err) {
      setCouponError("Failed to apply code");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleCopyAccount = () => {
    const acc = import.meta.env.VITE_BAKONG_ACCOUNT_ID || "khemara_chantha1@bkrt";
    navigator.clipboard?.writeText(acc);
    setCopiedAccount(true);
    toast.success("Copied Bakong account: " + acc);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  const handleDownloadQR = () => {
    const canvas = document.querySelector("#drawer-khqr-canvas canvas") || document.querySelector("canvas");
    if (canvas) {
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `FlameCrust-KHQR-${total.toFixed(2)}USD.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("QR Code downloaded! You can scan it from your banking app.");
    } else {
      toast.error("Unable to download QR image");
    }
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSuccess({
        method,
        cardLast4: method === "CARD" ? card.number.slice(-4) : null,
        paymentSlip: paymentSlip,
        address: address.trim(),
        city: city.trim(),
        notes: addressNote.trim() || null
      });
      setShowQRModal(false);
    } catch (err) {
      toast.error(err.message || "Failed to process payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitPayment = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (!address.trim()) {
      toast.error("Please provide your delivery address.");
      return;
    }
    if (method === "CARD" && (!card.name || !card.number || !card.expiry || !card.cvv)) {
      toast.error("Please fill in your card details.");
      return;
    }

    if (method === "KHQR" || method === "ABA_PAY") {
      generateQR(total);
      setShowQRModal(true);
      return;
    }

    await handleFinalSubmit();
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-background overflow-hidden">
      {/* Top Header / Breadcrumb matching Phone */}
      <div className="px-5 pt-4 pb-2 shrink-0 bg-background">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <button 
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 hover:text-foreground font-medium transition-colors cursor-pointer"
          >
            <ArrowLeft className="size-3.5" /> Back to Cart
          </button>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span>Cart</span>
            <span>→</span>
            <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Checkout</span>
            <span>→</span>
            <span>Payment</span>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <h2 className="font-serif text-2xl font-bold text-foreground">Checkout</h2>
          <span className="text-xs text-muted-foreground font-medium">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
        </div>
      </div>

      {/* Scrollable Form Body */}
      <form onSubmit={submitPayment} className="flex-1 overflow-y-auto px-5 py-3 space-y-3.5 no-scrollbar pb-6">
        
        {/* Card 1: Order Summary (Collapsible Accordion matching Phone) */}
        <div className="rounded-2xl sm:rounded-3xl border border-border/70 bg-card p-4 shadow-xs transition-all">
          <div 
            onClick={() => setShowOrderSummary(!showOrderSummary)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-9 rounded-full bg-red-500/10 text-primary flex items-center justify-center shrink-0">
                <ShoppingBag className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs sm:text-sm text-foreground">Order Summary</span>
                  <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.2 rounded-md font-semibold">
                    {itemCount} items
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5 max-w-[200px] sm:max-w-[260px]">
                  {itemsSummaryText || "Selected dishes"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-serif font-bold text-sm sm:text-base text-primary">
                ${total.toFixed(2)}
              </span>
              {showOrderSummary ? (
                <ChevronUp className="size-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Expanded Order Breakdown */}
          {showOrderSummary && (
            <div className="mt-3 pt-3 border-t border-border/40 space-y-2 text-xs animate-in fade-in-50 duration-150">
              <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                {lines.map((line) => {
                  const lineImg = line.image ? getImageUrl(line.image) : "/images/library/pizza.jpg";
                  return (
                    <div key={line.id} className="flex justify-between items-center text-muted-foreground py-1 gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-8 rounded-lg overflow-hidden bg-secondary border border-border/40 shrink-0 flex items-center justify-center">
                          <img 
                            src={lineImg} 
                            alt={line.name} 
                            className="w-full h-full object-cover" 
                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/images/library/pizza.jpg"; }} 
                          />
                        </div>
                        <span className="truncate pr-1 text-foreground font-medium">{line.qty}x {line.name}</span>
                      </div>
                      <span className="font-semibold text-foreground shrink-0">${(line.price * line.qty).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="pt-2 border-t border-border/30 space-y-1 text-[11px]">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>${grossSubtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Discount</span>
                    <span>-${discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Delivery Fee</span>
                  <span>{deliveryFee === 0 ? "FREE" : `$${deliveryFee.toFixed(2)}`}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Delivery Details (Matching Phone Style) */}
        <div className="rounded-2xl sm:rounded-3xl border border-border/70 bg-card p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-full bg-red-500/10 text-primary flex items-center justify-center shrink-0">
                <MapPin className="size-4" />
              </div>
              <h4 className="font-bold text-xs sm:text-sm text-foreground">Delivery Details</h4>
            </div>

            <div className="flex items-center gap-1.5">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => setShowMap(true)} 
                className="h-7 text-[11px] rounded-full px-2.5 border-primary/30 text-primary hover:bg-primary/10 font-semibold cursor-pointer"
              >
                <MapPin className="size-3 mr-1 text-primary" /> Pin on Map
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={handleAutoLocation} 
                disabled={isLocating} 
                className="h-7 text-[11px] rounded-full px-2.5 border-border/70 text-foreground hover:bg-secondary font-medium cursor-pointer"
              >
                <LocateFixed className={cn("size-3 mr-1 text-primary", isLocating && "animate-spin")} />
                Auto Location
              </Button>
            </div>
          </div>

          {/* Saved Address Preview / Edit Box */}
          <div className="p-3 rounded-2xl bg-secondary/20 border border-border/50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-foreground">1</span>
                <span className="text-[9px] bg-red-500/15 text-primary px-1.5 py-0.2 rounded font-bold uppercase">
                  DEFAULT
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddressEdit(!showAddressEdit)}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-0.5 cursor-pointer"
              >
                Edit {showAddressEdit ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </button>
            </div>

            <p className="text-xs text-foreground font-medium leading-relaxed">
              {address || "Please select or type your delivery address"}
            </p>

            <p className="text-[11px] text-muted-foreground">
              {customer?.name || "Flame Customer"} • {customer?.phone || "0965755963"}
            </p>

            {/* Editable Form Inputs when user clicks Edit */}
            {showAddressEdit && (
              <div className="pt-2 border-t border-border/40 space-y-2 animate-in fade-in-50 duration-150">
                {savedAddresses.length > 0 && (
                  <select
                    className="w-full h-9 px-3 text-xs appearance-none rounded-xl border border-border/80 bg-background text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "new") {
                        setAddress("");
                        setCity("Phnom Penh");
                      } else {
                        const selected = savedAddresses.find(a => String(a.id) === val);
                        if (selected) {
                          setAddress(selected.address_line);
                          setCity(selected.city || "Phnom Penh");
                        }
                      }
                    }}
                    defaultValue={savedAddresses.find(a => a.address_line === address)?.id || (address ? "new" : "")}
                  >
                    <option value="" disabled className="text-muted-foreground">-- Select saved address --</option>
                    {savedAddresses.map(addr => (
                      <option key={addr.id} value={addr.id}>
                        {addr.label} ({addr.city}) - {addr.address_line}
                      </option>
                    ))}
                    <option value="new">+ Enter new address...</option>
                  </select>
                )}
                <Input 
                  required 
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)} 
                  placeholder="Street address, building, house..." 
                  className="h-9 rounded-xl text-xs bg-background" 
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input 
                    required 
                    value={city} 
                    onChange={(e) => setCity(e.target.value)} 
                    placeholder="City / Province" 
                    className="h-9 rounded-xl text-xs bg-background" 
                  />
                  <Input 
                    value={addressNote} 
                    onChange={(e) => setAddressNote(e.target.value)} 
                    placeholder="Delivery note (optional)" 
                    className="h-9 rounded-xl text-xs bg-background" 
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Payment Method (Exact 2x2 Grid with Red Selected Borders) */}
        <div className="rounded-2xl sm:rounded-3xl border border-border/70 bg-card p-4 space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5 border-b border-border/40 pb-2">
            <div className="size-8 rounded-full bg-red-500/10 text-primary flex items-center justify-center shrink-0">
              <CreditCard className="size-4" />
            </div>
            <h4 className="font-bold text-xs sm:text-sm text-foreground">Payment Method</h4>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {PAYMENT_METHODS.map(({ id, label, sublabel, badge, icon: Icon }) => {
              const isSelected = method === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMethod(id)}
                  className={cn(
                    "relative flex flex-col items-start p-3 rounded-2xl border text-left transition-all cursor-pointer",
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                      : "border-border/70 bg-secondary/10 hover:border-border hover:bg-secondary/30"
                  )}
                >
                  {badge && (
                    <span className="absolute top-2 right-2 text-[8px] font-bold bg-primary text-white px-1.5 py-0.2 rounded-full uppercase">
                      {badge}
                    </span>
                  )}
                  <div className="flex items-center gap-2 mb-1">
                    <div className={cn("size-6 rounded-lg flex items-center justify-center shrink-0", isSelected ? "bg-primary text-white" : "bg-secondary text-muted-foreground")}>
                      <Icon className="size-3.5" />
                    </div>
                    <span className="font-bold text-xs text-foreground">{label}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate w-full">{sublabel}</p>
                </button>
              );
            })}
          </div>

          {/* Conditional Method Inputs */}
          {method === "CARD" && (
            <div className="mt-2 space-y-2.5 rounded-2xl border border-border/60 bg-secondary/20 p-3.5 animate-in fade-in-50 duration-150">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-foreground">Cardholder Name</Label>
                <Input 
                  required 
                  value={card.name} 
                  onChange={(e) => setCard({ ...card, name: e.target.value })} 
                  placeholder="e.g. Sok Dara" 
                  className="h-9 rounded-xl text-xs bg-background" 
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-foreground">Card Number</Label>
                <Input 
                  required 
                  inputMode="numeric" 
                  value={card.number} 
                  onChange={(e) => setCard({ ...card, number: e.target.value })} 
                  placeholder="4242 •••• •••• 4242" 
                  maxLength={19} 
                  className="h-9 rounded-xl text-xs bg-background" 
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-foreground">Expiry</Label>
                  <Input 
                    required 
                    value={card.expiry} 
                    onChange={(e) => setCard({ ...card, expiry: e.target.value })} 
                    placeholder="MM / YY" 
                    maxLength={7} 
                    className="h-9 rounded-xl text-xs bg-background" 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-foreground">CVV</Label>
                  <Input 
                    required 
                    inputMode="numeric" 
                    value={card.cvv} 
                    onChange={(e) => setCard({ ...card, cvv: e.target.value })} 
                    placeholder="123" 
                    maxLength={4} 
                    className="h-9 rounded-xl text-xs bg-background" 
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 pt-1">
                <ShieldCheck className="size-3 text-green-500" /> 256-bit encrypted secure checkout
              </p>
            </div>
          )}

          </div>

        {/* Card 4: Promo Code & Coupons (Matching Phone Style with Browse Button) */}
        <div className="rounded-2xl sm:rounded-3xl border border-border/70 bg-card p-4 space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-full bg-red-500/10 text-primary flex items-center justify-center shrink-0">
                <Ticket className="size-4" />
              </div>
              <h4 className="font-bold text-xs sm:text-sm text-foreground">Promo Code &amp; Coupons</h4>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenCouponModal}
              className="h-7 text-[11px] font-semibold rounded-full px-3 border-primary/30 text-primary hover:bg-primary/10 flex items-center gap-1 cursor-pointer"
            >
              <Ticket className="size-3 text-primary" /> Browse Coupons
            </Button>
          </div>

          {coupon ? (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-green-500/10 border border-green-500/30">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400 min-w-0">
                <CheckCircle2 className="size-4 shrink-0" />
                <span className="font-bold text-xs truncate">
                  {coupon.code} applied (-${discount.toFixed(2)})
                </span>
              </div>
              <button
                type="button"
                onClick={() => typeof onRemoveCoupon === "function" && onRemoveCoupon()}
                className="p-1 hover:bg-green-500/20 rounded-full text-green-700 dark:text-green-300 transition-colors cursor-pointer"
                title="Remove coupon"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex gap-2">
                <Input
                  value={couponCodeInput}
                  onChange={(e) => setCouponCodeInput(e.target.value)}
                  placeholder="ENTER VOUCHER CODE..."
                  className="h-10 rounded-xl text-xs uppercase bg-secondary/20 border-border/70 font-medium"
                />
                <Button
                  type="button"
                  onClick={handleApplyCouponCode}
                  disabled={!couponCodeInput.trim() || isApplyingCoupon}
                  className="h-10 rounded-xl px-4 text-xs font-bold bg-primary hover:bg-primary/90 text-white shrink-0 cursor-pointer"
                >
                  {isApplyingCoupon ? <Loader2 className="size-3.5 animate-spin" /> : "Apply"}
                </Button>
              </div>
              {couponError && <p className="text-[10px] text-destructive">{couponError}</p>}
            </div>
          )}
        </div>
      </form>

      {/* Sticky Bottom Action Bar matching Phone */}
      <div className="p-4 border-t border-border/70 bg-card flex items-center justify-between gap-3 shrink-0 shadow-lg">
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            TOTAL ({itemCount} {itemCount === 1 ? "ITEM" : "ITEMS"})
          </span>
          <span className="font-serif text-2xl font-bold text-primary leading-tight">
            ${total.toFixed(2)}
          </span>
        </div>

        <Button 
          type="button"
          onClick={submitPayment}
          disabled={isSubmitting} 
          className="h-12 px-7 rounded-full bg-gradient-to-r from-primary to-orange-500 hover:from-primary/95 hover:to-orange-500/95 text-white font-bold text-sm shadow-md shadow-primary/25 cursor-pointer active:scale-95 transition-all"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin mr-1.5" />
              Processing...
            </>
          ) : (
            <>
              Verify &amp; Order
              <ArrowLeft className="size-4 ml-1.5 rotate-180" />
            </>
          )}
        </Button>
      </div>

      {/* Available Coupons Selection Modal */}
      <Dialog open={showCouponModal} onOpenChange={setShowCouponModal}>
        <DialogContent className="max-w-sm w-[92vw] rounded-3xl p-5 border-border/70 z-[110]">
          <DialogHeader className="pb-3 border-b border-border/60">
            <DialogTitle className="font-serif text-base font-bold flex items-center gap-2">
              <Ticket className="size-4 text-primary" /> Select Available Coupon
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Choose an available coupon code to apply to your checkout.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2.5 py-2 max-h-[50vh] overflow-y-auto no-scrollbar">
            {loadingCoupons ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            ) : allCoupons.length > 0 ? (
              allCoupons.map((c) => {
                const isSelected = coupon?.id === c.id;
                const minOrder = Number(c.min_order_amount || 0);
                const isMinOrderNotMet = grossSubtotal > 0 && minOrder > 0 && grossSubtotal < minOrder;

                return (
                  <div
                    key={c.id}
                    className={cn(
                      "rounded-2xl p-3 border transition-all flex items-center justify-between gap-3 text-left",
                      isSelected
                        ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                        : isMinOrderNotMet
                          ? "border-border/40 bg-muted/20 opacity-70"
                          : "border-border/60 bg-secondary/30 hover:border-primary/50 hover:bg-secondary/60 cursor-pointer"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-foreground uppercase">{c.code}</span>
                        {c.isLuckyDraw && (
                          <span className="text-[9px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded-full font-bold uppercase flex items-center gap-1">
                            <Sparkles className="size-2 text-amber-500" />
                            Lucky Prize
                          </span>
                        )}
                        <span className="text-[9px] bg-primary/15 text-primary px-1.5 py-0.2 rounded-full font-bold">
                          {c.discount_type === "FREE_DELIVERY" ? "Free Delivery" : c.discount_type === "PERCENTAGE" ? `${c.discount_value}% OFF` : `$${c.discount_value} OFF`}
                        </span>
                        {c.isLuckyDraw && c.tier && (
                          <span className="text-[8px] uppercase tracking-wider px-1.5 py-0.2 rounded-full border border-border/50 text-muted-foreground font-semibold">
                            {c.tier}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                        {c.description || (c.discount_type === "FREE_DELIVERY" ? "Free delivery on your order" : "Discount on your order")}
                      </p>
                      {c.isLuckyDraw && c.expiresAt && !c.isUsed && (
                        <p className="text-[9px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                          Expires: {new Date(c.expiresAt).toLocaleDateString()}
                        </p>
                      )}
                      {minOrder > 0 && (
                        <p className={cn("text-[10px] mt-0.5", isMinOrderNotMet ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-muted-foreground")}>
                          Min order: ${minOrder.toFixed(2)} {isMinOrderNotMet && `(Need $${(minOrder - grossSubtotal).toFixed(2)} more)`}
                        </p>
                      )}
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      disabled={isMinOrderNotMet || isSelected}
                      onClick={() => {
                        const acc = getCurrentAccount();
                        if (typeof onApplyCoupon === "function") onApplyCoupon({ ...c, accountKey: acc.storageKey });
                        setShowCouponModal(false);
                        toast.success(`Coupon "${c.code}" applied!`);
                      }}
                      className={cn(
                        "rounded-full text-xs h-7 px-3 font-semibold shrink-0 cursor-pointer",
                        isSelected
                          ? "bg-green-600 text-white hover:bg-green-600"
                          : "bg-primary text-white hover:bg-primary/90"
                      )}
                    >
                      {isSelected ? "Applied ✓" : "Apply"}
                    </Button>
                  </div>
                );
              })
            ) : (
              <p className="text-center py-6 text-xs text-muted-foreground">
                No active coupons available right now.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Interactive Map Picker Modal */}
      <AnimatePresence>
        {showMap && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-lg rounded-3xl p-6 shadow-2xl relative"
            >
              <h3 className="font-serif text-xl font-bold text-foreground mb-4">Pick Delivery Location</h3>
              <MapPicker
                onConfirm={(loc) => {
                  setAddress(loc.address);
                  setCity(loc.city || "Phnom Penh");
                  setShowMap(false);
                  toast.success("Location selected!");
                }}
                onClose={() => setShowMap(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bakong KHQR Popup Modal */}
      <AnimatePresence>
        {showQRModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-card w-full max-w-sm rounded-3xl p-5 sm:p-6 shadow-2xl border border-border/70 relative text-center space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <QrCode className="size-4" />
                  </div>
                  <h3 className="font-serif text-lg font-bold text-foreground text-left">Scan &amp; Pay KHQR</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQRModal(false)}
                  className="size-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* QR Code with Scan Laser Animation */}
              <div id="drawer-khqr-canvas" className="bg-white p-3.5 rounded-2xl shadow-md border border-border/40 inline-flex flex-col items-center relative group overflow-hidden mx-auto">
                {qrCodeString ? (
                  <QRCodeCanvas
                    value={qrCodeString}
                    size={160}
                    level="H"
                    includeMargin={true}
                  />
                ) : (
                  <div className="size-40 flex items-center justify-center bg-secondary/50 rounded-xl">
                    <Loader2 className="size-6 animate-spin text-primary" />
                  </div>
                )}
                {qrCodeString && (
                  <motion.div
                    className="absolute top-3.5 left-3.5 h-0.5 bg-primary shadow-[0_0_6px_rgba(239,68,68,0.8)] rounded-full z-10 pointer-events-none"
                    style={{ width: "160px" }}
                    animate={{ y: [0, 160, 0] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                  />
                )}
              </div>

              {/* Price & Expiry */}
              <div className="space-y-1">
                <p className="font-serif font-bold text-2xl text-primary leading-tight">
                  ${total.toFixed(2)} USD
                </p>
                <div className="flex items-center justify-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-bold rounded-full w-fit mx-auto animate-pulse">
                  <span>⏱️</span>
                  <span>Expires in: {formatTime(timeLeft)}</span>
                </div>
                <p className="text-[11px] text-muted-foreground pt-1">
                  Scan with Bakong, ABA, ACLEDA, or any Cambodian banking app.
                </p>
              </div>

              {/* Action Buttons: Save QR & Copy Account */}
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadQR}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-semibold transition-all cursor-pointer"
                >
                  <Download className="size-3.5" /> Save QR
                </button>
                <button
                  type="button"
                  onClick={handleCopyAccount}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 text-foreground border border-border/60 text-xs font-medium transition-all cursor-pointer"
                >
                  {copiedAccount ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5 text-muted-foreground" />}
                  {copiedAccount ? "Copied" : "Copy Account"}
                </button>
              </div>

              {/* Bakong Waiting Pulse */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary animate-pulse w-full justify-center">
                <Loader2 className="size-3.5 animate-spin text-primary" />
                <span>កំពុងរង់ចាំការបាញ់លុយពី Bakong...</span>
              </div>

              {/* Manual Verify Bakong Button (Max 2 Clicks) */}
              <Button
                type="button"
                onClick={handleManualVerifyBakong}
                disabled={isVerifyingBakong || isSubmitting || manualChecksCount >= 2}
                className={cn(
                  "w-full h-11 rounded-full font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5",
                  manualChecksCount >= 2
                    ? "bg-secondary text-muted-foreground border border-border/60 cursor-not-allowed opacity-80"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95"
                )}
              >
                {isVerifyingBakong ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin mr-1.5" /> កំពុងផ្ទៀងផ្ទាត់ជាមួយ Bakong...
                  </>
                ) : isSubmitting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin mr-1.5" /> Completing Order...
                  </>
                ) : manualChecksCount >= 2 ? (
                  <>
                    <CheckCircle2 className="size-3.5 mr-1 text-muted-foreground" /> អស់សិទ្ធិចុចផ្ទៀងផ្ទាត់ (២/២ ដង)
                  </>
                ) : (
                  <>
                    <ShieldCheck className="size-4 mr-1 text-emerald-200" />
                    <span>ខ្ញុំបានផ្ទេររួច / ពិនិត្យឥឡូវ (សល់ {2 - manualChecksCount} ដង)</span>
                  </>
                )}
              </Button>

              {manualChecksCount >= 2 && (
                <p className="text-[10px] text-amber-500 font-medium">
                  ⚠️ អ្នកបានចុចគ្រប់ ២ ដងហើយ។ សូមរង់ចាំការពិនិត្យស្វ័យប្រវត្តិ។
                </p>
              )}

              <button
                type="button"
                onClick={() => setShowQRModal(false)}
                className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-semibold cursor-pointer py-1 block w-full text-center"
              >
                🔄 ប្តូរវិធីទូទាត់ប្រាក់ផ្សេង / ចាកចេញពី QR
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
