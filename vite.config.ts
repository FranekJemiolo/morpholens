import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "generateSW",
      manifestFilename: "manifest.webmanifest",
      injectRegister: "script",
      manifest: {
        name: "MorphoLens - Edge Anthropometric AI",
        short_name: "MorphoLens",
        description:
          "Zero-cost, 100% client-side anthropometric body composition estimation & 3D visualization.",
        start_url: "./",
        display: "standalone",
        orientation: "any",
        theme_color: "#090D16",
        background_color: "#090D16",
        icons: [
          {
            src: "icons/icon-192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
          },
          {
            src: "icons/icon-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,json,task,wasm}"],
        runtimeCaching: [
          {
            urlPattern: /.*\/models\/.*\.task$/,
            handler: "CacheFirst",
            options: {
              cacheName: "mediapipe-models-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          {
            urlPattern: /.*\/wasm\/.*$/,
            handler: "CacheFirst",
            options: {
              cacheName: "mediapipe-wasm-cache",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
    }),
  ],
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
  },
  worker: {
    format: "es",
  },
});
