import { buildODataQuery, type ODataQueryOptions } from '../utils/odata-builder'

export interface DynamicsTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export interface DynamicsApiConfig {
  orgUrl: string
  clientId: string
  tenantId: string
}

export class DynamicsApiClient {
  private config: DynamicsApiConfig
  private tokens: DynamicsTokens

  constructor(config: DynamicsApiConfig, tokens: DynamicsTokens) {
    this.config = config
    this.tokens = tokens
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.config.orgUrl}/api/data/v9.2${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.tokens.accessToken}`,
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Prefer': 'odata.include-annotations="*"',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Dynamics API error: ${response.status} - ${errorText}`)
    }

    return response.json()
  }

  async whoAmI(): Promise<{ UserId: string; BusinessUnitId: string; OrganizationId: string }> {
    return this.fetch('/WhoAmI')
  }

  async getCases(queryOptions?: ODataQueryOptions, ownerId?: string): Promise<{ value: unknown[]; nextSkipToken?: string }> {
    // Build filter with owner constraint if provided
    let filter = queryOptions?.filter
    if (ownerId) {
      const ownerFilter = `_ownerid_value eq ${ownerId}`
      filter = filter ? `${filter} and ${ownerFilter}` : ownerFilter
    }

    const query = buildODataQuery({
      select: ['incidentid', 'title', 'ticketnumber', 'description', 'statecode', 'statuscode', 'prioritycode', 'createdon', 'modifiedon', '_customerid_value', '_ownerid_value'],
      ...queryOptions,
      filter,
    })

    const response = await this.fetch<{ value: unknown[]; '@odata.nextLink'?: string }>(`/incidents${query}`)

    // Extract skip token from nextLink if present
    let nextSkipToken: string | undefined
    if (response['@odata.nextLink']) {
      const nextLinkUrl = new URL(response['@odata.nextLink'])
      nextSkipToken = nextLinkUrl.searchParams.get('$skiptoken') || undefined
    }

    return {
      value: response.value,
      nextSkipToken,
    }
  }

  async getCase(incidentId: string): Promise<unknown> {
    const query = buildODataQuery({
      select: ['incidentid', 'title', 'ticketnumber', 'description', 'statecode', 'statuscode', 'prioritycode', 'createdon', 'modifiedon', '_customerid_value', '_ownerid_value'],
      expand: ['customerid_contact($select=fullname,emailaddress1)', 'owninguser($select=fullname)'],
    })

    return this.fetch(`/incidents(${incidentId})${query}`)
  }

  async getCaseActivities(incidentId: string): Promise<{ value: unknown[] }> {
    const query = buildODataQuery({
      select: ['activityid', 'subject', 'activitytypecode', 'createdon', 'modifiedon', 'description', 'statecode', 'statuscode'],
      filter: `_regardingobjectid_value eq ${incidentId} and activitytypecode ne 'ent_notificationactivity'`,
      orderby: 'createdon desc',
    })

    return this.fetch(`/activitypointers${query}`)
  }

  async getCaseAnnotations(incidentId: string): Promise<{ value: unknown[] }> {
    const query = buildODataQuery({
      select: ['annotationid', 'subject', 'notetext', 'createdon', 'modifiedon', '_createdby_value', 'isdocument', 'filename', 'mimetype'],
      expand: ['createdby($select=fullname)'],
      filter: `_objectid_value eq ${incidentId}`,
      orderby: 'createdon desc',
    })

    return this.fetch(`/annotations${query}`)
  }

  async createAnnotation(incidentId: string, noteText: string, subject?: string): Promise<unknown> {
    return this.fetch('/annotations', {
      method: 'POST',
      body: JSON.stringify({
        'objectid_incident@odata.bind': `/incidents(${incidentId})`,
        notetext: noteText,
        subject: subject || 'Note',
      }),
    })
  }

  async getDashboardStats(): Promise<{
    totalCases: number
    openCases: number
    resolvedToday: number
    avgFirstResponseTime: number
  }> {
    // Get total cases
    const totalResponse = await this.fetch<{ '@odata.count': number }>('/incidents?$count=true&$top=0')
    const totalCases = totalResponse['@odata.count'] || 0

    // Get open cases
    const openResponse = await this.fetch<{ '@odata.count': number }>('/incidents?$filter=statecode eq 0&$count=true&$top=0')
    const openCases = openResponse['@odata.count'] || 0

    // Get resolved today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString()
    const resolvedResponse = await this.fetch<{ '@odata.count': number }>(`/incidents?$filter=statecode eq 1 and modifiedon ge ${todayStr}&$count=true&$top=0`)
    const resolvedToday = resolvedResponse['@odata.count'] || 0

    return {
      totalCases,
      openCases,
      resolvedToday,
      avgFirstResponseTime: 0, // Would need additional logic to calculate
    }
  }

  async getDashboardKPIs(): Promise<{
    casesByStatus: { status: string; count: number }[]
    casesByPriority: { priority: string; count: number }[]
    resolutionTimeTrend: { date: string; avgHours: number }[]
    slaCompliancePercent: number
  }> {
    // Get cases by status
    const activeResponse = await this.fetch<{ '@odata.count': number }>('/incidents?$filter=statecode eq 0&$count=true&$top=0')
    const resolvedResponse = await this.fetch<{ '@odata.count': number }>('/incidents?$filter=statecode eq 1&$count=true&$top=0')
    const cancelledResponse = await this.fetch<{ '@odata.count': number }>('/incidents?$filter=statecode eq 2&$count=true&$top=0')

    const casesByStatus = [
      { status: 'Active', count: activeResponse['@odata.count'] || 0 },
      { status: 'Resolved', count: resolvedResponse['@odata.count'] || 0 },
      { status: 'Cancelled', count: cancelledResponse['@odata.count'] || 0 },
    ]

    // Get cases by priority
    const highResponse = await this.fetch<{ '@odata.count': number }>('/incidents?$filter=prioritycode eq 1&$count=true&$top=0')
    const normalResponse = await this.fetch<{ '@odata.count': number }>('/incidents?$filter=prioritycode eq 2&$count=true&$top=0')
    const lowResponse = await this.fetch<{ '@odata.count': number }>('/incidents?$filter=prioritycode eq 3&$count=true&$top=0')

    const casesByPriority = [
      { priority: 'High', count: highResponse['@odata.count'] || 0 },
      { priority: 'Normal', count: normalResponse['@odata.count'] || 0 },
      { priority: 'Low', count: lowResponse['@odata.count'] || 0 },
    ]

    // Generate mock resolution time trend (would need actual data calculation)
    const resolutionTimeTrend: { date: string; avgHours: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      resolutionTimeTrend.push({
        date: date.toISOString().split('T')[0] || '',
        avgHours: Math.random() * 24 + 12, // Mock data
      })
    }

    return {
      casesByStatus,
      casesByPriority,
      resolutionTimeTrend,
      slaCompliancePercent: Math.round(Math.random() * 20 + 80), // Mock 80-100%
    }
  }
}

// Device code flow functions
export async function startDeviceCodeFlow(clientId: string, tenantId: string, orgUrl: string): Promise<{
  device_code: string
  user_code: string
  verification_uri: string
  expires_in: number
  interval: number
  message: string
}> {
  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/devicecode`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      scope: `${orgUrl}/user_impersonation offline_access`,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Device code request failed: ${response.status} - ${errorText}`)
  }

  return response.json()
}

export async function pollDeviceCodeToken(
  clientId: string,
  tenantId: string,
  deviceCode: string
): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}> {
  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      device_code: deviceCode,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    if (data.error === 'authorization_pending') {
      throw new Error('authorization_pending')
    }
    throw new Error(data.error_description || data.error || 'Token request failed')
  }

  return data
}

export async function refreshAccessToken(
  clientId: string,
  tenantId: string,
  refreshToken: string
): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
}> {
  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      scope: 'https://admin.services.crm.dynamics.com/.default offline_access',
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Token refresh failed: ${response.status} - ${errorText}`)
  }

  return response.json()
}
