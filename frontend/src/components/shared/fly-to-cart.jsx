"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

export function FlyToCart() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const handleFly = (e) => {
      // Disable fly animation on phone/mobile screens
      if (typeof window !== "undefined" && window.innerWidth < 768) {
        return;
      }

      const { image, startRect } = e.detail || {};
      if (!startRect) return;

      const cartWrapper = document.getElementById("cart-icon-wrapper") || document.getElementById("cart-icon");
      const endRect = cartWrapper
        ? cartWrapper.getBoundingClientRect()
        : { top: 20, left: window.innerWidth - 60, width: 44, height: 44 };

      const newItem = {
        id: Date.now() + Math.random(),
        image,
        startRect,
        endRect,
      };

      setItems((prev) => [...prev, newItem]);

      // Pop the cart icon when the flying item arrives
      const cartIcon = document.getElementById("cart-icon");
      if (cartIcon) {
        setTimeout(() => {
          cartIcon.animate(
            [
              { transform: "scale(1)" },
              { transform: "scale(1.35) rotate(-6deg)" },
              { transform: "scale(0.9) rotate(3deg)" },
              { transform: "scale(1.1)" },
              { transform: "scale(1)" },
            ],
            { duration: 450, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" }
          );
        }, 1100);
      }

      // Cleanup item after animation finishes
      setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== newItem.id));
      }, 1400);
    };

    window.addEventListener("fly-to-cart", handleFly);
    return () => window.removeEventListener("fly-to-cart", handleFly);
  }, []);

  if (items.length === 0) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[99999] overflow-hidden">
      <AnimatePresence>
        {items.map((item) => {
          const endRect = item.endRect;

          // Start from the exact center of the button (startRect)
          const startX = item.startRect.left + item.startRect.width / 2;
          const startY = item.startRect.top + item.startRect.height / 2;

          // End exactly at the center of the cart icon
          const targetX = endRect.left + endRect.width / 2;
          const targetY = endRect.top + endRect.height / 2;

          // Curve upward for the parabolic arc
          const midX = (startX + targetX) / 2;
          let midY = Math.min(startY, targetY) - 120;
          
          // Prevent flying off the top of the screen
          if (midY < 20) {
            midY = 20;
          }

          // Create a fixed square size for the flying image (so it's never squished)
          const initialSize = 80; // Always start as an 80x80 circle

          return (
            <motion.div
              key={item.id}
              initial={{
                position: "fixed",
                left: startX - initialSize / 2,
                top: startY - initialSize / 2,
                width: initialSize,
                height: initialSize,
                opacity: 1,
                scale: 0.5,
                borderRadius: "50%",
                rotate: 0,
              }}
              animate={{
                left: [startX - initialSize / 2, midX - initialSize / 2, targetX - 16],
                top: [startY - initialSize / 2, midY - initialSize / 2, targetY - 16],
                scale: [1, 1, 0.25],
                width: [initialSize, initialSize, 32],
                height: [initialSize, initialSize, 32],
                opacity: [1, 1, 0],
                borderRadius: ["50%", "50%", "50%"],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 1.15,
                times: [0, 0.45, 1],
                ease: [0.35, 0.8, 0.35, 1],
              }}
              className="overflow-hidden shadow-2xl border-2 border-primary bg-background ring-4 ring-primary/25 pointer-events-none"
            >
              <img
                src={item.image}
                alt=""
                className="w-full h-full object-cover"
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>,
    document.body
  );
}
