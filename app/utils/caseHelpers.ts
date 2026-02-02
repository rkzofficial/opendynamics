import { AlertCircle, AlertOctagon, AlertTriangle, CheckCircle, XCircle, Circle, Mail, Phone, FileText, MessageSquare } from 'lucide-vue-next'
import type { Component } from 'vue'
import { formatTimeAgo } from './timeAgo'
import type { CaseSLAInfo, SLABadgeStatus } from '~/types'

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

// Windows timezone code to IANA timezone mapping
export const timezoneCodeToIANA: Record<number, string> = {
  0: 'Etc/GMT+12',
  1: 'Etc/GMT+11',
  2: 'Pacific/Honolulu',
  4: 'America/Anchorage',
  10: 'America/Los_Angeles',
  15: 'America/Denver',
  20: 'America/Chicago',
  35: 'America/New_York',
  45: 'America/Halifax',
  65: 'Europe/London',
  85: 'Europe/Berlin',
  110: 'Africa/Cairo',
  130: 'Europe/Moscow',
  145: 'Asia/Dubai',
  165: 'Asia/Karachi',
  175: 'Asia/Kolkata',
  185: 'Asia/Dhaka',
  195: 'Asia/Bangkok',
  205: 'Asia/Shanghai',
  210: 'Asia/Singapore',
  215: 'Asia/Taipei',
  225: 'Australia/Perth',
  230: 'Asia/Tokyo',
  235: 'Asia/Tokyo',
  245: 'Australia/Adelaide',
  250: 'Australia/Sydney',
  255: 'Australia/Hobart',
  265: 'Pacific/Guadalcanal',
  275: 'Pacific/Auckland',
  290: 'Pacific/Tongatapu',
}

export function getTimezoneIANA(code: number | undefined): string | null {
  if (code === undefined || code === null) return null
  return timezoneCodeToIANA[code] || null
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

// SLA Badge helpers for CasesTable
export function getSLABadgeStatus(
  slaInfo: CaseSLAInfo | undefined,
  statuscode?: number
): SLABadgeStatus {
  // Only show for "In Progress" case status (statuscode === 1)
  if (statuscode !== 1 || !slaInfo) return 'none'

  // Use Dynamics SLA KPI status directly
  // status: 0=InProgress, 1=Noncompliant, 2=NearingNoncompliance, 4=Succeeded
  switch (slaInfo.status) {
    case 1: // Noncompliant - SLA breached
      return 'error'

    case 2: // Nearing Noncompliance - warning from Dynamics
      return 'warning'

    case 4: // Succeeded
      return 'success'

    case 0: // In Progress - determine based on time elapsed
    default: {
      const now = Date.now()
      const startTime = slaInfo.createdon
        ? new Date(slaInfo.createdon).getTime()
        : null
      const failureTime = slaInfo.failuretime
        ? new Date(slaInfo.failuretime).getTime()
        : null

      if (!failureTime) return 'none'

      // If past failure time, show error
      if (now >= failureTime) return 'error'

      // If we have start time, check if 50% of SLA time has passed
      if (startTime) {
        const totalDuration = failureTime - startTime
        const halfwayPoint = startTime + (totalDuration / 2)

        // If past halfway point, show warning
        if (now >= halfwayPoint) return 'warning'
      }

      // Otherwise, SLA is healthy
      return 'success'
    }
  }
}

export function getSLABadgeClass(status: SLABadgeStatus): string {
  switch (status) {
    case 'success':
      return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
    case 'warning':
      return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
    case 'error':
      return 'bg-red-500/10 text-red-500 border-red-500/20'
    default:
      return ''
  }
}

export function getSLABadgeLabel(status: SLABadgeStatus): string {
  switch (status) {
    case 'success':
      return 'SLA OK'
    case 'warning':
      return 'SLA Warning'
    case 'error':
      return 'SLA Breached'
    default:
      return ''
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

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function linkifyText(text: string): string {
  // First escape HTML to prevent XSS
  let escaped = escapeHtml(text)
  // Convert newlines to <br> tags for proper line breaks
  escaped = escaped.replace(/\n/g, '<br>')
  // Then linkify URLs
  const urlPattern = /(https?:\/\/[^\s<>"']+)/g
  return escaped.replace(urlPattern, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-primary dark:text-white underline hover:no-underline break-all">$1</a>')
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

export function getStatusBadgeClass(statecode: number): string {
  switch (statecode) {
    case 0: return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
    case 1: return 'bg-green-500/10 text-green-500 border-green-500/20'
    case 2: return 'bg-slate-500/10 text-slate-500 border-slate-500/20'
    default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20'
  }
}

// Status Reason helpers - uses formatted value from Dynamics for label
export function getStatusReasonLabel(formattedValue: string | undefined): string {
  return formattedValue || 'Unknown'
}

// Badge styling based on parent statecode for consistent coloring
export function getStatusReasonBadgeClass(statecode: number): string {
  switch (statecode) {
    case 0: return 'bg-blue-500/10 text-blue-500 border-blue-500/20'      // Active
    case 1: return 'bg-green-500/10 text-green-500 border-green-500/20'   // Resolved
    case 2: return 'bg-slate-500/10 text-slate-500 border-slate-500/20'   // Cancelled
    default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20'
  }
}

// Priority helpers
// P1 = Critical, P2 = Urgent, P3 = Important, P4 = Minor
export function getPriorityLabel(prioritycode: number): string {
  switch (prioritycode) {
    case 1: return 'P1 - Critical'
    case 2: return 'P2 - Urgent'
    case 3: return 'P3 - Important'
    case 4: return 'P4 - Minor'
    default: return 'Unknown'
  }
}

export function getPriorityVariant(prioritycode: number): 'destructive' | 'warning' | 'secondary' | 'outline' {
  switch (prioritycode) {
    case 1: return 'destructive'
    case 2: return 'warning'
    case 3: return 'secondary'
    case 4: return 'outline'
    default: return 'outline'
  }
}

export function getPriorityIcon(prioritycode: number): Component {
  switch (prioritycode) {
    case 1: return AlertOctagon
    case 2: return AlertTriangle
    case 3: return AlertCircle
    case 4: return Circle
    default: return Circle
  }
}

export function getPriorityIconColor(prioritycode: number): string {
  switch (prioritycode) {
    case 1: return 'text-red-600'
    case 2: return 'text-amber-600'
    case 3: return 'text-blue-600'
    case 4: return 'text-gray-500'
    default: return 'text-gray-500'
  }
}

export function getPriorityBadgeClass(prioritycode: number): string {
  switch (prioritycode) {
    case 1: return 'bg-red-500/10 text-red-500 border-red-500/20'
    case 2: return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
    case 3: return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
    case 4: return 'bg-slate-500/10 text-slate-500 border-slate-500/20'
    default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20'
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
  { value: 'critical', label: 'P1 - Critical', icon: AlertOctagon },
  { value: 'urgent', label: 'P2 - Urgent', icon: AlertTriangle },
  { value: 'important', label: 'P3 - Important', icon: AlertCircle },
  { value: 'minor', label: 'P4 - Minor', icon: Circle },
]

// Import icons for filter options (needed for circular imports)
import { CircleDot, Flag } from 'lucide-vue-next'
