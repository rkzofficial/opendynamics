export interface ODataQueryOptions {
  select?: string[]
  expand?: string[]
  filter?: string
  orderby?: string
  top?: number
  skip?: number
  skipToken?: string
  count?: boolean
}

export function buildODataQuery(options: ODataQueryOptions): string {
  const params: string[] = []

  if (options.select && options.select.length > 0) {
    params.push(`$select=${options.select.join(',')}`)
  }

  if (options.expand && options.expand.length > 0) {
    params.push(`$expand=${options.expand.join(',')}`)
  }

  if (options.filter) {
    params.push(`$filter=${encodeURIComponent(options.filter)}`)
  }

  if (options.orderby) {
    params.push(`$orderby=${encodeURIComponent(options.orderby)}`)
  }

  if (options.top !== undefined) {
    params.push(`$top=${options.top}`)
  }

  if (options.skip !== undefined) {
    params.push(`$skip=${options.skip}`)
  }

  if (options.count) {
    params.push('$count=true')
  }

  if (options.skipToken) {
    params.push(`$skiptoken=${encodeURIComponent(options.skipToken)}`)
  }

  return params.length > 0 ? `?${params.join('&')}` : ''
}

export function buildCaseFilter(filters: {
  status?: string
  statusReason?: string
  priority?: string
  search?: string
  dateFrom?: string
  dateTo?: string
  ownerId?: string
}): string {
  const conditions: string[] = []

  // Status reason filter takes precedence over status filter
  if (filters.statusReason && filters.statusReason !== 'all') {
    const code = parseInt(filters.statusReason, 10)
    if (!isNaN(code)) {
      conditions.push(`statuscode eq ${code}`)
    }
  } else if (filters.status) {
    switch (filters.status) {
      case 'active':
        conditions.push('statecode eq 0')
        break
      case 'resolved':
        conditions.push('statecode eq 1')
        break
      case 'cancelled':
        conditions.push('statecode eq 2')
        break
    }
  }

  if (filters.priority) {
    switch (filters.priority) {
      case 'critical':
        conditions.push('prioritycode eq 1')
        break
      case 'urgent':
        conditions.push('prioritycode eq 2')
        break
      case 'important':
        conditions.push('prioritycode eq 3')
        break
      case 'minor':
        conditions.push('prioritycode eq 4')
        break
    }
  }

  if (filters.search) {
    const searchTerm = filters.search.replace(/'/g, "''")
    conditions.push(`(contains(title,'${searchTerm}') or contains(ticketnumber,'${searchTerm}'))`)
  }

  if (filters.dateFrom) {
    conditions.push(`createdon ge ${filters.dateFrom}`)
  }

  if (filters.dateTo) {
    conditions.push(`createdon le ${filters.dateTo}`)
  }

  if (filters.ownerId) {
    conditions.push(`_ownerid_value eq ${filters.ownerId}`)
  }

  return conditions.join(' and ')
}
