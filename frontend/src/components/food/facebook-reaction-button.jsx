import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

/**
 * FacebookReactionButton
 * 
 * Supports:
 * 1. Mobile Phone (Touch):
 *    - Long-press (>240ms) opens the floating FB reaction dock with haptic feedback.
 *    - Sliding finger horizontally highlights/magnifies emojis dynamically.
 *    - Releasing finger over an emoji selects it immediately.
 *    - Quick tap (<240ms) toggles Like or active reaction.
 *    - Arrow ▾ button toggles dock on tap.
 * 2. Laptop / Desktop (Mouse):
 *    - Hovering over button opens the reaction dock.
 *    - Moving mouse over emojis smoothly magnifies them (1.4x) and displays Khmer tooltip.
 *    - Clicking selects reaction.
 *    - Clicking button toggles Like.
 */
export function FacebookReactionButton({
  FB_REACTIONS = [],
  userReaction = null,
  onSelectReaction,
  size = "md", // "md" for reviews, "sm" for replies
  className = ""
}) {
  const [isDockOpen, setIsDockOpen] = useState(false);
  const [highlightedEmoji, setHighlightedEmoji] = useState(null);

  const longPressTimer = useRef(null);
  const hoverTimer = useRef(null);
  const closeTimer = useRef(null);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const touchStartTime = useRef(0);
  const isTouchActive = useRef(false);
  const dockRef = useRef(null);
  const buttonRef = useRef(null);

  // Close dock on outside click/touch
  useEffect(() => {
    if (!isDockOpen) return;

    const handleOutsideInteraction = (e) => {
      if (
        dockRef.current && !dockRef.current.contains(e.target) &&
        buttonRef.current && !buttonRef.current.contains(e.target)
      ) {
        setIsDockOpen(false);
        setHighlightedEmoji(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideInteraction);
    document.addEventListener("touchstart", handleOutsideInteraction, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleOutsideInteraction);
      document.removeEventListener("touchstart", handleOutsideInteraction);
    };
  }, [isDockOpen]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  // --- MOBILE TOUCH EVENT HANDLERS ---
  const handleTouchStart = (e) => {
    isTouchActive.current = true;
    touchStartTime.current = Date.now();
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };

    // Start long-press detection
    longPressTimer.current = setTimeout(() => {
      setIsDockOpen(true);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try { navigator.vibrate(15); } catch {}
      }
    }, 240);
  };

  const handleTouchMove = (e) => {
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPos.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartPos.current.y);

    if (!isDockOpen) {
      // If user scrolls vertically or swipes horizontally before 240ms, cancel long press
      if (deltaY > 10 || deltaX > 12) {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
      }
      return;
    }

    // Dock is OPEN: User is sliding finger to choose emoji
    if (e.cancelable) {
      e.preventDefault(); // Prevent page scroll while sliding across emoji dock
    }

    const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
    const emojiBtn = targetEl?.closest("[data-reaction-emoji]");

    if (emojiBtn) {
      const emoji = emojiBtn.getAttribute("data-reaction-emoji");
      if (emoji !== highlightedEmoji) {
        setHighlightedEmoji(emoji);
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          try { navigator.vibrate(8); } catch {}
        }
      }
    } else {
      setHighlightedEmoji(null);
    }
  };

  const handleTouchEnd = (e) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    const duration = Date.now() - touchStartTime.current;
    const endTouch = e.changedTouches?.[0];
    const deltaX = Math.abs((endTouch?.clientX || touchStartPos.current.x) - touchStartPos.current.x);
    const deltaY = Math.abs((endTouch?.clientY || touchStartPos.current.y) - touchStartPos.current.y);

    if (isDockOpen) {
      // If user was sliding and released on an emoji
      if (highlightedEmoji) {
        onSelectReaction(highlightedEmoji);
        setIsDockOpen(false);
        setHighlightedEmoji(null);
      } else {
        // Released outside emojis, auto-close after 350ms
        setTimeout(() => {
          setIsDockOpen(false);
          setHighlightedEmoji(null);
        }, 350);
      }
      if (e.cancelable) e.preventDefault();
    } else {
      // Quick tap (< 240ms) without triggering dock -> toggle like
      if (duration < 240 && deltaX < 12 && deltaY < 12) {
        onSelectReaction(userReaction ? userReaction.emoji : "👍");
      }
    }

    setTimeout(() => {
      isTouchActive.current = false;
    }, 100);
  };

  // --- DESKTOP MOUSE EVENT HANDLERS ---
  const handleMouseEnter = () => {
    if (isTouchActive.current) return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    hoverTimer.current = setTimeout(() => {
      setIsDockOpen(true);
    }, 180);
  };

  const handleMouseLeave = () => {
    if (isTouchActive.current) return;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    closeTimer.current = setTimeout(() => {
      setIsDockOpen(false);
      setHighlightedEmoji(null);
    }, 350);
  };

  const handleClick = (e) => {
    if (isTouchActive.current) return;
    e.stopPropagation();
    onSelectReaction(userReaction ? userReaction.emoji : "👍");
  };

  const activeReactionObj = userReaction
    ? FB_REACTIONS.find((r) => r.emoji === userReaction.emoji) || userReaction
    : null;

  return (
    <div
      className={cn("relative inline-flex items-center select-none", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Main Reaction Trigger Button */}
      <div
        ref={buttonRef}
        className="flex items-center gap-0.5"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <button
          type="button"
          onClick={handleClick}
          className={cn(
            "flex items-center gap-1 font-semibold transition-all cursor-pointer touch-manipulation hover:underline",
            size === "sm" ? "text-[11px]" : "text-xs",
            activeReactionObj ? activeReactionObj.color : "hover:text-foreground text-muted-foreground"
          )}
          title={activeReactionObj ? `${activeReactionObj.label} (Click to remove)` : "ចូលចិត្ត (Like)"}
        >
          <span className={cn("transition-transform", activeReactionObj && "scale-110")}>
            {activeReactionObj ? activeReactionObj.emoji : "👍"}
          </span>
          <span>{activeReactionObj ? activeReactionObj.label : "ចូលចិត្ត"}</span>
        </button>

        {/* Small Arrow ▾ to quickly toggle dock on tap */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsDockOpen((prev) => !prev);
          }}
          className={cn(
            "text-muted-foreground/60 hover:text-foreground cursor-pointer px-0.5 transition-transform",
            size === "sm" ? "text-[9px]" : "text-[10px]",
            isDockOpen && "rotate-180"
          )}
          title="ជ្រើសរើស Reaction (Pick reaction)"
          aria-label="Toggle reaction picker"
        >
          ▾
        </button>
      </div>

      {/* Floating Animated Facebook Reaction Dock */}
      {isDockOpen && (
        <div
          ref={dockRef}
          className={cn(
            "absolute bottom-full left-0 mb-2 z-50",
            "bg-card/95 dark:bg-zinc-800/95 backdrop-blur-xl border border-border/80 shadow-[0_12px_36px_rgba(0,0,0,0.35)]",
            "rounded-full p-1 sm:p-1.5 flex items-center gap-0.5 sm:gap-1",
            "animate-in fade-in-0 zoom-in-90 duration-150 origin-bottom-left pointer-events-auto"
          )}
          onMouseEnter={() => {
            if (closeTimer.current) clearTimeout(closeTimer.current);
          }}
          onMouseLeave={handleMouseLeave}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {FB_REACTIONS.map((r) => {
            const isHighlighted = highlightedEmoji === r.emoji;

            return (
              <button
                key={r.id}
                type="button"
                data-reaction-emoji={r.emoji}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectReaction(r.emoji);
                  setIsDockOpen(false);
                  setHighlightedEmoji(null);
                }}
                onMouseEnter={() => setHighlightedEmoji(r.emoji)}
                onMouseLeave={() => setHighlightedEmoji((prev) => (prev === r.emoji ? null : prev))}
                className={cn(
                  "relative rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer touch-manipulation",
                  size === "sm" ? "size-7 sm:size-8 text-lg sm:text-xl" : "size-8 sm:size-9 text-xl sm:text-2xl",
                  isHighlighted
                    ? "scale-140 -translate-y-1.5 z-20 shadow-lg"
                    : "hover:scale-125 active:scale-95"
                )}
                title={`${r.emoji} ${r.label}`}
                aria-label={r.label}
              >
                <span className="leading-none transition-transform pointer-events-none">
                  {r.emoji}
                </span>

                {/* Floating Khmer Reaction Tooltip */}
                <span
                  className={cn(
                    "absolute -top-7 sm:-top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full",
                    "bg-zinc-950/90 dark:bg-zinc-900/95 text-white text-[10px] sm:text-[11px] font-bold",
                    "shadow-md whitespace-nowrap pointer-events-none transition-all duration-150 border border-white/10",
                    isHighlighted ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"
                  )}
                >
                  {r.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default FacebookReactionButton;
