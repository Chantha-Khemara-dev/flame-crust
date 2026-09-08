export function normalizeApiUrl(url) {
  if (!url) return '';
  let clean = url.trim().replace(/\/$/, "");
  if (clean && !clean.endsWith('/api') && clean.startsWith('http')) {
    clean = `${clean}/api`;
  }
  return clean;
}

let runtimeConfigApiUrl = '';

if (typeof window !== 'undefined') {
  // Check URL query parameters on initial load (e.g. ?api=https://... or ?backend=https://...)
  try {
    const params = new URLSearchParams(window.location.search);
    const queryApi = params.get('api') || params.get('backend');
    if (queryApi) {
      const normalized = normalizeApiUrl(queryApi);
      localStorage.setItem("custom_api_url", normalized);
      params.delete('api');
      params.delete('backend');
      const newSearch = params.toString() ? `?${params.toString()}` : '';
      window.history.replaceState({}, '', `${window.location.pathname}${newSearch}${window.location.hash}`);
    }
  } catch (e) {}

  // Fetch public/config.json asynchronously without caching
  const loadRuntimeConfig = () => {
    fetch('/config.json?t=' + Date.now(), { cache: 'no-store' })
      .then(res => res.ok ? res.json() : null)
      .then(cfg => {
        if (cfg && cfg.apiUrl) {
          runtimeConfigApiUrl = normalizeApiUrl(cfg.apiUrl);
        }
      })
      .catch(() => {});
  };

  loadRuntimeConfig();
  window.addEventListener("focus", loadRuntimeConfig);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") loadRuntimeConfig();
  });
}

export function getApiUrl() {
  if (typeof window !== 'undefined') {
    // 1. Manual override from localStorage
    try {
      const customApi = localStorage.getItem("custom_api_url");
      if (customApi) return normalizeApiUrl(customApi);
    } catch (e) {}

    // 2. Dynamic runtime config from public/config.json
    if (runtimeConfigApiUrl) {
      return runtimeConfigApiUrl;
    }

    const { hostname, protocol, origin } = window.location;
    const envUrl = (import.meta.env.VITE_API_URL || '').trim();

    // 3. Explicit HTTPS URL in env
    if (envUrl && envUrl.startsWith('https://')) {
      return normalizeApiUrl(envUrl);
    }

    // 4. Running under HTTPS (Cloudflare Pages, Cloudflare Tunnel, custom domain)
    if (protocol === 'https:') {
      if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
        return normalizeApiUrl(envUrl);
      }
      return `${origin}/api`;
    }

    // 5. Running on local network IP (e.g. http://192.168.1.15:3000)
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
        return normalizeApiUrl(envUrl);
      }
      return `http://${hostname}:8080/api`;
    }

    if (envUrl) return normalizeApiUrl(envUrl);
  }

  return normalizeApiUrl(import.meta.env.VITE_API_URL) || 'http://localhost:8080/api';
}

export function setCustomApiUrl(url) {
  if (typeof window === 'undefined') return;
  if (url) {
    localStorage.setItem("custom_api_url", normalizeApiUrl(url));
  } else {
    localStorage.removeItem("custom_api_url");
  }
}

// Dynamic API_URL object for template strings `${API_URL}/path`
export const API_URL = {
  toString: () => getApiUrl(),
  valueOf: () => getApiUrl(),
  [Symbol.toPrimitive]: () => getApiUrl(),
  replace: (...args) => getApiUrl().replace(...args),
  startsWith: (...args) => getApiUrl().startsWith(...args),
  endsWith: (...args) => getApiUrl().endsWith(...args),
  includes: (...args) => getApiUrl().includes(...args),
};

const inFlightRequests = new Map();
const responseCache = new Map();

export function clearApiCache(pathPrefix) {
  if (!pathPrefix) {
    responseCache.clear();
    return;
  }
  for (const key of responseCache.keys()) {
    if (key.includes(pathPrefix)) responseCache.delete(key);
  }
}

