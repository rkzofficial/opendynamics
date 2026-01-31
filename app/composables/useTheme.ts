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
