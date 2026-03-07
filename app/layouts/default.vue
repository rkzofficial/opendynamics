<script setup lang="ts">
const { fetchSession, isLoading, isAuthenticated } = useAuth()
const { fetchConnectionStatus } = useDynamics()
const { initTheme } = useTheme()
const router = useRouter()

const HEADER_HEIGHT = 56
const BOTTOM_NAV_HEIGHT = 72

const headerHiddenOffset = ref(0)
const bottomHiddenOffset = ref(0)
const lastScrollY = ref(0)
const isMobile = ref(false)
let scrollFrame = 0
let mediaQuery: MediaQueryList | null = null
let removeMediaQueryListener: (() => void) | null = null

const headerTransformStyle = computed(() => {
  if (!isMobile.value) return {}

  return {
    transform: `translateY(-${headerHiddenOffset.value}px)`,
    willChange: 'transform',
  }
})

const bottomNavTransformStyle = computed(() => {
  if (!isMobile.value) return {}

  return {
    transform: `translateY(${bottomHiddenOffset.value}px)`,
    willChange: 'transform',
  }
})

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function resetOffsets() {
  headerHiddenOffset.value = 0
  bottomHiddenOffset.value = 0
}

function applyScrollDelta(delta: number) {
  headerHiddenOffset.value = clamp(headerHiddenOffset.value + delta, 0, HEADER_HEIGHT)
  bottomHiddenOffset.value = clamp(bottomHiddenOffset.value + delta, 0, BOTTOM_NAV_HEIGHT)
}

function handleScrollFrame() {
  if (!isMobile.value) {
    scrollFrame = 0
    return
  }

  const currentY = window.scrollY
  const delta = currentY - lastScrollY.value
  lastScrollY.value = currentY

  applyScrollDelta(delta)

  if (currentY <= 0) {
    headerHiddenOffset.value = 0
    bottomHiddenOffset.value = 0
  }

  scrollFrame = 0
}

function onScroll() {
  if (!isMobile.value) return
  if (scrollFrame) return
  scrollFrame = requestAnimationFrame(handleScrollFrame)
}

function setIsMobile(matches: boolean) {
  isMobile.value = matches
  if (!matches) {
    if (scrollFrame) {
      cancelAnimationFrame(scrollFrame)
      scrollFrame = 0
    }
    resetOffsets()
    return
  }

  lastScrollY.value = window.scrollY
}

function addMediaQueryListener() {
  if (!mediaQuery) return

  const handler = (event: MediaQueryListEvent) => setIsMobile(event.matches)
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handler)
  } else {
    mediaQuery.addListener(handler)
  }

  return () => {
    if (mediaQuery?.removeEventListener) {
      mediaQuery.removeEventListener('change', handler)
    } else {
      mediaQuery?.removeListener(handler)
    }
  }
}

onMounted(async () => {
  initTheme()
  await fetchSession()
  mediaQuery = window.matchMedia('(max-width: 767px)')
  removeMediaQueryListener = addMediaQueryListener()
  setIsMobile(mediaQuery.matches)

  window.addEventListener('scroll', onScroll, { passive: true })

  if (!isAuthenticated.value) {
    router.push('/login')
    return
  }

  fetchConnectionStatus()
})

watch(isAuthenticated, (value) => {
  if (!value && !isLoading.value) {
    router.push('/login')
  }
})

onBeforeUnmount(() => {
  if (scrollFrame) {
    cancelAnimationFrame(scrollFrame)
    scrollFrame = 0
  }
  removeMediaQueryListener?.()
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <div v-if="isLoading" class="flex h-screen items-center justify-center">
    <UiSpinner size="lg" />
  </div>

  <div v-else-if="isAuthenticated" class="min-h-screen flex flex-col">
    <LayoutHeader :style="headerTransformStyle" />
    <LayoutGlobalCommandPalette />

    <main class="flex-1 p-4 pb-28 md:p-6 md:pb-8">
      <slot />
    </main>

    <LayoutBottomNav :style="bottomNavTransformStyle" />

    <!-- PWA Status Components -->
    <PWAStatus />
  </div>
</template>
