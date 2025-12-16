// Sidebar with navigation and theme/language controls
import { Link, useLocation } from 'react-router-dom'
import { FileVideo, ListChecks, Home, History, Settings, Sun, Moon, Monitor, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApp } from '@/contexts/AppContext'
import { Select } from '@/components/ui/select'

interface SidebarProps {
  collapsed?: boolean
  onToggle?: () => void
}

export default function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const location = useLocation()
  const { t, language, setLanguage, theme, setTheme } = useApp()

  const navItems = [
    {
      title: t.nav.home,
      href: '/',
      icon: Home,
    },
    {
      title: t.nav.transcode,
      href: '/transcode',
      icon: FileVideo,
    },
    {
      title: t.nav.tasks,
      href: '/tasks',
      icon: ListChecks,
    },
    {
      title: t.nav.history,
      href: '/history',
      icon: History,
    },
    {
      title: t.nav.presets,
      href: '/presets',
      icon: Sparkles,
    },
    {
      title: t.nav.settings,
      href: '/settings',
      icon: Settings,
    },
  ]

  const themeIcons = {
    light: Sun,
    dark: Moon,
    system: Monitor,
  }

  return (
    <div className={cn(
      "relative flex h-full flex-col border-r bg-background transition-all duration-300",
      collapsed ? "w-16" : "w-56"
    )}>
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-4">
        <FileVideo className={cn("h-5 w-5 flex-shrink-0", !collapsed && "mr-2")} />
        {!collapsed && <span className="text-lg font-bold">FFForge</span>}
      </div>

      {/* Collapse Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-md hover:bg-accent transition-colors"
        title={collapsed ? t.nav.expand : t.nav.collapse}
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.href
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                collapsed ? 'justify-center' : 'gap-2',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
              title={collapsed ? item.title : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && item.title}
            </Link>
          )
        })}
      </nav>

      {/* Footer with theme and language controls */}
      <div className="border-t p-3 space-y-2.5">
        {!collapsed ? (
          <>
            {/* Language Selection */}
            <div>
              <label className="block text-[10px] font-medium text-muted-foreground mb-1">
                {t.settings.language}
              </label>
              <Select
                value={language}
                onChange={(val) => setLanguage(val as 'en' | 'zh')}
                options={[
                  { value: 'zh', label: '中文' },
                  { value: 'en', label: 'English' },
                ]}
              />
            </div>

            {/* Theme Selection */}
            <div>
              <label className="block text-[10px] font-medium text-muted-foreground mb-1">
                {t.settings.theme}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['light', 'dark', 'system'] as const).map((themeOption) => {
                  const Icon = themeIcons[themeOption]
                  return (
                    <button
                      key={themeOption}
                      onClick={() => setTheme(themeOption)}
                      className={cn(
                        'flex flex-col items-center justify-center py-2 rounded-md transition-colors text-xs',
                        theme === themeOption
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-accent'
                      )}
                      title={t.settings.themeOptions[themeOption]}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="pt-2 border-t">
              <p className="text-[10px] text-muted-foreground text-center">
                v1.0.0 · GPL v3
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Collapsed state - icon-only theme toggles */}
            <div className="flex flex-col gap-2">
              {(['light', 'dark', 'system'] as const).map((themeOption) => {
                const Icon = themeIcons[themeOption]
                return (
                  <button
                    key={themeOption}
                    onClick={() => setTheme(themeOption)}
                    className={cn(
                      'flex items-center justify-center p-2 rounded-md transition-colors',
                      theme === themeOption
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-accent'
                    )}
                    title={t.settings.themeOptions[themeOption]}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
