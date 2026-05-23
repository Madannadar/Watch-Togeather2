import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "Watch Together",
        short_name: "WatchTogether",
        description: "Sync YouTube with friends in real time.",
        theme_color: "#4f46e5",
        background_color: "#020617",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        // Cache app shell (JS, CSS, HTML) for offline-capable shell
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Don't cache YouTube IFrame API or socket connections
        navigateFallback: "/",
        navigateFallbackDenylist: [/^\/api/, /socket\.io/],
        runtimeCaching: [
          {
            // Cache YouTube thumbnail images
            urlPattern: /^https:\/\/i\.ytimg\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "youtube-thumbnails",
              expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
            },
          },
        ],
      },
      devOptions: {
        // Enable PWA in dev for testing
        enabled: false,
      },
    }),
  ],
  server: {
    host: true,
    allowedHosts: ["https://watch-togeather2.onrender.com"],
  },
});