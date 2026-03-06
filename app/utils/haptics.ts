import type { HapticIntent, HapticPattern } from '~/types'

export const HAPTIC_PATTERNS: Record<HapticIntent, HapticPattern> = {
  tap: 8,
  navigation: [12],
  modalOpen: [10],
  modalClose: [8],
  selection: [6],
  copy: [10, 30, 10],
  refresh: [12, 24, 12],
  success: [16, 32, 22],
  warning: [18, 40, 12],
  error: [24, 40, 24],
}

export const NOTIFICATION_HAPTIC_PATTERN: number[] = [200, 100, 200]

export function getHapticPattern(intent: HapticIntent): HapticPattern {
  return HAPTIC_PATTERNS[intent]
}
