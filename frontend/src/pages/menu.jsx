"use client";
import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { categoryMeta, categoryOrder as defaultCategoryOrder } from "@/lib/food-data";
import { fetchFoodItems, fetchCategories, getCachedFoodItems, getCachedCategories, getTopTrendingDishes } from "@/lib/food-api";
import { Navbar } from "@/components/food/navbar";
import { FoodCard } from "@/components/food/food-card";
import { SearchInput } from "@/components/shared/search-input";
import { ArcCategoryNav } from "@/components/food/arc-category-nav";
import { CardGridSkeleton } from "@/components/shared/loading-skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { PageTransition } from "@/components/shared/page-transition";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { Flame, Sparkles, Filter, Check, Star, Leaf, LayoutGrid, TrendingUp } from "lucide-react";
import "./menu.css";

const FoodGrid = ({ items, topProducts = [] }) => {
  return (
    <div className="menu-food-grid">
      {items.map((item, idx) => {
        const topIndex = topProducts.findIndex((p) => String(p.id) === String(item.id));
        const isTop = topIndex !== -1;

        return (
          <div key={item.id} className="relative">
            {isTop && (
              <div
                className={cn(
                  "menu-top-product-badge",
                  topIndex === 0 && "menu-top-product-badge-1"
                )}
              >
                <TrendingUp className="size-3 sm:size-3.5 stroke-[3]" />
                <span>#{topIndex + 1}</span>
              </div>
            )}
            <FoodCard item={item} index={idx} />
          </div>
        );
      })}
    </div>
  );
};

function MenuPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryFromUrl = searchParams.get("category") || "all";
  const [active, setActive] = useState(categoryFromUrl);
  const [dietaryFilter, setDietaryFilter] = useState("all"); // 'all' | 'spicy' | 'veg' | 'popular'
  const [itemsFromApi, setItemsFromApi] = useState(() => getCachedFoodItems());
  const [categories, setCategories] = useState(() => getCachedCategories());
  const [loading, setLoading] = useState(() => getCachedFoodItems().length === 0);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(16);
  const [loadingMore, setLoadingMore] = useState(false);

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 16);
  };

  useEffect(() => {
    setActive(categoryFromUrl);
  }, [categoryFromUrl]);

  useEffect(() => {
    setVisibleCount(16);
  }, [active, search, dietaryFilter]);

  useEffect(() => {
    let isMounted = true;
    if (getCachedFoodItems().length === 0) {
      setLoading(true);
    }
    setError(null);
    Promise.all([
      fetchFoodItems(),
      fetchCategories()
    ])
      .then(([items, cats]) => {
        if (isMounted) {
          setItemsFromApi(items);
          setCategories(cats);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          if (!itemsFromApi || itemsFromApi.length === 0) {
            setError(err.message || "Failed to load menu items");
          }
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const syncMenuData = (force = false) => {
      fetchFoodItems(force).then((items) => {
        if (isMounted && Array.isArray(items) && items.length > 0) setItemsFromApi(items);
      });
      fetchCategories().then((cats) => {
        if (isMounted && Array.isArray(cats) && cats.length > 0) setCategories(cats);
      });
    };

    const handleFoodUpdates = (e) => {
      if (e?.detail?.items && Array.isArray(e.detail.items)) {
        if (isMounted) setItemsFromApi(e.detail.items);
      } else {
        syncMenuData(true);
      }
    };

    window.addEventListener("foodItemsUpdated", handleFoodUpdates);
    window.addEventListener("foodsChanged", () => syncMenuData(true));

    const handleStorage = (e) => {
      if (e.key === "flame_foods_last_updated" || e.key === "flame_foods_cache") {
        syncMenuData(true);
      }
    };
    window.addEventListener("storage", handleStorage);

    // Auto real-time poll every 8s while tab is visible
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        syncMenuData(true);
      }
    }, 8000);

    const handleFocus = () => syncMenuData(true);
    window.addEventListener("focus", handleFocus);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("foodItemsUpdated", handleFoodUpdates);
      window.removeEventListener("foodsChanged", () => syncMenuData(true));
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const allItems = itemsFromApi || [];

  const filteredItems = useMemo(() => {
    let items = active === "all" 
      ? allItems 
      : allItems.filter((i) => {
          if (!i.category) return false;
          const normalize = (cat) => String(cat || "").toLowerCase().trim().replace(/[\s_]+/g, "-");
          const itemCat = normalize(i.category);
          const actCat = normalize(active);
          return (
            itemCat === actCat ||
            (itemCat.endsWith("s") && itemCat.slice(0, -1) === actCat) ||
            (actCat.endsWith("s") && actCat.slice(0, -1) === itemCat)
          );
        });
    
    // Dietary filter
    if (dietaryFilter === "spicy") {
      items = items.filter((i) => i.spicy);
    } else if (dietaryFilter === "veg") {
      items = items.filter((i) => i.vegetarian);
    } else if (dietaryFilter === "popular") {
      items = items.filter((i) => i.popular || (Array.isArray(i.tags) && i.tags.some(t => t.toLowerCase().includes("bestseller"))));
    }

    // Text search
    if (search.trim()) {
      const lower = search.toLowerCase();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(lower) ||
          i.description?.toLowerCase().includes(lower) ||
          (Array.isArray(i.tags) ? i.tags : []).some(t => t.toLowerCase().includes(lower))
      );
    }
    return items;
  }, [allItems, active, search, dietaryFilter]);

  const topProducts = useMemo(() => {
    return getTopTrendingDishes(allItems, 4);
  }, [allItems]);

  const orderedFilteredItems = useMemo(() => {
    if (active === "all" && !search.trim() && dietaryFilter === "all" && topProducts.length > 0) {
      const topIds = new Set(topProducts.map((p) => String(p.id)));
      const remaining = filteredItems.filter((i) => !topIds.has(String(i.id)));
      return [...topProducts, ...remaining];
    }
    return filteredItems;
  }, [filteredItems, topProducts, active, search, dietaryFilter]);

  const visibleItems = useMemo(() => {
    if (active !== "all" && dietaryFilter === "all" && !search.trim()) {
      return orderedFilteredItems;
    }
    return orderedFilteredItems.slice(0, visibleCount);
  }, [orderedFilteredItems, visibleCount, active, dietaryFilter, search]);

  const handleCategoryChange = (cat) => {
    if (active === cat) return;
    setActive(cat);
    setDietaryFilter("all");
    setSearchParams({ category: cat }, { replace: true });
  };

  const retry = () => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    Promise.all([
      fetchFoodItems(controller.signal),
      fetchCategories(controller.signal)
    ])
      .then(([items, cats]) => {
        setItemsFromApi(items);
        setCategories(cats);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError(err.message || "Failed to load menu items");
          setLoading(false);
        }
      });
  };

  const dbActiveCat = categories.find(c => c.slug === active);
  const baseMeta = categoryMeta[active] || (dbActiveCat ? { label: dbActiveCat.name, description: `Explore our delicious ${dbActiveCat.name} made fresh to order.`, icon: "🍽️" } : categoryMeta.all);
  const meta = {
    ...baseMeta,
    icon: (active === "all" ? (categoryMeta.all?.icon || "🍽️") : (dbActiveCat?.icon || baseMeta?.icon || "🍽️")),
    label: dbActiveCat?.name || baseMeta?.label,
  };
  const currentCategoryOrder = categories.length > 0 ? ["all", ...categories.map(c => c.slug)] : defaultCategoryOrder;

  return (
    <div className="menu-page-container">
      <Navbar />
      <main className="menu-main">
        <PageTransition>
          <section className="menu-section">
            <div className="menu-content-container">
              
              {/* Header Title */}
              <div className="menu-header-wrapper">
                <span className="menu-badge">
                  <Sparkles className="size-3.5" />
                  Our Menu
                </span>
                <h2 className="menu-title">
                  Pick your <span className="text-gradient-warm italic">flavor</span> of comfort
                </h2>
                <p className="menu-subtitle">
                  Every dish is made-to-order with fresh sourdough & premium ingredients.
                </p>
              </div>

              {/* Mobile & Desktop Search Bar */}
              <div className="menu-search-wrapper">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Search for pizza, burgers, sides..."
                  className="w-full shadow-xs"
                />
              </div>

              {/* Curved / Arched Dome Category Selector */}
              <div className="menu-nav-wrapper">
                <ArcCategoryNav
                  categories={categories}
                  active={active}
                  onSelectCategory={handleCategoryChange}
                  currentCategoryOrder={currentCategoryOrder}
                />
              </div>

              {/* Quick Dietary Filters & Count Bar */}
              <div className="menu-filters-bar">
                <div className="menu-filters-list">
                  <span className="menu-filters-label">
                    <Filter className="size-3.5" /> Filter:
                  </span>
                  {[
                    { id: "all", label: "All", icon: null },
                    { id: "popular", label: "Popular", icon: Star },
                    { id: "spicy", label: "Spicy", icon: Flame },
                    { id: "veg", label: "Vegetarian", icon: Leaf },
                  ].map((filter) => {
                    const isSelected = dietaryFilter === filter.id;
                    const IconComponent = filter.icon;
                    return (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => setDietaryFilter(filter.id)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold transition-all duration-300 shrink-0 cursor-pointer border",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-[0_4px_12px_rgba(227,52,47,0.3)]"
                            : "bg-card text-muted-foreground border-border/40 shadow-sm hover:bg-secondary hover:text-foreground hover:border-border/60"
                        )}
                      >
                        {IconComponent && (
                          <IconComponent className={cn("size-3.5", isSelected ? "text-primary-foreground" : "text-muted-foreground/70")} />
                        )}
                        {filter.label}
                      </button>
                    );
                  })}
                </div>

                <div className="menu-filters-count">
                  Showing <span className="font-bold text-foreground">{filteredItems.length}</span> {active === "all" ? "dishes" : meta.label}
                </div>
              </div>

              {/* Category Description Banner */}
              <div className="menu-desc-banner">
                <p className="menu-desc-text">
                  {meta.description}
                </p>
              </div>

              {/* Food Items Grid */}
              <div className="menu-food-items-container">
                {error ? (
                  <ErrorState
                    title="Couldn't load the menu"
                    description={error}
                    onRetry={retry}
                    className="py-16"
                  />
                ) : loading ? (
                  <CardGridSkeleton count={8} className="mt-6 sm:mt-8" />
                ) : filteredItems.length === 0 ? (
                  <div className="menu-no-dishes">
                    <p className="menu-no-dishes-title">No dishes found</p>
                    <p className="menu-no-dishes-subtitle">
                      Try selecting a different category or clearing search & filters.
                    </p>
                    {(search || dietaryFilter !== "all" || active !== "all") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearch("");
                          setDietaryFilter("all");
                          handleCategoryChange("all");
                        }}
                        className="mt-4 rounded-full text-xs font-semibold"
                      >
                        Reset All Filters
                      </Button>
                    )}
                  </div>
                ) : (
                  <motion.div
                    key={active + "-" + dietaryFilter}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <FoodGrid 
                      items={visibleItems} 
                      topProducts={active === "all" && !search.trim() && dietaryFilter === "all" ? topProducts : []} 
                    />

                    {active === "all" && dietaryFilter === "all" && !search.trim() && visibleCount < filteredItems.length && (
                      <div className="menu-load-more-container">
                        <Button
                          onClick={handleLoadMore}
                          size="lg"
                          className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6 text-sm sm:text-base font-semibold shadow-warm transition-all duration-300 active:scale-95 min-w-[260px] sm:min-w-[280px]"
                        >
                          Load More Foods ({filteredItems.length - visibleCount} remaining)
                        </Button>
                        <p className="text-xs text-muted-foreground font-medium">
                          Showing {visibleCount} of {filteredItems.length} foods
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </div>
          </section>
        </PageTransition>
      </main>
    </div>
  );
}

export default MenuPage;
