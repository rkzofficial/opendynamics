import type { CommandCaseResult } from '../../app/types'

const MAX_EDIT_DISTANCE = 2

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(value: string): string[] {
  const normalized = normalize(value)
  if (!normalized) return []

  return [...new Set(normalized.split(' ').filter(Boolean))]
}

function levenshteinDistance(a: string, b: string, maxDistance = MAX_EDIT_DISTANCE): number | null {
  if (!a || !b) return null
  if (a === b) return 0
  if (Math.abs(a.length - b.length) > maxDistance) return null

  const prev = new Array(b.length + 1).fill(0)
  const curr = new Array(b.length + 1).fill(0)

  for (let j = 0; j <= b.length; j += 1) {
    prev[j] = j
  }

  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i
    let rowMin = curr[0]

    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost
      )
      rowMin = Math.min(rowMin, curr[j])
    }

    if (rowMin > maxDistance) return null

    for (let j = 0; j <= b.length; j += 1) {
      prev[j] = curr[j]
    }
  }

  return prev[b.length] <= maxDistance ? prev[b.length] : null
}

function subsequenceScore(value: string, token: string): number {
  if (!value || !token) return 0

  let valueIndex = 0
  let tokenIndex = 0

  while (valueIndex < value.length && tokenIndex < token.length) {
    if (value[valueIndex] === token[tokenIndex]) {
      tokenIndex += 1
    }
    valueIndex += 1
  }

  if (tokenIndex !== token.length) return 0

  const density = token.length / Math.max(value.length, token.length)
  return 0.35 + (density * 0.35)
}

function editDistanceScore(value: string, token: string): number {
  const distance = levenshteinDistance(value, token)

  if (distance === null) return 0
  if (distance === 0) return 1
  if (distance === 1) return 0.72
  if (distance === 2) return 0.48

  return 0
}

function scoreTokenAgainstField(field: string | undefined, token: string): number {
  if (!field) return 0

  const normalizedField = normalize(field)
  if (!normalizedField) return 0

  if (normalizedField === token) return 1
  if (normalizedField.startsWith(token)) return 0.95
  if (normalizedField.includes(token)) return 0.8

  let bestScore = Math.max(
    editDistanceScore(normalizedField, token) * 0.6,
    subsequenceScore(normalizedField, token) * 0.7
  )

  const words = normalizedField.split(' ')
  for (const word of words) {
    if (!word) continue

    if (word === token) {
      bestScore = Math.max(bestScore, 1)
      continue
    }

    if (word.startsWith(token)) {
      bestScore = Math.max(bestScore, 0.92)
      continue
    }

    if (word.includes(token)) {
      bestScore = Math.max(bestScore, 0.75)
      continue
    }

    bestScore = Math.max(
      bestScore,
      editDistanceScore(word, token),
      subsequenceScore(word, token)
    )
  }

  return bestScore
}

function scoreToken(candidate: CommandCaseResult, token: string): number {
  const ticketScore = scoreTokenAgainstField(candidate.ticketNumber, token) * 100
  const titleScore = scoreTokenAgainstField(candidate.title, token) * 70
  const customerScore = scoreTokenAgainstField(candidate.customerName, token) * 55
  const companyScore = scoreTokenAgainstField(candidate.companyName, token) * 55
  const descriptionScore = scoreTokenAgainstField(candidate.description, token) * 35

  return Math.max(ticketScore, titleScore, customerScore, companyScore, descriptionScore)
}

function compareModifiedAtDesc(a: string, b: string): number {
  const aDate = new Date(a).getTime()
  const bDate = new Date(b).getTime()
  return bDate - aDate
}

export function rankCommandCaseResults(query: string, candidates: CommandCaseResult[]): CommandCaseResult[] {
  const tokens = tokenize(query)
  if (tokens.length === 0) return []

  return candidates
    .map((candidate, index) => {
      const tokenScores = tokens.map(token => scoreToken(candidate, token))
      const matchedTokenCount = tokenScores.filter(score => score > 0).length

      if (matchedTokenCount === 0) {
        return { candidate, score: 0, index }
      }

      const scoreSum = tokenScores.reduce((sum, current) => sum + current, 0)
      const coverageBoost = 0.65 + ((matchedTokenCount / tokens.length) * 0.35)
      const score = scoreSum * coverageBoost

      return { candidate, score, index }
    })
    .filter(item => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score

      const modifiedOrder = compareModifiedAtDesc(a.candidate.modifiedAt, b.candidate.modifiedAt)
      if (modifiedOrder !== 0) return modifiedOrder

      return a.index - b.index
    })
    .map(item => item.candidate)
}

