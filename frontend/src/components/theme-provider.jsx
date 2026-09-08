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

    // Determine the origin point of the ripple (from event target center, or click coordinates)
    const rect = event?.currentTarget?.getBoundingClientRect?.();
    const x = rect ? rect.left + rect.width / 2 : (event?.clientX ?? lastPointerPos.x);
    const y = rect ? rect.top + rect.height / 2 : (event?.clientY ?? lastPointerPos.y);

    const isReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    // Activate smooth color transitions across all elements
    if (typeof document !== "undefined") {
      document.documentElement.classList.add("theme-transitioning");
      setTimeout(() => {
        document.documentElement.classList.remove("theme-transitioning");
      }, 500);
    }

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

      try {
        const transition = document.startViewTransition(() => {
          setThemeState(newTheme);
          document.documentElement.classList.toggle("dark", newTheme === "dark");
          localStorage.setItem("flame-crust-theme", newTheme);
          localStorage.setItem("kitchenTheme", newTheme);
          localStorage.setItem("driverTheme", newTheme);
        });

        transition.ready
          .then(() => {
            // Expand the new theme outward in a silky circular ripple like Telegram
            document.documentElement.animate(
              {
                clipPath: [
                  `circle(0px at ${x}px ${y}px)`,
                  `circle(${endRadius}px at ${x}px ${y}px)`,
                ],
              },
              {
                duration: 600,
                easing: "cubic-bezier(0.16, 1, 0.3, 1)",
                pseudoElement: "::view-transition-new(root)",
              }
            );
          })
          .catch(() => {
            // Fallback if animation fails
          });
      } catch {
        // Fallback for browsers with broken startViewTransition
        setThemeState(newTheme);
        document.documentElement.classList.toggle("dark", newTheme === "dark");
        localStorage.setItem("flame-crust-theme", newTheme);
        localStorage.setItem("kitchenTheme", newTheme);
        localStorage.setItem("driverTheme", newTheme);
      }
    } else {
      // Fallback for browsers without View Transition API: Smooth Expanding Ripple Layer
      if (typeof document !== "undefined") {
        try {
          const maxDim = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y)
          ) * 2.2;

          const ripple = document.createElement("div");
          ripple.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:999999;overflow:hidden;";
          
          const circle = document.createElement("div");
          circle.style.cssText = `
            position:absolute;
            left:${x}px;
            top:${y}px;
            width:${maxDim}px;
            height:${maxDim}px;
            border-radius:50%;
            transform:translate(-50%, -50%) scale(0);
            background-color:${newTheme === "dark" ? "#18181b" : "#faf8f5"};
            transition:transform 520ms cubic-bezier(0.16, 1, 0.3, 1), opacity 350ms ease 250ms;
            box-shadow:0 0 100px ${newTheme === "dark" ? "rgba(0,0,0,0.8)" : "rgba(239,68,68,0.25)"};
          `;
          
          ripple.appendChild(circle);
          document.body.appendChild(ripple);

          requestAnimationFrame(() => {
            circle.style.transform = "translate(-50%, -50%) scale(1)";
            circle.style.opacity = "0";
          });

          setTimeout(() => {
            ripple.remove();
          }, 650);
        } catch {}

        setThemeState(newTheme);
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
