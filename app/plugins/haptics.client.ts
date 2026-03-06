import { getHapticPattern } from '~/utils/haptics'
import type {
  HapticsAdapter,
  HapticsService,
  HapticIntent,
  HapticPattern,
  HapticTriggerOptions,
} from '~/types'

const DEFAULT_MIN_INTERVAL_MS = 45

function createNavigatorVibrateAdapter(): HapticsAdapter {
  return {
    name: 'navigator.vibrate',
    isSupported() {
      return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
    },
    trigger(pattern: HapticPattern) {
      return navigator.vibrate(pattern)
    },
  }
}

export default defineNuxtPlugin(() => {
  const adapters: HapticsAdapter[] = [
    createNavigatorVibrateAdapter(),
  ]

  let lastTriggerAt = 0

  function getActiveAdapter(): HapticsAdapter | null {
    return adapters.find(adapter => adapter.isSupported()) || null
  }

  function isDocumentVisible(): boolean {
    return typeof document === 'undefined' || document.visibilityState !== 'hidden'
  }

  function trigger(intent: HapticIntent, options: HapticTriggerOptions = {}): boolean {
    const adapter = getActiveAdapter()
    if (!adapter || !isDocumentVisible()) return false

    const now = performance.now()
    const minIntervalMs = options.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS

    if (!options.force && now - lastTriggerAt < minIntervalMs) {
      return false
    }

    lastTriggerAt = now
    return adapter.trigger(options.pattern ?? getHapticPattern(intent))
  }

  const haptics: HapticsService = {
    isSupported() {
      return !!getActiveAdapter()
    },
    trigger,
  }

  return {
    provide: {
      haptics,
    },
  }
})
