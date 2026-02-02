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

// Dynamics CRM types
export interface Case {
  incidentid: string
  title: string
  ticketnumber: string
  description?: string
  statecode: 0 | 1 | 2 // Active, Resolved, Cancelled
  statuscode?: number
  'statuscode@OData.Community.Display.V1.FormattedValue'?: string
  prioritycode: 1 | 2 | 3 // High, Normal, Low
  createdon: string
  modifiedon: string
  _customerid_value?: string
  customerid_contact?: {
    fullname?: string
    emailaddress1?: string
  }
  _ownerid_value?: string
  owninguser?: {
    fullname?: string
  }
  // SLA and deadline fields
  responseby?: string
  followupby?: string
  // Support plan / entitlement (standard - often null)
  _entitlementid_value?: string
  entitlementid?: {
    name?: string
  }
  // Custom product entitlement (Adobe custom entity)
  _ent_productentitlement_value?: string
  ent_productentitlement?: {
    ent_supportlevel?: number
    'ent_supportlevel@OData.Community.Display.V1.FormattedValue'?: string
  }
  // Primary contact (standard - often null)
  _primarycontactid_value?: string
  primarycontactid?: {
    fullname?: string
  }
  // Custom contact field (Adobe custom - used instead of primarycontactid)
  _ent_contact_value?: string
  '_ent_contact_value@OData.Community.Display.V1.FormattedValue'?: string
  // Organization/Account
  _accountid_value?: string
  customerid_account?: {
    name?: string
  }
  // Additional contact (field name to be determined)
  additionalContactName?: string
  // Customer 360 (Adobe custom)
  _ent_customer_value?: string
  '_ent_customer_value@OData.Community.Display.V1.FormattedValue'?: string
  // Customer contact preferences
  ent_preferredemail?: string
  ent_preferredphonenumber?: string
  ent_supportedlanguage?: number
  'ent_supportedlanguage@OData.Community.Display.V1.FormattedValue'?: string
  ent_preferredcustomertimezone?: number
  'ent_preferredcustomertimezone@OData.Community.Display.V1.FormattedValue'?: string
  ent_custworkhrsstarttime?: number
  ent_custworkhrsendtime?: number
  ent_threestrikepreference?: number
  'ent_threestrikepreference@OData.Community.Display.V1.FormattedValue'?: string
  // Queue
  _ent_queueid_value?: string
  '_ent_queueid_value@OData.Community.Display.V1.FormattedValue'?: string
}

export interface ActivityAttachment {
  activitymimeattachmentid: string
  filename: string
  mimetype: string
  body: string // base64 encoded
}

export interface Activity {
  activityid: string
  subject: string
  activitytypecode: string // email, phonecall, task, appointment, etc.
  createdon: string
  modifiedon?: string
  description?: string
  statecode: number
  statuscode: number
  _regardingobjectid_value?: string
  regardingobjectid_incident?: {
    title?: string
    ticketnumber?: string
  }
  attachments?: ActivityAttachment[]
}

export interface Email extends Activity {
  sender?: string
  torecipients?: string
  ccrecipients?: string
  bccrecipients?: string
}

export interface PhoneCall extends Activity {
  phonenumber?: string
  directioncode?: boolean // true = outgoing, false = incoming
}

export interface Annotation {
  annotationid: string
  subject?: string
  notetext: string
  createdon: string
  modifiedon?: string
  _objectid_value?: string
  _createdby_value?: string
  createdby?: {
    fullname?: string
  }
  isdocument?: boolean
  filename?: string
  mimetype?: string
  filesize?: number
}

export interface CaseAttachment {
  annotationid: string
  filename: string
  mimetype: string
  filesize?: number
  createdon: string
  createdby?: { fullname?: string }
}

// API Response types
export interface CasesResponse {
  cases: Case[]
  skipToken?: string
  hasMore: boolean
  pageSize: number
}

export interface ActivitiesResponse {
  activities: Activity[]
  annotations: Annotation[]
  attachments: CaseAttachment[]
}

export interface SLAKPIInstance {
  slakpiinstanceid: string
  name: string
  failuretime?: string
  warningtime?: string
  status: 0 | 1 | 2 | 3 | 4 | 5 // In Progress, Noncompliant, Nearing Noncompliance, Paused, Succeeded, Canceled
  succeededon?: string
  computedfailuretime?: string
  computedwarningtime?: string
  description?: string
}

export interface SLAKPIsResponse {
  slakpis: SLAKPIInstance[]
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

export interface CaseSLAInfo {
  createdon?: string     // SLA start time (ISO datetime)
  warningtime?: string   // Warning deadline (ISO datetime)
  failuretime?: string   // Failure deadline (ISO datetime)
  status: number         // 0=InProgress, 1=Noncompliant, 2=NearingNoncompliance, 4=Succeeded
}

export interface BatchSLAResponse {
  slaData: Record<string, CaseSLAInfo>
}

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
