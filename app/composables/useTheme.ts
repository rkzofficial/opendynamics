export type Theme = 'light' | 'dark' | 'system'

export function useTheme() {
  const theme = ref<Theme>('system')
  const resolvedTheme = computed(() => {
    if (theme.value === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return theme.value
  })

  const isDark = computed(() => resolvedTheme.value === 'dark')

  function setTheme(newTheme: Theme) {
    theme.value = newTheme
    localStorage.setItem('theme', newTheme)
    applyTheme()
  }

  function toggleTheme() {
    setTheme(isDark.value ? 'light' : 'dark')
  }

  function applyTheme() {
    const html = document.documentElement
    const isCurrentlyDark = resolvedTheme.value === 'dark'

    if (isCurrentlyDark) {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }

    // Update theme-color meta tag for PWA status bar
    updateThemeColor(isCurrentlyDark)
  }

  function ensureMetaTag(name: string) {
    let meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', name)
      document.head.appendChild(meta)
    }
    return meta
  }

  function getSurfaceColor(isDark: boolean) {
    const backgroundValue = getComputedStyle(document.documentElement)
      .getPropertyValue('--background')
      .trim()

    if (backgroundValue) {
      if (backgroundValue.includes('(') || backgroundValue.startsWith('#')) {
        return backgroundValue
      }
      return `hsl(${backgroundValue})`
    }

    return isDark ? '#121212' : '#ffffff'
  }

  function updateThemeColor(isDark: boolean) {
    const themeColor = getSurfaceColor(isDark)
    const metaTags = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')

    if (metaTags.length === 0) {
      const metaThemeColor = ensureMetaTag('theme-color')
      metaThemeColor.setAttribute('content', themeColor)
    } else {
      metaTags.forEach((meta) => meta.setAttribute('content', themeColor))
    }

    ensureMetaTag('apple-mobile-web-app-capable').setAttribute('content', 'yes')
    ensureMetaTag('apple-mobile-web-app-status-bar-style').setAttribute('content', isDark ? 'black' : 'default')
  }

  function initTheme() {
    const saved = localStorage.getItem('theme') as Theme | null
    if (saved) {
      theme.value = saved
    }
    applyTheme()

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', () => {
      if (theme.value === 'system') {
        applyTheme()
      }
    })
  }

  return {
    theme,
    resolvedTheme,
    isDark,
    setTheme,
    toggleTheme,
    initTheme,
  }
}
