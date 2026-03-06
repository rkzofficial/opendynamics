import type { HapticsService } from '~/types'

const noopHaptics: HapticsService = {
  isSupported() {
    return false
  },
  trigger() {
    return false
  },
}

export function useHaptics(): HapticsService {
  return useNuxtApp().$haptics || noopHaptics
}
