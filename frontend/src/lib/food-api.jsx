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
let inFlightCategoriesPromise = null;

async function fetchFoodItems() {
  if (inFlightFoodsPromise) return inFlightFoodsPromise;

  inFlightFoodsPromise = (async () => {
    try {
      const products = await getProducts();
      if (Array.isArray(products) && products.length > 0) {
        const normalized = products.map(normalizeProduct);
        cachedFoodItems = normalized;
        try {
          localStorage.setItem("flame_foods_cache", JSON.stringify(normalized));
        } catch (e) {}
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

export {
  fetchFoodItems,
  fetchCategories,
  fetchDashboard
};
