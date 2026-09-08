import { createContext, useContext, useEffect, useState } from "react";

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
    if (newTheme === theme) return;

    // Determine the origin point of the ripple (from event or last known click coordinate)
    const x = event?.clientX ?? lastPointerPos.x;
    const y = event?.clientY ?? lastPointerPos.y;

    const isReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    // Check if the browser natively supports View Transitions (Chrome, Edge, Safari 18+)
    if (
      typeof document !== "undefined" &&
      document.startViewTransition &&
      !isReducedMotion
    ) {
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      const transition = document.startViewTransition(() => {
        setThemeState(newTheme);
        document.documentElement.classList.toggle("dark", newTheme === "dark");
        localStorage.setItem("flame-crust-theme", newTheme);
        localStorage.setItem("kitchenTheme", newTheme);
        localStorage.setItem("driverTheme", newTheme);
      });

      transition.ready.then(() => {
        // Expand the new theme outward in a silky circular ripple like Telegram
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${endRadius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 620,
            easing: "cubic-bezier(0.2, 0, 0, 1)",
            pseudoElement: "::view-transition-new(root)",
          }
        );
      });
    } else {
      // Fallback for browsers without View Transition API
      setThemeState(newTheme);
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", newTheme === "dark");
        localStorage.setItem("flame-crust-theme", newTheme);
        localStorage.setItem("kitchenTheme", newTheme);
        localStorage.setItem("driverTheme", newTheme);
      }
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
