import { createContext, useContext, useEffect, useState, useRef } from "react";

const ThemeContext = createContext({ theme: "light", setTheme: () => {} });

// Global tracking of the most recent tap / pointer coordinates so the ripple originates exactly from the clicked button
let lastPointerPos = { x: 0, y: 0 };
if (typeof window !== "undefined") {
  lastPointerPos = { x: window.innerWidth - 60, y: 40 };
  window.addEventListener(
    "pointerdown",
    (e) => {
      lastPointerPos = { x: e.clientX, y: e.clientY };
    },
    { passive: true }
  );
}

export function ThemeProvider({ children, defaultTheme = "light" }) {
  const isTransitioningRef = useRef(false);
  const [theme, setThemeState] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("flame-crust-theme") ||
        localStorage.getItem("kitchenTheme") ||
        defaultTheme
      );
    }
    return defaultTheme;
  });

  const setTheme = (newTheme, event) => {
    if (newTheme === theme || isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    // Determine the origin point of the ripple (from event or last known click coordinate)
    const x = event?.clientX ?? lastPointerPos.x;
    const y = event?.clientY ?? lastPointerPos.y;

    const isReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const applyThemeState = () => {
      setThemeState(newTheme);
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", newTheme === "dark");
        localStorage.setItem("flame-crust-theme", newTheme);
        localStorage.setItem("kitchenTheme", newTheme);
        localStorage.setItem("driverTheme", newTheme);
      }
    };

    // Silky smooth CSS cross-fade fallback for browsers without View Transitions (prevents layout thrashing/freezing)
    const runFallbackSmooth = () => {
      if (typeof document === "undefined" || isReducedMotion) {
        applyThemeState();
        isTransitioningRef.current = false;
        return;
      }
      try {
        document.documentElement.classList.add("theme-transitioning");
        applyThemeState();
        setTimeout(() => {
          document.documentElement.classList.remove("theme-transitioning");
          isTransitioningRef.current = false;
        }, 750);
      } catch {
        applyThemeState();
        isTransitioningRef.current = false;
      }
    };

    // Check if the browser natively supports View Transitions (Chrome, Edge, Safari 18+)
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
            // Expand the new theme outward in a silky circular ripple (750ms, graceful deceleration, zero lag)
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
                isTransitioningRef.current = false;
              })
              .catch(() => {
                isTransitioningRef.current = false;
              });
          })
          .catch(() => {
            runFallbackSmooth();
          });

        transition.finished
          .finally(() => {
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
