"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export function getCurrentAccountKey() {
  if (typeof window === "undefined") return "guest";
  try {
    const raw = localStorage.getItem("customerAuth");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.id != null || parsed.email || parsed.phone)) {
        const id = parsed.id != null ? String(parsed.id) : String(parsed.email || parsed.phone);
        return `user_${id}`;
      }
    }
  } catch {}
  return "guest";
}

const useCart = create()(
  persist(
    (set, get) => ({
      lines: [],
      isOpen: false,
      coupon: null,
      addItem: (item, quantity = 1) => set((state) => {
        const existing = state.lines.find((l) => String(l.id) === String(item.id));
        if (existing) {
          return {
            lines: state.lines.map(
              (l) => String(l.id) === String(item.id) ? { ...l, qty: l.qty + quantity } : l
            )
          };
        }
        return { lines: [...state.lines, { ...item, qty: quantity }] };
      }),
      removeItem: (id) => set((state) => ({
        lines: state.lines.filter((l) => String(l.id) !== String(id))
      })),
      increment: (id) => set((state) => ({
        lines: state.lines.map(
          (l) => String(l.id) === String(id) ? { ...l, qty: l.qty + 1 } : l
        )
      })),
      decrement: (id) => set((state) => ({
        lines: state.lines.map((l) => String(l.id) === String(id) ? { ...l, qty: l.qty - 1 } : l).filter((l) => l.qty > 0)
      })),
      clear: () => set({ lines: [], coupon: null }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),
      subtotal: () => get().lines.reduce((sum, l) => sum + l.price * l.qty, 0),
      count: () => get().lines.reduce((sum, l) => sum + l.qty, 0),
      applyCoupon: (couponData, explicitAccountKey) => {
        if (!couponData) {
          set({ coupon: null });
          return;
        }
        const accountKey = explicitAccountKey || couponData.accountKey || getCurrentAccountKey();
        set({
          coupon: {
            ...couponData,
            accountKey,
          }
        });
      },
      clearCoupon: () => set({ coupon: null }),
      removeCoupon: () => set({ coupon: null }),
      validateCouponForAccount: () => {
        const currentKey = getCurrentAccountKey();
        const currentCoupon = get().coupon;
        if (currentCoupon && currentCoupon.accountKey && currentCoupon.accountKey !== currentKey) {
          set({ coupon: null });
          return null;
        }
        return currentCoupon;
      }
    }),
    {
      name: "flame-crust-cart",
      partialize: (s) => ({ lines: s.lines, coupon: s.coupon }),
      onRehydrateStorage: () => (state) => {
        if (state && state.coupon) {
          const currentKey = getCurrentAccountKey();
          if (state.coupon.accountKey && state.coupon.accountKey !== currentKey) {
            state.coupon = null;
          }
        }
      }
    }
  )
);

if (typeof window !== "undefined") {
  const syncCartCouponWithActiveAccount = () => {
    try {
      const currentKey = getCurrentAccountKey();
      const state = useCart.getState();
      if (state.coupon && state.coupon.accountKey && state.coupon.accountKey !== currentKey) {
        state.clearCoupon();
      }
    } catch {}
  };

  window.addEventListener("authChanged", syncCartCouponWithActiveAccount);
  window.addEventListener("storage", (e) => {
    if (e.key === "customerAuth") {
      syncCartCouponWithActiveAccount();
    }
  });
}

export {
  useCart
};
