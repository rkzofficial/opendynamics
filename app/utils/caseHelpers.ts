import { AlertCircle, CheckCircle, XCircle, ArrowUp, Minus, ArrowDown, Mail, Phone, FileText, MessageSquare } from 'lucide-vue-next'
import type { Component } from 'vue'
import { formatTimeAgo } from './timeAgo'

// Windows timezone code to readable name mapping
export const timezoneCodeMap: Record<number, string> = {
  0: '(UTC-12:00) International Date Line West',
  1: '(UTC-11:00) Coordinated Universal Time-11',
  2: '(UTC-10:00) Hawaii',
  4: '(UTC-09:00) Alaska',
  10: '(UTC-08:00) Pacific Time (US & Canada)',
  15: '(UTC-07:00) Mountain Time (US & Canada)',
  20: '(UTC-06:00) Central Time (US & Canada)',
  35: '(UTC-05:00) Eastern Time (US & Canada)',
  45: '(UTC-04:00) Atlantic Time (Canada)',
  65: '(UTC) Dublin, Edinburgh, Lisbon, London',
  85: '(UTC+01:00) Amsterdam, Berlin, Rome, Paris',
  110: '(UTC+02:00) Cairo, Helsinki, Kyiv',
  130: '(UTC+03:00) Moscow, Baghdad, Kuwait',
  145: '(UTC+04:00) Abu Dhabi, Muscat',
  165: '(UTC+05:00) Islamabad, Karachi',
  175: '(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi',
  185: '(UTC+06:00) Dhaka, Astana',
  195: '(UTC+07:00) Bangkok, Hanoi, Jakarta',
  205: '(UTC+08:00) Beijing, Hong Kong, Singapore',
  210: '(UTC+08:00) Kuala Lumpur, Singapore',
  215: '(UTC+08:00) Taipei',
  225: '(UTC+08:00) Perth',
  230: '(UTC+09:00) Tokyo, Seoul',
  235: '(UTC+09:00) Osaka, Sapporo, Tokyo',
  245: '(UTC+09:30) Adelaide, Darwin',
  250: '(UTC+10:00) Brisbane, Canberra, Sydney',
  255: '(UTC+10:00) Hobart',
  265: '(UTC+11:00) Solomon Islands, New Caledonia',
  275: '(UTC+12:00) Auckland, Wellington, Fiji',
  290: '(UTC+13:00) Nuku\'alofa, Samoa',
}

export function getTimezoneName(code: number | undefined): string | null {
  if (code === undefined || code === null) return null
  return timezoneCodeMap[code] || `UTC Timezone (Code: ${code})`
}

// SLA helpers
export function getSLAStatusLabel(status: number): string {
  switch (status) {
    case 0: return 'In Progress'
    case 1: return 'Noncompliant'
    case 2: return 'Nearing Noncompliance'
    case 3: return 'Paused'
    case 4: return 'Succeeded'
    case 5: return 'Canceled'
    default: return 'Unknown'
  }
}

export function getSLAStatusVariant(status: number): 'default' | 'destructive' | 'warning' | 'success' | 'secondary' {
  switch (status) {
    case 0: return 'default'
    case 1: return 'destructive'
    case 2: return 'warning'
    case 3: return 'secondary'
    case 4: return 'success'
    case 5: return 'secondary'
    default: return 'secondary'
  }
}

export function formatCountdown(targetDate: string): string {
  const now = new Date().getTime()
  const target = new Date(targetDate).getTime()
  const diff = target - now

  if (diff <= 0) {
    return 'Overdue'
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${seconds}s`
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`
  } else {
    return `${minutes}m ${seconds}s`
  }
}

// Activity helpers
export function getActivityIcon(activityType: string): Component {
  switch (activityType) {
    case 'email': return Mail
    case 'phonecall': return Phone
    case 'task': return FileText
    default: return MessageSquare
  }
}

export function getActivityLabel(activityType: string): string {
  switch (activityType) {
    case 'email': return 'Email'
    case 'phonecall': return 'Phone Call'
    case 'task': return 'Task'
    case 'appointment': return 'Appointment'
    case 'letter': return 'Letter'
    case 'fax': return 'Fax'
    case 'ent_customernote': return 'Customer Note'
    case 'ent_abortivenote': return 'Abortive Note'
    case 'ent_loggednote': return 'Logged Note'
    case 'ent_internalnote': return 'Internal Note'
    default: return activityType.replace(/^ent_/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }
}

export function linkifyText(text: string): string {
  const urlPattern = /(https?:\/\/[^\s<>"']+)/g
  return text.replace(urlPattern, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-primary dark:text-white underline hover:no-underline break-all">$1</a>')
}

// Status helpers
export function getStatusLabel(statecode: number): string {
  switch (statecode) {
    case 0: return 'Active'
    case 1: return 'Resolved'
    case 2: return 'Cancelled'
    default: return 'Unknown'
  }
}

export function getStatusVariant(statecode: number): 'default' | 'success' | 'secondary' {
  switch (statecode) {
    case 0: return 'default'
    case 1: return 'success'
    case 2: return 'secondary'
    default: return 'secondary'
  }
}

export function getStatusIcon(statecode: number): Component {
  switch (statecode) {
    case 0: return AlertCircle
    case 1: return CheckCircle
    case 2: return XCircle
    default: return AlertCircle
  }
}

export function getStatusDotColor(statecode: number): string {
  switch (statecode) {
    case 0: return 'bg-blue-500'
    case 1: return 'bg-green-500'
    case 2: return 'bg-gray-400'
    default: return 'bg-gray-400'
  }
}

// Priority helpers
export function getPriorityLabel(prioritycode: number): string {
  switch (prioritycode) {
    case 1: return 'High'
    case 2: return 'Normal'
    case 3: return 'Low'
    default: return 'Unknown'
  }
}

export function getPriorityVariant(prioritycode: number): 'destructive' | 'warning' | 'secondary' {
  switch (prioritycode) {
    case 1: return 'destructive'
    case 2: return 'warning'
    case 3: return 'secondary'
    default: return 'secondary'
  }
}

export function getPriorityIcon(prioritycode: number): Component {
  switch (prioritycode) {
    case 1: return ArrowUp
    case 2: return Minus
    case 3: return ArrowDown
    default: return Minus
  }
}

export function getPriorityIconColor(prioritycode: number): string {
  switch (prioritycode) {
    case 1: return 'text-red-500'
    case 2: return 'text-amber-500'
    case 3: return 'text-gray-400'
    default: return 'text-gray-400'
  }
}

// Date formatting
export function formatCaseDate(dateString: string | null | undefined, dateOnly = false): { text: string; tooltip: string } {
  return formatTimeAgo(dateString, dateOnly)
}

// Filter options
export const statusFilterOptions = [
  { value: 'all', label: 'All Statuses', icon: CircleDot },
  { value: 'active', label: 'Active', icon: AlertCircle },
  { value: 'resolved', label: 'Resolved', icon: CheckCircle },
  { value: 'cancelled', label: 'Cancelled', icon: XCircle },
]

export const priorityFilterOptions = [
  { value: 'all', label: 'All Priorities', icon: Flag },
  { value: 'high', label: 'High', icon: ArrowUp },
  { value: 'normal', label: 'Normal', icon: Minus },
  { value: 'low', label: 'Low', icon: ArrowDown },
]

// Import icons for filter options (needed for circular imports)
import { CircleDot, Flag } from 'lucide-vue-next'
