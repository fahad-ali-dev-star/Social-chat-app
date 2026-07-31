import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ['logo.svg'],
      manifest: {
        name: "Buzz Chat",
        short_name: "Buzz Chat",
        description: "A modern social platform. Connect, share, and discover.",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        icons: [
          {
            src: "/logo.svg",
            sizes: "192x192 512x512",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      }
    })
  ],
  server: {
    proxy: {
      "/api": "http://localhost:5000",
    },
  },
});
