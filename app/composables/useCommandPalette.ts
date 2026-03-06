import type { CommandCaseResult } from '~/types'

interface CommandPaletteState {
  open: boolean
  query: string
  results: CommandCaseResult[]
  loading: boolean
  activeIndex: number
  error: string
  requestId: number
}

const SEARCH_RESULT_LIMIT = 12
const MIN_SEARCH_LENGTH = 2
const MAX_SEARCH_LENGTH = 120

const commandPaletteState = reactive<CommandPaletteState>({
  open: false,
  query: '',
  results: [],
  loading: false,
  activeIndex: -1,
  error: '',
  requestId: 0,
})

let activeAbortController: AbortController | null = null

function abortActiveSearch() {
  if (!activeAbortController) return

  activeAbortController.abort()
  activeAbortController = null
}

function resetSearchState() {
  commandPaletteState.results = []
  commandPaletteState.loading = false
  commandPaletteState.activeIndex = -1
  commandPaletteState.error = ''
}

export function useCommandPalette() {
  const route = useRoute()
  const router = useRouter()
  const { isAdmin } = useAuth()
  const { trigger } = useHaptics()

  const adminSearchUserId = computed(() => {
    if (!isAdmin()) return undefined

    const userId = route.params.userId
    return typeof userId === 'string' && userId.length > 0 ? userId : undefined
  })

  const isSearchEnabled = computed(() => {
    if (!isAdmin()) return true
    return !!adminSearchUserId.value
  })

  const helperMessage = computed(() => {
    if (isSearchEnabled.value) return ''
    if (route.path === '/admin/cases') return 'Select a user to search their cases'
    return 'Select a user context from User Cases to search tickets'
  })

  const open = computed({
    get: () => commandPaletteState.open,
    set: (value: boolean) => {
      if (value) {
        commandPaletteState.open = true
        return
      }

      closePalette()
    },
  })

  const query = computed({
    get: () => commandPaletteState.query,
    set: (value: string) => {
      commandPaletteState.query = value
    },
  })

  const results = computed(() => commandPaletteState.results)
  const loading = computed(() => commandPaletteState.loading)
  const error = computed(() => commandPaletteState.error)
  const activeIndex = computed(() => commandPaletteState.activeIndex)

  function openPalette() {
    commandPaletteState.open = true
  }

  function closePalette() {
    commandPaletteState.open = false
    commandPaletteState.query = ''
    abortActiveSearch()
    resetSearchState()
  }

  function togglePalette() {
    if (commandPaletteState.open) {
      closePalette()
      return
    }

    openPalette()
  }

  function setActiveIndex(index: number) {
    if (commandPaletteState.results.length === 0) {
      commandPaletteState.activeIndex = -1
      return
    }

    commandPaletteState.activeIndex = Math.min(Math.max(index, 0), commandPaletteState.results.length - 1)
  }

  function moveSelection(direction: 1 | -1) {
    const count = commandPaletteState.results.length
    if (count === 0) {
      commandPaletteState.activeIndex = -1
      return
    }

    if (commandPaletteState.activeIndex === -1) {
      commandPaletteState.activeIndex = 0
      return
    }

    commandPaletteState.activeIndex = (commandPaletteState.activeIndex + direction + count) % count
  }

  function getResultPath(result: CommandCaseResult): string {
    if (isAdmin() && adminSearchUserId.value) {
      return `/admin/cases/${adminSearchUserId.value}/${result.id}`
    }

    return `/cases/${result.id}`
  }

  async function goToResult(result: CommandCaseResult) {
    trigger('navigation')
    closePalette()
    await router.push(getResultPath(result))
  }

  async function selectActiveResult() {
    if (commandPaletteState.activeIndex < 0) return

    const result = commandPaletteState.results[commandPaletteState.activeIndex]
    if (!result) return

    await goToResult(result)
  }

  async function search() {
    const trimmedQuery = commandPaletteState.query.trim()

    if (!isSearchEnabled.value) {
      abortActiveSearch()
      resetSearchState()
      return
    }

    if (!trimmedQuery) {
      abortActiveSearch()
      resetSearchState()
      return
    }

    if (trimmedQuery.length < MIN_SEARCH_LENGTH) {
      abortActiveSearch()
      resetSearchState()
      return
    }

    if (trimmedQuery.length > MAX_SEARCH_LENGTH) {
      abortActiveSearch()
      commandPaletteState.loading = false
      commandPaletteState.results = []
      commandPaletteState.activeIndex = -1
      commandPaletteState.error = `Query must be at most ${MAX_SEARCH_LENGTH} characters`
      return
    }

    abortActiveSearch()
    activeAbortController = new AbortController()
    const requestId = commandPaletteState.requestId + 1
    commandPaletteState.requestId = requestId
    commandPaletteState.loading = true
    commandPaletteState.error = ''

    try {
      const response = await $fetch<{ results: CommandCaseResult[] }>('/api/search/cases', {
        params: {
          cv: '2',
          q: trimmedQuery,
          limit: SEARCH_RESULT_LIMIT,
          ...(isAdmin() && adminSearchUserId.value ? { userId: adminSearchUserId.value } : {}),
        },
        signal: activeAbortController.signal,
      })

      if (requestId !== commandPaletteState.requestId) return

      commandPaletteState.results = response.results
      commandPaletteState.activeIndex = response.results.length > 0 ? 0 : -1
      commandPaletteState.error = ''
    } catch (error: unknown) {
      if (requestId !== commandPaletteState.requestId) return
      if (error instanceof DOMException && error.name === 'AbortError') return

      const err = error as { data?: { message?: string } }
      commandPaletteState.results = []
      commandPaletteState.activeIndex = -1
      commandPaletteState.error = err.data?.message || 'Failed to search cases'
    } finally {
      if (requestId === commandPaletteState.requestId) {
        commandPaletteState.loading = false
      }
    }
  }

  return {
    open,
    query,
    results,
    loading,
    error,
    activeIndex,
    isSearchEnabled,
    helperMessage,
    openPalette,
    closePalette,
    togglePalette,
    setActiveIndex,
    moveSelection,
    search,
    goToResult,
    selectActiveResult,
  }
}
