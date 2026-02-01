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
  ],

  css: ['~/assets/css/main.css'],

  alias: {
    '@convex': join(currentDir, 'convex'),
  },

  runtimeConfig: {
    sessionSecret: process.env.SESSION_SECRET || 'default-session-secret-change-in-production',
    encryptionKey: process.env.ENCRYPTION_KEY || 'default-encryption-key-32chars!',
    public: {
      convexUrl: process.env.NUXT_CONVEX_URL || '',
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000',
    },
  },

  app: {
    head: {
      title: 'OpenDynamics - CRM Dashboard',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Microsoft Dynamics 365 CRM Dashboard' },
      ],
    },
  },

  typescript: {
    strict: true,
  },

  nitro: {
    // Use NITRO_PRESET env var for Cloudflare, defaults to bun for local dev
    preset: process.env.NITRO_PRESET || 'bun',
    alias: {
      '@convex': join(currentDir, 'convex'),
    },
    routeRules: {
      '/api/**': { cors: true },
    },
  },
})
