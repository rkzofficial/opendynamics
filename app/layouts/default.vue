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
let scrollFrame = 0

const headerTransformStyle = computed(() => ({
  transform: `translateY(-${headerHiddenOffset.value}px)`,
  willChange: 'transform',
}))

const bottomNavTransformStyle = computed(() => ({
  transform: `translateY(${bottomHiddenOffset.value}px)`,
  willChange: 'transform',
}))

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function applyScrollDelta(delta: number) {
  headerHiddenOffset.value = clamp(headerHiddenOffset.value + delta, 0, HEADER_HEIGHT)
  bottomHiddenOffset.value = clamp(bottomHiddenOffset.value + delta, 0, BOTTOM_NAV_HEIGHT)
}

function handleScrollFrame() {
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
  if (scrollFrame) return
  scrollFrame = requestAnimationFrame(handleScrollFrame)
}

onMounted(async () => {
  initTheme()
  await fetchSession()
  lastScrollY.value = window.scrollY
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
