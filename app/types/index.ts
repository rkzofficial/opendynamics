// User types
export interface User {
  _id: string
  username: string
  email?: string
  name?: string
  role: 'admin' | 'user'
}

export interface Session {
  _id: string
  userId: string
  token: string
  expiresAt: number
}

export interface SessionUser extends User {
  sessionToken: string
}

// Clean case types (decoupled from Dynamics CRM field names)

export interface CaseListItem {
  id: string
  title: string
  ticketNumber: string
  description?: string
  state: 'active' | 'resolved' | 'cancelled' | 'unknown'
  statusCode: number
  statusLabel?: string
  priority: number
  createdAt: string
  modifiedAt: string
  customer?: { name?: string; email?: string }
  owner?: { name?: string }
  queue?: { id?: string; name?: string }
  sla?: SLASummary
}

export interface CaseDetail extends CaseListItem {
  responseBy?: string
  followUpBy?: string
  contact?: { name?: string }
  account?: { name?: string }
  entitlement?: { name?: string }
  supportLevel?: string
  customer360?: string
  customerPreferences?: {
    email?: string
    phone?: string
    language?: string
    timezoneCode?: number
    timezoneName?: string
    workHoursStart?: number
    workHoursEnd?: number
    threeStrikePreference?: string
  }
  activities: ActivityItem[]
  notes: NoteItem[]
  attachments: AttachmentItem[]
  slaKpis: SLAKpiItem[]
}

export interface ActivityAttachmentItem {
  id: string
  filename: string
  mimeType: string
  body: string
}

export interface ActivityItem {
  id: string
  subject: string
  type: string
  description?: string
  createdAt: string
  modifiedAt?: string
  state: number
  status: number
  sender?: string
  toRecipients?: string
  ccRecipients?: string
  bccRecipients?: string
  phoneNumber?: string
  isOutgoing?: boolean
  attachments?: ActivityAttachmentItem[]
}

export interface NoteItem {
  id: string
  subject?: string
  text: string
  createdAt: string
  modifiedAt?: string
  createdBy?: string
  isDocument?: boolean
  filename?: string
  mimeType?: string
  fileSize?: number
}

export interface AttachmentItem {
  id: string
  filename: string
  mimeType: string
  fileSize?: number
  createdAt: string
  createdBy?: string
}

export interface SLAKpiItem {
  id: string
  name: string
  failureTime?: string
  warningTime?: string
  status: number
  succeededAt?: string
  computedFailureTime?: string
  computedWarningTime?: string
  description?: string
}

export interface SLASummary {
  createdAt?: string
  warningTime?: string
  failureTime?: string
  status: number
}

// API Response types
export interface CasesResponse {
  cases: CaseListItem[]
  skipToken?: string
  hasMore: boolean
  pageSize: number
}

export interface CommandCaseResult {
  id: string
  ticketNumber: string
  title: string
  description?: string
  customerName?: string
  companyName?: string
  modifiedAt: string
}

// Dashboard KPI types
export interface DashboardStats {
  totalCases: number
  openCases: number
  resolvedToday: number
  avgFirstResponseTime: number // in hours
}

export interface DashboardKPIs {
  resolutionTimeTrend: { date: string; avgHours: number }[]
  casesByStatus: { status: string; count: number }[]
  casesByPriority: { priority: string; count: number }[]
  slaCompliancePercent: number
}

// Settings types
export interface OIDCConfig {
  enabled: boolean
  issuerUrl?: string
  clientId?: string
  clientSecret?: string
  scopes?: string[]
}

export interface DynamicsConfig {
  clientId: string
  tenantId: string
  orgUrl: string
}

export interface DynamicsConnectionStatus {
  connected: boolean
  email?: string
  organizationId?: string
  expiresAt?: number
}

// Device code flow types
export interface DeviceCodeResponse {
  device_code: string
  user_code: string
  verification_uri: string
  expires_in: number
  interval: number
  message: string
}

// Status reason option from Dynamics metadata
export interface StatusReasonOption {
  value: number
  label: string
  state: number // parent statecode (0=Active, 1=Resolved, 2=Cancelled)
}

// SLA Badge types for CasesTable
export type SLABadgeStatus = 'success' | 'warning' | 'error' | 'none'

// Filter types
export interface CaseFilters {
  status?: 'active' | 'resolved' | 'cancelled' | ''
  statusReason?: string // statuscode value as string
  priority?: 'high' | 'normal' | 'low' | ''
  dxPendingRelease?: boolean
  search?: string
  dateFrom?: string
  dateTo?: string
  ownerId?: string
  skipToken?: string
  pageSize?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
}

// Case share types
export interface CaseShare {
  _id: string
  shareToken: string
  caseId: string
  userId: string
  createdAt: number
  expiresAt?: number
  isRevoked: boolean
  viewCount: number
}

// API Key types
export interface ApiKey {
  _id: string
  name: string
  keyPrefix: string
  createdAt: number
  expiresAt?: number
  lastUsedAt?: number
}

export type HapticIntent =
  | 'tap'
  | 'navigation'
  | 'modalOpen'
  | 'modalClose'
  | 'selection'
  | 'copy'
  | 'refresh'
  | 'success'
  | 'warning'
  | 'error'

export type HapticPattern = number | number[]

export interface HapticTriggerOptions {
  // Override the intent's default vibration pattern.
  pattern?: HapticPattern
  // Bypass interval coalescing when a follow-up haptic must always fire.
  force?: boolean
  // Override the default interval used to collapse rapid sequential triggers.
  minIntervalMs?: number
}

export interface HapticsAdapter {
  name: string
  isSupported: () => boolean
  trigger: (pattern: HapticPattern) => boolean
}

export interface HapticsService {
  isSupported: () => boolean
  trigger: (intent: HapticIntent, options?: HapticTriggerOptions) => boolean
}
