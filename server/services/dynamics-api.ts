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

export type TokenSaveCallback = (tokens: DynamicsTokens) => Promise<void>

export class DynamicsApiClient {
  private config: DynamicsApiConfig
  private tokens: DynamicsTokens
  private onTokenRefresh?: TokenSaveCallback
  private isRefreshing = false
  private refreshPromise: Promise<void> | null = null

  constructor(config: DynamicsApiConfig, tokens: DynamicsTokens, onTokenRefresh?: TokenSaveCallback) {
    this.config = config
    this.tokens = tokens
    this.onTokenRefresh = onTokenRefresh
  }

  private async executeFetch<T>(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.config.orgUrl}/api/data/v9.2${endpoint}`

    return fetch(url, {
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
  }

  private async refreshToken(): Promise<void> {
    // If already refreshing, wait for that to complete
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise
    }

    this.isRefreshing = true
    this.refreshPromise = this.doRefresh()

    try {
      await this.refreshPromise
    } finally {
      this.isRefreshing = false
      this.refreshPromise = null
    }
  }

  private async doRefresh(): Promise<void> {
    try {
      const tokenResponse = await refreshAccessToken(
        this.config.clientId,
        this.config.tenantId,
        this.tokens.refreshToken,
        this.config.orgUrl
      )

      this.tokens = {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt: Date.now() + tokenResponse.expires_in * 1000,
      }

      // Save tokens via callback if provided
      if (this.onTokenRefresh) {
        await this.onTokenRefresh(this.tokens)
      }
    } catch (error) {
      throw new Error('Token refresh failed: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}, retryCount = 0): Promise<T> {
    const response = await this.executeFetch(endpoint, options)

    // Handle 401 Unauthorized - attempt token refresh and retry
    if (response.status === 401) {
      if (retryCount > 0) {
        // Already tried refreshing, don't retry again
        const errorText = await response.text()
        throw new Error(`Dynamics API error: ${response.status} - Token refresh failed or token still invalid`)
      }

      // No refresh callback configured, can't refresh
      if (!this.onTokenRefresh) {
        const errorText = await response.text()
        throw new Error(`Dynamics API error: ${response.status} - ${errorText}`)
      }

      try {
        await this.refreshToken()
        // Retry the request with new token
        return this.fetch(endpoint, options, retryCount + 1)
      } catch {
        throw new Error(`Dynamics API error: 401 - Session expired. Please reconnect to Dynamics.`)
      }
    }

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

    // Extract pageSize for Prefer header, don't pass top to query builder
    const pageSize = queryOptions?.top || 20
    const { top, ...restOptions } = queryOptions || {}

    const query = buildODataQuery({
      select: ['incidentid', 'title', 'ticketnumber', 'description', 'statecode', 'statuscode', 'prioritycode', 'createdon', 'modifiedon', '_customerid_value', '_ownerid_value'],
      ...restOptions,
      filter,
    })

    // Use Prefer header for server-side pagination instead of $top
    const response = await this.fetch<{ value: unknown[]; '@odata.nextLink'?: string }>(`/incidents${query}`, {
      headers: {
        'Prefer': `odata.include-annotations="*",odata.maxpagesize=${pageSize}`,
      },
    })

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
      select: [
        'incidentid', 'title', 'ticketnumber', 'description', 'statecode', 'statuscode', 'prioritycode',
        'createdon', 'modifiedon', '_customerid_value', '_ownerid_value',
        'responseby', 'followupby', '_entitlementid_value', '_primarycontactid_value', '_accountid_value',
        '_ent_productentitlement_value', '_ent_contact_value', '_ent_customer_value',
        'ent_preferredemail', 'ent_preferredphonenumber', 'ent_supportedlanguage',
        'ent_preferredcustomertimezone', 'ent_custworkhrsstarttime', 'ent_custworkhrsendtime',
        'ent_threestrikepreference'
      ],
      expand: [
        'customerid_contact($select=fullname,emailaddress1)',
        'owninguser($select=fullname)',
        'entitlementid($select=name)',
        'primarycontactid($select=fullname)',
        'customerid_account($select=name)',
        'ent_productentitlement($select=ent_supportlevel)'
      ],
    })

    return this.fetch(`/incidents(${incidentId})${query}`)
  }

  async getCaseSLAKPIs(incidentId: string): Promise<{ value: unknown[] }> {
    const query = buildODataQuery({
      select: [
        'slakpiinstanceid', 'name', 'failuretime', 'warningtime', 'status',
        'succeededon', 'computedfailuretime', 'computedwarningtime', 'description'
      ],
      filter: `_regarding_value eq ${incidentId}`,
      orderby: 'createdon desc',
    })

    return this.fetch(`/slakpiinstances${query}`)
  }

  async getCaseActivities(incidentId: string): Promise<{ value: unknown[] }> {
    // First get all activities
    const query = buildODataQuery({
      select: ['activityid', 'subject', 'activitytypecode', 'createdon', 'modifiedon', 'description', 'statecode', 'statuscode'],
      filter: `_regardingobjectid_value eq ${incidentId} and activitytypecode ne 'ent_notificationactivity'`,
      orderby: 'createdon desc',
    })

    const activities = await this.fetch<{ value: unknown[] }>(`/activitypointers${query}`)

    // For each email activity, fetch attachments
    for (const activity of activities.value) {
      const act = activity as Record<string, unknown>
      if (act.activitytypecode === 'email') {
        try {
          const attachmentQuery = buildODataQuery({
            select: ['activitymimeattachmentid', 'filename', 'mimetype', 'body'],
            filter: `_objectid_value eq ${act.activityid}`,
          })
          const attachments = await this.fetch<{ value: unknown[] }>(`/activitymimeattachments${attachmentQuery}`)
          ;(act as Record<string, unknown>).attachments = attachments.value
        } catch {
          // If attachments fail to load, continue without them
          (act as Record<string, unknown>).attachments = []
        }
      }
    }

    return activities
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

  async getDashboardStats(ownerId?: string): Promise<{
    totalCases: number
    openCases: number
    resolvedToday: number
    avgFirstResponseTime: number
  }> {
    const ownerFilter = ownerId ? `_ownerid_value eq ${ownerId}` : ''

    // Get total cases
    const totalFilter = ownerFilter ? `$filter=${ownerFilter}&` : ''
    const totalResponse = await this.fetch<{ '@odata.count': number }>(`/incidents?${totalFilter}$count=true&$top=1`)
    const totalCases = totalResponse['@odata.count'] || 0

    // Get open cases
    const openFilter = ownerFilter ? `statecode eq 0 and ${ownerFilter}` : 'statecode eq 0'
    const openResponse = await this.fetch<{ '@odata.count': number }>(`/incidents?$filter=${openFilter}&$count=true&$top=1`)
    const openCases = openResponse['@odata.count'] || 0

    // Get resolved today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString()
    const resolvedFilter = ownerFilter
      ? `statecode eq 1 and modifiedon ge ${todayStr} and ${ownerFilter}`
      : `statecode eq 1 and modifiedon ge ${todayStr}`
    const resolvedResponse = await this.fetch<{ '@odata.count': number }>(`/incidents?$filter=${resolvedFilter}&$count=true&$top=1`)
    const resolvedToday = resolvedResponse['@odata.count'] || 0

    return {
      totalCases,
      openCases,
      resolvedToday,
      avgFirstResponseTime: 0, // Would need additional logic to calculate
    }
  }

  async getStatusReasonOptions(): Promise<{ value: number; label: string; state: number }[]> {
    const response = await this.fetch<{
      OptionSet: {
        Options: Array<{
          Value: number
          Label: { UserLocalizedLabel: { Label: string } }
          State: number
        }>
      }
    }>(`/EntityDefinitions(LogicalName='incident')/Attributes(LogicalName='statuscode')/Microsoft.Dynamics.CRM.StatusAttributeMetadata?$expand=OptionSet`)

    return response.OptionSet.Options.map(opt => ({
      value: opt.Value,
      label: opt.Label.UserLocalizedLabel.Label,
      state: opt.State
    }))
  }

  async getDashboardKPIs(ownerId?: string): Promise<{
    casesByStatus: { status: string; count: number }[]
    casesByPriority: { priority: string; count: number }[]
    resolutionTimeTrend: { date: string; avgHours: number }[]
    slaCompliancePercent: number
  }> {
    const ownerFilter = ownerId ? ` and _ownerid_value eq ${ownerId}` : ''

    // Get cases by status
    const activeResponse = await this.fetch<{ '@odata.count': number }>(`/incidents?$filter=statecode eq 0${ownerFilter}&$count=true&$top=1`)
    const resolvedResponse = await this.fetch<{ '@odata.count': number }>(`/incidents?$filter=statecode eq 1${ownerFilter}&$count=true&$top=1`)
    const cancelledResponse = await this.fetch<{ '@odata.count': number }>(`/incidents?$filter=statecode eq 2${ownerFilter}&$count=true&$top=1`)

    const casesByStatus = [
      { status: 'Active', count: activeResponse['@odata.count'] || 0 },
      { status: 'Resolved', count: resolvedResponse['@odata.count'] || 0 },
      { status: 'Cancelled', count: cancelledResponse['@odata.count'] || 0 },
    ]

    // Get cases by priority (P1=Critical, P2=Urgent, P3=Important, P4=Minor)
    const criticalResponse = await this.fetch<{ '@odata.count': number }>(`/incidents?$filter=prioritycode eq 1${ownerFilter}&$count=true&$top=1`)
    const urgentResponse = await this.fetch<{ '@odata.count': number }>(`/incidents?$filter=prioritycode eq 2${ownerFilter}&$count=true&$top=1`)
    const importantResponse = await this.fetch<{ '@odata.count': number }>(`/incidents?$filter=prioritycode eq 3${ownerFilter}&$count=true&$top=1`)
    const minorResponse = await this.fetch<{ '@odata.count': number }>(`/incidents?$filter=prioritycode eq 4${ownerFilter}&$count=true&$top=1`)

    const casesByPriority = [
      { priority: 'P1 - Critical', count: criticalResponse['@odata.count'] || 0 },
      { priority: 'P2 - Urgent', count: urgentResponse['@odata.count'] || 0 },
      { priority: 'P3 - Important', count: importantResponse['@odata.count'] || 0 },
      { priority: 'P4 - Minor', count: minorResponse['@odata.count'] || 0 },
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
  refreshToken: string,
  orgUrl: string
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
      scope: `${orgUrl}/user_impersonation offline_access`,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Token refresh failed: ${response.status} - ${errorText}`)
  }

  return response.json()
}
