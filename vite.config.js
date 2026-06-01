import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const appEnv = process.env.VITE_APP_ENV || "production";
const isStaging = appEnv === "staging";

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString()),
    __APP_ENV__: JSON.stringify(appEnv),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "generateSW",
      devOptions: {
        enabled: false, // Disable service worker in development
      },
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],
      manifest: {
        name: isStaging ? "Omega Könyvtár (Teszt)" : "Omega Könyvtár",
        short_name: isStaging ? "Omega-Teszt" : "Omega",
        description: isStaging
          ? "TESZT - Digitális Könyvtárad"
          : "Digitális Könyvtárad",
        theme_color: "#844a59",
        background_color: "#f8f9fa",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/logo.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
          {
            src: "/logo.svg",
            sizes: "512x512",
            type: "dynamic",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: isStaging
                ? "firebase-storage-staging"
                : "firebase-storage",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.firebaseio\.com\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: isStaging
                ? "firebase-database-staging"
                : "firebase-database",
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
              },
            },
          },
        ],
        // Force immediate updates and cache busting
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        // Add cache busting for development
        clientsClaim: true,
        // Cache name for better version control
        cacheId: isStaging ? "omega-konyvtar-staging" : "omega-konyvtar-v1",
        // Don't cache the service worker itself
        navigateFallback: "index.html",
        // Maximum entries to cache
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3MB
      },
    }),
  ],
});
