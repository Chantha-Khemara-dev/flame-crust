"use client";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  CreditCard,
  Landmark,
  QrCode,
  Wallet,
  Lock,
  X,
  Loader2,
  LocateFixed,
  MapPin,
  Ticket,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  User,
  Phone,
  Building,
  FileText,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Download,
  Copy,
  Check,
  ExternalLink,
  Smartphone,
  RefreshCw,
} from "lucide-react";
import { AvailableCoupons } from "@/components/food/available-coupons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Navbar } from "@/components/food/navbar";
import { Footer } from "@/components/food/footer";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageTransition } from "@/components/shared/page-transition";
import { MapPicker } from "@/components/food/map-picker";
import { useCart } from "@/lib/cart-store";
import { create, list, API_URL } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getImageUrl, triggerFoodRefresh } from "@/lib/food-api";
import {
  getCurrentAccount,
  getWonCoupons,
  markWonCouponUsed,
  addBonusSpins,
  formatWonVouchersAsCoupons,
} from "@/components/food/lucky-draw-modal";
import { QRCodeCanvas } from "qrcode.react";
import { BakongKHQR, IndividualInfo } from "bakong-khqr";

// Dynamic delivery fee calculation
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; 
}
const STORE_LAT = 11.5564;
const STORE_LNG = 104.9282;

const FREE_DELIVERY_THRESHOLD = 25;

const paymentMethods = [
  { 
    id: "KHQR", 
    label: "KHQR", 
    sublabel: "All Cambodian Banks",
    badge: "Popular",
    icon: QrCode 
  },
  { 
    id: "ABA_PAY", 
    label: "ABA Pay", 
    sublabel: "ABA Mobile App",
    icon: Wallet 
  },
  { 
    id: "CARD", 
    label: "Credit/Debit", 
    sublabel: "Visa, Mastercard",
    icon: CreditCard 
  },
  { 
    id: "CASH", 
    label: "Cash", 
    sublabel: "Pay on delivery",
    icon: Landmark 
  },
];

