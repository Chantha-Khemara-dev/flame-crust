import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export function SplashScreen() {
  const [show, setShow] = useState(() => {
    return !sessionStorage.getItem("hasSeenSplash");
  });
  const [fade, setFade] = useState(false);

  useEffect(() => {
    if (show) {
      sessionStorage.setItem("hasSeenSplash", "true");
      
      // Sequence:
      // 1. Enter (0ms - 500ms)
      // 2. Pizza eaten slice by slice (500ms - 2500ms)
      // 3. Fade out (2500ms - 3000ms)
      // 4. Unmount
      
      const fadeTimer = setTimeout(() => setFade(true), 2500);
      const removeTimer = setTimeout(() => setShow(false), 3000);
      
      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(removeTimer);
      };
    }
  }, [show]);

  if (!show) return null;

  return (
    <div 
      className={cn(
        "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-500",
        fade ? "opacity-0" : "opacity-100"
      )}
    >
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-background to-amber-500/20" />
      
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative w-40 h-40 flex items-center justify-center">
          {/* Base shadow */}
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
          
          {/* Custom SVG Pizza Slice Animation */}
          <svg 
            className="w-32 h-32 text-primary drop-shadow-2xl relative z-10"
            viewBox="0 0 100 100"
          >
            <defs>
              <mask id="pizza-mask">
                {/* 
                  Radius 25, Stroke 50 = Fills the 100x100 area.
                  Circumference = 2 * PI * 25 = 157.08
                  Using stroke-dasharray to create a radial wipe. 
                */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="25" 
                  fill="none" 
                  stroke="white" 
                  strokeWidth="50" 
                  strokeDasharray="157.08"
                  style={{
                    transformOrigin: "center",
                    transform: "rotate(-90deg)",
                    animation: "eat-pizza 2s steps(8, end) forwards",
                    animationDelay: "0.2s"
                  }}
                />
              </mask>
            </defs>

            {/* The Pizza Base (what gets eaten) */}
            <g mask="url(#pizza-mask)">
              {/* Outer Crust */}
              <circle cx="50" cy="50" r="45" fill="currentColor" opacity="0.9" />
              {/* Inner Cheese */}
              <circle cx="50" cy="50" r="38" fill="#F59E0B" />
              {/* Pepperoni 1 */}
              <circle cx="50" cy="25" r="8" fill="#B91C1C" />
              {/* Pepperoni 2 */}
              <circle cx="70" cy="45" r="7" fill="#B91C1C" />
              {/* Pepperoni 3 */}
              <circle cx="65" cy="70" r="6" fill="#B91C1C" />
              {/* Pepperoni 4 */}
              <circle cx="35" cy="75" r="8" fill="#B91C1C" />
              {/* Pepperoni 5 */}
              <circle cx="25" cy="50" r="7" fill="#B91C1C" />
              
              {/* Slice lines to make it look like 8 slices */}
              <line x1="50" y1="5" x2="50" y2="95" stroke="currentColor" strokeWidth="2" opacity="0.5" />
              <line x1="5" y1="50" x2="95" y2="50" stroke="currentColor" strokeWidth="2" opacity="0.5" />
              <line x1="18.18" y1="18.18" x2="81.82" y2="81.82" stroke="currentColor" strokeWidth="2" opacity="0.5" />
              <line x1="18.18" y1="81.82" x2="81.82" y2="18.18" stroke="currentColor" strokeWidth="2" opacity="0.5" />
            </g>
          </svg>
        </div>
        
        <h1 className="mt-8 font-serif text-3xl font-black tracking-tight text-foreground animate-in slide-in-from-bottom-4 fade-in duration-700">
          Flame <span className="text-primary">&</span> Crust
        </h1>
        <p className="mt-2 text-sm font-bold tracking-[0.3em] uppercase text-muted-foreground animate-in slide-in-from-bottom-4 fade-in duration-700 delay-150">
          Artisan Pizza
        </p>
      </div>

      <style>{`
        @keyframes eat-pizza {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 157.08; }
        }
      `}</style>
    </div>
  );
}
