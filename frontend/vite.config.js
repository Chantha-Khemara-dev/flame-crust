import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import fs from "node:fs";
import { VitePWA } from "vite-plugin-pwa";
// import { nodePolyfills } from 'vite-plugin-node-polyfills';

const BUILD_TIME = Date.now().toString();

export default defineConfig({
  define: {
    __APP_BUILD_TIME__: JSON.stringify(BUILD_TIME),
  },
  plugins: [
    // nodePolyfills(),
    react(),
    {
      name: 'fix-ios-pwa-css-crossorigin',
      transformIndexHtml(html) {
        // Strip crossorigin from stylesheet links so iOS WebKit standalone PWA doesn't block local CSS
        return html.replace(/<link rel="stylesheet" crossorigin/g, '<link rel="stylesheet"');
      }
    },
    {
      name: 'generate-version-json',
      buildStart() {
        const publicDir = path.resolve(__dirname, 'public');
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true });
        }
        fs.writeFileSync(
          path.resolve(publicDir, 'version.json'),
          JSON.stringify({ version: BUILD_TIME, builtAt: new Date().toISOString() }, null, 2)
        );
      }
    },
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/assets\//, /\.[a-zA-Z0-9]+$/],
        importScripts: ['/sw-push.js'],
        runtimeCaching: [
          {
            urlPattern: /version\.json/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^\/api\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /config\.json/i,
            handler: 'NetworkOnly',
          }
        ]
      },
      includeAssets: ['logo.png', 'logo-192.png', 'robots.txt', 'sw-push.js'],
      manifest: {
        name: 'Flame Crust',
        short_name: 'FlameCrust',
        description: 'Flame Crust Pizza Delivery',
        theme_color: '#EF4444',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/logo-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  server: {
    port: 3000,
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      }
    },
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      "Cross-Origin-Embedder-Policy": "unsafe-none",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
