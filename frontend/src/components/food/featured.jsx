"use client";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, ArrowRight } from "lucide-react";
import { fetchFoodItems, getCachedFoodItems } from "@/lib/food-api";
import { FoodCard } from "./food-card";
import "./featured.css";

export function getTopTrendingDishes(items, count = 4) {
  if (!Array.isArray(items) || items.length === 0) return [];

  // Filter for active food dishes (exclude drinks and inactive products)
  const dishes = items.filter(
    (item) =>
      item.active !== false &&
      item.active !== 0 &&
      String(item.category || "").toLowerCase() !== "drink" &&
      String(item.category || "").toLowerCase() !== "drinks"
  );

  // If popular dishes exist, use them as priority pool
  const popularDishes = dishes.filter((item) => Boolean(item.popular));
  const candidatePool = popularDishes.length >= count ? popularDishes : dishes;

  // Sort by true customer demand:
  // 1. sales_count DESC (most ordered items)
  // 2. popular flag DESC
  // 3. rating DESC (highest customer satisfaction)
  // 4. view_count DESC
  return [...candidatePool]
    .sort((a, b) => {
      const salesA = Number(a.sales_count ?? a.salesCount ?? 0);
      const salesB = Number(b.sales_count ?? b.salesCount ?? 0);
      if (salesB !== salesA) return salesB - salesA;

      const popA = a.popular ? 1 : 0;
      const popB = b.popular ? 1 : 0;
      if (popB !== popA) return popB - popA;

      const ratingA = Number(a.rating ?? 0);
      const ratingB = Number(b.rating ?? 0);
      if (ratingB !== ratingA) return ratingB - ratingA;

      const viewsA = Number(a.view_count ?? a.viewCount ?? 0);
      const viewsB = Number(b.view_count ?? b.viewCount ?? 0);
      return viewsB - viewsA;
    })
    .slice(0, count);
}

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
    fetchFoodItems()
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
    return () => {
      isMounted = false;
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

