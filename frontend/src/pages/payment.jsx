import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { QrCode, CheckCircle2, ShieldCheck, Loader2, CreditCard, X, RefreshCw, Landmark, AlertCircle } from "lucide-react";
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
import { getCurrentAccount, addBonusSpins } from "@/components/food/lucky-draw-modal.jsx";
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

  const processSuccessfulPayment = async () => {
    // Guard: reject any payment confirmed after the 5-minute QR validity
    if ((paymentMethod === "KHQR" || paymentMethod === "ABA_PAY") && Date.now() - qrCreatedAtRef.current > QR_VALIDITY_MS) {
      toast.error("ការទូទាត់ត្រូវបានបដិសេធ — QR អស់សុពលភាពក្រោយ 5 នាទី។");
      return;
    }
    paidRef.current = true;
    setIsPaid(true);

    // Clear cart upon successful payment
    try {
      useCart.getState().clear();
    } catch (e) {}

    toast.success("Payment confirmed successfully! ទទួលបានការទូទាត់ជោគជ័យ");
    
    // Handle navigation based on whether we have formData
    if (formData && cartItems) {
      // Create order after payment
      try {
        // Create customer if needed
        let customerId = null;
        if (formData.phone) {
          const customers = await list("customers");
          let currentCust = customers.find((item) => item.phone === formData.phone);
          if (!currentCust) {
            currentCust = await create("customers", {
              name: formData.fullName,
              phone: formData.phone,
              email: formData.email || null,
              status: "ACTIVE",
            });
          }
          customerId = currentCust?.id;
        }

        // Create address
        const address = await create("addresses", {
          customer_id: customerId || null,
          label: "Delivery",
          address_line: `${formData.address1}${formData.address2 ? `, ${formData.address2}` : ""}`,
          city: formData.city || "Phnom Penh",
          notes: formData.notes || null,
          is_default: true,
        });

        // Create order
        const newOrder = await create("orders", {
          customer_id: customerId,
          address_id: address.id,
          total: totalAmount,
          status: "PAID",
          payment_method: paymentMethod,
          notes: formData.notes || null,
        });

        // Create order items
        for (const item of cartItems) {
          await create("order_items", {
            order_id: newOrder.id,
            product_id: item.productId,
            quantity: item.quantity,
            price: item.price,
            special_requests: item.specialRequests || null,
          });
        }

        // Trigger real-time auto-update of trending scores and rankings across active tabs
        try {
          triggerFoodRefresh();
        } catch (e) {
          console.warn("Error triggering food refresh:", e);
        }
        
        // Create payment record
        const dbMethod = ["CASH", "CARD", "ABA_PAY", "WING"].includes(paymentMethod) ? paymentMethod : "KHQR";
        await create("payments", {
          order_id: newOrder.id,
          method: dbMethod,
          status: "PAID",
          amount: Number(Number(totalAmount).toFixed(2))
        });

        // Award +1 Lucky Spin for ordering pizza!
        try {
          const acc = getCurrentAccount();
          addBonusSpins(acc.storageKey, 1);
        } catch (e) {}

        setTimeout(() => {
          navigate(`/order-confirmation`, {
            state: {
              orderId: newOrder.id,
              total: Number(totalAmount),
              itemCount: location.state?.itemCount || 1,
              paymentMethod,
              address: location.state?.address || "Phnom Penh",
            }
          });
        }, 1500);
      } catch (e) {
        console.error("Failed to create order after payment:", e);
        toast.error("Payment successful but order creation failed. Please contact support.");
        setTimeout(() => {
          navigate("/order-confirmation");
        }, 1500);
      }
    } else if (orderId) {
      // Order already exists, just update it and create payment record
      try {
        const dbMethod = ["CASH", "CARD", "ABA_PAY", "WING"].includes(paymentMethod) ? paymentMethod : "KHQR";
        await create("payments", {
          order_id: orderId,
          method: dbMethod,
          status: "PAID",
          amount: Number(Number(totalAmount).toFixed(2))
        });
        await update("orders", orderId, { status: "CONFIRMED" });
      } catch (e) {
        console.error("Failed to update existing order:", e);
      }
      
      const confirmationState = {
        orderId,
        total: Number(totalAmount),
        itemCount: location.state?.itemCount || 1,
        paymentMethod,
        address: location.state?.address || "Phnom Penh",
      };
      setTimeout(() => {
        navigate("/order-confirmation", { state: confirmationState });
      }, 1500);
    } else {
      setTimeout(() => {
        navigate("/order-confirmation");
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
      if (orderId) {
        await update("orders", orderId, {
          payment_method: "CASH",
          status: "PENDING"
        });
        await create("payments", {
          order_id: orderId,
          method: "CASH",
          status: "PENDING",
          amount: Number(Number(totalAmount).toFixed(2))
        });
      }
      try {
        useCart.getState().clear();
      } catch (e) {}

      toast.success("បានប្តូរវិធីទូទាត់ទៅជា 'បង់ប្រាក់សុទ្ធពេលដឹកដល់ (Cash)' ជោគជ័យ!");
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
    toast.info("បានបោះបង់ការទូទាត់។ ការបញ្ជាទិញមិនត្រូវបានគិតជាផ្លូវការទេ។");
    navigate("/checkout", { replace: true });
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-card rounded-3xl overflow-hidden shadow-2xl border border-border/60"
      >
        <div className="bg-primary p-6 text-center text-primary-foreground relative">
          <ShieldCheck className="size-8 absolute top-6 left-6 opacity-50" />
          <button 
            onClick={() => setShowExitConfirm(true)} 
            className="absolute top-6 right-6 opacity-70 hover:opacity-100 transition-opacity bg-primary-foreground/10 rounded-full p-1 cursor-pointer"
            title="ប្តូរវិធីទូទាត់ / ចាកចេញ"
          >
            <X className="size-6" />
          </button>
          <h1 className="font-serif text-2xl font-bold">Secure Checkout</h1>
          <p className="text-primary-foreground/80 mt-1">{paymentMethod.replace("_", " ")}</p>
        </div>

        <div className="p-6 sm:p-8 flex flex-col items-center">
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
              <div className="text-center mb-6">
                <p className="text-muted-foreground text-sm sm:text-base font-medium">សូមស្កេន QR ខាងក្រោមដើម្បីទូទាត់ប្រាក់</p>
                <p className="text-4xl sm:text-5xl font-bold text-foreground mt-2">${Number(totalAmount).toFixed(2)}</p>
              </div>

              <div className="bg-white p-4 rounded-2xl shadow-sm mb-6 relative group overflow-hidden">
                {paymentMethod === "CARD" ? (
                  <div className="size-48 flex items-center justify-center bg-blue-50/50 rounded-xl border-2 border-blue-100">
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
                  <div className="p-4 bg-white rounded-2xl shadow-md">
                    <QRCodeCanvas
                      value={qrCodeString}
                      size={192}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                ) : (
                  <div className="size-48 flex flex-col items-center justify-center border-2 border-dashed border-border/60 rounded-xl bg-muted/30">
                    <QrCode className="size-12 text-muted-foreground mb-3 opacity-50" />
                    <Button type="button" size="sm" onClick={generateQR} className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                      Generate KHQR
                    </Button>
                  </div>
                )}

                {/* Final 30 seconds: scanning closed, only waiting for the final Bakong token verify */}
                {paymentMethod !== "CARD" && qrCodeString && timeLeft > 0 && timeLeft <= (300 - SCAN_CUTOFF_SECONDS) && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-2xl gap-2">
                    <Loader2 className="size-8 animate-spin text-primary" />
                    <p className="text-sm font-semibold text-zinc-800">បានបិទការស្កេន</p>
                    <p className="text-xs text-zinc-500">កំពុងផ្ទៀងផ្ទាត់ចុងក្រោយជាមួយ Bakong...</p>
                  </div>
                )}

                {/* Scanning animation overlay for QR codes */}
                {paymentMethod !== "CARD" && qrCodeString && timeLeft > (300 - SCAN_CUTOFF_SECONDS) && (
                  <motion.div
                    className="absolute top-4 left-4 h-1 bg-primary shadow-[0_0_8px_rgba(239,68,68,0.8)] rounded-full z-10"
                    style={{ width: "192px" }}
                    animate={{ y: [0, 192, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  />
                )}
              </div>

              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                {timeLeft > 0 ? (
                  timeLeft <= (300 - SCAN_CUTOFF_SECONDS) ? (
                    <>
                      <Loader2 className="size-4 animate-spin text-amber-500" />
                      <span className="text-sm font-medium text-amber-600">
                        បានបិទការស្កេន — កំពុងផ្ទៀងផ្ទាត់ចុងក្រោយ ({formatTime(timeLeft)})
                      </span>
                    </>
                  ) : (
                    <>
                      <Loader2 className="size-4 animate-spin mt-0.5 self-start" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {paymentMethod === "CARD" ? "Processing card payment..." : "កំពុងរង់ចាំការទូទាត់..."} ({formatTime(timeLeft)})
                        </span>
                        {paymentMethod !== "CARD" && (
                          <span className="text-xs text-muted-foreground mt-0.5">
                            បន្ទាប់ពីស្កេនរួច អ្នកអាចចុចប៊ូតុងខាងក្រោមដើម្បីផ្ទៀងផ្ទាត់ ឬរង់ចាំប្រព័ន្ធស្វ័យប្រវត្តិ។
                          </span>
                        )}
                      </div>
                    </>
                  )
                ) : (
                  <span className="text-sm font-medium text-destructive text-center">
                    QR Code expired. Please refresh to get a new one.
                  </span>
                )}
              </div>

              {/* Action buttons */}
              <div className="w-full space-y-2.5">
                {paymentMethod !== "CARD" && (
                  <Button
                    type="button"
                    onClick={handleManualCheck}
                    disabled={isVerifying || manualChecksCount >= MAX_MANUAL_CHECKS || timeLeft <= 0}
                    className={cn(
                      "w-full h-12 rounded-2xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2",
                      manualChecksCount >= MAX_MANUAL_CHECKS
                        ? "bg-secondary text-muted-foreground border border-border/60 cursor-not-allowed opacity-80"
                        : "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white cursor-pointer active:scale-[0.98] shadow-emerald-500/20"
                    )}
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>កំពុងទាក់ទង Bakong ផ្ទៀងផ្ទាត់...</span>
                      </>
                    ) : manualChecksCount >= MAX_MANUAL_CHECKS ? (
                      <>
                        <CheckCircle2 className="size-4 text-muted-foreground" />
                        <span>បានចុចគ្រប់កំណត់ (២/២ ដង) — សូមរង់ចាំ</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="size-4.5 text-emerald-300" />
                        <span>ខ្ញុំបានផ្ទេររួចរាល់ / ពិនិត្យឥឡូវ (សល់ {MAX_MANUAL_CHECKS - manualChecksCount} ដង)</span>
                      </>
                    )}
                  </Button>
                )}

                {paymentMethod !== "CARD" && (
                  <p className="text-[11px] text-center text-muted-foreground">
                    {manualChecksCount >= MAX_MANUAL_CHECKS ? (
                      <span className="text-amber-500 font-medium">
                        ⚠️ អ្នកបានចុចគ្រប់ ២ ដងហើយ។ ប្រព័ន្ធកំពុងពិនិត្យស្វ័យប្រវត្តិតាមវដ្ត។
                      </span>
                    ) : (
                      <span>
                        💡 អ្នកអាចចុចផ្ទៀងផ្ទាត់ដោយផ្ទាល់បាន <strong className="text-foreground">{MAX_MANUAL_CHECKS - manualChecksCount} ដងទៀត</strong> បន្ទាប់ពីផ្ទេរប្រាក់ក្នុង App ធនាគារ។
                      </span>
                    )}
                  </p>
                )}

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                  {qrCodeString && (
                    <button
                      onClick={generateQR}
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-secondary"
                    >
                      <RefreshCw className="size-3.5" /> <span>បង្កើត QR ថ្មី</span>
                    </button>
                  )}

                  <button
                    onClick={() => setShowExitConfirm(true)}
                    type="button"
                    className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:underline font-semibold ml-auto transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-amber-500/10"
                  >
                    <Landmark className="size-3.5" /> <span>ប្តូរវិធីទូទាត់ / ចាកចេញ</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* Dialog: Change Payment Method or Cancel */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent className="max-w-md w-[92vw] rounded-3xl p-5 sm:p-6 border-border/70">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-lg sm:text-xl font-bold flex items-center gap-2">
              <AlertCircle className="size-5 text-amber-500" />
              <span>ជម្រើសចាកចេញ ឬប្តូរវិធីទូទាត់</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm text-muted-foreground pt-1 leading-relaxed">
              តើអ្នកចង់ប្តូរវិធីទូទាត់ប្រាក់ ឬបោះបង់ការបញ្ជាទិញនេះ? ការចាកចេញនឹងមិនត្រូវបានគិតថាបានទិញជោគជ័យឡើយ។
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2.5 py-3">
            {/* Option 1: Switch to Cash on Delivery */}
            <button
              type="button"
              disabled={isSwitchingMethod}
              onClick={handleSwitchToCash}
              className="w-full p-3.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-left flex items-center justify-between gap-3 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Landmark className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-xs sm:text-sm text-foreground">ប្តូរទៅបង់ប្រាក់សុទ្ធ (Cash on Delivery)</p>
                  <p className="text-[11px] text-muted-foreground">បង់ប្រាក់ ${Number(totalAmount).toFixed(2)} ពេលបុគ្គលិកដឹកដល់ផ្ទះ</p>
                </div>
              </div>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 shrink-0">ជ្រើសរើស →</span>
            </button>

            {/* Option 2: Cancel order and go back to Checkout */}
            <button
              type="button"
              onClick={handleCancelAndExit}
              className="w-full p-3.5 rounded-2xl bg-destructive/10 hover:bg-destructive/20 border border-destructive/30 text-left flex items-center justify-between gap-3 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-10 rounded-xl bg-destructive/20 text-destructive flex items-center justify-center shrink-0">
                  <X className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-xs sm:text-sm text-destructive">បោះបង់ការទិញ &amp; ត្រឡប់ក្រោយ</p>
                  <p className="text-[11px] text-muted-foreground">ការកុម្ម៉ង់នឹងត្រូវលុបចោល (មិនទាន់ទិញបានទេ)</p>
                </div>
              </div>
              <span className="text-xs font-bold text-destructive shrink-0">បោះបង់ →</span>
            </button>
          </div>

          <AlertDialogFooter className="sm:justify-end pt-1">
            <AlertDialogCancel className="rounded-xl cursor-pointer">
              នៅបន្តស្កេន QR វិញ
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
