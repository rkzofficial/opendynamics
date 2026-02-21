// Dynamics CRM → Clean type mappers
// Transforms raw OData responses into frontend-friendly structures

import type { SLASummary, CaseListItem, CaseDetail, ActivityItem, ActivityAttachmentItem, NoteItem, AttachmentItem, SLAKpiItem } from '../../app/types'

// Raw Dynamics OData response shapes (partial, for type safety in mappers)
export interface DynamicsCase {
  incidentid: string
  title: string
  ticketnumber: string
  description?: string
  statecode: number
  statuscode: number
  'statuscode@OData.Community.Display.V1.FormattedValue'?: string
  prioritycode: number
  createdon: string
  modifiedon: string
  customerid_contact?: { fullname?: string; emailaddress1?: string }
  '_customerid_value@OData.Community.Display.V1.FormattedValue'?: string
  '_ent_contact_value@OData.Community.Display.V1.FormattedValue'?: string
  owninguser?: { fullname?: string }
  _ent_queueid_value?: string
  '_ent_queueid_value@OData.Community.Display.V1.FormattedValue'?: string
  responseby?: string
  followupby?: string
  '_ent_contact_value@OData.Community.Display.V1.FormattedValue'?: string
  primarycontactid?: { fullname?: string }
  customerid_account?: { name?: string }
  entitlementid?: { name?: string }
  ent_productentitlement?: { 'ent_supportlevel@OData.Community.Display.V1.FormattedValue'?: string }
  '_ent_customer_value@OData.Community.Display.V1.FormattedValue'?: string
  ent_preferredemail?: string
  ent_preferredphonenumber?: string
  'ent_supportedlanguage@OData.Community.Display.V1.FormattedValue'?: string
  ent_preferredcustomertimezone?: number
  'ent_preferredcustomertimezone@OData.Community.Display.V1.FormattedValue'?: string
  ent_custworkhrsstarttime?: number
  ent_custworkhrsendtime?: number
  'ent_threestrikepreference@OData.Community.Display.V1.FormattedValue'?: string
}

export interface DynamicsActivity {
  activityid: string
  subject: string
  activitytypecode: string
  description?: string
  createdon: string
  modifiedon?: string
  statecode: number
  statuscode: number
  sender?: string
  torecipients?: string
  ccrecipients?: string
  bccrecipients?: string
  phonenumber?: string
  directioncode?: boolean
  attachments?: DynamicsActivityAttachment[]
}

export interface DynamicsActivityAttachment {
  activitymimeattachmentid: string
  filename: string
  mimetype: string
  body: string
}

export interface DynamicsAnnotation {
  annotationid: string
  subject?: string
  notetext: string
  createdon: string
  modifiedon?: string
  createdby?: { fullname?: string }
  isdocument?: boolean
  filename?: string
  mimetype?: string
  filesize?: number
}

export interface DynamicsAttachment {
  attachmentMetadataId?: string
  fileName?: string
  mimeType?: string
  createdOn?: string
  uploadedBy?: string
  annotationid?: string
  filename?: string
  mimetype?: string
  filesize?: number
  createdon?: string
  createdby?: { fullname?: string }
}

export interface DynamicsSLAKpi {
  slakpiinstanceid: string
  name: string
  failuretime?: string
  warningtime?: string
  status: number
  succeededon?: string
  computedfailuretime?: string
  computedwarningtime?: string
  description?: string
}

function mapState(statecode: number): 'active' | 'resolved' | 'cancelled' | 'unknown' {
  switch (statecode) {
    case 0: return 'active'
    case 1: return 'resolved'
    case 2: return 'cancelled'
    default: return 'unknown'
  }
}

