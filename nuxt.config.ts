// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
  ],

  css: ['~/assets/css/main.css'],

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
    routeRules: {
      '/api/**': { cors: true },
    },
  },
})
