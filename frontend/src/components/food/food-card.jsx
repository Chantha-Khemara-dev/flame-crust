"use client";
import React, { Fragment, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, Star, Flame, Leaf, Check, Heart, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-store";
import { cn, formatPrice } from "@/lib/utils";
import { getOptimizedImageUrl } from "@/lib/cloudinary";

const FoodCardComponent = ({ item, index = 0, trendingRank = null }) => {
  const addItem = useCart((s) => s.addItem);
  const increment = useCart((s) => s.increment);
  const decrement = useCart((s) => s.decrement);
  const removeItem = useCart((s) => s.removeItem);
  
  // Select primitive qty to prevent mass re-renders on low-end devices
  const inCartQty = useCart((s) => s.lines.find((l) => String(l.id) === String(item.id))?.qty || 0);
  const inCart = inCartQty > 0 ? { id: item.id, qty: inCartQty } : null;
  const [isFavorite, setIsFavorite] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  useEffect(() => {
    try {
      const favs = JSON.parse(localStorage.getItem("customerFavorites") || "[]");
      setIsFavorite(favs.some((f) => String(f.id) === String(item.id)));
    } catch (e) { }
  }, [item.id]);

  const toggleFavorite = (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      let favs = JSON.parse(localStorage.getItem("customerFavorites") || "[]");
      if (isFavorite) {
        favs = favs.filter((f) => String(f.id) !== String(item.id));
      } else {
        favs.push(item);
      }
      localStorage.setItem("customerFavorites", JSON.stringify(favs));
      setIsFavorite(!isFavorite);
      window.dispatchEvent(new Event("favoritesChanged"));
    } catch (err) { }
  };

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    window.dispatchEvent(
      new CustomEvent("fly-to-cart", {
        detail: { image: item.image, startRect: rect },
      })
    );

    addItem(item);
  };

  const discountBadge = item.discount_percent || item.discount_percentage
    ? `-${item.discount_percent || item.discount_percentage}%`
    : item.original_price && Number(item.original_price) > Number(item.price)
      ? `-${Math.round(((item.original_price - item.price) / item.original_price) * 100)}%`
      : null;

  return (
    <article className="group card-lift relative flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl bg-card border border-border/70 shadow-warm hover:shadow-warm-lg transition-all duration-300">
      <Link to={`/product/${item.id}`} className="block relative">
        <div className="relative aspect-[4/3] overflow-hidden bg-secondary/30">
          {!isImageLoaded && (
            <div className="absolute inset-0 bg-muted animate-pulse" />
          )}
          <img
            src={getOptimizedImageUrl(item.image)}
            alt={item.name}
            onLoad={() => setIsImageLoaded(true)}
            className={cn(
              "w-full h-full object-cover transition-all duration-500 group-hover:scale-105",
              isImageLoaded ? "opacity-100 blur-0" : "opacity-0 blur-sm"
            )}
            loading="lazy"
          />

          {/* Top-Right: Favorite Heart Button */}
          <button
            type="button"
            onClick={toggleFavorite}
            className="absolute top-2.5 right-2.5 p-1.5 sm:p-2 rounded-full bg-background/80 hover:bg-background backdrop-blur-md shadow-xs hover:scale-110 active:scale-95 transition-all z-10 cursor-pointer"
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart
              className={cn(
                "size-3.5 sm:size-4 transition-colors",
                isFavorite ? "fill-red-500 text-red-500" : "text-foreground/75"
              )}
            />
          </button>

          {/* Top-Left: Trending Rank or Discount Badge */}
          <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1">
            {trendingRank && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 text-slate-950 px-2 py-0.5 text-[10px] sm:text-xs font-black uppercase tracking-wide shadow-xs">
                <TrendingUp className="size-2.5 sm:size-3" />
                #{trendingRank}
              </span>
            )}
            {discountBadge && !trendingRank && (
              <span className="inline-flex items-center rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-[10px] sm:text-xs font-bold tracking-tight shadow-xs">
                {discountBadge}
              </span>
            )}
          </div>

          {/* Bottom-Right: Star Rating Badge */}
          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-full bg-background/90 backdrop-blur-md px-2 py-0.5 text-[10px] sm:text-xs font-bold text-foreground shadow-xs border border-border/40">
            <Star className="size-2.5 sm:size-3 fill-amber-500 text-amber-500" />
            <span>{item.rating || "4.9"}</span>
          </div>

          {/* Bottom-Left: Spicy / Veg Badges */}
          <div className="absolute bottom-2.5 left-2.5 flex flex-wrap items-center gap-1 pr-12">
            {item.spicy && (
              <span className="flex items-center gap-1 rounded-full bg-red-600/90 backdrop-blur-xs text-white px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase shadow-xs">
                <Flame className="size-2.5 sm:size-3" />
                Spicy
              </span>
            )}
            {item.vegetarian && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-600/90 backdrop-blur-xs text-white px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase shadow-xs">
                <Leaf className="size-2.5 sm:size-3" />
                Veg
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Card Body: Name, Description, Price & Action Controls */}
      <div className="flex flex-1 flex-col p-3 sm:p-4 bg-card justify-between gap-3 border-t border-border/40">
        <div>
          <Link to={`/product/${item.id}`} className="hover:text-primary transition-colors block">
            <h3 className="font-serif text-sm sm:text-base font-bold text-foreground leading-tight line-clamp-1 group-hover:text-primary transition-colors">
              {item.name}
            </h3>
          </Link>
          {item.description && (
            <p className="mt-1 text-[11px] sm:text-xs text-muted-foreground line-clamp-1 sm:line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-1.5 pt-1 h-8 sm:h-9">
          <div className="flex flex-col shrink-0 min-w-0">
            <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-muted-foreground font-semibold leading-none">
              Price
            </span>
            <span className="font-serif text-sm sm:text-lg font-bold text-foreground leading-tight mt-0.5 whitespace-nowrap">
              {formatPrice(item.price)}
            </span>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {inCart ? (
              <motion.div
                key="in-cart-pill"
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center justify-between gap-1 h-7 sm:h-9 w-[80px] sm:w-[96px] rounded-xl bg-emerald-600 text-white shadow-xs shrink-0 px-1"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (inCart.qty > 1) decrement(inCart.id);
                    else removeItem(inCart.id);
                  }}
                  className="size-5 sm:size-6 rounded-lg hover:bg-white/20 flex items-center justify-center transition-transform shrink-0 cursor-pointer active:scale-90"
                >
                  <Minus className="size-3" />
                </button>
                <motion.span
                  key={inCart.qty}
                  initial={{ scale: 1.25 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.12 }}
                  className="text-xs font-bold w-4 text-center tabular-nums"
                >
                  {inCart.qty}
                </motion.span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    increment(inCart.id);
                  }}
                  className="size-5 sm:size-6 rounded-lg hover:bg-white/20 flex items-center justify-center transition-transform shrink-0 cursor-pointer active:scale-90"
                >
                  <Plus className="size-3" />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="add-btn-wrapper"
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Button
                  onClick={handleAdd}
                  size="sm"
                  className="h-7 sm:h-9 px-3 sm:px-4 rounded-xl font-bold shadow-xs transition-all active:scale-95 text-[11px] sm:text-xs shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  <span>Add</span>
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </article>
  );
};

export const FoodCard = React.memo(FoodCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.trendingRank === nextProps.trendingRank
  );
});

export default FoodCard;
