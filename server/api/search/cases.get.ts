import type { CommandCaseResult } from '../../../app/types'
import type { DynamicsCase } from '../../utils/mappers'
import { cachedAuthHandler } from '../../utils/cache'
import { getDynamicsClientWithUser } from '../../utils/dynamics'
import { rankCommandCaseResults } from '../../utils/search'

const DEFAULT_LIMIT = 12
const MAX_LIMIT = 20
const MIN_QUERY_LENGTH = 2
const MAX_QUERY_LENGTH = 120
const SEARCH_CANDIDATE_LIMIT = 100
const SEARCH_CACHE_VERSION = 'v2'

function parseLimit(rawLimit: string | undefined): number {
  const parsed = Number.parseInt(rawLimit || '', 10)

  if (Number.isNaN(parsed)) return DEFAULT_LIMIT

  if (parsed < 1) return 1
  if (parsed > MAX_LIMIT) return MAX_LIMIT
  return parsed
}

function mapCandidate(c: DynamicsCase): CommandCaseResult {
  const companyName = c.customerid_account?.name || undefined
  const entitlementContactName = c['_ent_contact_value@OData.Community.Display.V1.FormattedValue'] || undefined
  const fallbackCustomerName = c['_customerid_value@OData.Community.Display.V1.FormattedValue'] || undefined
  const customerName =
    c.customerid_contact?.fullname ||
    c.primarycontactid?.fullname ||
    entitlementContactName ||
    fallbackCustomerName ||
    companyName ||
    undefined

  return {
    id: c.incidentid,
    ticketNumber: c.ticketnumber,
    title: c.title,
    description: c.description || undefined,
    customerName,
    companyName,
    modifiedAt: c.modifiedon,
  }
}

function dedupeById(candidates: CommandCaseResult[]): CommandCaseResult[] {
  const seen = new Set<string>()
  const deduped: CommandCaseResult[] = []

  for (const candidate of candidates) {
    if (seen.has(candidate.id)) continue
    seen.add(candidate.id)
    deduped.push(candidate)
  }

  return deduped
}

export default cachedAuthHandler(async (event, user) => {
  const query = getQuery(event)
  const rawQuery = query.q

  if (typeof rawQuery !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Query parameter "q" is required',
    })
  }

  const q = rawQuery.trim()
  if (q.length < MIN_QUERY_LENGTH) {
    throw createError({
      statusCode: 400,
      message: `Query must be at least ${MIN_QUERY_LENGTH} characters`,
    })
  }

  if (q.length > MAX_QUERY_LENGTH) {
    throw createError({
      statusCode: 400,
      message: `Query must be at most ${MAX_QUERY_LENGTH} characters`,
    })
  }

  const limit = parseLimit(query.limit as string | undefined)
  const userId = typeof query.userId === 'string' ? query.userId : undefined

  const { client, dynamicsUserId } = await getDynamicsClientWithUser(user, userId)

  const primary = await client.searchCases({
    query: q,
    top: SEARCH_CANDIDATE_LIMIT,
    ownerId: dynamicsUserId,
  })

  let candidates = primary.value.map(mapCandidate)

  // Backfill with recent cases so typo-heavy fuzzy queries can still return results.
  if (candidates.length < SEARCH_CANDIDATE_LIMIT / 2) {
    const fallback = await client.searchCases({
      top: SEARCH_CANDIDATE_LIMIT,
      ownerId: dynamicsUserId,
    })

    candidates = dedupeById([
      ...candidates,
      ...fallback.value.map(mapCandidate),
    ])
  }

  const rankedResults = rankCommandCaseResults(q, candidates).slice(0, limit)

  return {
    results: rankedResults,
  }
}, {
  maxAge: 45,
  getKey: (event, user) => {
    const query = getQuery(event)
    const q = typeof query.q === 'string' ? query.q.trim().toLowerCase() : ''
    const userId = typeof query.userId === 'string' ? query.userId : ''
    const limit = parseLimit(query.limit as string | undefined)

    return `search-cases:${SEARCH_CACHE_VERSION}:${user._id}:${userId}:${limit}:${q}`
  },
})
