import { defineNuxtConfig } from 'nuxt/config'

// https://nuxt.com/docs/api/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  ssr: false,
  future: { compatibilityVersion: 5 },
  devtools: { enabled: false },

  // Auto-imports désactivés : tous les imports (vue, #imports, pinia, composants) sont explicites.
  imports: { autoImport: false },
  components: { dirs: [] },

  modules: ['@pinia/nuxt', '@vite-pwa/nuxt', '@nuxt/eslint', '@nuxt/test-utils/module'],

  css: ['@/assets/styles/main.css'],

  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      title: 'mCloud Compte and Budget',
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, viewport-fit=cover'
        },
        { name: 'theme-color', content: '#4DBA87' },
        { name: 'description', content: 'Mobile Cloud compte and Budget application' }
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/img/icons/apple-touch-icon-152x152.png' }
      ]
    }
  },

  // Le shell SPA est prérendu pour que le service worker puisse le précacher (navigateFallback)
  nitro: { prerender: { routes: ['/'] } },

  pwa: {
    filename: 'service-worker.js',
    registerType: 'autoUpdate',
    includeAssets: ['favicon.ico', 'icon/*.png'],
    manifest: {
      name: 'mCloud Compte and Budget',
      short_name: 'mCcBng',
      description: 'mCloud Compte and Budget Next Generation',
      start_url: '/',
      display: 'fullscreen',
      orientation: 'portrait',
      theme_color: '#4DBA87',
      background_color: '#000000',
      icons: [
        { src: 'icon/app-icon-48.png', sizes: '48x48', type: 'image/png' },
        { src: 'icon/app-icon-96.png', sizes: '96x96', type: 'image/png' },
        { src: 'icon/app-icon-144.png', sizes: '144x144', type: 'image/png' },
        { src: 'icon/app-icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icon/app-icon-512.png', sizes: '512x512', type: 'image/png' }
      ]
    },
    workbox: {
      navigateFallback: '/',
      // Les appels /api ne doivent jamais être remplacés par le shell HTML
      navigateFallbackDenylist: [/^\/api\//]
    }
  },

  devServer: { port: 8080, host: '0.0.0.0' },

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "@/assets/styles/variables.scss" as *;',
        },
      },
    },
    build: { sourcemap: false },
  },

  typescript: {
    tsConfig: {
      compilerOptions: {
        noImplicitAny: false,
        // Nuxt 4 l'active par défaut ; l'ancien tsconfig ne l'avait pas (migration iso)
        noUncheckedIndexedAccess: false,
        noUnusedLocals: true,
        noUnusedParameters: true,
      },
    },
  },
})
