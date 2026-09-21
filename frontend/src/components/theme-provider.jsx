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

    if (event?.currentTarget?.getBoundingClientRect) {
      const rect = event.currentTarget.getBoundingClientRect();
      x = Math.round(rect.left + rect.width / 2);
      y = Math.round(rect.top + rect.height / 2);
    } else if (event?.target?.getBoundingClientRect) {
      const rect = event.target.getBoundingClientRect();
      x = Math.round(rect.left + rect.width / 2);
      y = Math.round(rect.top + rect.height / 2);
    } else if (event?.clientX !== undefined && event?.clientY !== undefined) {
      x = Math.round(event.clientX);
      y = Math.round(event.clientY);
    } else if (event?.touches && event.touches[0]) {
      x = Math.round(event.touches[0].clientX);
      y = Math.round(event.touches[0].clientY);
    }

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

    // Safety timer to ensure isTransitioningRef is always reset even if browser transition hangs or is aborted
    const safetyTimer = setTimeout(() => {
      isTransitioningRef.current = false;
    }, 700);

    // Smooth responsive fallback for devices without native View Transitions (e.g. mobile Safari/WebKit)
    const runFallbackSmooth = () => {
      applyThemeState();
      if (typeof document === "undefined" || isReducedMotion) {
        clearTimeout(safetyTimer);
        isTransitioningRef.current = false;
        return;
      }
      try {
        document.documentElement.classList.add("theme-transitioning");
        const ripple = document.createElement("div");
        ripple.style.position = "fixed";
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        ripple.style.width = "20px";
        ripple.style.height = "20px";
        ripple.style.borderRadius = "50%";
        ripple.style.pointerEvents = "none";
        ripple.style.zIndex = "999999";
        ripple.style.border = newTheme === "dark" 
          ? "2px solid rgba(251, 191, 36, 0.7)" 
          : "2px solid rgba(99, 102, 241, 0.7)";
        ripple.style.boxShadow = newTheme === "dark"
          ? "0 0 30px 15px rgba(251, 191, 36, 0.25)"
          : "0 0 30px 15px rgba(99, 102, 241, 0.25)";
        ripple.style.transform = "translate(-50%, -50%) scale(0.3)";
        ripple.style.opacity = "1";
        ripple.style.transition = "transform 400ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 400ms ease-out";
        document.body.appendChild(ripple);

        requestAnimationFrame(() => {
          ripple.style.transform = `translate(-50%, -50%) scale(${Math.max(window.innerWidth, window.innerHeight) / 10})`;
          ripple.style.opacity = "0";
        });

        setTimeout(() => {
          ripple.remove();
          document.documentElement.classList.remove("theme-transitioning");
          clearTimeout(safetyTimer);
          isTransitioningRef.current = false;
        }, 400);
      } catch {
        clearTimeout(safetyTimer);
        isTransitioningRef.current = false;
      }
    };

    // Native Telegram-style Circular View Transition (Chrome, Brave, Edge, Safari 18+)
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
            try {
              document.documentElement.animate(
                {
                  clipPath: [
                    `circle(0px at ${x}px ${y}px)`,
                    `circle(${Math.ceil(endRadius * 1.05)}px at ${x}px ${y}px)`,
                  ],
                },
                {
                  duration: 650,
                  easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
                  pseudoElement: "::view-transition-new(root)",
                  fill: "forwards",
                }
              );
            } catch (e) {}
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
