import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";
// https://vitejs.dev/config/
export default defineConfig({
  root: ".",
  plugins: [
    vue(),
    VitePWA({
      filename: "service-worker.js",
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "icon/*.png"],
      manifest: {
        name: "MCCB NG",
        short_name: "MCCB",
        description: "mCloud Compte and Budget Next Generation",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        icons: [
          {
            src: "icon/app-icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icon/app-icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/styles/variables.scss" as *;`,
      },
    },
  },
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "vue",
              test: /[\\/]node_modules[\\/](vue|vue-router|vuex)[\\/]/,
            },
            {
              name: "vendor",
              test: /[\\/]node_modules[\\/](axios|highcharts)[\\/]/,
            },
          ],
        },
      },
    },
  },
  server: {
    port: 8080,
    host: true,
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
