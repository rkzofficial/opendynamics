import type { HapticIntent, HapticPattern } from '~/types'

export const HAPTIC_PATTERNS: Record<HapticIntent, HapticPattern> = {
  copy: [10, 30, 10],
  success: [16, 32, 22],
  warning: [18, 40, 12],
  error: [24, 40, 24],
}

export function getHapticPattern(intent: HapticIntent): HapticPattern {
  return HAPTIC_PATTERNS[intent]
}
