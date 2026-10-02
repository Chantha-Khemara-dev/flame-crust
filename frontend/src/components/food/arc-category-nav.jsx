"use client";
import React, { useRef } from "react";
import { motion } from "framer-motion";
import { LayoutGrid, Grip, ChevronLeft, ChevronRight } from "lucide-react";
import { categoryMeta } from "@/lib/food-data";
import { cn } from "@/lib/utils";

export function ArcCategoryNav({
  categories = [],
  active = "all",
  onSelectCategory,
  currentCategoryOrder = [],
}) {
  const containerRef = useRef(null);

  // Compute category list with icons and labels
  const allCategoryList = currentCategoryOrder.map((catKey) => {
    const dbCat = categories.find((c) => c.slug === catKey);
    const m = categoryMeta[catKey] || {
      label: dbCat ? dbCat.name : catKey,
      icon: "🍽️",
    };
    return {
      key: catKey,
      label: catKey === "all" ? "All" : (m.label || (dbCat ? dbCat.name : catKey)),
      icon: catKey === "all" ? (categoryMeta.all?.icon || "🍽️") : (dbCat?.icon || m.icon || "🍽️"),
      isAll: catKey === "all",
    };
  });

  // Ensure "All" is at the start (edge) of the list
  const reorderedList = [...allCategoryList];
  const allItemIndex = reorderedList.findIndex(c => c.isAll);
  if (allItemIndex > 0) {
    const [allItem] = reorderedList.splice(allItemIndex, 1);
    reorderedList.unshift(allItem);
  }

  const scrollContainer = (dir) => {
    if (containerRef.current) {
      const amount = dir === "left" ? -180 : 180;
      containerRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  return (
    <div className="w-full relative select-none">
      {/* ================= MOBILE VIEW: FLAT HORIZONTAL ================= */}
      <div className="sm:hidden relative w-full pt-2 pb-1">
        
        {/* Full-width Container (no horizontal scroll) */}
        <div 
          ref={containerRef}
          className="flex items-center justify-between w-full px-1 py-2"
        >
          {reorderedList.map((item) => {
            const isActive = active === item.key;
            
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  if (active !== item.key) {
                    onSelectCategory(item.key);
                  }
                }}
                className="flex flex-col items-center justify-start flex-1 cursor-pointer relative shrink-0 group px-0.5 select-none"
              >
                {/* Fixed-height Icon Wrapper to prevent vertical layout shifting */}
                <div className="h-[3.25rem] w-full flex items-center justify-center relative">
                  {/* Background glow for active item */}
                  {isActive && (
                    <div className="absolute inset-0 bg-red-500/15 rounded-full blur-xl pointer-events-none" />
                  )}

                  {/* Circular Icon Container */}
                  <div
                    className={cn(
                      "flex items-center justify-center rounded-full bg-card relative z-10 transition-transform duration-200",
                      isActive
                        ? "size-[3.25rem] ring-1.5 ring-[#e3342f] shadow-md text-[#e3342f] scale-100"
                        : "size-10 shadow-sm border border-border/40 text-foreground/70 scale-95 hover:border-border/60"
                    )}
                  >
                    {item.isAll ? (
                      <Grip className={cn("size-[1.15rem]", isActive ? "text-[#e3342f]" : "")} />
                    ) : (
                      <span className={cn(isActive ? "text-[1.35rem]" : "text-base", "transition-all")}>
                        {item.icon}
                      </span>
                    )}
                  </div>
                </div>

                {/* Label & Active Underline with fixed height */}
                <div className="flex flex-col items-center mt-1.5 h-6">
                  <span
                    className={cn(
                      "text-[10px] sm:text-[11px] whitespace-nowrap transition-colors tracking-tight leading-tight",
                      isActive
                        ? "font-bold text-foreground"
                        : "font-medium text-muted-foreground group-hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                  <span
                    className={cn(
                      "w-5 h-[2px] rounded-full mt-1 transition-all duration-200",
                      isActive ? "bg-foreground opacity-100 scale-100" : "bg-transparent opacity-0 scale-50"
                    )}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ================= DESKTOP VIEW: PILL TABS ================= */}
      <div className="hidden sm:flex items-center justify-center gap-2 flex-wrap py-2">
        {allCategoryList.map((cat) => {
          const isActive = active === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => onSelectCategory(cat.key)}
              className={cn(
                "relative shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full text-sm sm:text-base font-semibold transition-all duration-200 whitespace-nowrap border-2",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-warm scale-105"
                  : "bg-secondary/80 text-foreground/80 hover:bg-secondary hover:text-foreground hover:border-border/80"
              )}
            >
              {cat.isAll ? <LayoutGrid className="size-4" /> : <span className="text-base">{cat.icon}</span>}
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
