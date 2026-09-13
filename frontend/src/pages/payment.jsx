import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { QrCode, CheckCircle2, ShieldCheck, Loader2, CreditCard, X, RefreshCw, Landmark, AlertCircle, ChevronLeft, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { get, create, update, list, API_URL } from "@/lib/api";
import { toast } from "sonner";
import { QRCodeCanvas } from "qrcode.react";
import { BakongKHQR, IndividualInfo } from "bakong-khqr";
import { getCurrentAccount, addBonusSpins, markWonCouponUsed } from "@/components/food/lucky-draw-modal.jsx";
import { triggerFoodRefresh } from "@/lib/food-api";
import { useCart } from "@/lib/cart-store";
import { cn } from "@/lib/utils";

// QR session: total validity 5 minutes (300s)
// Bakong token (verify) schedule per QR: 5 tokens total, no check at start.
//   - Token 1: 60s, Token 2: 120s, Token 3: 180s, Token 4: 240s
//   - Token 5: 300s (decisive close check) — if paid → success, else close QR
//   - Last 60s (240s -> 300s): QR shown but scanning is closed, waiting for the
//     decisive verify. After 300s the QR is invalidated; any later bank scan
//     is never accepted (no further checks).
const QR_VALIDITY_MS = 5 * 60 * 1000; // 5 minutes hard cap
const TOKEN_SCHEDULE_SECONDS = [60, 120, 180, 240]; // 4 scheduled + 1 decisive at close = 5
const SCAN_CUTOFF_SECONDS = 240; // scanning closed after this point

export default function PaymentGatewayPage() {
  const { orderId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [qrCodeString, setQrCodeString] = useState("");
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [manualChecksCount, setManualChecksCount] = useState(0);
  const MAX_MANUAL_CHECKS = 2;
  const [isSwitchingMethod, setIsSwitchingMethod] = useState(false);
  const qrCreatedAtRef = useRef(0);
  const paidRef = useRef(false);
  const [totalAmount, setTotalAmount] = useState(location.state?.total || 0);
  const paymentMethod = location.state?.paymentMethod || "KHQR";
  const formData = location.state?.formData;
  const cartItems = location.state?.cartItems;

  useEffect(() => {
    if (!orderId && !formData) {
      navigate("/");
      return;
    }

    const loadOrderData = async () => {
      if (orderId && !totalAmount) {
        try {
          const ord = await get("orders", orderId);
          if (ord && ord.total) {
            setTotalAmount(Number(ord.total));
          }
        } catch (e) {
          console.error("Failed to fetch order:", e);
        }
      }
    };
    loadOrderData();
  }, [orderId, formData, navigate, totalAmount]);

  const generateQR = (amountToUse = totalAmount) => {
    // Every generated QR starts a fresh session: new 5-minute validity + new token schedule
    qrCreatedAtRef.current = Date.now();
    paidRef.current = false;
    setTimeLeft(300);
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
        console.log("Generated KHQR String:", res.data.qr);
      } else {
        throw new Error(res?.status?.message || "Invalid QR response");
      }
    } catch (e) {
      console.error("Failed to generate KHQR", e);
      // Fallback KHQR simulation string
      setQrCodeString(`https://bakong.nbc.gov.kh/pay?account=khemara_chantha1@bkrt&amount=${Number(amountToUse || 0).toFixed(2)}&currency=USD`);
    }
  };

  useEffect(() => {
    if (!orderId && !formData) return;

    if (totalAmount > 0 && (paymentMethod === "KHQR" || paymentMethod === "ABA_PAY")) {
      generateQR(totalAmount);
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Decisive 5th token at close (300s): if paid → success, else close QR.
          // The QR is now invalidated — any later bank scan won't be accepted.
          (async () => {
            const ok = await checkPaymentVerification();
            if (!ok && !paidRef.current) {
              toast.error("QR Code expired. Please refresh to get a new one.");
            }
          })();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [orderId, formData, totalAmount, navigate, paymentMethod]);

  useEffect(() => {
    if (paymentMethod === "CARD") {
      // Auto-confirm CARD after 4 seconds
      const autoConfirmTimer = setTimeout(() => {
        handleSimulatePayment();
      }, 4000);
      return () => clearTimeout(autoConfirmTimer);
    }
  }, [paymentMethod, totalAmount]);

  const checkPaymentVerification = async (isManual = false) => {
    if (paidRef.current || !qrCodeString) return false;

    // Never verify with Bakong after the 5-minute hard cap (+ small grace so the
    // decisive close check at 300s can still fire before the QR is invalidated)
    if (Date.now() - qrCreatedAtRef.current > QR_VALIDITY_MS + 10_000) {
      toast.error("QR អស់សុពលភាព (5 នាទី)។ ការទូទាត់មិនត្រូវបានទទួលយកទេ។");
      return false;
    }

    setIsVerifying(true);
    try {
      let success = false;
      
      if (orderId) {
        // Verify using order ID
        const response = await fetch(`${API_URL}/payments/verify-khqr`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            qr_code_string: qrCodeString || "dummy",
            qrCodeString: qrCodeString || "dummy",
            order_id: orderId,
            orderId,
            qr_created_at: qrCreatedAtRef.current
          })
        });
        const data = await response.json();
        if (data.status === "EXPIRED") {
          toast.error("Server បដិសេធ: QR អស់សុពលភាពក្រោយ 5 នាទី។ ការទូទាត់មិនត្រូវបានទទួលយកទេ។");
          return false;
        }
        if (data.status === "LIMIT_EXCEEDED" || data.errorCode === 17) {
          if (isManual) toast.error("Bakong API daily limit reached. Please try again later or pay with Cash.");
          return false;
        }
        success = data.status === "SUCCESS";
      } else {
        // Fallback: check recent payments by amount
        const payments = await list("payments");
        const matchingPayment = payments.find(p => 
          p.amount == totalAmount && 
          ["KHQR", "ABA_PAY"].includes(p.method) && 
          ["PAID", "CONFIRMED"].includes(p.status)
        );
        success = !!matchingPayment;
      }

      if (success) {
        await processSuccessfulPayment();
        return true;
      } else if (isManual) {
        const remaining = Math.max(0, MAX_MANUAL_CHECKS - manualChecksCount);
        toast.warning(
          `មិនទាន់ទទួលបានការផ្ទេរប្រាក់ទេ។ សូមរង់ចាំបន្តិច ឬពិនិត្យក្នុង App ធនាគាររបស់អ្នកម្ដងទៀត។${remaining > 0 ? ` (នៅសល់សិទ្ធិចុច ${remaining} ដង)` : " (អស់សិទ្ធិចុចផ្ទៀងផ្ទាត់ហើយ — សូមរង់ចាំការពិនិត្យស្វ័យប្រវត្តិ)"}`,
          { duration: 5000 }
        );
      }
    } catch (err) {
      console.error("Verification error:", err);
      if (isManual) {
        toast.error("មិនអាចទាក់ទងទៅប្រព័ន្ធ Bakong បានទេនៅពេលនេះ។ សូមរង់ចាំបន្តិចទៀត។");
      }
    } finally {
      setIsVerifying(false);
    }
    return false;
  };

  const handleManualCheck = async () => {
    if (isVerifying) return;
    if (manualChecksCount >= MAX_MANUAL_CHECKS) {
      toast.info("អ្នកបានចុចផ្ទៀងផ្ទាត់គ្រប់ចំនួនកំណត់ (២ ដង) ហើយ។ សូមរង់ចាំប្រព័ន្ធផ្ទៀងផ្ទាត់ដោយស្វ័យប្រវត្តិតាមពេលកំណត់។");
      return;
    }
    setManualChecksCount(prev => prev + 1);
    await checkPaymentVerification(true);
  };
  const createOrderFromFormData = async (methodToUse = paymentMethod, orderStatus = "CONFIRMED", paymentStatus = "PAID") => {
    if (!formData || !cartItems) return null;

    let customerId = formData.customerId;
    if (!customerId && formData.phone) {
      try {
        const customers = await list("customers");
        let currentCust = customers.find((item) => item.phone === formData.phone);
        if (!currentCust) {
          currentCust = await create("customers", {
            name: formData.fullName || "Guest",
            phone: formData.phone,
            email: formData.email || null,
            status: "ACTIVE",
          });
        }
        customerId = currentCust?.id;
      } catch (e) {
        console.warn("Customer handling error in payment:", e);
      }
    }

    let addressId = formData.addressId;
    if (!addressId || String(addressId).startsWith("local-")) {
      try {
        const address = await create("addresses", {
          customer_id: customerId || null,
          label: "Delivery",
          address_line: `${formData.address1 || ""}${formData.address2 ? `, ${formData.address2}` : ""}`.trim() || "Phnom Penh",
          city: formData.city || "Phnom Penh",
          notes: formData.notes || null,
          is_default: true,
        });
        addressId = address?.id;
      } catch (e) {
        console.warn("Address create error in payment:", e);
      }
    }

    const dbTotal = Number(Number(totalAmount).toFixed(2));
    const newOrder = await create("orders", {
      order_number: `FC-${Date.now()}`,
      customer_id: customerId ? Number(customerId) : null,
      address_id: addressId ? Number(addressId) : null,
      status: orderStatus,
      order_type: "DELIVERY",
      subtotal: Number(Number(formData.subtotal || dbTotal).toFixed(2)),
      discount_amount: Number(Number(formData.discount || 0).toFixed(2)),
      delivery_fee: Number(Number(formData.deliveryFee || 0).toFixed(2)),
      driver_commission: 0.00,
      total: dbTotal,
      notes: formData.notes || null,
    });

    const newOrderId = newOrder.id;

    await Promise.all(
      cartItems.map((item) =>
        create("order_items", {
          order_id: newOrderId,
          product_id: Number(item.originalId || item.id || item.productId),
          product_name: item.name || item.productName || "Pizza Item",
          quantity: item.qty || item.quantity || 1,
          unit_price: Number(Number(item.price || item.unitPrice || 0).toFixed(2)),
          line_total: Number((Number(item.price || item.unitPrice || 0) * (item.qty || item.quantity || 1)).toFixed(2)),
          status: "PENDING",
          options: item.selectedOptions ? JSON.stringify(item.selectedOptions) : null,
        })
      )
    );

    try {
      triggerFoodRefresh();
    } catch (e) {
      console.warn("Food refresh error:", e);
    }

    const dbMethod = ["CASH", "CARD", "ABA_PAY", "WING"].includes(methodToUse) ? methodToUse : "KHQR";
    await create("payments", {
      order_id: newOrderId,
      method: dbMethod,
      status: paymentStatus,
      amount: dbTotal,
    });

    const coupon = formData.coupon;
    if (coupon && coupon.isLuckyDraw) {
      try {
        const acc = getCurrentAccount();
        markWonCouponUsed(acc.storageKey, coupon.code);
      } catch (e) {
        console.warn("Lucky draw coupon error:", e);
      }
    } else if (coupon && customerId) {
      try {
        await create("coupon_usages", {
          coupon_id: coupon.id,
          customer_id: customerId,
          order_id: newOrderId,
          used_at: new Date().toISOString(),
        });
        if (typeof update === "function") {
          await update("coupons", coupon.id, {
            ...coupon,
            used_count: (coupon.used_count || 0) + 1,
          });
        }
      } catch (e) {
        console.warn("Coupon usage error:", e);
      }
    }

    try {
      const acc = getCurrentAccount();
      addBonusSpins(acc.storageKey, 1);
    } catch (e) {}

    try {
      useCart.getState().clear();
    } catch (e) {}

    return newOrderId;
  };

  const processSuccessfulPayment = async () => {
    // Guard: reject any payment confirmed after the 5-minute QR validity
    if ((paymentMethod === "KHQR" || paymentMethod === "ABA_PAY") && Date.now() - qrCreatedAtRef.current > QR_VALIDITY_MS) {
      toast.error("ការទូទាត់ត្រូវបានបដិសេធ — QR អស់សុពលភាពក្រោយ 5 នាទី។");
      return;
    }
    paidRef.current = true;
    setIsPaid(true);

    toast.success("Payment confirmed successfully! ទទួលបានការទូទាត់ជោគជ័យ");

    if (formData && cartItems) {
      try {
        const newOrderId = await createOrderFromFormData(paymentMethod, "CONFIRMED", "PAID");
        setTimeout(() => {
          navigate("/order-confirmation", {
            replace: true,
            state: {
              orderId: newOrderId,
              total: Number(totalAmount),
              itemCount: location.state?.itemCount || cartItems.length,
              paymentMethod,
              address: location.state?.address || `${formData.address1 || ""}, ${formData.city || "Phnom Penh"}`,
            }
          });
        }, 1500);
      } catch (e) {
        console.error("Failed to create order after payment:", e);
        toast.error("Payment successful but order creation failed. Please contact support.");
        setTimeout(() => {
          navigate("/order-confirmation", { replace: true });
        }, 1500);
      }
    } else if (orderId) {
      try {
        const dbMethod = ["CASH", "CARD", "ABA_PAY", "WING"].includes(paymentMethod) ? paymentMethod : "KHQR";
        const paymentsRes = await list("payments", { limit: 100 }).catch(() => []);
        const paymentList = Array.isArray(paymentsRes) ? paymentsRes : (paymentsRes.items || paymentsRes.content || []);
        const existingPayment = paymentList.find(p => String(p.order_id || p.orderId) === String(orderId));

        if (existingPayment?.id) {
          await update("payments", existingPayment.id, {
            method: dbMethod,
            status: "PAID",
            amount: Number(Number(totalAmount).toFixed(2))
          });
        } else {
          await create("payments", {
            order_id: orderId,
            method: dbMethod,
            status: "PAID",
            amount: Number(Number(totalAmount).toFixed(2))
          }).catch(() => {});
        }
        await update("orders", orderId, { status: "CONFIRMED" });
      } catch (e) {
        console.error("Failed to update existing order:", e);
      }

      try {
        useCart.getState().clear();
      } catch (e) {}

      const confirmationState = {
        orderId,
        total: Number(totalAmount),
        itemCount: location.state?.itemCount || 1,
        paymentMethod,
        address: location.state?.address || "Phnom Penh",
      };
      setTimeout(() => {
        navigate("/order-confirmation", { replace: true, state: confirmationState });
      }, 1500);
    } else {
      setTimeout(() => {
        navigate("/order-confirmation", { replace: true });
      }, 1500);
    }
  };

  // Bakong token verification schedule — 4 scheduled tokens per QR, no check at start.
  // 60s / 120s / 180s / 240s. The decisive 5th token fires at close (300s) from
  // the countdown effect: if paid → success, else the QR is invalidated & closed.
  // If the user has already paid, the next scheduled token confirms it immediately.
  useEffect(() => {
    if (paymentMethod !== "KHQR" && paymentMethod !== "ABA_PAY") return;
    if (!qrCodeString) return;

    const createdAt = qrCreatedAtRef.current;
    const timeouts = TOKEN_SCHEDULE_SECONDS
      .map((t) => t * 1000 - (Date.now() - createdAt))
      .filter((delay) => delay > 0)
      .map((delay) => setTimeout(() => {
        checkPaymentVerification();
      }, delay));

    return () => timeouts.forEach(clearTimeout);
  }, [qrCodeString, orderId, paymentMethod, totalAmount]);

  const handleSimulatePayment = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await processSuccessfulPayment();
    } catch (err) {
      toast.error("Payment confirmation failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToCash = async () => {
    if (isSwitchingMethod) return;
    setIsSwitchingMethod(true);
    try {
      if (formData && cartItems) {
        const newOrderId = await createOrderFromFormData("CASH", "PENDING", "PENDING");
        toast.success("បានប្តូរទៅបង់ប្រាក់សុទ្ធ (Cash on Delivery) ជោគជ័យ!");
        setShowExitConfirm(false);
        navigate("/order-confirmation", {
          replace: true,
          state: {
            orderId: newOrderId,
            total: Number(totalAmount),
            itemCount: location.state?.itemCount || cartItems.length,
            paymentMethod: "CASH",
            address: location.state?.address || `${formData.address1 || ""}, ${formData.city || "Phnom Penh"}`
          }
        });
        return;
      }

      if (orderId) {
        let switched = false;
        try {
          const res = await fetch(`${API_URL}/payments/switch-to-cash`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId })
          });
          if (res.ok) {
            switched = true;
          }
        } catch (err) {
          console.warn("Backend switch-to-cash endpoint call failed, falling back to direct update:", err);
        }

        if (!switched) {
          // Fallback: update existing payment record instead of creating duplicate
          const paymentsRes = await list("payments", { limit: 100 }).catch(() => []);
          const paymentList = Array.isArray(paymentsRes) ? paymentsRes : (paymentsRes.items || paymentsRes.content || []);
          const existingPayment = paymentList.find(p => String(p.order_id || p.orderId) === String(orderId));

          if (existingPayment?.id) {
            await update("payments", existingPayment.id, {
              method: "CASH",
              status: "PENDING",
              amount: Number(Number(totalAmount).toFixed(2))
            });
          } else {
            await create("payments", {
              order_id: orderId,
              method: "CASH",
              status: "PENDING",
              amount: Number(Number(totalAmount).toFixed(2))
            }).catch(e => console.warn("Payment insert fallback:", e));
          }

          await update("orders", orderId, {
            status: "PENDING"
          });
        }
        try {
          useCart.getState().clear();
        } catch (e) {}

        toast.success("បានប្តូរទៅបង់ប្រាក់សុទ្ធ (Cash on Delivery) ជោគជ័យ!");
        setShowExitConfirm(false);
        navigate("/order-confirmation", {
          replace: true,
          state: {
            orderId,
            total: Number(totalAmount),
            itemCount: location.state?.itemCount || 1,
            paymentMethod: "CASH",
            address: location.state?.address || "Phnom Penh"
          }
        });
      }
    } catch (e) {
      console.error("Failed to switch to cash:", e);
      toast.error("មិនអាចប្តូរវិធីទូទាត់បានទេ សូមព្យាយាមម្តងទៀត");
    } finally {
      setIsSwitchingMethod(false);
    }
  };

  const handleCancelAndExit = async () => {
    setShowExitConfirm(false);
    if (orderId) {
      try {
        await update("orders", orderId, { status: "CANCELLED" });
      } catch (e) {
        console.warn("Failed to mark order as cancelled:", e);
      }
    }
    toast.info("បានត្រឡប់ក្រោយ។ អ្នកអាចជ្រើសរើសវិធីទូទាត់សារជាថ្មីបាន។");
    navigate("/checkout", { replace: true });
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-3 sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-card rounded-3xl overflow-hidden shadow-2xl border border-border/60"
      >
        {/* Modern Flex Header - No absolute overlap */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 px-4 py-3.5 text-white">
          <div className="flex items-center justify-between gap-2">
            <button 
              onClick={handleCancelAndExit} 
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/20 hover:bg-black/30 backdrop-blur-md active:scale-95 transition-all text-xs font-bold text-white border border-white/20 cursor-pointer shrink-0 shadow-sm"
              title="ថយក្រោយទៅ Checkout"
            >
              <ChevronLeft className="size-4" />
              <span>ថយក្រោយ</span>
            </button>

            <div className="flex flex-col items-center text-center min-w-0">
              <div className="flex items-center gap-1 text-[11px] font-bold tracking-wider uppercase text-red-100">
                <ShieldCheck className="size-3.5 text-emerald-300" />
                <span>FLAME &amp; CRUST</span>
              </div>
              <span className="text-xs font-bold text-white/90 truncate">Secure Checkout</span>
            </div>

            <button 
              onClick={handleCancelAndExit} 
              className="size-8 rounded-full bg-black/20 hover:bg-black/30 backdrop-blur-md flex items-center justify-center active:scale-95 transition-all text-white border border-white/20 cursor-pointer shrink-0 shadow-sm"
              title="ចាកចេញ"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-7 flex flex-col items-center">
          {isPaid ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="py-10 flex flex-col items-center text-center space-y-4"
            >
              <div className="size-20 rounded-full bg-green-500/15 text-green-500 flex items-center justify-center">
                <CheckCircle2 className="size-12" />
              </div>
              <h2 className="font-serif text-2xl font-bold text-foreground">Payment Received!</h2>
              <p className="text-sm text-muted-foreground">Redirecting to order confirmation...</p>
            </motion.div>
          ) : (
            <>
              {/* Payment Amount Display */}
              <div className="text-center mb-4">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1">
                  {paymentMethod === "KHQR" ? "🇰🇭 Bakong KHQR" : paymentMethod.replace("_", " ")}
                </span>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">សូមស្កេន QR ខាងក្រោមដើម្បីទូទាត់ប្រាក់</p>
                <div className="text-4xl sm:text-5xl font-black text-foreground tracking-tight mt-1">
                  ${Number(totalAmount).toFixed(2)}
                </div>
              </div>

              {/* QR Code Container */}
              <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-xl border-2 border-primary/15 mb-3 relative group overflow-hidden">
                {paymentMethod === "CARD" ? (
                  <div className="size-48 flex items-center justify-center bg-blue-50/50 rounded-2xl border-2 border-blue-100">
                    <motion.div
                      animate={{
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0]
                      }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      <CreditCard className="size-24 text-blue-500" />
                    </motion.div>
                  </div>
                ) : qrCodeString ? (
                  <div className="p-2 bg-white rounded-2xl">
                    <QRCodeCanvas
                      value={qrCodeString}
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                ) : (
                  <div className="size-48 flex flex-col items-center justify-center border-2 border-dashed border-border/60 rounded-2xl bg-muted/30">
                    <QrCode className="size-12 text-muted-foreground mb-3 opacity-50" />
                    <Button type="button" size="sm" onClick={generateQR} className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                      Generate KHQR
                    </Button>
                  </div>
                )}

                {/* Final 30 seconds: scanning closed */}
                {paymentMethod !== "CARD" && qrCodeString && timeLeft > 0 && timeLeft <= (300 - SCAN_CUTOFF_SECONDS) && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm rounded-3xl gap-2">
                    <Loader2 className="size-8 animate-spin text-primary" />
                    <p className="text-sm font-bold text-zinc-900">បានបិទការស្កេន</p>
                    <p className="text-xs text-zinc-500">កំពុងផ្ទៀងផ្ទាត់ចុងក្រោយជាមួយ Bakong...</p>
                  </div>
                )}

                {/* Scanning laser animation overlay for QR codes */}
                {paymentMethod !== "CARD" && qrCodeString && timeLeft > (300 - SCAN_CUTOFF_SECONDS) && (
                  <motion.div
                    className="absolute top-5 left-5 h-1 bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.9)] rounded-full z-10"
                    style={{ width: "200px" }}
                    animate={{ y: [0, 200, 0] }}
                    transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
                  />
                )}
              </div>

              {/* Status & Countdown Pill */}
              <div className="w-full max-w-[340px] mb-4 flex items-center justify-between gap-2 py-2 px-3.5 rounded-2xl bg-secondary/70 border border-border/70">
                <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <span className="relative flex size-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500"></span>
                  </span>
                  <span>កំពុងរង់ចាំការស្កេន...</span>
                </div>
                <div className="font-mono font-bold text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full border border-primary/20">
                  {formatTime(timeLeft)}
                </div>
              </div>

              {/* Action buttons */}
              <div className="w-full space-y-3">
                {paymentMethod !== "CARD" && (
                  <Button
                    type="button"
                    onClick={handleManualCheck}
                    disabled={isVerifying || manualChecksCount >= MAX_MANUAL_CHECKS || timeLeft <= 0}
                    className={cn(
                      "w-full h-13 rounded-2xl font-bold text-sm sm:text-base shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer",
                      manualChecksCount >= MAX_MANUAL_CHECKS
                        ? "bg-muted text-muted-foreground border border-border/60 cursor-not-allowed opacity-80"
                        : "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/25"
                    )}
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="size-5 animate-spin" />
                        <span>កំពុងទាក់ទង Bakong ផ្ទៀងផ្ទាត់...</span>
                      </>
                    ) : manualChecksCount >= MAX_MANUAL_CHECKS ? (
                      <>
                        <CheckCircle2 className="size-5 text-muted-foreground" />
                        <span>បានចុចគ្រប់កំណត់ (២/២ ដង)</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="size-5 text-emerald-200" />
                        <span>ខ្ញុំបានបាញ់លុយរួចរាល់ / ពិនិត្យឥឡូវ</span>
                        <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                          សល់ {MAX_MANUAL_CHECKS - manualChecksCount} ដង
                        </span>
                      </>
                    )}
                  </Button>
                )}

                {paymentMethod !== "CARD" && (
                  <p className="text-[11px] text-center text-muted-foreground px-2 leading-relaxed">
                    {manualChecksCount >= MAX_MANUAL_CHECKS ? (
                      <span className="text-amber-500 font-medium">
                        ⚠️ អ្នកបានចុចគ្រប់ ២ ដងហើយ។ ប្រព័ន្ធកំពុងពិនិត្យស្វ័យប្រវត្តិតាមវដ្ត។
                      </span>
                    ) : (
                      <span>
                        💡 បន្ទាប់ពីបាញ់លុយក្នុង App ធនាគាររួច អ្នកអាចចុចប៊ូតុងខាងលើដើម្បីផ្ទៀងផ្ទាត់ភ្លាមៗ
                      </span>
                    )}
                  </p>
                )}

                {/* Bottom Navigation Buttons */}
                <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-border/60">
                  <button
                    onClick={handleCancelAndExit}
                    type="button"
                    className="h-11 rounded-xl border border-border/80 bg-secondary/50 hover:bg-secondary active:scale-95 text-foreground font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <ArrowLeft className="size-4 text-muted-foreground" />
                    <span>ថយក្រោយ (ដូរវិធីទូទាត់)</span>
                  </button>

                  {qrCodeString && (
                    <button
                      onClick={generateQR}
                      type="button"
                      className="h-11 rounded-xl border border-border/80 bg-secondary/50 hover:bg-secondary active:scale-95 text-foreground font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <RefreshCw className="size-4 text-muted-foreground" />
                      <span>បង្កើត QR ថ្មី</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
