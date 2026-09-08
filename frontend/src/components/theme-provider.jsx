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

    // Guaranteed Telegram circular reveal overlay for Firefox on Linux, WebViews, etc.
    const runFallbackCircleReveal = () => {
      if (typeof document === "undefined" || isReducedMotion) {
        applyThemeState();
        return;
      }

      try {
        const overlay = document.createElement("div");
        overlay.style.cssText = `
          position: fixed;
          inset: 0;
          z-index: 9999999;
          pointer-events: none;
          overflow: hidden;
          background-color: ${newTheme === "dark" ? "oklch(0.16 0.015 30)" : "oklch(0.985 0.012 75)"};
          clip-path: circle(0px at ${x}px ${y}px);
          -webkit-clip-path: circle(0px at ${x}px ${y}px);
          transition: clip-path 550ms cubic-bezier(0.2, 0, 0, 1), -webkit-clip-path 550ms cubic-bezier(0.2, 0, 0, 1);
          will-change: clip-path;
        `;
        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const targetRadius = `${Math.ceil(endRadius * 1.15)}px`;
            overlay.style.clipPath = `circle(${targetRadius} at ${x}px ${y}px)`;
            overlay.style.webkitClipPath = `circle(${targetRadius} at ${x}px ${y}px)`;
          });
        });

        // Switch underlying theme when the circle is expanding across the screen
        setTimeout(() => {
          applyThemeState();
        }, 260);

        // Smoothly dismiss overlay after full expansion
        setTimeout(() => {
          overlay.style.transition = "opacity 160ms ease-out";
          overlay.style.opacity = "0";
          setTimeout(() => {
            overlay.remove();
          }, 180);
        }, 560);
      } catch {
        applyThemeState();
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
            // Expand the new theme outward in a silky circular ripple like Telegram
            const anim = document.documentElement.animate(
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

            anim.addEventListener("error", () => {
              runFallbackCircleReveal();
            });
          })
          .catch(() => {
            runFallbackCircleReveal();
          });
      } catch {
        runFallbackCircleReveal();
      }
    } else {
      // Guaranteed Telegram Circular Reveal for Firefox on Linux, WebViews, etc.
      runFallbackCircleReveal();
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
