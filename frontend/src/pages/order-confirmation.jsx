"use client";
import { useEffect } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, ArrowRight, Package, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/food/navbar";
import { Footer } from "@/components/food/footer";
import { PageTransition } from "@/components/shared/page-transition";
import confetti from "canvas-confetti";

const methodLabels = {
  CARD: "Card",
  KHQR: "KHQR",
  ABA_PAY: "ABA Pay",
  CASH: "Cash on delivery",
};

function OrderConfirmationPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    orderId = "ORD-CONFIRMED",
    total = 0,
    itemCount = 0,
    paymentMethod = "CARD",
    address = "",
  } = location.state || {};

  useEffect(() => {
    // Fire confetti on successful order load
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#ef4444', '#f59e0b', '#10b981'] // Primary, Accent, Green
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#ef4444', '#f59e0b', '#10b981']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-[calc(4.5rem+env(safe-area-inset-top))] sm:pt-28 pb-16 pb-[calc(4rem+env(safe-area-inset-bottom))]">
        <PageTransition>
          <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-12 text-center">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
              className="flex items-center justify-center size-20 rounded-full bg-green-600/15 mx-auto mb-6"
            >
              <CheckCircle2 className="size-10 text-green-600" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="font-serif text-3xl sm:text-4xl font-bold text-foreground"
            >
              Order confirmed!
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-3 text-base text-muted-foreground"
            >
              Your order <span className="font-semibold text-foreground">{orderId}</span> has been placed
              successfully. We're getting your food ready!
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-6 sm:mt-8 rounded-2xl border border-border/60 bg-card p-5 sm:p-6 text-left space-y-3 sm:space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-10 rounded-full bg-primary/15">
                  <Package className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{itemCount} item{itemCount !== 1 ? "s" : ""}</p>
                  <p className="text-xs text-muted-foreground">Order #{orderId}</p>
                </div>
                <span className="ml-auto font-serif text-xl font-bold text-primary">${total.toFixed(2)}</span>
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-border/60">
                <div className="flex items-center justify-center size-10 rounded-full bg-accent/15">
                  <Clock className="size-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Estimated delivery</p>
                  <p className="text-xs text-muted-foreground">25–35 minutes</p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-border/60">
                <div className="flex items-center justify-center size-10 rounded-full bg-secondary">
                  <MapPin className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Delivery address</p>
                  <p className="text-xs text-muted-foreground">{address || "Address on file"}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-border/60 text-sm text-muted-foreground">
                Payment: <span className="font-medium text-foreground">{methodLabels[paymentMethod] || paymentMethod}</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-8 flex flex-col gap-3 justify-center"
            >
              <Button
                onClick={() => navigate(`/track/${orderId}`)}
                className="w-full h-12 rounded-full bg-primary text-primary-foreground text-base font-semibold hover:bg-primary/90 transition-all"
              >
                Track Order Live
              </Button>
              <Button
                variant="outline"
                asChild
                className="rounded-full h-12 px-6 border-border/60"
              >
                <Link to="/">Back to home</Link>
              </Button>
            </motion.div>
          </div>
        </PageTransition>
      </main>
    </div>
  );
}

export default OrderConfirmationPage;
