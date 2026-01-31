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
  prioritycode: 1 | 2 | 3 // High, Normal, Low
  createdon: string
  modifiedon: string
  _customerid_value?: string
  customerid_contact?: {
    fullname?: string
    emailaddress1?: string
  }
  _ownerid_value?: string
  ownerid?: {
    fullname?: string
  }
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

// Filter types
export interface CaseFilters {
  status?: 'active' | 'resolved' | 'cancelled' | ''
  priority?: 'high' | 'normal' | 'low' | ''
  search?: string
  dateFrom?: string
  dateTo?: string
  ownerId?: string
  skipToken?: string
  pageSize?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
}
