import { createContext, useContext, useEffect, useState, useRef } from "react";

const ThemeContext = createContext({ theme: "light", setTheme: () => {} });

// Global tracking of the most recent tap / pointer coordinates so the ripple originates exactly from the clicked button
let lastPointerPos = { x: 0, y: 0 };
if (typeof window !== "undefined") {
  lastPointerPos = { x: window.innerWidth - 60, y: 40 };
  const recordPointer = (e) => {
    if (e.touches && e.touches[0]) {
      lastPointerPos = { x: Math.round(e.touches[0].clientX), y: Math.round(e.touches[0].clientY) };
    } else if (e.clientX !== undefined && e.clientY !== undefined) {
      lastPointerPos = { x: Math.round(e.clientX), y: Math.round(e.clientY) };
    }
  };
  window.addEventListener("pointerdown", recordPointer, { passive: true });
  window.addEventListener("touchstart", recordPointer, { passive: true });
  window.addEventListener("click", recordPointer, { passive: true });
}

export function ThemeProvider({ children, defaultTheme = "light" }) {
  const isTransitioningRef = useRef(false);
  const [theme, setThemeState] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("flame-crust-theme") ||
        localStorage.getItem("kitchenTheme") ||
        localStorage.getItem("driverTheme") ||
        defaultTheme
      );
    }
    return defaultTheme;
  });

  const setTheme = (newTheme, event) => {
    if (newTheme === theme || isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    // Determine origin coordinate
    let x = null;
    let y = null;

    const btn = event?.currentTarget || event?.target;
    if (btn && typeof btn.getBoundingClientRect === "function") {
      const rect = btn.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        x = Math.round(rect.left + rect.width / 2);
        y = Math.round(rect.top + rect.height / 2);
      }
    }

    if (x === null || y === null) {
      if (event?.touches && event.touches[0]) {
        x = Math.round(event.touches[0].clientX);
        y = Math.round(event.touches[0].clientY);
      } else if (event?.clientX !== undefined && event?.clientY !== undefined && (event.clientX !== 0 || event.clientY !== 0)) {
        x = Math.round(event.clientX);
        y = Math.round(event.clientY);
      } else if (lastPointerPos.x && lastPointerPos.y) {
        x = lastPointerPos.x;
        y = lastPointerPos.y;
      }
    }

    if (!x || isNaN(x) || x <= 0) x = typeof window !== "undefined" ? window.innerWidth - 50 : 300;
    if (!y || isNaN(y) || y <= 0) y = 40;

    const isReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    const endRadius = Math.ceil(
      Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      ) * 1.05
    );

    // Provide CSS variables for any consumers
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--theme-ripple-x", `${x}px`);
      document.documentElement.style.setProperty("--theme-ripple-y", `${y}px`);
      document.documentElement.style.setProperty("--theme-ripple-radius", `${endRadius}px`);
    }

    const applyThemeState = () => {
      setThemeState(newTheme);
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", newTheme === "dark");
        localStorage.setItem("flame-crust-theme", newTheme);
        localStorage.setItem("kitchenTheme", newTheme);
        localStorage.setItem("driverTheme", newTheme);
      }
    };

    // Safety timer to prevent any frozen state
    const safetyTimer = setTimeout(() => {
      isTransitioningRef.current = false;
    }, 700);

    // Universal circular clip-path reveal for all mobile phones (iOS Safari, Android WebViews, etc.)
    const runUniversalCircularFallback = () => {
      if (typeof document === "undefined" || isReducedMotion) {
        applyThemeState();
        clearTimeout(safetyTimer);
        isTransitioningRef.current = false;
        return;
      }
      try {
        const overlay = document.createElement("div");
        overlay.style.position = "fixed";
        overlay.style.inset = "0";
        overlay.style.zIndex = "999999";
        overlay.style.pointerEvents = "none";
        overlay.style.backgroundColor = newTheme === "dark" ? "#09090b" : "#fcfbf9";
        overlay.style.clipPath = `circle(0px at ${x}px ${y}px)`;
        overlay.style.webkitClipPath = `circle(0px at ${x}px ${y}px)`;
        document.body.appendChild(overlay);

        // Force browser reflow
        void overlay.offsetHeight;

        const anim = overlay.animate(
          [
            { clipPath: `circle(0px at ${x}px ${y}px)`, webkitClipPath: `circle(0px at ${x}px ${y}px)` },
            { clipPath: `circle(${endRadius}px at ${x}px ${y}px)`, webkitClipPath: `circle(${endRadius}px at ${x}px ${y}px)` }
          ],
          {
            duration: 520,
            easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
            fill: "forwards"
          }
        );

        // Switch theme underneath as the circle expands
        setTimeout(() => {
          applyThemeState();
        }, 180);

        anim.onfinish = () => {
          overlay.remove();
          clearTimeout(safetyTimer);
          isTransitioningRef.current = false;
        };

        setTimeout(() => {
          overlay?.remove();
          clearTimeout(safetyTimer);
          isTransitioningRef.current = false;
        }, 580);
      } catch {
        applyThemeState();
        clearTimeout(safetyTimer);
        isTransitioningRef.current = false;
      }
    };

    // Native Telegram-style Circular View Transition (Chrome, Brave, Edge, Safari 18+)
    if (
      typeof document !== "undefined" &&
      typeof document.startViewTransition === "function" &&
      !isReducedMotion
    ) {
      try {
        const styleId = "theme-circle-transition-style";
        let styleEl = document.getElementById(styleId);
        if (!styleEl) {
          styleEl = document.createElement("style");
          styleEl.id = styleId;
          document.head.appendChild(styleEl);
        }
        styleEl.textContent = `
          ::view-transition-old(root),
          ::view-transition-new(root) {
            animation: none;
            mix-blend-mode: normal;
          }
          ::view-transition-old(root) {
            z-index: 1;
          }
          ::view-transition-new(root) {
            z-index: 999999;
            animation: telegram-circle-reveal 520ms cubic-bezier(0.22, 0.61, 0.36, 1) forwards !important;
          }
          @keyframes telegram-circle-reveal {
            0% {
              clip-path: circle(0px at ${x}px ${y}px);
            }
            100% {
              clip-path: circle(${endRadius}px at ${x}px ${y}px);
            }
          }
        `;

        const transition = document.startViewTransition(() => {
          applyThemeState();
        });

        transition.finished.finally(() => {
          styleEl?.remove();
          clearTimeout(safetyTimer);
          isTransitioningRef.current = false;
        });
      } catch {
        runUniversalCircularFallback();
      }
    } else {
      runUniversalCircularFallback();
    }
  };

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", theme === "dark");
      localStorage.setItem("flame-crust-theme", theme);
      localStorage.setItem("kitchenTheme", theme);
      localStorage.setItem("driverTheme", theme);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
