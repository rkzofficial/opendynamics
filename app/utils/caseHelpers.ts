import { AlertCircle, CheckCircle, XCircle, ArrowUp, Minus, ArrowDown } from 'lucide-vue-next'
import type { Component } from 'vue'
import { formatTimeAgo } from './timeAgo'

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
export function formatCaseDate(dateString: string | null | undefined): { text: string; tooltip: string } {
  return formatTimeAgo(dateString)
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