export function mapCaseToListItem(c: DynamicsCase, sla?: SLASummary): CaseListItem {
  return {
    id: c.incidentid,
    title: c.title,
    ticketNumber: c.ticketnumber,
    description: c.description || undefined,
    state: mapState(c.statecode),
    statusCode: c.statuscode,
    statusLabel: c['statuscode@OData.Community.Display.V1.FormattedValue'] || undefined,
    priority: c.prioritycode,
    createdAt: c.createdon,
    modifiedAt: c.modifiedon,
    customer: c.customerid_contact
      ? { name: c.customerid_contact.fullname, email: c.customerid_contact.emailaddress1 }
      : undefined,
    owner: c.owninguser?.fullname ? { name: c.owninguser.fullname } : undefined,
    queue: c._ent_queueid_value
      ? {
          id: c._ent_queueid_value,
          name: c['_ent_queueid_value@OData.Community.Display.V1.FormattedValue'] || undefined,
        }
      : undefined,
    sla: sla || undefined,
  }
}

export function mapCaseToCaseDetail(
  c: DynamicsCase,
  activities: DynamicsActivity[],
  annotations: DynamicsAnnotation[],
  attachments: DynamicsAttachment[],
  slaKpis: DynamicsSLAKpi[]
): CaseDetail {
  const listItem = mapCaseToListItem(c)

  const prefs = {
    email: c.ent_preferredemail || undefined,
    phone: c.ent_preferredphonenumber || undefined,
    language: c['ent_supportedlanguage@OData.Community.Display.V1.FormattedValue'] || undefined,
    timezoneCode: c.ent_preferredcustomertimezone ?? undefined,
    timezoneName: c['ent_preferredcustomertimezone@OData.Community.Display.V1.FormattedValue'] || undefined,
    workHoursStart: c.ent_custworkhrsstarttime ?? undefined,
    workHoursEnd: c.ent_custworkhrsendtime ?? undefined,
    threeStrikePreference: c['ent_threestrikepreference@OData.Community.Display.V1.FormattedValue'] || undefined,
  }
  const hasPreferences = Object.values(prefs).some(v => v !== undefined)

  return {
    ...listItem,
    responseBy: c.responseby || undefined,
    followUpBy: c.followupby || undefined,
    contact: (c['_ent_contact_value@OData.Community.Display.V1.FormattedValue'] || c.primarycontactid?.fullname)
      ? { name: c['_ent_contact_value@OData.Community.Display.V1.FormattedValue'] || c.primarycontactid?.fullname }
      : undefined,
    account: c.customerid_account?.name ? { name: c.customerid_account.name } : undefined,
    entitlement: c.entitlementid?.name ? { name: c.entitlementid.name } : undefined,
    supportLevel: c.ent_productentitlement?.['ent_supportlevel@OData.Community.Display.V1.FormattedValue'] || undefined,
    customer360: c['_ent_customer_value@OData.Community.Display.V1.FormattedValue'] || undefined,
    customerPreferences: hasPreferences ? prefs : undefined,
    activities: activities.map(mapActivity),
    notes: annotations.map(mapAnnotation),
    attachments: attachments.map(mapAttachment),
    slaKpis: slaKpis.map(mapSLAKpi),
  }
}

export function mapActivity(a: DynamicsActivity): ActivityItem {
  return {
    id: a.activityid,
    subject: a.subject,
    type: a.activitytypecode,
    description: a.description || undefined,
    createdAt: a.createdon,
    modifiedAt: a.modifiedon || undefined,
    state: a.statecode,
    status: a.statuscode,
    sender: a.sender || undefined,
    toRecipients: a.torecipients || undefined,
    ccRecipients: a.ccrecipients || undefined,
    bccRecipients: a.bccrecipients || undefined,
    phoneNumber: a.phonenumber || undefined,
    isOutgoing: a.directioncode ?? undefined,
    attachments: a.attachments?.map(mapActivityAttachment) || undefined,
  }
}

export function mapActivityAttachment(a: DynamicsActivityAttachment): ActivityAttachmentItem {
  return {
    id: a.activitymimeattachmentid,
    filename: a.filename,
    mimeType: a.mimetype,
    body: a.body,
  }
}

export function mapAnnotation(a: DynamicsAnnotation): NoteItem {
  return {
    id: a.annotationid,
    subject: a.subject || undefined,
    text: a.notetext,
    createdAt: a.createdon,
    modifiedAt: a.modifiedon || undefined,
    createdBy: a.createdby?.fullname || undefined,
    isDocument: a.isdocument || undefined,
    filename: a.filename || undefined,
    mimeType: a.mimetype || undefined,
    fileSize: a.filesize ?? undefined,
  }
}

