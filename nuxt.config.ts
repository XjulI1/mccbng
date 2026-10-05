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

  modules: ['@pinia/nuxt', '@vite-pwa/nuxt', '@nuxt/eslint', '@nuxt/test-utils/module', 'nuxt-security'],

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

  // En-têtes de sécurité (helmet-like) + rate-limit du login. Le rate-limit global est désactivé : seule la route de login est limitée.
  // CSP appliquée (un report-only sans point de collecte `report-to` n'a aucun effet). Staging et prod sont servis en HTTPS :
  // `upgrade-insecure-requests` (défaut du module) reste actif. Servir l'app en HTTP simple casserait les sous-ressources.
  security: {
    rateLimiter: false,
    // Validateur XSS inutile pour une API JSON (risque de faux positifs sur les libellés d'opérations)
    xssValidator: false
  },

  // En dev, le serveur est en HTTP : sans ça, la CSP (`upgrade-insecure-requests`) et HSTS forcent https://localhost et cassent le chargement.
  $development: {
    security: {
      headers: {
        contentSecurityPolicy: { 'upgrade-insecure-requests': false },
        strictTransportSecurity: false
      }
    }
  },

  routeRules: {
    // 5 tentatives / 15 min / IP (nuxt-security compte toutes les requêtes, y compris réussies).
    // Le module ne décompte pas la 1re requête de la fenêtre : tokensPerInterval = 4 donne 5 essais, la 6e reçoit 429.
    '/api/users/login': { security: { rateLimiter: { tokensPerInterval: 4, interval: 15 * 60 * 1000 } } }
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