function CheckoutPage() {
  const navigate = useNavigate();
  const { lines, clear, coupon, applyCoupon, removeCoupon } = useCart();
  const [paymentMethod, setPaymentMethod] = useState("KHQR");
  const [submitting, setSubmitting] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState(() => {
    try {
      const stored = localStorage.getItem("flamecrust_saved_addresses");
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [addressTab, setAddressTab] = useState("new"); // "new" | "saved"
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [showMobileSummary, setShowMobileSummary] = useState(false);
  const [showDeliveryDetails, setShowDeliveryDetails] = useState(false);
  const [showAddressPickerModal, setShowAddressPickerModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [isSuccessRedirecting, setIsSuccessRedirecting] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [allCoupons, setAllCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [deliveryDistance, setDeliveryDistance] = useState(0);
  const [calculatedDeliveryFee, setCalculatedDeliveryFee] = useState(1.00);

  const fetchCoupons = async () => {
    try {
      setLoadingCoupons(true);
      const data = await list("coupons");
      // Only include public promo codes (without hyphen). Personal lucky draw vouchers have '-' and belong to specific accounts.
      let activeCoupons = data.filter(c => 
        c.active && 
        (c.usage_limit === null || c.used_count < c.usage_limit) &&
        !String(c.code).includes("-")
      );

      // Mark already used coupons for the current user
      try {
        let currentCustomerId = customer?.id;
        if (!currentCustomerId) {
           const formPhone = (getValues("phone") || "").trim();
           if (formPhone) {
              const customers = await list("customers");
              const currentCust = customers.find((item) => item.phone === formPhone);
              if (currentCust) currentCustomerId = currentCust.id;
           }
        }

        if (currentCustomerId) {
          const usages = await list("coupon_usages");
          const usedCouponIds = usages
            .filter(u => String(u.customer_id) === String(currentCustomerId))
            .map(u => String(u.coupon_id));
          
          activeCoupons = activeCoupons.map(c => {
            if (usedCouponIds.includes(String(c.id))) {
              return { ...c, isUsed: true };
            }
            return c;
          });
        }
      } catch(e) {
        console.warn("Failed to check coupon usages", e);
      }

      // Load ONLY the CURRENT customer's won Lucky Draw vouchers
      const acc = getCurrentAccount();
      const rawWon = getWonCoupons(acc.storageKey);
      const luckyCoupons = formatWonVouchersAsCoupons(rawWon);

      // Deduplicate: If DB has a coupon with the same code as a won Lucky Draw voucher, prefer the won voucher
      const luckyCodes = new Set(luckyCoupons.map((lc) => lc.code.toUpperCase()));
      const remainingDbCoupons = activeCoupons.filter((c) => !luckyCodes.has(String(c.code).toUpperCase()));

      // Put won Lucky Draw vouchers FIRST so customer easily applies them!
      setAllCoupons([...luckyCoupons, ...remainingDbCoupons]);
    } catch (e) {
      console.error(e);
      try {
        const acc = getCurrentAccount();
        const rawWon = getWonCoupons(acc.storageKey);
        setAllCoupons(formatWonVouchersAsCoupons(rawWon));
      } catch {}
    } finally {
      setLoadingCoupons(false);
    }
  };

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm({
    shouldUnregister: false,
    defaultValues: {
      fullName: "",
      phone: "",
      address1: "",
      address2: "",
      city: "Phnom Penh",
      notes: ""
    }
  });

  const watchedFullName = watch("fullName");
  const watchedPhone = watch("phone");
  const watchedAddress1 = watch("address1");

  useEffect(() => {
    const fetchProfile = async () => {
      const auth = localStorage.getItem("customerAuth");
      if (auth) {
        try {
          const c = JSON.parse(auth);
          setCustomer(c);
          const allAddresses = await list("addresses");
          const myAddresses = allAddresses.filter(a => String(a.customer_id) === String(c.id));
          
          // Deduplicate addresses with same address_line
          const uniqueAddresses = [];
          const seen = new Set();
          for (const a of myAddresses) {
            const line = (a.address_line || "").trim().toLowerCase();
            if (line && !seen.has(line)) {
              seen.add(line);
              uniqueAddresses.push(a);
            }
          }
          setSavedAddresses(uniqueAddresses);
          
          const defaultAddr = uniqueAddresses.find(a => a.is_default) || uniqueAddresses[0];
          if (defaultAddr) {
            handleSelectAddress(defaultAddr, c);
          } else {
            setValue("fullName", c.name || "");
            setValue("phone", c.phone || "");
          }
        } catch (e) {
          console.error("Failed to parse customerAuth or fetch addresses:", e);
        }
      }

      // Check if current coupon belongs to another account
      const acc = getCurrentAccount();
      if (coupon && coupon.accountKey && coupon.accountKey !== acc.storageKey) {
        removeCoupon();
      }
    };
    fetchProfile();
    fetchCoupons();
  }, []);

  const handleSelectAddress = (addr, c = customer) => {
    setSelectedAddressId(addr.id);
    if (c) {
      setValue("fullName", c.name || "");
      setValue("phone", c.phone || "");
    }
    setValue("address1", addr.address_line || "");
    setValue("city", addr.city || "Phnom Penh");
    setValue("notes", addr.notes || "");
  };

  const saveAddressToLocal = (address, city, label = "Home", fullName = "", phone = "", lat = null, lng = null) => {
    if (!address?.trim()) return;
    const newAddr = {
      id: `local-${Date.now()}`,
      label,
      address_line: address.trim(),
      city: city || "Phnom Penh",
      full_name: fullName,
      phone: phone,
      latitude: lat,
      longitude: lng,
      is_default: savedAddresses.length === 0,
      saved_at: new Date().toISOString()
    };
    const updated = [newAddr, ...savedAddresses.filter(a => a.address_line !== address.trim())].slice(0, 5);
    setSavedAddresses(updated);
    localStorage.setItem("flamecrust_saved_addresses", JSON.stringify(updated));
    setSelectedAddressId(newAddr.id);
  };

  const handleAutoLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          
            if (data && data.address) {
              const addr = data.address;
              const cityMatch = ["Phnom Penh", "Kandal", "Siem Reap", "Sihanoukville", "Battambang", "Kampong Cham"].find(
                c => addr.city?.includes(c) || addr.state?.includes(c) || addr.province?.includes(c)
              );
              const detectedCity = cityMatch || "Phnom Penh";
              const detectedAddress = data.display_name || "";
              
              setValue("address1", detectedAddress);
              setValue("city", detectedCity);
              const fn = getValues("fullName") || "";
              const ph = getValues("phone") || "";
              saveAddressToLocal(detectedAddress, detectedCity, "Auto Location", fn, ph, latitude, longitude);
              toast.success("Location auto-detected and saved!");
          }
        } catch (err) {
          toast.error("Failed to get location address");
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        toast.error("Please allow location permissions");
        setIsLocating(false);
      }
    );
  };

  useEffect(() => {
    const addr = savedAddresses.find(a => a.id === selectedAddressId);
    let fee = 1.00;
    let dist = 0;
    if (addr && addr.latitude && addr.longitude) {
      dist = calculateDistance(STORE_LAT, STORE_LNG, addr.latitude, addr.longitude);
      if (dist <= 3) {
        fee = 0.50;
      } else {
        fee = 0.50 + ((dist - 3) * 0.20);
      }
      if (fee > 15) fee = 15;
    }
    setDeliveryDistance(dist);
    setCalculatedDeliveryFee(fee);
  }, [selectedAddressId, savedAddresses]);

  const grossSubtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const isCouponValid = coupon && (!coupon.min_order_amount || grossSubtotal >= Number(coupon.min_order_amount));
  const discount = isCouponValid
    ? coupon.discount_type === "PERCENTAGE"
      ? Math.min(grossSubtotal, (grossSubtotal * Number(coupon.discount_value)) / 100)
      : coupon.discount_type === "FREE_DELIVERY"
        ? 0
        : Math.min(grossSubtotal, Number(coupon.discount_value))
    : 0;
  const subtotal = grossSubtotal - discount;
  const itemCount = lines.reduce((s, l) => s + l.qty, 0);
  const deliveryFee = (isCouponValid && coupon.discount_type === "FREE_DELIVERY") 
    ? 0 
    : (subtotal === 0 ? 0 : calculatedDeliveryFee);
  const total = subtotal + deliveryFee;

  const [qrCodeString, setQrCodeString] = useState("");
  const [qrMd5, setQrMd5] = useState("");
  const [isPaymentVerified, setIsPaymentVerified] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const qrCreatedAtRef = useRef(0);

  const generateNewQR = () => {
    if (total <= 0) return;
    qrCreatedAtRef.current = Date.now();
    try {
      const accountId = import.meta.env.VITE_BAKONG_ACCOUNT_ID || "khemara_chantha1@bkrt";
      const merchantName = import.meta.env.VITE_BAKONG_MERCHANT_NAME || "Flame Crust";
      const billNumber = "FC" + Date.now().toString().slice(-6);
      const qrInfo = new IndividualInfo(
        accountId,
        merchantName,
        "Phnom Penh",
        {
          currency: "840",
          amount: Number(total.toFixed(2)),
          billNumber: billNumber,
          storeLabel: "FlameCrust",
          terminalLabel: "T1"
        }
      );
      const khqr = new BakongKHQR();
      const res = khqr.generateIndividual(qrInfo);
      if (res && res.data && res.data.qr) {
        setQrCodeString(res.data.qr);
        setQrMd5(res.data.md5 || "");
      } else {
        setQrCodeString(`https://bakong.nbc.gov.kh/pay?account=khemara_chantha1@bkrt&amount=${total.toFixed(2)}&currency=USD&bill=${billNumber}`);
        setQrMd5("");
      }
    } catch (e) {
      setQrCodeString(`https://bakong.nbc.gov.kh/pay?account=khemara_chantha1@bkrt&amount=${total.toFixed(2)}&currency=USD&bill=${Date.now()}`);
      setQrMd5("");
    }
  };

  useEffect(() => {
    if (total > 0 && (paymentMethod === "KHQR" || paymentMethod === "ABA_PAY")) {
      generateNewQR();
    }
  }, [total, paymentMethod]);

  const verifyPaymentWithBakong = async (showToast = false) => {
    if (!qrCodeString) return false;

    // 5-minute QR validity guard (frontend side)
    if (Date.now() - qrCreatedAtRef.current > 5 * 60 * 1000) {
      if (showToast) toast.error("QR អស់សុពលភាពក្រោយ 5 នាទី។ បានបង្កើត QR ថ្មី — សូមស្កេនម្ដងទៀត។");
      generateNewQR();
      return false;
    }
    
    setIsCheckingPayment(true);

    try {
      const res = await fetch(`${API_URL}/payments/verify-khqr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qr_code_string: qrCodeString,
          md5: qrMd5,
          qr_created_at: qrCreatedAtRef.current
        })
      });
      const data = await res.json();
      if (data.status === "SUCCESS") {
        setIsPaymentVerified(true);
        if (showToast) toast.success("Payment verified! ទទួលបានការផ្ទេរប្រាក់ជោគជ័យ");
        return true;
      } else if (data.status === "LIMIT_EXCEEDED" || data.errorCode === 17) {
        if (showToast) {
          toast.error("Bakong API daily limit reached. Please try again tomorrow.");
        }
      } else {
        if (showToast) {
          toast.error("មិនទាន់ឃើញមានការផ្ទេរប្រាក់ចូលទេ។ សូមស្កេនបាញ់លុយជាមុនសិន!");
        }
      }
    } catch (e) {
      console.warn("Bakong verification error:", e);
    } finally {
      setIsCheckingPayment(false);
    }
    return false;
  };

  const [copiedAccount, setCopiedAccount] = useState(false);

  const handleCopyAccount = () => {
    const acc = "khemara_chantha1@bkrt";
    navigator.clipboard?.writeText(acc);
    setCopiedAccount(true);
    toast.success("បានចម្លងលេខគណនី Bakong: " + acc);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  const handleDownloadQR = () => {
    const canvas = document.querySelector("#khqr-canvas-element canvas") || document.querySelector("canvas");
    if (canvas) {
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `FlameCrust-KHQR-${total.toFixed(2)}USD.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("បានទាញយករូប QR Code! អ្នកអាចចូលក្នុង App ធនាគារ ហើយជ្រើសរើសស្កេនរូបភាពពី Gallery");
    } else {
      toast.error("មិនទាន់អាចទាញយក QR Code បានទេ");
    }
  };

  const handleOpenBankApp = (bank) => {
    if (bank === "bakong") {
      const bakongUrl = qrCodeString && qrCodeString.startsWith("https://")
        ? qrCodeString
        : `https://bakong.nbc.gov.kh/pay?account=khemara_chantha1@bkrt&amount=${total.toFixed(2)}&currency=USD`;
      window.location.href = bakongUrl;
    } else if (bank === "aba") {
      window.location.href = "ababank://";
      setTimeout(() => {
        window.open("https://link.payway.com.kh", "_blank");
      }, 1200);
    } else if (bank === "acleda") {
      window.location.href = "unitymobile://";
    }
  };

  // Reset verification state when amount or method changes
  useEffect(() => {
    setIsPaymentVerified(false);
    isAutoSubmittingRef.current = false;
  }, [total, paymentMethod]);

  const isAutoSubmittingRef = useRef(false);

  // Payment polling is now handled in the dedicated payment page (/payment)
  // This checkout page navigates to /payment for KHQR/ABA_PAY payments

  const handleApplyCoupon = async (e) => {
    if (e) e.preventDefault();
    if (!couponCode.trim()) return;
    setIsApplyingCoupon(true);
    setCouponError("");
    try {
      const targetCode = couponCode.trim().toUpperCase();

      // 1. Check won Lucky Draw vouchers first!
      const acc = getCurrentAccount();
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

        applyCoupon({ ...wonMatch, accountKey: acc.storageKey });
        setCouponCode("");
        toast.success(`🎉 Lucky Draw voucher "${wonMatch.code}" applied!`);
        return;
      }

      // If code contains a hyphen, it's a personal lucky draw voucher.
      // Since it wasn't found in current user's won list, reject it!
      if (targetCode.includes("-")) {
        setCouponError("This voucher belongs to another account or is invalid");
        return;
      }

      // 2. Check DB coupons
      const coupons = await list("coupons");
      const found = coupons.find((c) => c.code.toUpperCase() === targetCode);
      if (!found) {
        setCouponError("Invalid promo code");
      } else if (!found.active) {
        setCouponError("This code is no longer active");
      } else if (found.min_order_amount && grossSubtotal < Number(found.min_order_amount)) {
        setCouponError(`Minimum order amount is $${Number(found.min_order_amount).toFixed(2)}`);
      } else if (found.usage_limit !== null && found.used_count >= found.usage_limit) {
        setCouponError("This promo code has reached its usage limit");
      } else {
        // Check if customer already used it
        let alreadyUsed = false;
        let checkCustomerId = customer?.id;
        
        if (!checkCustomerId) {
          const formData = getValues();
          const phone = (formData.phone || "").trim();
          if (phone) {
            try {
              const customers = await list("customers");
              const currentCust = customers.find((item) => item.phone === phone);
              if (currentCust) {
                checkCustomerId = currentCust.id;
              }
            } catch (e) {
              console.warn("Failed to check customer by phone", e);
            }
          }
        }

        if (checkCustomerId) {
           const usages = await list("coupon_usages");
           alreadyUsed = usages.some(u => String(u.coupon_id) === String(found.id) && String(u.customer_id) === String(checkCustomerId));
        }

        if (alreadyUsed) {
           setCouponError("You have already used this promo code");
           return;
        }

        applyCoupon({ ...found, accountKey: acc.storageKey });
        setCouponCode("");
        toast.success(`Promo code "${found.code}" applied!`);
      }
    } catch (err) {
      setCouponError("Failed to apply code");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const onInvalid = (formErrors) => {
    console.warn("Validation errors:", formErrors);
    setShowDeliveryDetails(true);
    const firstKey = Object.keys(formErrors)[0];
    const firstErr = formErrors[firstKey];
    toast.error(firstErr?.message || "Please check required delivery fields");
  };

  const onSubmit = async (data) => {
    if (lines.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    const formData = { ...getValues(), ...data };
    const fullName = (formData.fullName || customer?.name || "").trim();
    const phone = (formData.phone || customer?.phone || "").trim();
    const address1 = (formData.address1 || "").trim();
    const city = (formData.city || "Phnom Penh").trim();
    const address2 = (formData.address2 || "").trim();
    const notes = (formData.notes || "").trim();

    if (!fullName) {
      setShowDeliveryDetails(true);
      toast.error("Please enter recipient name");
      return;
    }
    if (!phone) {
      setShowDeliveryDetails(true);
      toast.error("Please enter recipient phone number");
      return;
    }
    if (!address1) {
      setShowDeliveryDetails(true);
      toast.error("Please enter or select a delivery address");
      return;
    }



    await executeOrderCreation(isPaymentVerified);
  };

  const executeOrderCreation = async (verifiedPayment = false) => {
    setSubmitting(true);
    try {
      const formData = getValues();
      const fullName = (formData.fullName || customer?.name || "").trim();
      const phone = (formData.phone || customer?.phone || "").trim();
      const address1 = (formData.address1 || "").trim();
      const city = (formData.city || "Phnom Penh").trim();
      const address2 = (formData.address2 || "").trim();
      const notes = (formData.notes || "").trim();

      let customerId = customer?.id;
      if (!customerId) {
        try {
          const customers = await list("customers");
          let currentCust = customers.find((item) => item.phone === phone);
          if (!currentCust) {
            currentCust = await create("customers", {
              name: fullName,
              phone: phone,
              email: formData.email || null,
              status: "ACTIVE",
            });
          }
          customerId = currentCust?.id;
        } catch (e) {
          console.warn("Customer handling error:", e);
        }
      }

      // Final strict coupon validation before order placement
      if (coupon && customerId) {
        try {
          const usages = await list("coupon_usages");
          const alreadyUsed = usages.some(u => String(u.coupon_id) === String(coupon.id) && String(u.customer_id) === String(customerId));
          
          if (alreadyUsed) {
            toast.error("You have already used this promo code. It has been removed.");
            if (typeof removeCoupon === "function") removeCoupon();
            setSubmitting(false);
            return;
          }
        } catch (e) {
          console.warn("Final coupon validation failed", e);
        }
      }

      let addressId = selectedAddressId;
      if (!addressId || String(addressId).startsWith("local-")) {
        try {
          const address = await create("addresses", {
            customer_id: customerId || null,
            label: "Delivery",
            address_line: `${address1}${address2 ? `, ${address2}` : ""}`,
            city: city || "Phnom Penh",
            notes: notes || null,
            latitude: savedAddresses.find(a => a.id === selectedAddressId)?.latitude || null,
            longitude: savedAddresses.find(a => a.id === selectedAddressId)?.longitude || null,
            is_default: true,
          });
          addressId = address?.id;
        } catch (e) {
          console.warn("Address create error:", e);
        }
      }

      const finalCustomerId = customerId ? Number(customerId) : null;
      const finalAddressId = addressId ? Number(addressId) : null;

      const isDigitalPaid = verifiedPayment || isPaymentVerified || (paymentMethod === "CARD");
      const orderStatus = isDigitalPaid ? "CONFIRMED" : "PENDING";
      const paymentStatus = isDigitalPaid ? "PAID" : "PENDING";

      const order = await create("orders", {
        order_number: `FC-${Date.now()}`,
        customer_id: finalCustomerId,
        address_id: finalAddressId,
        status: orderStatus,
        order_type: "DELIVERY",
        subtotal: Number(subtotal.toFixed(2)),
        discount_amount: Number(discount.toFixed(2)),
        delivery_fee: Number(deliveryFee.toFixed(2)),
        driver_commission: 0.00,
        total: Number(total.toFixed(2)),
        notes: notes || null,
      });
      const orderId = order.id;

      await Promise.all(
        lines.map((line) =>
          create("order_items", {
            order_id: orderId,
            product_id: Number(line.originalId || line.id),
            product_name: line.name,
            quantity: line.qty,
            unit_price: Number(line.price.toFixed(2)),
            line_total: Number((line.price * line.qty).toFixed(2)),
            status: "PENDING",
            options: line.selectedOptions ? JSON.stringify(line.selectedOptions) : null,
          })
        )
      );

      // Trigger real-time auto-update of trending scores and rankings across active tabs
      try {
        triggerFoodRefresh();
      } catch (e) {
        console.warn("Error triggering food refresh:", e);
      }

      await create("payments", {
        order_id: orderId,
        method: paymentMethod,
        amount: Number(total.toFixed(2)),
        status: paymentStatus,
      });

      if (coupon && coupon.isLuckyDraw) {
        try {
          const acc = getCurrentAccount();
          markWonCouponUsed(acc.storageKey, coupon.code);
        } catch (e) {
          console.warn("Failed to mark lucky draw coupon as used", e);
        }
      } else if (coupon && finalCustomerId) {
        try {
          await create("coupon_usages", {
            coupon_id: coupon.id,
            customer_id: finalCustomerId,
            order_id: orderId,
            used_at: new Date().toISOString()
          });

          // Increment global used_count
          if (typeof update === "function") {
            await update("coupons", coupon.id, {
              ...coupon,
              used_count: (coupon.used_count || 0) + 1
            });
          }
        } catch(e) {
          console.warn("Failed to record coupon usage", e);
        }
      }

      // Award +1 Lucky Spin for ordering pizza!
      try {
        const acc = getCurrentAccount();
        addBonusSpins(acc.storageKey, 1);
        toast.success("🎉 You earned +1 Lucky Spin with this order!");
      } catch (e) {}

      setIsSuccessRedirecting(true);
      const targetTotal = Number(total.toFixed(2));
      const targetMethod = paymentMethod;
      const targetItemCount = itemCount;
      const targetAddress = `${address1}${address2 ? `, ${address2}` : ""}, ${city}`;

      setTimeout(() => {
        if (typeof clear === "function") clear();
        if (typeof removeCoupon === "function") removeCoupon();
      }, 200);

      if ((targetMethod === "KHQR" || targetMethod === "ABA_PAY") && !verifiedPayment) {
        navigate(`/payment/${orderId}`, {
          replace: true,
          state: {
            total: targetTotal,
            paymentMethod: targetMethod,
            itemCount: targetItemCount,
            address: targetAddress
          }
        });
      } else {
        navigate("/order-confirmation", {
          replace: true,
          state: {
            orderId,
            total: targetTotal,
            itemCount: targetItemCount,
            paymentMethod: targetMethod,
            address: targetAddress,
          },
        });
      }
    } catch (err) {
      console.error("Order submission error:", err);
      toast.error(err.message || "Failed to place order. Please try again.");
      setSubmitting(false);
      setIsSuccessRedirecting(false);
    }
  };

  if (isSuccessRedirecting) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 pt-[calc(4.5rem+env(safe-area-inset-top))] flex items-center justify-center p-4">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="size-16 rounded-full bg-green-500/15 text-green-500 flex items-center justify-center animate-bounce">
              <CheckCircle2 className="size-10" />
            </div>
            <h2 className="font-serif text-xl font-bold text-foreground">Order Placed Successfully!</h2>
            <p className="text-xs text-muted-foreground">Redirecting to order confirmation...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (lines.length === 0 && !submitting && !isSuccessRedirecting) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 pt-[calc(4.5rem+env(safe-area-inset-top))] flex items-center justify-center">
          <div className="mx-auto max-w-md px-6 py-16 text-center">
            <div className="size-20 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="size-10" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-foreground">Your cart is empty</h2>
            <p className="mt-2 text-sm text-muted-foreground">Add some delicious artisan pizza before checking out.</p>
            <Button
              onClick={() => navigate("/menu")}
              className="mt-6 rounded-full bg-primary text-primary-foreground px-8 shadow-lg shadow-primary/25 hover:shadow-primary/40"
            >
              Browse Menu
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary selection:text-white">
      <Navbar />

      <main className="flex-1 pt-[calc(4.5rem+env(safe-area-inset-top))] sm:pt-24 pb-44 lg:pb-16">
        <PageTransition>
          <div className="mx-auto max-w-6xl px-3 sm:px-6 lg:px-8 py-2 sm:py-6">
            {/* Top Navigation & Step Indicator */}
            <div className="flex flex-col gap-3 mb-5 sm:mb-8">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => navigate("/cart")}
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1 px-2.5 -ml-2.5 rounded-full hover:bg-secondary/60"
                >
                  <ArrowLeft className="size-4" />
                  <span>Back to Cart</span>
                </button>

                <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-muted-foreground">
                  <span className="text-muted-foreground">Cart</span>
                  <span>→</span>
                  <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-full">Checkout</span>
                  <span>→</span>
                  <span className="text-muted-foreground/60">Payment</span>
                </div>
              </div>

              <div className="flex items-baseline justify-between border-b border-border/40 pb-3">
                <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
                  Checkout
                </h1>
                <span className="text-xs sm:text-sm text-muted-foreground font-medium">
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </span>
              </div>
            </div>

            {/* Mobile Collapsible Order Summary Bar */}
            <div className="lg:hidden mb-3">
              <div className="rounded-2xl border border-border/70 bg-card/80 backdrop-blur-md shadow-xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowMobileSummary(!showMobileSummary)}
                  className="w-full flex items-center justify-between p-3 text-left transition-colors hover:bg-secondary/30"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <ShoppingBag className="size-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        Order Summary
                        <span className="text-[10px] bg-secondary px-1.5 py-0.2 rounded-full text-muted-foreground font-normal">
                          {itemCount} items
                        </span>
                      </span>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {lines.map((l) => `${l.qty}x ${l.name}`).join(", ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold text-primary">${total.toFixed(2)}</span>
                    {showMobileSummary ? (
                      <ChevronUp className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {showMobileSummary && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-border/50 p-3.5 space-y-3 bg-secondary/15"
                    >
                      <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                        {lines.map((line) => (
                          <div key={line.id} className="flex items-center gap-3">
                            <img
                              src={line.image ? getImageUrl(line.image) : "/images/library/pizza.jpg"}
                              alt={line.name}
                              className="size-11 rounded-lg object-cover bg-secondary shrink-0 border border-border/40"
                              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/images/library/pizza.jpg"; }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">{line.name}</p>
                              <p className="text-[10px] text-muted-foreground">Qty: {line.qty} × ${line.price.toFixed(2)}</p>
                            </div>
                            <span className="text-xs font-semibold text-foreground shrink-0">
                              ${(line.price * line.qty).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-border/60 pt-2.5 space-y-1.5 text-xs">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Subtotal</span>
                          <span className="font-medium text-foreground">${grossSubtotal.toFixed(2)}</span>
                        </div>
                        {coupon && (
                          <div className="flex justify-between text-green-600 dark:text-green-400 font-medium">
                            <span className="flex items-center gap-1">
                              <Ticket className="size-3" /> Discount ({coupon.code})
                            </span>
                            <span>-${discount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-muted-foreground">
                          <span className="flex items-center gap-1">
                            Delivery Fee {deliveryDistance > 0 && <span className="text-[10px]">({deliveryDistance.toFixed(1)} km)</span>}
                          </span>
                          <span className={cn("font-medium", deliveryFee === 0 ? "text-green-600 dark:text-green-400" : "text-foreground")}>
                            {deliveryFee === 0 ? "FREE" : `$${deliveryFee.toFixed(2)}`}
                          </span>
                        </div>/
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Main Form & Desktop Grid */}
            <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="grid lg:grid-cols-[1fr_390px] gap-4 sm:gap-6 lg:gap-8">
              <div className="space-y-3.5 sm:space-y-6">
                {/* 1. Contact & Delivery Section */}
                <div className="rounded-2xl sm:rounded-3xl border border-border/70 bg-card/60 backdrop-blur-xl shadow-sm p-3.5 sm:p-6 lg:p-7 space-y-3">
                  <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="size-7 sm:size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <MapPin className="size-4" />
                      </div>
                      <h2 className="font-serif text-sm sm:text-lg font-bold text-foreground leading-tight">
                        Delivery Details
                      </h2>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowMapModal(true)}
                        className="rounded-full text-[11px] sm:text-xs h-7 px-2.5 border-primary/30 text-primary hover:bg-primary/10"
                      >
                        <MapPin className="size-3.5 mr-1 text-primary" />
                        Pin on Map
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleAutoLocation}
                        disabled={isLocating}
                        className="rounded-full text-[11px] sm:text-xs h-7 px-2.5 text-primary hover:bg-primary/10"
                      >
                        <LocateFixed className={cn("size-3.5 mr-1", isLocating && "animate-spin")} />
                        {isLocating ? "Locating..." : "Auto Location"}
                      </Button>
                    </div>
                  </div>

                  {/* Address Tabs */}
                  <div className="flex gap-1.5 p-1 bg-muted/30 rounded-xl mb-3">
                    <button
                      type="button"
                      onClick={() => setAddressTab("new")}
                      className={cn(
                        "flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all",
                        addressTab === "new"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <MapPin className="inline size-3.5 mr-1 -mt-0.5" />
                      New Address
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddressTab("saved")}
                      className={cn(
                        "flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all relative",
                        addressTab === "saved"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Bookmark className="inline size-3.5 mr-1 -mt-0.5" />
                      Saved Addresses
                      {savedAddresses.length > 0 && (
                        <span className="absolute -top-1 -right-1 size-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                          {savedAddresses.length}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Saved Addresses Tab Content */}
                  {addressTab === "saved" && (
                    <div className="space-y-2 mb-4">
                      {savedAddresses.length > 0 ? (
                        <div className="grid gap-2">
                          {savedAddresses.map((addr) => (
                            <button
                              key={addr.id}
                              type="button"
                              onClick={() => {
                                setValue("address1", addr.address_line);
                                setValue("city", addr.city);
                                setValue("fullName", addr.full_name || "");
                                setValue("phone", addr.phone || "");
                                setSelectedAddressId(addr.id);
                                setAddressTab("new");
                                toast.success(`Selected: ${addr.label}`);
                              }}
                              className={cn(
                                "w-full text-left p-3 rounded-xl border transition-all",
                                selectedAddressId === addr.id
                                  ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                                  : "border-border/60 bg-secondary/20 hover:border-primary/50"
                              )}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <MapPin className="size-3.5 text-primary" />
                                <span className="font-bold text-sm text-foreground">{addr.label}</span>
                                {addr.is_default && (
                                  <span className="text-[8px] bg-primary/15 text-primary px-1.5 py-0.2 rounded font-bold uppercase">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">{addr.address_line}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{addr.city}</p>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-muted-foreground">
                          <Bookmark className="size-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">No saved addresses yet</p>
                          <p className="text-xs mt-1">Use "Pin on Map" or "Auto Location" to save one</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* New Address Form Fields */}
                    <div className="flex items-start justify-between gap-3 pt-0.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-foreground">
                            {savedAddresses.find(a => a.id === selectedAddressId)?.label || "Delivery Address"}
                          </span>
                          {savedAddresses.find(a => a.id === selectedAddressId)?.is_default && (
                            <span className="text-[9px] bg-primary/15 text-primary px-1.5 py-0.2 rounded font-bold uppercase">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                          {watchedAddress1}
                        </p>
                        {(watchedFullName || watchedPhone) && (
                          <p className="text-[11px] text-foreground/80 font-medium mt-1">
                            {watchedFullName} {watchedPhone && `• ${watchedPhone}`}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1.5 shrink-0">
                        {savedAddresses.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAddressPickerModal(true)}
                            className="rounded-full text-xs h-7.5 px-2.5 font-semibold border-primary/30 text-primary hover:bg-primary/10"
                          >
                            Change
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowDeliveryDetails(!showDeliveryDetails)}
                          className="rounded-full text-xs h-7.5 px-2 text-muted-foreground hover:text-foreground font-medium"
                        >
                          {showDeliveryDetails ? "Hide" : "Edit"}
                          <ChevronDown className={cn("size-3.5 ml-1 transition-transform", showDeliveryDetails && "rotate-180")} />
                        </Button>
                      </div>
                    </div>
                  {/* Delivery Form Details (Always mounted in DOM to retain input state) */}
                  <div className={cn("space-y-3.5 pt-1", (!showDeliveryDetails && watchedAddress1) ? "hidden" : "block")}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="fullName" className="text-xs font-semibold flex items-center gap-1">
                          <User className="size-3 text-muted-foreground" /> Full Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="fullName"
                          {...register("fullName", { required: "Name is required" })}
                          placeholder="e.g. John Doe"
                          className={cn("h-10 rounded-xl border-border/60 text-sm", errors.fullName && "border-destructive focus-visible:ring-destructive")}
                        />
                        {errors.fullName && <p className="text-[11px] text-destructive">{errors.fullName.message}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="phone" className="text-xs font-semibold flex items-center gap-1">
                          <Phone className="size-3 text-muted-foreground" /> Phone Number <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          {...register("phone", { required: "Phone number is required" })}
                          placeholder="e.g. 012 345 678"
                          className={cn("h-10 rounded-xl border-border/60 text-sm", errors.phone && "border-destructive focus-visible:ring-destructive")}
                        />
                        {errors.phone && <p className="text-[11px] text-destructive">{errors.phone.message}</p>}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="address1" className="text-xs font-semibold flex items-center gap-1">
                        <MapPin className="size-3 text-muted-foreground" /> Delivery Street Address <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="address1"
                        {...register("address1", { required: "Address is required" })}
                        placeholder="House / Street / Sangkat / Khan"
                        className={cn("h-10 rounded-xl border-border/60 text-sm", errors.address1 && "border-destructive focus-visible:ring-destructive")}
                      />
                      {errors.address1 && <p className="text-[11px] text-destructive">{errors.address1.message}</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="address2" className="text-xs font-semibold text-muted-foreground">
                          Apt / Building / Unit <span className="text-[10px] font-normal">(Optional)</span>
                        </Label>
                        <Input
                          id="address2"
                          {...register("address2")}
                          placeholder="e.g. Floor 3, Room 302"
                          className="h-10 rounded-xl border-border/60 text-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="city" className="text-xs font-semibold">
                          City / Province <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="city"
                          {...register("city", { required: "City is required" })}
                          defaultValue="Phnom Penh"
                          placeholder="e.g. Phnom Penh"
                          className={cn("h-10 rounded-xl border-border/60 text-sm", errors.city && "border-destructive focus-visible:ring-destructive")}
                        />
                        {errors.city && <p className="text-[11px] text-destructive">{errors.city.message}</p>}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="notes" className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                        <FileText className="size-3" /> Driver Delivery Notes <span className="text-[10px] font-normal">(Optional)</span>
                      </Label>
                      <Textarea
                        id="notes"
                        {...register("notes")}
                        placeholder="e.g. Gate passcode, call upon arrival, leave at reception..."
                        className="rounded-xl border-border/60 text-sm min-h-[70px] resize-none"
                      />
                    </div>

                    {watchedAddress1 && (
                      <div className="flex justify-end pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowDeliveryDetails(false)}
                          className="rounded-full text-xs h-8 px-4 font-medium"
                        >
                          Done / Collapse Form
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Payment Method Section */}
                <div className="rounded-2xl sm:rounded-3xl border border-border/70 bg-card/60 backdrop-blur-xl shadow-sm p-3.5 sm:p-6 lg:p-7 space-y-3">
                  <div className="flex items-center gap-2 border-b border-border/40 pb-2.5">
                    <div className="size-7 sm:size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <CreditCard className="size-4" />
                    </div>
                    <div>
                      <h2 className="font-serif text-sm sm:text-lg font-bold text-foreground leading-tight">
                        Payment Method
                      </h2>
                    </div>
                  </div>

                  {/* Payment Methods Grid */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {paymentMethods.map(({ id, label, sublabel, badge, icon: Icon }) => {
                      const isSelected = paymentMethod === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setPaymentMethod(id)}
                          className={cn(
                            "relative flex flex-col items-start p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border text-left transition-all duration-200 cursor-pointer group",
                            isSelected
                              ? "border-primary bg-primary/10 shadow-xs ring-2 ring-primary/30 text-primary"
                              : "border-border/70 bg-secondary/20 hover:border-primary/50 hover:bg-secondary/50 text-foreground"
                          )}
                        >
                          {badge && (
                            <span className={cn(
                              "absolute top-1.5 right-1.5 text-[8px] sm:text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase",
                              id === "KHQR" 
                                ? "bg-gradient-to-r from-primary to-orange-500 text-white shadow-md shadow-primary/20" 
                                : "bg-primary text-white"
                            )}>
                              {badge}
                            </span>
                          )}
                          <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                            <div className={cn(
                              "size-6 sm:size-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                              isSelected 
                                ? "bg-primary text-white" 
                                : id === "KHQR" 
                                  ? "bg-gradient-to-br from-primary/20 to-orange-500/20 text-primary group-hover:from-primary/30 group-hover:to-orange-500/30" 
                                  : "bg-secondary text-muted-foreground"
                            )}>
                              <Icon className="size-3.5 sm:size-4" />
                            </div>
                            <span className={cn(
                              "font-bold text-xs sm:text-sm leading-tight",
                              id === "KHQR" && !isSelected 
                                ? "bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent" 
                                : ""
                            )}>{label}</span>
                          </div>
                          <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate w-full">{sublabel}</p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Payment Details Container */}
                  <div className="pt-2">
                    {paymentMethod === "CARD" && (
                      <div className="space-y-3 rounded-2xl border border-border/60 bg-secondary/20 p-3.5 sm:p-4 animate-in fade-in-50 duration-200">
                        <div className="space-y-1">
                          <Label htmlFor="cardName" className="text-xs font-semibold">Cardholder Name</Label>
                          <Input
                            id="cardName"
                            {...register("cardName", { required: paymentMethod === "CARD" })}
                            placeholder="e.g. Sok Dara"
                            className="h-9 rounded-xl border-border/60 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="cardNumber" className="text-xs font-semibold">Card Number</Label>
                          <Input
                            id="cardNumber"
                            inputMode="numeric"
                            {...register("cardNumber", { required: paymentMethod === "CARD" })}
                            placeholder="4242 4242 4242 4242"
                            maxLength={19}
                            className="h-9 rounded-xl border-border/60 text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="space-y-1">
                            <Label htmlFor="expiry" className="text-xs font-semibold">Expiry</Label>
                            <Input
                              id="expiry"
                              {...register("expiry", { required: paymentMethod === "CARD" })}
                              placeholder="MM / YY"
                              maxLength={7}
                              className="h-9 rounded-xl border-border/60 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="cvv" className="text-xs font-semibold">CVV</Label>
                            <Input
                              id="cvv"
                              inputMode="numeric"
                              {...register("cvv", { required: paymentMethod === "CARD" })}
                              placeholder="123"
                              maxLength={4}
                          className="h-9 rounded-xl border-border/60 text-sm"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 pt-1">
                        <ShieldCheck className="size-3.5 text-green-500" /> End-to-end 256-bit encrypted checkout.
                      </p>
                    </div>
                  )}



                  {paymentMethod === "CASH" && (
                    <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4 text-center animate-in fade-in-50 duration-200">
                      <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
                        <Landmark className="size-5" />
                      </div>
                      <p className="font-bold text-xs sm:text-sm text-foreground">Cash on Delivery</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Please prepare exact change of <span className="font-bold text-foreground">${total.toFixed(2)}</span> when your driver arrives.
                      </p>
                    </div>
                  )}
                </div>
              </div>

                {/* 3. Promo Code & Coupons Section - Enhanced & Engaging */}
                {(() => {
                  const availableCouponsList = allCoupons.filter(c => !c.isUsed && !c.isExpired);
                  const luckyVouchers = availableCouponsList.filter(c => c.isLuckyDraw || String(c.code).includes("-"));
                  const bestLucky = luckyVouchers[0];

                  return (
                    <div className="rounded-2xl sm:rounded-3xl border-2 border-amber-500/30 bg-gradient-to-br from-card via-amber-500/[0.04] to-card shadow-warm p-4 sm:p-6 space-y-4 relative overflow-hidden transition-all">
                      {/* Ambient background glow */}
                      <div className="absolute -top-10 -right-10 size-36 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />

                      {/* Header Row */}
                      <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-3 flex-wrap sm:flex-nowrap">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="size-9 sm:size-10 rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-red-500 text-white flex items-center justify-center shadow-md shadow-orange-500/25 shrink-0">
                            <Ticket className="size-4.5 sm:size-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-serif text-sm sm:text-base font-bold text-foreground truncate">
                                Coupons &amp; Special Rewards
                              </h3>
                              {availableCouponsList.length > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold border border-emerald-500/30 shrink-0">
                                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse mr-1" />
                                  {availableCouponsList.length} Available
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                              {luckyVouchers.length > 0 
                                ? "✨ You have Lucky Draw vouchers ready to use!" 
                                : "Apply a promo code or voucher to save on your order"}
                            </p>
                          </div>
                        </div>

                        <Button
                          type="button"
                          onClick={() => {
                            fetchCoupons();
                            setShowCouponModal(true);
                          }}
                          className="rounded-xl text-xs h-8 px-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold shadow-2xs cursor-pointer flex items-center gap-1.5 transition-all active:scale-95 shrink-0 whitespace-nowrap ml-auto"
                        >
                          <Sparkles className="size-3.5" />
                          <span>Browse Vouchers</span>
                          <ArrowRight className="size-3" />
                        </Button>
                      </div>

                      {coupon ? (
                        /* Applied Coupon Celebration Card */
                        <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 p-3.5 sm:p-4 flex items-center justify-between gap-3 shadow-xs">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="size-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                              <Sparkles className="size-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono font-black text-xs sm:text-sm text-foreground uppercase tracking-wide">
                                  {coupon.code}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                                  Applied ✓
                                </span>
                                {coupon.isLuckyDraw && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                    🎰 Lucky Prize
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                You save ${discount.toFixed(2)} on this order! 🎉
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                fetchCoupons();
                                setShowCouponModal(true);
                              }}
                              className="h-8 px-2.5 text-xs font-bold rounded-xl border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer"
                            >
                              Change
                            </Button>
                            <button
                              type="button"
                              onClick={() => {
                                removeCoupon();
                                toast.info("Coupon removed");
                              }}
                              className="size-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                              title="Remove coupon"
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Lucky Prize Recommendation Banner if user won a voucher */}
                          {bestLucky && (
                            <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 p-3 sm:p-3.5 flex items-center justify-between gap-3 shadow-2xs">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="size-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center text-base shadow-sm shrink-0">
                                  🎰
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-xs sm:text-sm text-foreground truncate">
                                      {bestLucky.label || "Lucky Prize Discount"}
                                    </span>
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 uppercase">
                                      Won Prize
                                    </span>
                                  </div>
                                  <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                                    Code: <strong className="text-amber-600 dark:text-amber-400 font-bold">{bestLucky.code}</strong> {bestLucky.minOrder ? `• Min. $${bestLucky.minOrder}` : ""}
                                  </p>
                                </div>
                              </div>

                              <Button
                                type="button"
                                size="sm"
                                disabled={grossSubtotal < Number(bestLucky.minOrder || 0)}
                                onClick={() => {
                                  const acc = getCurrentAccount();
                                  applyCoupon(bestLucky, acc.storageKey);
                                  toast.success(`🎉 Applied Lucky Draw voucher "${bestLucky.code}"!`);
                                }}
                                className="h-8 px-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs shrink-0 cursor-pointer shadow-xs whitespace-nowrap active:scale-95"
                              >
                                Apply Voucher ✨
                              </Button>
                            </div>
                          )}

                          {/* Quick Manual Code Input Form */}
                          <div className="space-y-1.5">
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <Input
                                  value={couponCode}
                                  onChange={(e) => {
                                    setCouponCode(e.target.value.toUpperCase());
                                    if (couponError) setCouponError("");
                                  }}
                                  placeholder="Enter voucher code (e.g. PIZZA10)..."
                                  className="h-9.5 rounded-xl border-border/80 text-xs sm:text-sm uppercase font-mono font-bold bg-background/80 placeholder:font-normal placeholder:normal-case focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all"
                                />
                              </div>
                              <Button
                                type="button"
                                onClick={handleApplyCoupon}
                                disabled={!couponCode.trim() || isApplyingCoupon}
                                className="h-9.5 rounded-xl px-4 text-xs font-extrabold bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 cursor-pointer shadow-xs transition-all active:scale-95 whitespace-nowrap"
                              >
                                {isApplyingCoupon ? <Loader2 className="size-3.5 animate-spin" /> : "Apply Code"}
                              </Button>
                            </div>
                            {couponError && <p className="text-[11px] text-destructive font-semibold">{couponError}</p>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Desktop Sticky Order Summary Column */}
              <div className="hidden lg:block lg:sticky lg:top-28 lg:self-start">
                <div className="rounded-3xl border border-border/70 bg-card/60 backdrop-blur-xl shadow-sm p-6 space-y-5">
                  <div className="flex items-center justify-between border-b border-border/40 pb-3">
                    <h3 className="font-serif text-lg font-bold text-foreground">Order Summary</h3>
                    <span className="text-xs bg-secondary px-2.5 py-0.5 rounded-full font-semibold text-muted-foreground">
                      {itemCount} items
                    </span>
                  </div>

                  {/* Items List */}
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {lines.map((line) => (
                      <div key={line.id} className="flex items-center gap-3">
                        <img
                          src={line.image ? getImageUrl(line.image) : "/images/library/pizza.jpg"}
                          alt={line.name}
                          className="size-12 rounded-xl object-cover bg-secondary shrink-0 border border-border/40"
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/images/library/pizza.jpg"; }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{line.name}</p>
                          <p className="text-[11px] text-muted-foreground">Qty: {line.qty} × ${line.price.toFixed(2)}</p>
                        </div>
                        <span className="text-xs font-bold text-foreground shrink-0">
                          ${(line.price * line.qty).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Cost breakdown */}
                  <div className="space-y-2 border-t border-border/40 pt-3">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Subtotal</span>
                      <span className="font-medium text-foreground">${grossSubtotal.toFixed(2)}</span>
                    </div>
                    {coupon && (
                      <div className="flex items-center justify-between text-sm text-green-600 dark:text-green-400 font-medium">
                        <span className="flex items-center gap-1">
                          <Ticket className="size-4" /> Discount ({coupon.code})
                        </span>
                        <span>-${discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        Delivery Fee {deliveryDistance > 0 && <span className="text-xs">({deliveryDistance.toFixed(1)} km)</span>}
                      </span>
                      <span className={cn("font-medium", deliveryFee === 0 ? "text-green-600 dark:text-green-400" : "text-foreground")}>
                        {deliveryFee === 0 ? "FREE" : `$${deliveryFee.toFixed(2)}`}
                      </span>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="flex justify-between items-baseline pt-3 border-t border-border/60">
                    <div>
                      <span className="font-serif text-base font-bold text-foreground">Total</span>
                      <p className="text-[10px] text-muted-foreground">Taxes & fees included</p>
                    </div>
                    <span className="font-serif text-2xl font-bold text-primary">${total.toFixed(2)}</span>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={submitting}
                    className={cn(
                      "w-full h-12 rounded-full font-bold text-sm transition-all duration-200 shadow-md",
                      isPaymentVerified
                        ? "bg-green-600 hover:bg-green-700 text-white shadow-green-600/25"
                        : "bg-gradient-to-r from-primary to-orange-500 text-white shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.01]"
                    )}
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        Placing Order...
                      </span>
                    ) : isPaymentVerified ? (
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="size-4" />
                        Complete Order (Paid ✓)
                        <ArrowRight className="size-4 ml-1" />
                      </span>
                    ) : paymentMethod === "CASH" ? (
                      <>
                        Place Order (Pay on Delivery)
                        <ArrowRight className="size-4 ml-1.5" />
                      </>
                    ) : (
                      <>
                        Verify & Place Order
                        <ArrowRight className="size-4 ml-1.5" />
                      </>
                    )}
                  </Button>

                  <p className="text-center text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                    <ShieldCheck className="size-3.5 text-primary" /> 100% Safe & Secure Checkout
                  </p>
                </div>
              </div>

              {/* Mobile Fixed Sticky Bottom Action Bar */}
              <div className="lg:hidden fixed bottom-0 inset-x-0 bg-background border-t border-border/80 p-3.5 pb-[max(1.15rem,env(safe-area-inset-bottom))] z-40 shadow-2xl">
                <div className="max-w-md mx-auto flex items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                      Total ({itemCount} {itemCount === 1 ? "item" : "items"})
                    </span>
                    <span className="font-serif text-xl font-bold text-primary leading-none">
                      ${total.toFixed(2)}
                    </span>
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className={cn(
                      "flex-1 max-w-[220px] h-12 rounded-full font-bold text-sm shadow-md active:scale-95 transition-all",
                      isPaymentVerified
                        ? "bg-green-600 text-white hover:bg-green-700 shadow-green-600/25"
                        : "bg-gradient-to-r from-primary to-orange-500 text-white shadow-primary/25 hover:shadow-primary/40"
                    )}
                  >
                    {submitting ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="size-4 animate-spin" />
                        Processing...
                      </span>
                    ) : isPaymentVerified ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="size-4" />
                        Order (Paid ✓)
                        <ArrowRight className="size-4 ml-1" />
                      </span>
                    ) : paymentMethod === "CASH" ? (
                      <span className="flex items-center gap-1">
                        Place Order
                        <ArrowRight className="size-4 ml-1" />
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        Verify & Order
                        <ArrowRight className="size-4 ml-1" />
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </PageTransition>
      </main>

      {/* Saved Addresses Selection Modal */}
      <Dialog open={showAddressPickerModal} onOpenChange={setShowAddressPickerModal}>
        <DialogContent className="max-w-md w-[92vw] rounded-3xl p-5 border-border/60">
          <DialogHeader className="pb-3 border-b border-border/60">
            <DialogTitle className="font-serif text-lg font-bold flex items-center gap-2">
              <Building className="size-5 text-primary" /> Select Delivery Address
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Choose one of your saved delivery addresses.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2.5 py-2 max-h-[55vh] overflow-y-auto no-scrollbar">
            {savedAddresses.map((addr) => {
              const isSelected = selectedAddressId === addr.id;
              return (
                <div
                  key={addr.id}
                  onClick={() => {
                    handleSelectAddress(addr);
                    setShowAddressPickerModal(false);
                  }}
                  className={cn(
                    "cursor-pointer rounded-2xl p-3.5 border transition-all text-left relative flex items-start gap-3",
                    isSelected
                      ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                      : "border-border/60 bg-secondary/30 hover:border-border hover:bg-secondary/60"
                  )}
                >
                  <div className={cn("size-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5", isSelected ? "border-primary bg-primary text-white" : "border-muted-foreground/40")}>
                    {isSelected && <CheckCircle2 className="size-3.5 text-white" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs sm:text-sm text-foreground truncate">{addr.label || "Delivery Address"}</span>
                      {addr.is_default && (
                        <span className="text-[9px] bg-primary/15 text-primary px-1.5 py-0.2 rounded font-bold uppercase">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{addr.address_line}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="pt-2 border-t border-border/60 flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAddressPickerModal(false);
                setShowDeliveryDetails(true);
              }}
              className="rounded-full text-xs text-primary font-semibold hover:bg-primary/10"
            >
              + Enter Custom Address
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Map Picker Modal */}
      <Dialog open={showMapModal} onOpenChange={setShowMapModal}>
        <DialogContent className="max-w-lg w-[94vw] rounded-3xl p-5 border-border/60">
          <DialogHeader className="pb-2 border-b border-border/60">
            <DialogTitle className="font-serif text-lg font-bold flex items-center gap-2">
              <MapPin className="size-5 text-primary" /> Pin Delivery Location
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Drag the pin on the map to set your exact delivery location.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <MapPicker
              onConfirm={(loc) => {
                const pinnedAddress = loc.address || "";
                const pinnedCity = loc.city || "Phnom Penh";
                if (pinnedAddress) setValue("address1", pinnedAddress);
                if (pinnedCity) setValue("city", pinnedCity);
                const fn = getValues("fullName") || "";
                const ph = getValues("phone") || "";
                saveAddressToLocal(pinnedAddress, pinnedCity, "Pinned Location", fn, ph, loc.lat, loc.lng);
                setShowMapModal(false);
                toast.success("Location pinned and saved from map!");
              }}
              onClose={() => setShowMapModal(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Available Coupons Selection Modal */}
      <Dialog open={showCouponModal} onOpenChange={setShowCouponModal}>
        <DialogContent className="max-w-md w-[92vw] rounded-3xl p-5 border-border/60">
          <DialogHeader className="pb-3 border-b border-border/60">
            <DialogTitle className="font-serif text-lg font-bold flex items-center gap-2">
              <Ticket className="size-5 text-primary" /> Select Available Coupon
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select a coupon code to apply to your order.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2.5 py-2 max-h-[55vh] overflow-y-auto no-scrollbar">
            {loadingCoupons ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            ) : allCoupons.length > 0 ? (
              allCoupons.map((c) => {
                const isSelected = coupon?.id === c.id;
                const minOrder = Number(c.min_order_amount || 0);
                const isMinOrderNotMet = grossSubtotal > 0 && minOrder > 0 && grossSubtotal < minOrder;
                const isUsed = c.isUsed;

                return (
                  <div
                    key={c.id}
                    className={cn(
                      "rounded-2xl p-3.5 border transition-all flex items-center justify-between gap-3",
                      isSelected
                        ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                        : (isMinOrderNotMet || isUsed)
                          ? "border-border/40 bg-muted/20 opacity-70"
                          : "border-border/60 bg-secondary/30 hover:border-primary/50 hover:bg-secondary/60 cursor-pointer"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground">{c.code}</span>
                        {c.isLuckyDraw && (
                          <span className="text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1">
                            <Sparkles className="size-2.5 text-amber-500" />
                            Lucky Prize
                          </span>
                        )}
                        <span className="text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded-full font-bold uppercase">
                          {c.discount_type === "FREE_DELIVERY"
                            ? "Free Delivery"
                            : c.discount_type === "PERCENTAGE"
                              ? `${c.discount_value}% OFF`
                              : `$${c.discount_value} OFF`}
                        </span>
                        {c.isLuckyDraw && c.tier && (
                          <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded-full border border-border/50 text-muted-foreground font-semibold">
                            {c.tier}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {c.description || (c.discount_type === "FREE_DELIVERY" ? "Free delivery on your order" : `Get discount on your pizza order`)}
                      </p>
                      {c.isLuckyDraw && c.expiresAt && !c.isUsed && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
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
                      disabled={isMinOrderNotMet || isSelected || isUsed}
                      onClick={() => {
                        const acc = getCurrentAccount();
                        applyCoupon(c, acc.storageKey);
                        setShowCouponModal(false);
                        toast.success(`Coupon "${c.code}" applied!`);
                      }}
                      className={cn(
                        "rounded-full text-xs h-8 px-3 font-semibold shrink-0",
                        isSelected
                          ? "bg-[#6BCF8E] text-white hover:bg-[#5bb87a]"
                          : (isUsed || isMinOrderNotMet)
                            ? "bg-muted-foreground/20 text-muted-foreground"
                            : "bg-primary text-white hover:bg-primary/90"
                      )}
                    >
                      {isSelected ? "Applied ✓" : isUsed ? "Used" : "Apply"}
                    </Button>
                  </div>
                );
              })
            ) : (
              <p className="text-center py-6 text-sm text-muted-foreground">
                No active coupons available right now.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment is now handled in dedicated /payment page */}
    </div>
  );
}

export default CheckoutPage;
