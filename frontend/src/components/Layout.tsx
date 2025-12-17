import { ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { Languages, Sun, Moon, Monitor, Github } from 'lucide-react'
import { AppSidebar } from './app-sidebar'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useApp } from '@/contexts/AppContext'

interface LayoutProps {
  children?: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { t, setLanguage, theme, setTheme } = useApp()

  const themeIcons = {
    light: Sun,
    dark: Moon,
    system: Monitor,
  }

  const ThemeIcon = themeIcons[theme]

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 sticky top-0 z-10 px-6 rounded-t-xl">
          <SidebarTrigger className="-ml-1" />
          
          <div className="flex items-center gap-2">
            {/* GitHub Link */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9"
              asChild
            >
              <a 
                href="https://github.com/ChanningHe/ffforge" 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="GitHub Repository"
              >
                <Github className="h-4 w-4" />
              </a>
            </Button>

            {/* Language Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Languages className="h-4 w-4" />
                  <span className="sr-only">{t.settings.language}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLanguage('zh')}>
                  <span>中文</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('en')}>
                  <span>English</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <ThemeIcon className="h-4 w-4" />
                  <span className="sr-only">{t.settings.theme}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme('light')}>
                  <Sun className="mr-2 h-4 w-4" />
                  <span>{t.settings.themeOptions.light}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')}>
                  <Moon className="mr-2 h-4 w-4" />
                  <span>{t.settings.themeOptions.dark}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')}>
                  <Monitor className="mr-2 h-4 w-4" />
                  <span>{t.settings.themeOptions.system}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <div className="flex flex-1 flex-col p-6 overflow-auto">
          {children || <Outlet />}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}




