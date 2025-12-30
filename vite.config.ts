import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: { enabled: false },

      // ✅ switch to custom SW you control
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",

      includeAssets: ["favicon.ico", "robots.txt"],
      manifest: {
        name: "LensTracker",
        short_name: "LensTracker",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#4f46e5",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" }
        ]
      }
    })
  ]
});
