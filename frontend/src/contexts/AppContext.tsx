// App context for global state management (theme, language, settings)
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { translations, Language } from '@/i18n/translations'

type Theme = 'light' | 'dark' | 'system'

interface AppSettings {
  defaultOutputPath: string
  enableGPU: boolean
  maxConcurrentTasks: number
  ffmpegPath?: string
  ffprobePath?: string
}

interface AppContextType {
  // Language
  language: Language
  setLanguage: (lang: Language) => void
  t: typeof translations.en
  
  // Theme
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
  
  // Settings
  settings: AppSettings
  updateSettings: (settings: Partial<AppSettings>) => void
  
  // File Browser State
  fileBrowserPath: string
  setFileBrowserPath: (path: string) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

const DEFAULT_SETTINGS: AppSettings = {
  defaultOutputPath: '/output',
  enableGPU: true,
  maxConcurrentTasks: 3,
}

export function AppProvider({ children }: { children: ReactNode }) {
  // Load saved preferences from localStorage
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language')
    return (saved === 'en' || saved === 'zh' ? saved : 'zh') as Language
  })
  
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme')
    return (saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system') as Theme
  })
  
  const [settings, setSettingsState] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('settings')
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS
  })
  
  // File browser current path state
  const [fileBrowserPath, setFileBrowserPathState] = useState<string>(() => {
    const saved = sessionStorage.getItem('fileBrowserPath')
    return saved || ''
  })
  
  // Save file browser path to sessionStorage
  const setFileBrowserPath = (path: string) => {
    setFileBrowserPathState(path)
    sessionStorage.setItem('fileBrowserPath', path)
  }
  
  // Get system theme preference
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  
  // Resolved theme (actual theme to use)
  const resolvedTheme = theme === 'system' ? systemTheme : theme
  
  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }
    
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])
  
  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(resolvedTheme)
  }, [resolvedTheme])
  
  // Save language preference
  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('language', lang)
  }
  
  // Save theme preference
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
  }
  
  // Save settings
  const updateSettings = (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings }
    setSettingsState(updated)
    localStorage.setItem('settings', JSON.stringify(updated))
  }
  
  // Get translations for current language
  const t = translations[language] as typeof translations.en
  
  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        t,
        theme,
        setTheme,
        resolvedTheme,
        settings,
        updateSettings,
        fileBrowserPath,
        setFileBrowserPath,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within AppProvider')
  }
  return context
}

