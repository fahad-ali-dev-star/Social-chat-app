import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["logo.svg", "logo192.png", "logo512.png"],
      manifest: {
        name: "Buzz Chat",
        short_name: "Buzz Chat",
        description: "A modern social platform. Connect, share, and discover.",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        id: "/",
        prefer_related_applications: false,
        categories: ["social", "communication"],
        icons: [
          {
            src: "/logo192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/logo512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/logo512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ],
        shortcuts: [
          {
            name: "Messages",
            url: "/messages",
            description: "Open your messages"
          },
          {
            name: "Notifications",
            url: "/notifications",
            description: "View notifications"
          }
        ]
      },
      workbox: {
        // Precache all app shell assets
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Max file size to precache (5MB)
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Runtime caching strategies
        runtimeCaching: [
          {
            // API — NetworkFirst: always try network, fall back to cache when offline
            urlPattern: /^\/api\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Cloudinary images — StaleWhileRevalidate: show cached instantly, update in background
            urlPattern: /^https:\/\/res\.cloudinary\.com\//,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "cloudinary-images",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Google Fonts — CacheFirst: fonts never change
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // All other images — CacheFirst
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "images",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        // Offline fallback page
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/],
        // Skip waiting so updates apply immediately
        skipWaiting: true,
        clientsClaim: true,
      },
    })
  ],
  server: {
    proxy: {
      "/api": "http://localhost:5000",
      // Forward Socket.IO WebSocket traffic to the backend.
      // Without this, Vite intercepts the upgrade handshake and Socket.IO
      // never gets a real-time connection in development.
      "/socket.io": {
        target: "http://localhost:5000",
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    // Target modern browsers for smaller bundles
    target: "es2015",
    rollupOptions: {
      output: {
        // Manual chunk splitting to reduce initial load
        manualChunks: {
          react: ["react", "react-dom"],
          router: ["react-router-dom"],
          socket: ["socket.io-client"],
          zustand: ["zustand"],
        },
      },
    },
    // Warn if any chunk exceeds 400KB
    chunkSizeWarningLimit: 400,
  },
});
