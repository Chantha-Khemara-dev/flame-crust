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

    // Determine the origin point of the ripple (from button center, event, or last known touch coordinate)
    let x = lastPointerPos.x;
    let y = lastPointerPos.y;

    const btn = event?.currentTarget || event?.target;
    if (btn && typeof btn.getBoundingClientRect === "function") {
      const rect = btn.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        x = Math.round(rect.left + rect.width / 2);
        y = Math.round(rect.top + rect.height / 2);
      }
    } else if (event?.clientX !== undefined && event?.clientY !== undefined && (event.clientX !== 0 || event.clientY !== 0)) {
      x = Math.round(event.clientX);
      y = Math.round(event.clientY);
    } else if (event?.touches && event.touches[0]) {
      x = Math.round(event.touches[0].clientX);
      y = Math.round(event.touches[0].clientY);
    }

    if (!x || isNaN(x) || x <= 0) x = typeof window !== "undefined" ? window.innerWidth - 60 : 300;
    if (!y || isNaN(y) || y <= 0) y = 40;

    const isReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    // Provide CSS variables for compositor-accelerated keyframe animation
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--theme-ripple-x", `${x}px`);
      document.documentElement.style.setProperty("--theme-ripple-y", `${y}px`);
      document.documentElement.style.setProperty("--theme-ripple-radius", `${Math.ceil(endRadius * 1.05)}px`);
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

    const safetyTimer = setTimeout(() => {
      isTransitioningRef.current = false;
    }, 950);

    // Silky smooth CSS cross-fade fallback for browsers without View Transitions
    const runFallbackSmooth = () => {
      if (typeof document === "undefined" || isReducedMotion) {
        applyThemeState();
        clearTimeout(safetyTimer);
        isTransitioningRef.current = false;
        return;
      }
      try {
        document.documentElement.classList.add("theme-transitioning");
        applyThemeState();
        setTimeout(() => {
          document.documentElement.classList.remove("theme-transitioning");
          clearTimeout(safetyTimer);
          isTransitioningRef.current = false;
        }, 700);
      } catch {
        applyThemeState();
        clearTimeout(safetyTimer);
        isTransitioningRef.current = false;
      }
    };

    // Native Circular View Transition (Chrome, Brave, Edge, Safari 18+)
    if (
      typeof document !== "undefined" &&
      document.startViewTransition &&
      !isReducedMotion
    ) {
      try {
        const transition = document.startViewTransition(() => {
          applyThemeState();
        });

        transition.ready
          .then(() => {
            const anim = document.documentElement.animate(
              {
                clipPath: [
                  `circle(0px at ${x}px ${y}px)`,
                  `circle(${Math.ceil(endRadius * 1.05)}px at ${x}px ${y}px)`,
                ],
              },
              {
                duration: 750,
                easing: "cubic-bezier(0.25, 1, 0.5, 1)",
                pseudoElement: "::view-transition-new(root)",
                fill: "forwards",
              }
            );

            anim.finished
              .then(() => {
                clearTimeout(safetyTimer);
                isTransitioningRef.current = false;
              })
              .catch(() => {
                clearTimeout(safetyTimer);
                isTransitioningRef.current = false;
              });
          })
          .catch(() => {
            runFallbackSmooth();
          });

        transition.finished
          .finally(() => {
            clearTimeout(safetyTimer);
            isTransitioningRef.current = false;
          });
      } catch {
        runFallbackSmooth();
      }
    } else {
      runFallbackSmooth();
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
