import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const currentDir = dirname(fileURLToPath(import.meta.url))

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  future: {
    compatibilityVersion: 4,
  },

  srcDir: 'app',
  serverDir: 'server',

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@vite-pwa/nuxt',
  ],

  css: ['~/assets/css/main.css'],

  alias: {
    '@convex': join(currentDir, 'convex'),
  },

  runtimeConfig: {
    sessionSecret: process.env.NUXT_SESSION_SECRET || 'default-session-secret-change-in-production',
    encryptionKey: process.env.NUXT_ENCRYPTION_KEY || 'default-encryption-key-32chars!',
    public: {
      convexUrl: process.env.NUXT_PUBLIC_CONVEX_URL || '',
    },
  },

  app: {
    head: {
      title: 'OpenDynamics - CRM Dashboard',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Microsoft Dynamics 365 CRM Dashboard' },
        { name: 'theme-color', content: '#ffffff' },
        { name: 'theme-color', content: '#121212', media: '(prefers-color-scheme: dark)' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      ],
    },
  },

  typescript: {
    strict: true,
  },

  components: {
    dirs: [
      {
        path: '~/components',
        ignore: ['**/index.ts'],
      },
    ],
  },

  nitro: {
    // Use NITRO_PRESET env var for Cloudflare, defaults to bun for local dev
    preset: process.env.NITRO_PRESET || 'bun',
    alias: {
      '@convex': join(currentDir, 'convex'),
    },
    routeRules: {
      '/api/**': { cors: true },
      // Cache static assets
      '/_nuxt/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
      // Don't cache auth endpoints
      '/api/auth/**': { cache: false },
      // OAuth endpoints - don't cache and enable CORS
      '/api/oauth/**': { cors: true, cache: false },
      '/.well-known/**': { cors: true, cache: false },
      // Don't cache mutation endpoints
      '/api/**/**.post': { cache: false },
      '/api/**/**.put': { cache: false },
      '/api/**/**.patch': { cache: false },
      '/api/**/**.delete': { cache: false },
    },
  },

  // PWA Configuration
  pwa: {
    registerType: 'autoUpdate',
    strategies: 'generateSW',
    manifest: {
      name: 'OpenDynamics CRM',
      short_name: 'OpenDynamics',
      description: 'Microsoft Dynamics 365 CRM Dashboard',
      theme_color: '#121212',
      background_color: '#121212',
      display: 'standalone',
      orientation: 'portrait',
      scope: '/',
      start_url: '/',
      categories: ['business', 'productivity'],
      icons: [
        {
          src: '/icon-72x72.png',
          sizes: '72x72',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/icon-96x96.png',
          sizes: '96x96',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/icon-128x128.png',
          sizes: '128x128',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/icon-144x144.png',
          sizes: '144x144',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/icon-152x152.png',
          sizes: '152x152',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/icon-384x384.png',
          sizes: '384x384',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable',
        },
        {
          src: '/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
      shortcuts: [
        {
          name: 'Dashboard',
          short_name: 'Dashboard',
          description: 'View CRM Dashboard',
          url: '/dashboard',
          icons: [{ src: '/icon-96x96.png', sizes: '96x96' }],
        },
        {
          name: 'Cases',
          short_name: 'Cases',
          description: 'View all cases',
          url: '/cases',
          icons: [{ src: '/icon-96x96.png', sizes: '96x96' }],
        },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      skipWaiting: true,
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/api\/.*/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-cache',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 60 * 60 * 24, // 24 hours
            },
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
        {
          urlPattern: /^https:\/\/.+\.convex\.cloud\/.*/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'convex-cache',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 5, // 5 minutes
            },
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
        {
          urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'image-cache',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
            },
          },
        },
        {
          urlPattern: /\.(?:woff2|woff|ttf|otf)$/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'font-cache',
            expiration: {
              maxEntries: 20,
              maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
            },
          },
        },
      ],
    },
    devOptions: {
      enabled: true,
      type: 'module',
    },
    client: {
      installPrompt: true,
      periodicSyncForUpdates: 3600, // Check for updates every hour
    },
  },
})
