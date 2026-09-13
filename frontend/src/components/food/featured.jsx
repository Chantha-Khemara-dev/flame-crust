"use client";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, ArrowRight } from "lucide-react";
import { fetchFoodItems, getCachedFoodItems, getTopTrendingDishes } from "@/lib/food-api";
import { FoodCard } from "./food-card";
import "./featured.css";

export function Featured() {
  const [featured, setFeatured] = useState(() => {
    const cached = getCachedFoodItems();
    return getTopTrendingDishes(cached, 4);
  });
  const [loading, setLoading] = useState(() => {
    const cached = getCachedFoodItems();
    return getTopTrendingDishes(cached, 4).length === 0;
  });

  useEffect(() => {
    let isMounted = true;
    if (getCachedFoodItems().length === 0) {
      setLoading(true);
    }

    const syncTrending = (force = false) => {
      fetchFoodItems(force)
        .then((items) => {
          if (isMounted && Array.isArray(items) && items.length > 0) {
            const topDishes = getTopTrendingDishes(items, 4);
            if (topDishes.length > 0) {
              setFeatured(topDishes);
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    };

    // 1. Initial fetch
    syncTrending(false);

    // 2. Real-time event listener for local order placement or update
    const handleFoodUpdate = (e) => {
      if (e?.detail?.items && Array.isArray(e.detail.items)) {
        const topDishes = getTopTrendingDishes(e.detail.items, 4);
        if (isMounted && topDishes.length > 0) {
          setFeatured(topDishes);
        }
      } else {
        syncTrending(true);
      }
    };

    window.addEventListener("foodItemsUpdated", handleFoodUpdate);

    // 3. Multi-tab sync via localStorage storage event
    const handleStorage = (e) => {
      if (e.key === "flame_foods_last_updated" || e.key === "flame_foods_cache") {
        syncTrending(true);
      }
    };
    window.addEventListener("storage", handleStorage);

    // 4. Background real-time polling every 8s while tab is active
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        syncTrending(true);
      }
    }, 8000);

    // 5. Visibility and focus triggers
    const handleFocus = () => syncTrending(true);
    window.addEventListener("focus", handleFocus);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("foodItemsUpdated", handleFoodUpdate);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  if (!loading && featured.length === 0) {
    return null;
  }

  return (
    <section className="featured-section">
      <div className="featured-container">
        
        {/* Compact Single-Row Header */}
        <div className="featured-header-row">
          <div className="trending-pill">
            <TrendingUp className="trending-icon" />
            Trending this week
          </div>
          <Link 
            to="/menu" 
            className="see-menu-link"
          >
            <span>See full menu</span>
            <ArrowRight className="see-menu-icon" />
          </Link>
        </div>

        <h2 className="featured-heading">
          The dishes our fans <span className="text-gradient-warm italic">can't stop ordering.</span>
        </h2>

        {/* Product Cards Grid */}
        {loading ? (
          <div className="featured-grid">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="skeleton-item" />
            ))}
          </div>
        ) : (
          <div className="featured-grid">
            {featured.map((item, i) => (
              <FoodCard key={item.id} item={item} index={i} trendingRank={i + 1} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default Featured;