async function request(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const isGet = method === "GET";

  // Invalidate cache immediately on mutations (POST, PUT, DELETE)
  if (!isGet) {
    responseCache.clear();
  }

  let token = null;
  if (typeof window !== 'undefined') {
    const adminAuth = localStorage.getItem("adminAuth");
    const customerAuth = localStorage.getItem("customerAuth");
    const driverAuth = localStorage.getItem("driverAuth");
    const kitchenAuth = localStorage.getItem("kitchenAuth");
    
    if (adminAuth) {
      try { token = JSON.parse(adminAuth).token; } catch (e) {}
    } else if (kitchenAuth) {
      try { token = JSON.parse(kitchenAuth).token; } catch (e) {}
    } else if (driverAuth) {
      try { token = JSON.parse(driverAuth).token; } catch (e) {}
    } else if (customerAuth) {
      try { token = JSON.parse(customerAuth).token; } catch (e) {}
    }
  }

  const currentApiUrl = getApiUrl();
  const fullUrl = `${currentApiUrl}${path}`;
  const cacheKey = `${token || "anon"}:${fullUrl}`;

  // Check TTL micro-cache for GET requests (0 ms latency)
  if (isGet && !options.noCache && !options.refresh) {
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }
  }

  // Deduplicate simultaneous in-flight GET requests
  if (isGet && inFlightRequests.has(cacheKey) && !options.noCache && !options.refresh) {
    return inFlightRequests.get(cacheKey);
  }

  const execRequest = async () => {
    const headers = {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...options.headers
    };

    // Safe 15s timeout to prevent browser hanging indefinitely
    let signal = options.signal;
    let timeoutId = null;
    if (!signal && typeof AbortController !== "undefined") {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(new Error("Request timeout")), 15000);
      signal = controller.signal;
    }

    try {
      const response = await globalThis.fetch(fullUrl, {
        ...options,
        signal,
        headers
      });

      if (!response.ok) {
        let message = `API request failed: ${response.status} ${response.statusText}`;
        try {
          const error = await response.json();
          message = error.error ?? error.message ?? message;
        } catch {
          // Keep the HTTP error when the response is not JSON.
        }
        throw new Error(message);
      }

      if (response.status === 204) return null;
      const data = await response.json();

      // Store in micro-cache with appropriate TTL
      if (isGet && !options.noCache) {
        let ttl = 3000; // 3s micro-cache for orders / high-frequency data
        if (path.includes("/products") || path.includes("/categories") || path.includes("/coupons")) {
          ttl = 45000; // 45s for products & categories
        } else if (path.includes("/dashboard")) {
          ttl = 5000; // 5s for dashboard
        }
        responseCache.set(cacheKey, { data, expiresAt: Date.now() + ttl });
      }

      return data;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      inFlightRequests.delete(cacheKey);
    }
  };

  if (isGet && !options.noCache && !options.refresh) {
    const p = execRequest();
    inFlightRequests.set(cacheKey, p);
    return p;
  }

  return execRequest();
}

function jsonBody(data) {
  return JSON.stringify(data);
}

export function getHealth(options = {}) {
  return request("/health", options);
}

export function getProducts(category, options = {}) {
  return request(`/products${category ? `/${encodeURIComponent(category)}` : ""}`, options);
}

export function getProductCategories(options = {}) {
  return request("/products/categories", options);
}

export function getDashboard(options = {}) {
  return request("/dashboard", options);
}

export function list(resource, params = {}, options = {}) {
  let query = "";
  let isExplicitPaginate = false;
  if (params && typeof params === "object") {
    if (params.headers || params.signal || params.method) {
      options = params;
    } else {
      isExplicitPaginate = Boolean(params.paginate) || params.page !== undefined;
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          searchParams.append(k, v);
        }
      });
      const qs = searchParams.toString();
      if (qs) query = `?${qs}`;
    }
  }
  return request(`/admin/${encodeURIComponent(resource)}${query}`, options).then((res) => {
    if (isExplicitPaginate) return res;
    if (res && Array.isArray(res.items)) return res.items;
    if (res && Array.isArray(res.content)) return res.content;
    if (res && Array.isArray(res.data)) return res.data;
    if (Array.isArray(res)) return res;
    return [];
  });
}

export function get(resource, id, options = {}) {
  return request(`/admin/${encodeURIComponent(resource)}/${encodeURIComponent(id)}`, options);
}

export function create(resource, data, options = {}) {
  return request(`/admin/${encodeURIComponent(resource)}`, {
    ...options,
    method: "POST",
    body: jsonBody(data)
  });
}

export function update(resource, id, data, options = {}) {
  return request(`/admin/${encodeURIComponent(resource)}/${encodeURIComponent(id)}`, {
    ...options,
    method: "PUT",
    body: jsonBody(data)
  });
}

