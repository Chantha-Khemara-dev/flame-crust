import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "./components/theme-provider.jsx";
import App from "./App.jsx";
import "./app/globals.css";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { registerSW } from 'virtual:pwa-register';
import { ErrorBoundary } from "./components/shared/error-boundary.jsx";

// Purge stale runtime cache (like old static-assets) so Android/iOS gets the latest bundle immediately
if (typeof window !== 'undefined' && 'caches' in window) {
  caches.delete('static-assets').catch(() => {});
}

// -------------------------------------------------------------
// Real-time Version Poller & Instant PWA Update Engine
// -------------------------------------------------------------
const CURRENT_VERSION = typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : 'dev';
let isUpdating = false;

function showUpdateNotification() {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById('pwa-update-banner');
  if (existing) return;

  const banner = document.createElement('div');
  banner.id = 'pwa-update-banner';
  banner.style.cssText = `
    position: fixed;
    top: 18px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #EF4444, #DC2626);
    color: #ffffff;
    padding: 10px 22px;
    border-radius: 9999px;
    font-size: 13px;
    font-weight: 600;
    box-shadow: 0 10px 30px -5px rgba(239, 68, 68, 0.6);
    z-index: 999999;
    display: flex;
    align-items: center;
    gap: 10px;
    pointer-events: none;
    font-family: system-ui, -apple-system, sans-serif;
  `;
  banner.innerHTML = `
    <span style="display:inline-block;width:12px;height:12px;border:2px solid #ffffff;border-top-color:transparent;border-radius:50%;animation:fc-spin 0.8s linear infinite;"></span>
    <span>🚀 កំណែថ្មីកំពុង Update Real-time...</span>
    <style>@keyframes fc-spin { to { transform: rotate(360deg); } }</style>
  `;
  document.body.appendChild(banner);
}

async function triggerInstantUpdate(newVersion) {
  if (isUpdating) return;
  isUpdating = true;
  console.log(`[PWA Update] Applying update: ${CURRENT_VERSION} -> ${newVersion}`);
  showUpdateNotification();

  try {
    // 1. Purge all cache storages
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
    // 2. Prompt service workers to activate
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) {
        if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        await reg.update().catch(() => {});
      }
    }
  } catch (err) {
    console.error('[PWA Update Error]', err);
  }

  // 3. Instant hard reload with cache-buster
  setTimeout(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('_v', Date.now());
    window.location.replace(url.toString());
  }, 600);
}

async function checkVersion() {
  if (isUpdating || CURRENT_VERSION === 'dev') return;
  if (typeof document !== 'undefined' && document.hidden) return;
  try {
    const res = await fetch(`/version.json?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.version && data.version !== CURRENT_VERSION) {
      triggerInstantUpdate(data.version);
    }
  } catch (err) {
    // Silent on offline/network errors
  }
}

// Low-power adaptive version check:
// 25s background interval + instant check on app switch/focus
setInterval(checkVersion, 25000);

// Check on mobile app switch / focus / network reconnect
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkVersion();
  });
  window.addEventListener('focus', checkVersion);
  window.addEventListener('online', checkVersion);
}
setTimeout(checkVersion, 1500);

let isRefreshing = false;

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true);
  },
  onRegisteredSW(swUrl, registration) {
    if (registration) {
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      registration.update().catch(() => {});

      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (installingWorker) {
          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              installingWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        }
      });

      setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return;
        registration.update().catch(() => {});
      }, 30 * 1000);
    }
  }
});

// Immediately reload when new Service Worker takes control so phone PWA updates instantly
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!isRefreshing && !isUpdating) {
      isRefreshing = true;
      triggerInstantUpdate('sw-controller');
    }
  });
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "55635804125-pvsg464061vkl6n8rrb32bfu2f5c1t9e.apps.googleusercontent.com";

// Disable iOS/PWA swipe-to-navigate gestures from the edges of the screen
document.addEventListener("touchstart", (e) => {
  const x = e.touches[0].pageX;
  // If touch starts within 25px of the left or right edge, block it
  if (x < 25 || x > window.innerWidth - 25) {
    e.preventDefault();
  }
}, { passive: false });


// Handle Vite dynamic import chunk failure (e.g. after fresh deployments) to prevent blank black screens
if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    window.location.reload();
  });
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <BrowserRouter>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
            <App />
          </ThemeProvider>
        </BrowserRouter>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
