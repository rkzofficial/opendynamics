<script setup lang="ts">
import { Search, CornerDownLeft, Ticket, UserRound, Building2, LoaderCircle, Command, ArrowDown, ArrowUp, X } from 'lucide-vue-next'
import { formatTimeAgo } from '~/utils/timeAgo'

const {
  open,
  query,
  results,
  loading,
  error,
  activeIndex,
  isSearchEnabled,
  helperMessage,
  closePalette,
  togglePalette,
  setActiveIndex,
  moveSelection,
  search,
  goToResult,
  selectActiveResult,
} = useCommandPalette()

const SEARCH_DEBOUNCE_MS = 250
const MOBILE_SHEET_QUERY = '(max-width: 639px)'
const MOBILE_SHEET_CLOSE_THRESHOLD = 120
const MOBILE_SHEET_CLOSE_DURATION_MS = 180
const inputId = 'global-command-palette-search'
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null
let mobileSheetCloseTimer: ReturnType<typeof setTimeout> | null = null
const resultsContainerRef = ref<HTMLElement | null>(null)
const isMobileSheet = ref(false)
const isDraggingSheet = ref(false)
const sheetOffsetY = ref(0)
const dragStartY = ref(0)
let mobileSheetMediaQuery: MediaQueryList | null = null
let removeMobileSheetListener: (() => void) | null = null

function clearSearchDebounce() {
  if (!searchDebounceTimer) return
  clearTimeout(searchDebounceTimer)
  searchDebounceTimer = null
}

function clearMobileSheetCloseTimer() {
  if (!mobileSheetCloseTimer) return
  clearTimeout(mobileSheetCloseTimer)
  mobileSheetCloseTimer = null
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false

  const tagName = target.tagName.toLowerCase()
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') return true
  if (target.isContentEditable) return true
  if (target.closest('[contenteditable="true"]')) return true

  return false
}

function isOpenShortcut(event: KeyboardEvent): boolean {
  if (!(event.ctrlKey || event.metaKey)) return false
  if (event.altKey) return false

  return event.code === 'Slash' || event.key === '/' || event.key === '?'
}

function focusSearchInput() {
  const inputElement = document.getElementById(inputId) as HTMLInputElement | null
  inputElement?.focus()
  inputElement?.select()
}

function resetSheetPosition() {
  clearMobileSheetCloseTimer()
  isDraggingSheet.value = false
  sheetOffsetY.value = 0
  dragStartY.value = 0
}

function setIsMobileSheet(matches: boolean) {
  isMobileSheet.value = matches
  if (!matches) {
    resetSheetPosition()
  }
}

function addMobileSheetListener() {
  if (!mobileSheetMediaQuery) return

  const handler = (event: MediaQueryListEvent) => setIsMobileSheet(event.matches)
  if (mobileSheetMediaQuery.addEventListener) {
    mobileSheetMediaQuery.addEventListener('change', handler)
  } else {
    mobileSheetMediaQuery.addListener(handler)
  }

  return () => {
    if (mobileSheetMediaQuery?.removeEventListener) {
      mobileSheetMediaQuery.removeEventListener('change', handler)
    } else {
      mobileSheetMediaQuery?.removeListener(handler)
    }
  }
}

function handleSheetPointerDown(event: PointerEvent) {
  if (!open.value || !isMobileSheet.value) return
  if (event.pointerType === 'mouse' && event.button !== 0) return

  clearMobileSheetCloseTimer()
  isDraggingSheet.value = true
  dragStartY.value = event.clientY
}

function handleWindowPointerMove(event: PointerEvent) {
  if (!isDraggingSheet.value || !isMobileSheet.value) return

  const delta = Math.max(0, event.clientY - dragStartY.value)
  sheetOffsetY.value = delta
}

function finishSheetDrag(forceClose = false) {
  if (!isDraggingSheet.value && !forceClose) return

  const shouldClose = forceClose || sheetOffsetY.value >= MOBILE_SHEET_CLOSE_THRESHOLD
  isDraggingSheet.value = false

  if (!shouldClose) {
    sheetOffsetY.value = 0
    return
  }

  sheetOffsetY.value = window.innerHeight
  clearMobileSheetCloseTimer()
  mobileSheetCloseTimer = setTimeout(() => {
    closePalette()
    resetSheetPosition()
  }, MOBILE_SHEET_CLOSE_DURATION_MS)
}

function handleWindowPointerUp() {
  finishSheetDrag()
}

