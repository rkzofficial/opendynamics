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

  function updateThemeColor(isDark: boolean) {
    // Colors from main.css - background colors
    // Light mode: hsl(0 0% 100%) = #ffffff (white)
    // Dark mode: hsl(0 0% 7%) = #121212 (dark gray)
    const themeColor = isDark ? '#121212' : '#ffffff'

    let metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta')
      metaThemeColor.setAttribute('name', 'theme-color')
      document.head.appendChild(metaThemeColor)
    }
    metaThemeColor.setAttribute('content', themeColor)
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
