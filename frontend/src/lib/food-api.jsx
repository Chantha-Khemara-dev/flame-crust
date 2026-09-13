import { getDashboard, getProducts, getProductCategories } from "./api";
import { DEFAULT_FALLBACK_PRODUCTS } from "./food-data";

let cachedFoodItems = DEFAULT_FALLBACK_PRODUCTS;
try {
  const stored = localStorage.getItem("flame_foods_cache");
  if (stored) {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.length > 0) cachedFoodItems = parsed;
  }
} catch (e) {}

let cachedCategories = [];
try {
  const stored = localStorage.getItem("flame_categories_cache");
  if (stored) cachedCategories = JSON.parse(stored);
} catch (e) {}

export function getCachedFoodItems() {
  return cachedFoodItems.length > 0 ? cachedFoodItems : DEFAULT_FALLBACK_PRODUCTS;
}

export function getCachedCategories() {
  return cachedCategories;
}

async function fetchDashboard(signal) {
  return getDashboard({ signal });
}

export function getImageUrl(img) {
  if (!img) return "/images/library/pizza.jpg";
  
  // Fix for accidentally prefixed local images from previous bugs
  if (img.includes("/image/upload/images/")) {
    return "/" + img.substring(img.indexOf("images/"));
  }
  if (img.includes("/image/upload//images/")) {
    return img.substring(img.indexOf("/images/"));
  }

  if (img.startsWith("http://") || img.startsWith("https://") || img.startsWith("/")) {
    return img;
  }

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "gdkctwwo";
  return `https://res.cloudinary.com/${cloudName}/image/upload/${img}`;
}

function normalizeProduct(product) {
  return {
    ...product,
    id: String(product.id),
    tags: Array.isArray(product.tags) ? product.tags : String(product.tags ?? "").split(",").map((tag) => tag.trim()).filter(Boolean),
    image: getImageUrl(product.image)
  };
}

let inFlightFoodsPromise = null;
async function fetchFoodItems(forceRefresh = false) {
  if (inFlightFoodsPromise && !forceRefresh) return inFlightFoodsPromise;

  inFlightFoodsPromise = (async () => {
    try {
      const fetchOpts = forceRefresh ? { cache: "no-store", headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" } } : {};
      const products = await getProducts(null, fetchOpts);
      if (Array.isArray(products) && products.length > 0) {
        const normalized = products.map(normalizeProduct);
        
        // Detect if sales_count, ratings, or items changed
        const prevSummary = cachedFoodItems.map((p) => `${p.id}:${p.sales_count ?? p.salesCount ?? 0}`).join(",");
        const nextSummary = normalized.map((p) => `${p.id}:${p.sales_count ?? p.salesCount ?? 0}`).join(",");
        const hasChanged = prevSummary !== nextSummary;

        cachedFoodItems = normalized;
        try {
          localStorage.setItem("flame_foods_cache", JSON.stringify(normalized));
        } catch (e) {}

        if (hasChanged && typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("foodItemsUpdated", { detail: { items: normalized } }));
        }

        return normalized;
      }
      return cachedFoodItems.length > 0 ? cachedFoodItems : DEFAULT_FALLBACK_PRODUCTS;
    } catch (err) {
      return cachedFoodItems.length > 0 ? cachedFoodItems : DEFAULT_FALLBACK_PRODUCTS;
    } finally {
      inFlightFoodsPromise = null;
    }
  })();

  return inFlightFoodsPromise;
}

export function triggerFoodRefresh() {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("flame_foods_last_updated", Date.now().toString());
    } catch (e) {}
    window.dispatchEvent(new CustomEvent("foodItemsUpdated"));
  }
  return fetchFoodItems(true);
}

async function fetchCategories() {
  if (inFlightCategoriesPromise) return inFlightCategoriesPromise;

  inFlightCategoriesPromise = (async () => {
    try {
      const data = await getProductCategories();
      if (Array.isArray(data) && data.length > 0) {
        cachedCategories = data;
        try {
          localStorage.setItem("flame_categories_cache", JSON.stringify(data));
        } catch (e) {}
      }
      return data;
    } catch (err) {
      if (cachedCategories.length > 0) return cachedCategories;
      throw err;
    } finally {
      inFlightCategoriesPromise = null;
    }
  })();

  return inFlightCategoriesPromise;
}

export function getTopTrendingDishes(items, count = 4) {
  if (!Array.isArray(items) || items.length === 0) return [];

  // Filter for active food dishes (exclude drinks and inactive items)
  const dishes = items.filter(
    (item) =>
      item.active !== false &&
      item.active !== 0 &&
      String(item.category || "").toLowerCase() !== "drink" &&
      String(item.category || "").toLowerCase() !== "drinks"
  );

  // Filter popular dishes first if available
  const popularOnly = dishes.filter((item) => Boolean(item.popular));
  const pool = popularOnly.length >= count ? popularOnly : dishes;

  return [...pool]
    .sort((a, b) => {
      // 1. Real order sales count (highest orders first)
      const salesA = Number(a.sales_count ?? a.salesCount ?? 0);
      const salesB = Number(b.sales_count ?? b.salesCount ?? 0);
      if (salesB !== salesA) return salesB - salesA;

      // 2. Rating (highest rating first)
      const ratingA = Number(a.rating ?? 0);
      const ratingB = Number(b.rating ?? 0);
      if (ratingB !== ratingA) return ratingB - ratingA;

      // 3. View count
      const viewsA = Number(a.view_count ?? a.viewCount ?? 0);
      const viewsB = Number(b.view_count ?? b.viewCount ?? 0);
      return viewsB - viewsA;
    })
    .slice(0, count);
}

export {
  fetchFoodItems,
  fetchCategories,
  fetchDashboard
};

