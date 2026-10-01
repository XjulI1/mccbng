import { ref, readonly, onMounted } from 'vue'

export type Theme = 'light' | 'dark' | 'system'

const currentTheme = ref<Theme>('system')
const isDark = ref<boolean>(false)

export function useTheme () {
  // Détecte le thème système
  const getSystemTheme = (): boolean => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  // Applique le thème au document
  const applyTheme = (theme: Theme) => {
    const systemIsDark = getSystemTheme()

    if (theme === 'system') {
      isDark.value = systemIsDark
    } else {
      isDark.value = theme === 'dark'
    }

    // Applique la classe ou l'attribut data sur le document
    document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark-theme', isDark.value)
  }

  // Change le thème
  const setTheme = (theme: Theme) => {
    currentTheme.value = theme
    localStorage.setItem('theme', theme)
    applyTheme(theme)
  }

  // Initialise le thème depuis le localStorage ou système
  const initTheme = () => {
    const savedTheme = localStorage.getItem('theme') as Theme

    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      currentTheme.value = savedTheme
    } else {
      currentTheme.value = 'system'
    }

    applyTheme(currentTheme.value)
  }

  // Écoute les changements du thème système
  const setupSystemThemeListener = () => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleSystemThemeChange = () => {
      if (currentTheme.value === 'system') {
        applyTheme('system')
      }
    }

    // Utilise addEventListener pour une meilleure compatibilité
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange)
    } else {
      // Fallback pour les navigateurs plus anciens
      mediaQuery.addListener(handleSystemThemeChange)
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemThemeChange)
      } else {
        mediaQuery.removeListener(handleSystemThemeChange)
      }
    }
  }

  // Cycle entre les thèmes (utile pour un bouton toggle)
  const toggleTheme = () => {
    const themes: Theme[] = ['light', 'dark', 'system']
    const currentIndex = themes.indexOf(currentTheme.value)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }

  // Auto-initialisation lors du montage
  onMounted(() => {
    initTheme()
    setupSystemThemeListener()
  })

  return {
    currentTheme: readonly(currentTheme),
    isDark: readonly(isDark),
    setTheme,
    toggleTheme,
    initTheme,
    getSystemTheme
  }
}

// Singleton pattern pour partager l'état entre composants
let themeInstance: ReturnType<typeof useTheme> | null = null

export function useGlobalTheme () {
  if (!themeInstance) {
    themeInstance = useTheme()
  }
  return themeInstance
}
