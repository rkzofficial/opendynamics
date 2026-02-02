/**
 * Format a date string to time-ago format with 12-hour fallback
 * 
 * For dates < 2 days old: shows relative time (e.g., "2 hours ago", "Yesterday")
 * For dates >= 2 days old: shows absolute date in 12-hour format
 * 
 * @param dateString - ISO date string to format
 * @param dateOnly - If true, shows date without time for dates >= 2 days old
 * @returns Object with display text and tooltip text
 */
export function formatTimeAgo(dateString: string | null | undefined, dateOnly = false): {
  text: string
  tooltip: string
} {
  if (!dateString) {
    return { text: 'Not set', tooltip: 'Not set' }
  }

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  // Format for tooltip (always show absolute date in 12-hour format)
  const tooltip = date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  // For dates >= 2 days, show absolute date
  if (diffDays >= 2) {
    const text = dateOnly
      ? date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
    return { text, tooltip }
  }

  // For dates < 2 days, show relative time
  if (diffDays === 1) {
    return { text: 'Yesterday', tooltip }
  }

  if (diffHours >= 1) {
    return { text: `${diffHours}h ago`, tooltip }
  }

  if (diffMins >= 1) {
    return { text: `${diffMins}m ago`, tooltip }
  }

  return { text: 'Just now', tooltip }
}

/**
 * Simple wrapper that returns just the display text
 */
export function timeAgo(dateString: string | null | undefined): string {
  return formatTimeAgo(dateString).text
}

/**
 * Simple wrapper that returns just the tooltip text (absolute date)
 */
export function timeAgoTooltip(dateString: string | null | undefined): string {
  return formatTimeAgo(dateString).tooltip
}