export function remove(resource, id, options = {}) {
  return request(`/admin/${encodeURIComponent(resource)}/${encodeURIComponent(id)}`, {
    ...options,
    method: "DELETE"
  });
}

export function recordProductView(id, options = {}) {
  return request(`/products/${encodeURIComponent(id)}/view`, { ...options, method: "POST" });
}

export const resources = Object.freeze([
  "roles", "users", "customers", "addresses", "categories", "products",
  "product_options", "product_variants", "reviews", "carts", "cart_items",
  "coupons", "orders", "order_items", "payments", "drivers", "otps", "audit_logs"
]);

export const api = Object.freeze({
  health: getHealth,
  products: getProducts,
  dashboard: getDashboard,
  admin: Object.freeze({ list, get, create, update, remove }),
  resources
});

// ── Driver-specific API helpers ──

function driverRequest(path, options = {}) {
  let token = null;
  if (typeof window !== 'undefined') {
    const driverAuth = localStorage.getItem("driverAuth");
    if (driverAuth) {
      try { token = JSON.parse(driverAuth).token; } catch (e) {}
    }
  }
  const headers = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    ...options.headers
  };
  return globalThis.fetch(`${API_URL}${path}`, { ...options, headers }).then(async (res) => {
    if (!res.ok) {
      let message = `API request failed: ${res.status}`;
      try { const err = await res.json(); message = err.error ?? message; } catch {}
      throw new Error(message);
    }
    if (res.status === 204) return null;
    return res.json();
  });
}

export function driverLogin(email, password) {
  return driverRequest("/auth/driver-login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function driverRegister(name, email, phone, password) {
  return driverRequest("/auth/driver-register", {
    method: "POST",
    body: JSON.stringify({ name, email, phone, password }),
  });
}

export function getDriverMe() {
  return driverRequest("/auth/driver-me");
}

export function updateDriverProfile(data) {
  return driverRequest("/auth/driver-profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function updateDriverLocation(latitude, longitude) {
  return driverRequest("/auth/driver-location", {
    method: "PUT",
    body: JSON.stringify({ latitude, longitude }),
  });
}

export async function getOrderMessages(orderId) {
  try {
    const res = await globalThis.fetch(`${API_URL}/auth/order-messages?orderId=${encodeURIComponent(orderId)}`);
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    return [];
  }
}

export async function sendOrderMessage(data) {
  const res = await globalThis.fetch(`${API_URL}/auth/order-messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to send message");
  }
  return await res.json();
}

export async function getActiveCall(orderId) {
  try {
    const res = await globalThis.fetch(`${API_URL}/auth/active-calls?orderId=${encodeURIComponent(orderId)}`);
    if (!res.ok) return { active: false };
    return await res.json();
  } catch (e) {
    return { active: false };
  }
}

export async function startActiveCall(data) {
  const res = await globalThis.fetch(`${API_URL}/auth/active-calls/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to start call");
  }
  return await res.json();
}

export async function answerActiveCall(orderId) {
  const res = await globalThis.fetch(`${API_URL}/auth/active-calls/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order_id: orderId })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to answer call");
  }
  return await res.json();
}

export async function endActiveCall(orderId) {
  const res = await globalThis.fetch(`${API_URL}/auth/active-calls/end`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order_id: orderId })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to end call");
  }
  return await res.json();
}

export async function markOrderMessagesRead(orderId, readerType = "CUSTOMER") {
  try {
    await globalThis.fetch(`${API_URL}/auth/order-messages/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId, reader_type: readerType })
    });
  } catch (e) {}
}

export async function reportOrderChatTyping(orderId, senderType = "CUSTOMER") {
  try {
    await globalThis.fetch(`${API_URL}/auth/order-chat/typing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId, sender_type: senderType })
    });
  } catch (e) {}
}

export async function checkOrderChatTyping(orderId, userType = "CUSTOMER") {
  try {
    const res = await globalThis.fetch(`${API_URL}/auth/order-chat/typing?orderId=${encodeURIComponent(orderId)}&userType=${encodeURIComponent(userType)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {}
  return { isTyping: false };
}

export async function deleteOrderMessage(messageId, senderType = "CUSTOMER") {
  try {
    const res = await globalThis.fetch(`${API_URL}/auth/order-messages/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message_id: messageId, sender_type: senderType })
    });
    return await res.json();
  } catch (e) {
    return { success: false };
  }
}