export function mapAttachment(a: DynamicsAttachment): AttachmentItem {
  // Handle both standard annotation attachments and custom Adobe attachments
  if (a.attachmentMetadataId) {
    // Custom Adobe attachment format (no fileSize available from API)
    return {
      id: a.attachmentMetadataId,
      filename: a.fileName!,
      mimeType: a.mimeType || 'application/octet-stream',
      createdAt: a.createdOn!,
      createdBy: a.uploadedBy || undefined,
    }
  }
  // Standard annotation attachment
  return {
    id: a.annotationid!,
    filename: a.filename!,
    mimeType: a.mimetype!,
    fileSize: a.filesize ?? undefined,
    createdAt: a.createdon!,
    createdBy: a.createdby?.fullname || undefined,
  }
}

// SLA KPI status: 0=InProgress, 1=Noncompliant, 2=NearingNoncompliance, 3=Paused, 4=Succeeded, 5=Canceled
export function mapSLAKpi(kpi: DynamicsSLAKpi): SLAKpiItem {
  return {
    id: kpi.slakpiinstanceid,
    name: kpi.name,
    failureTime: kpi.failuretime || undefined,
    warningTime: kpi.warningtime || undefined,
    status: kpi.status,
    succeededAt: kpi.succeededon || undefined,
    computedFailureTime: kpi.computedfailuretime || undefined,
    computedWarningTime: kpi.computedwarningtime || undefined,
    description: kpi.description || undefined,
  }
}

// Minimal client interface for buildCaseDetail (avoids importing DynamicsApiClient)
interface CaseDetailClient {
  getCase(caseId: string): Promise<DynamicsCase>
  getCaseActivities(caseId: string): Promise<{ value: DynamicsActivity[] }>
  getCaseAnnotations(caseId: string): Promise<{ value: DynamicsAnnotation[] }>
  getCaseAttachments(caseId: string): Promise<{ attachments: DynamicsAttachment[] }>
  getCaseSLAKPIs(caseId: string): Promise<{ value: DynamicsSLAKpi[] }>
}

/**
 * Fetches all case-related data in parallel and maps to a CaseDetail.
 * Sub-fetches for activities, annotations, attachments, and SLA KPIs are
 * individually wrapped so a failure in one doesn't break the entire response.
 */
export async function buildCaseDetail(client: CaseDetailClient, caseId: string): Promise<CaseDetail> {
  const [caseData, activitiesResult, annotationsResult, attachmentsResult, slaResult] = await Promise.all([
    client.getCase(caseId),
    client.getCaseActivities(caseId).catch((): { value: DynamicsActivity[] } => ({ value: [] })),
    client.getCaseAnnotations(caseId).catch((): { value: DynamicsAnnotation[] } => ({ value: [] })),
    client.getCaseAttachments(caseId).catch((): { attachments: DynamicsAttachment[] } => ({ attachments: [] })),
    client.getCaseSLAKPIs(caseId).catch((): { value: DynamicsSLAKpi[] } => ({ value: [] })),
  ])

  // Filter out annotations that are documents (keep only text notes)
  const annotations = annotationsResult.value.filter(a => !a.isdocument)

  return mapCaseToCaseDetail(
    caseData,
    activitiesResult.value,
    annotations,
    attachmentsResult.attachments,
    slaResult.value || []
  )
}

type BatchSLAInput = Record<string, { createdon?: string; warningtime?: string; failuretime?: string; status: number }>

export function mapBatchSLA(dynamicsSLA: BatchSLAInput): Record<string, SLASummary> {
  const result: Record<string, SLASummary> = {}
  for (const [caseId, sla] of Object.entries(dynamicsSLA)) {
    result[caseId.toLowerCase()] = {
      createdAt: sla.createdon || undefined,
      warningTime: sla.warningtime || undefined,
      failureTime: sla.failuretime || undefined,
      status: sla.status,
    }
  }
  return result
}
