// MCP Tool types and definitions

export interface McpToolContext {
  userId: string
}

export interface ToolResult {
  content: Array<{
    type: 'text'
    text: string
  }>
  isError?: boolean
}

// Case listing filters
export interface ListCasesArgs {
  status?: 'active' | 'resolved' | 'cancelled'
  priority?: 'critical' | 'urgent' | 'important' | 'minor'
  search?: string
  dateFrom?: string
  dateTo?: string
  pageSize?: number
  skipToken?: string
}

// Case details
export interface GetCaseArgs {
  caseId: string
}

// Add note to case
export interface AddCaseNoteArgs {
  caseId: string
  noteText: string
  subject?: string
}

// Share creation
export interface CreateShareArgs {
  caseId: string
  expiresInDays?: number
}

// List shares
export interface ListSharesArgs {
  caseId: string
}

// Revoke share
export interface RevokeShareArgs {
  shareId: string
}