const sheetStyle = computed(() => {
  if (!isMobileSheet.value) return {}

  return {
    transform: `translateY(${sheetOffsetY.value}px)`,
    transition: isDraggingSheet.value
      ? 'none'
      : `transform ${MOBILE_SHEET_CLOSE_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
    willChange: 'transform',
  }
})

const backdropStyle = computed(() => {
  if (!isMobileSheet.value) {
    return {
      transition: `opacity ${MOBILE_SHEET_CLOSE_DURATION_MS}ms ease`,
    }
  }

  const progress = Math.min(sheetOffsetY.value / Math.max(MOBILE_SHEET_CLOSE_THRESHOLD, 1), 1)

  return {
    opacity: `${1 - progress}`,
    transition: isDraggingSheet.value
      ? 'none'
      : `opacity ${MOBILE_SHEET_CLOSE_DURATION_MS}ms ease`,
  }
})

function handleGlobalKeydown(event: KeyboardEvent) {
  if (event.defaultPrevented) return

  if (isOpenShortcut(event)) {
    if (isEditableTarget(event.target)) return

    event.preventDefault()
    togglePalette()
    return
  }

  if (open.value && !event.altKey && !event.ctrlKey && !event.metaKey) {
    const target = event.target
    const isPaletteInput = target instanceof HTMLInputElement && target.id === inputId
    const targetIsEditable = isEditableTarget(target)

    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && (!targetIsEditable || isPaletteInput)) {
      event.preventDefault()
      moveSelection(event.key === 'ArrowDown' ? 1 : -1)
      return
    }

    if (event.key === 'Enter' && (!targetIsEditable || isPaletteInput)) {
      event.preventDefault()
      void selectActiveResult()
      return
    }
  }

  if (event.key === 'Escape' && open.value) {
    event.preventDefault()
    closePalette()
  }
}

function formatModifiedAt(value: string): string {
  return new Date(value).toLocaleString()
}

function getCustomerLabel(result: { customerName?: string }): string | undefined {
  const name = result.customerName?.trim()
  return name ? name : undefined
}

function getCompanyLabel(result: { companyName?: string }): string | undefined {
  const name = result.companyName?.trim()
  return name ? name : undefined
}

function hasCustomer(result: { customerName?: string }): boolean {
  return !!getCustomerLabel(result)
}

function hasCompany(result: { companyName?: string }): boolean {
  const company = getCompanyLabel(result)
  if (!company) return false

  const customer = getCustomerLabel(result)
  if (!customer) return true

  return company.toLocaleLowerCase() !== customer.toLocaleLowerCase()
}

const trimmedQuery = computed(() => query.value.trim())
const hasQuery = computed(() => trimmedQuery.value.length > 0)
const queryTokens = computed(() => {
  return [...new Set(
    trimmedQuery.value
      .split(/\s+/)
      .map(token => token.trim())
      .filter(Boolean)
      .sort((a, b) => b.length - a.length)
  )]
})

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function highlightText(value?: string): string {
  const rawText = value || ''
  if (!rawText) return ''

  let highlighted = escapeHtml(rawText)
  if (queryTokens.value.length === 0) return highlighted

  for (const token of queryTokens.value) {
    const pattern = escapeRegExp(escapeHtml(token))
    if (!pattern) continue

    highlighted = highlighted.replace(
      new RegExp(`(${pattern})`, 'gi'),
      '<mark class="command-highlight">$1</mark>'
    )
  }

  return highlighted
}

const resultCountLabel = computed(() => {
  const count = results.value.length
  if (count === 0) return 'No matches'
  if (count === 1) return '1 match'
  return `${count} matches`
})

watch(query, () => {
  clearSearchDebounce()

  if (!open.value) return

  searchDebounceTimer = setTimeout(() => {
    search()
  }, SEARCH_DEBOUNCE_MS)
})

watch(open, (isOpen) => {
  if (!isOpen) {
    clearSearchDebounce()
    resetSheetPosition()
    return
  }

  nextTick(() => {
    focusSearchInput()
  })
})

watch(activeIndex, () => {
  if (!open.value) return
  if (activeIndex.value < 0) return

  nextTick(() => {
    const container = resultsContainerRef.value
    if (!container) return

    const item = container.querySelector<HTMLElement>(`[data-result-index="${activeIndex.value}"]`)
    item?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
    })
  })
})

onMounted(() => {
  mobileSheetMediaQuery = window.matchMedia(MOBILE_SHEET_QUERY)
  removeMobileSheetListener = addMobileSheetListener()
  setIsMobileSheet(mobileSheetMediaQuery.matches)
  window.addEventListener('keydown', handleGlobalKeydown)
  window.addEventListener('pointermove', handleWindowPointerMove, { passive: true })
  window.addEventListener('pointerup', handleWindowPointerUp)
  window.addEventListener('pointercancel', handleWindowPointerUp)
})

onUnmounted(() => {
  clearSearchDebounce()
  clearMobileSheetCloseTimer()
  removeMobileSheetListener?.()
  window.removeEventListener('keydown', handleGlobalKeydown)
  window.removeEventListener('pointermove', handleWindowPointerMove)
  window.removeEventListener('pointerup', handleWindowPointerUp)
  window.removeEventListener('pointercancel', handleWindowPointerUp)
})
</script>

<template>
  <UiDialog
    v-model:open="open"
    container-class="items-end sm:items-center"
    :content-style="sheetStyle"
    :show-close-button="false"
    :backdrop-style="backdropStyle"
    class="mt-auto w-full max-w-none gap-0 overflow-hidden rounded-t-[28px] border-x-0 border-b-0 border-t border-border/80 p-0 shadow-2xl sm:mt-0 sm:w-[min(56rem,calc(100vw-2rem))] sm:rounded-[28px] sm:border"
  >
    <div class="relative min-w-0 max-w-full">
      <div
        class="relative flex cursor-grab select-none justify-center border-b border-border/60 bg-background/95 px-4 pb-2 pt-2 [touch-action:none] active:cursor-grabbing sm:hidden"
        data-command-sheet-handle
        @pointerdown="handleSheetPointerDown"
      >
        <div class="h-1.5 w-12 rounded-full bg-muted-foreground/25" />
      </div>

      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(120,120,120,0.12),transparent_62%)]" />

      <div class="relative border-b bg-muted/20 px-4 pb-3 pt-3.5">
        <div class="flex items-center justify-between gap-3">
          <div class="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Command class="h-3.5 w-3.5" />
            Command Center
          </div>
          <div class="flex items-center gap-2">
            <div class="hidden items-center gap-1.5 rounded-md border bg-background/80 px-2 py-1 text-[11px] text-muted-foreground sm:flex">
              <kbd class="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Ctrl</kbd>
              +
              <kbd class="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">/</kbd>
            </div>
            <UiButton
              variant="ghost"
              size="icon"
              class="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
              haptic-intent="none"
              @click="closePalette"
            >
              <X class="h-4 w-4" />
              <span class="sr-only">Close command center</span>
            </UiButton>
          </div>
        </div>

        <div class="mt-3 flex items-center gap-2 rounded-xl border bg-background px-3 py-2.5 shadow-sm">
          <Search class="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <UiInput
            :id="inputId"
            v-model="query"
            class="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            :placeholder="isSearchEnabled ? 'Jump to ticket, title, customer, or company' : 'Search unavailable in this view'"
            :disabled="!isSearchEnabled"
            autocomplete="off"
          />
          <LoaderCircle v-if="loading" class="h-4 w-4 animate-spin text-muted-foreground" />
        </div>

        <div class="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span class="inline-flex items-center gap-1 rounded-full border bg-background/70 px-2 py-1">
            <Ticket class="h-3.5 w-3.5" />
            Cases
          </span>
          <span class="inline-flex items-center gap-1 rounded-full border bg-background/70 px-2 py-1">
            <UserRound class="h-3.5 w-3.5" />
            Customer
          </span>
          <span class="inline-flex items-center gap-1 rounded-full border bg-background/70 px-2 py-1">
            <Building2 class="h-3.5 w-3.5" />
            Company
          </span>
          <span v-if="hasQuery" class="ml-auto text-[11px] text-muted-foreground/80">
            {{ resultCountLabel }}
          </span>
        </div>
      </div>

      <div class="relative h-[min(62vh,30rem)] min-w-0 overflow-hidden bg-background sm:h-[430px]">
        <div
          v-if="!isSearchEnabled"
          class="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground"
        >
          <div class="space-y-2">
            <p class="font-medium text-foreground">Search is unavailable</p>
            <p>{{ helperMessage }}</p>
          </div>
        </div>

        <div
          v-else-if="error"
          class="flex h-full items-center justify-center px-6 text-center text-sm text-destructive"
        >
          <div class="space-y-2">
            <p class="font-medium">Search failed</p>
            <p>{{ error }}</p>
          </div>
        </div>

        <div
          v-else-if="!hasQuery"
          class="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground"
        >
          <div class="space-y-2">
            <p class="font-medium text-foreground">Search across your workspace cases</p>
            <p>Type at least 2 characters to find ticket numbers, titles, descriptions, companies, and customers.</p>
          </div>
        </div>

        <div v-else-if="loading" class="command-scroll h-full overflow-x-hidden overflow-y-auto space-y-2 p-3">
          <div v-for="n in 6" :key="n" class="rounded-lg border p-3">
            <UiSkeleton class="h-3.5 w-24" />
            <UiSkeleton class="mt-2 h-4 w-[70%]" />
            <UiSkeleton class="mt-2 h-3.5 w-[45%]" />
          </div>
        </div>

        <div
          v-else-if="results.length === 0"
          class="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground"
        >
          <div class="space-y-2">
            <p class="font-medium text-foreground">No matching cases found</p>
            <p>Try a different keyword or use a ticket number for direct matches.</p>
          </div>
        </div>

        <div ref="resultsContainerRef" class="command-scroll h-full min-w-0 overflow-x-hidden overflow-y-auto p-3">
          <button
            v-for="(result, index) in results"
            :key="result.id"
            type="button"
            :data-result-index="index"
            class="group mb-2 block w-full max-w-full overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-all duration-150"
            :class="index === activeIndex
              ? 'border-primary/40 bg-primary/[0.06] shadow-sm'
              : 'border-border/70 bg-background hover:border-border hover:bg-muted/25'"
            @mouseenter="setActiveIndex(index)"
            @click="goToResult(result)"
          >
            <div class="flex min-w-0 max-w-full items-start gap-3 overflow-hidden">
              <div
                class="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border bg-muted/35"
                :class="index === activeIndex ? 'border-primary/40 bg-primary/10 text-primary' : 'text-muted-foreground'"
              >
                <Ticket class="h-4 w-4" />
              </div>

              <div class="min-w-0 flex-1 overflow-hidden">
                <div class="flex min-w-0 items-start justify-between gap-3 overflow-hidden">
                  <div class="min-w-0 max-w-full flex-1">
                    <p class="max-w-full truncate font-mono text-[11px] text-primary/95" v-html="highlightText(result.ticketNumber)" />
                    <p class="max-w-full truncate text-sm font-semibold" v-html="highlightText(result.title)" />
                  </div>
                  <div class="flex-shrink-0 text-right text-[11px] text-muted-foreground">
                    <p :title="formatModifiedAt(result.modifiedAt)">
                      {{ formatTimeAgo(result.modifiedAt).text }}
                    </p>
                  </div>
                </div>

                <p
                  v-if="result.description"
                  class="mt-1 truncate text-xs text-muted-foreground"
                  v-html="highlightText(result.description)"
                />

                <div class="mt-2 flex min-w-0 flex-wrap items-center gap-1.5 text-[11px]">
                  <span
                    v-if="hasCustomer(result)"
                    class="inline-flex min-w-0 max-w-full items-center gap-1 rounded-md border bg-background/70 px-2 py-1 text-muted-foreground"
                  >
                    <UserRound class="h-3.5 w-3.5" />
                    <span
                      class="block min-w-0 max-w-[180px] truncate sm:max-w-[260px]"
                      v-html="highlightText(getCustomerLabel(result))"
                    />
                  </span>
                  <span
                    v-if="hasCompany(result)"
                    class="inline-flex min-w-0 max-w-full items-center gap-1 rounded-md border bg-background/70 px-2 py-1 text-muted-foreground"
                  >
                    <Building2 class="h-3.5 w-3.5" />
                    <span
                      class="block min-w-0 max-w-[180px] truncate sm:max-w-[260px]"
                      v-html="highlightText(getCompanyLabel(result))"
                    />
                  </span>
                </div>
              </div>

              <div
                class="hidden flex-shrink-0 items-center gap-1 rounded-md border bg-background/80 px-2 py-1 text-[10px] text-muted-foreground md:flex"
                :class="index === activeIndex ? 'border-primary/30 text-primary' : ''"
              >
                <CornerDownLeft class="h-3.5 w-3.5" />
                Open
              </div>
            </div>
          </button>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground">
        <span class="inline-flex items-center gap-1.5">
          <ArrowUp class="h-3.5 w-3.5" />
          <ArrowDown class="h-3.5 w-3.5" />
          Navigate
        </span>
        <span class="inline-flex items-center gap-1.5">
          <CornerDownLeft class="h-3.5 w-3.5" />
          Enter to open
        </span>
        <span class="inline-flex items-center gap-1.5">
          <kbd class="rounded border bg-background px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd>
          Close
        </span>
      </div>
    </div>
  </UiDialog>
</template>

<style scoped>
:deep(mark.command-highlight) {
  background: hsl(var(--primary) / 0.18);
  color: inherit;
  border-radius: 4px;
  padding: 0 2px;
  font-weight: 600;
}

.command-scroll {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--border)) transparent;
}

.command-scroll::-webkit-scrollbar {
  width: 10px;
}

.command-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.command-scroll::-webkit-scrollbar-thumb {
  background: hsl(var(--border));
  border: 2px solid transparent;
  border-radius: 9999px;
  background-clip: padding-box;
}

.command-scroll::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--primary) / 0.45);
  border: 2px solid transparent;
  background-clip: padding-box;
}

.command-scroll::-webkit-scrollbar-corner {
  background: transparent;
}

</style>
