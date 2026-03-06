import type { HapticsService } from '~/types'

declare module '#app' {
  interface NuxtApp {
    $haptics: HapticsService
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $haptics: HapticsService
  }
}

export {}
