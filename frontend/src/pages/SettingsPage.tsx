// Settings page for global configuration
import { useState } from 'react'
import { useApp } from '@/contexts/AppContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Sun, Moon, Monitor, Check } from 'lucide-react'

export default function SettingsPage() {
  const { t, language, setLanguage, theme, setTheme, settings, updateSettings } = useApp()
  const [localSettings, setLocalSettings] = useState(settings)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    updateSettings(localSettings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleReset = () => {
    const defaults = {
      defaultOutputPath: '/output',
      enableGPU: true,
      maxConcurrentTasks: 3,
    }
    setLocalSettings(defaults)
    updateSettings(defaults)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <h1 className="text-2xl font-bold">{t.settings.title}</h1>
        <p className="text-sm text-muted-foreground">
          {t.settings.subtitle}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{t.settings.general}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Language */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t.settings.language}
                </label>
                <div className="flex gap-2">
                  <Button
                    variant={language === 'zh' ? 'default' : 'outline'}
                    onClick={() => setLanguage('zh')}
                    className="flex-1"
                  >
                    {language === 'zh' && <Check className="w-4 h-4 mr-2" />}
                    中文
                  </Button>
                  <Button
                    variant={language === 'en' ? 'default' : 'outline'}
                    onClick={() => setLanguage('en')}
                    className="flex-1"
                  >
                    {language === 'en' && <Check className="w-4 h-4 mr-2" />}
                    English
                  </Button>
                </div>
              </div>

              {/* Theme */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t.settings.theme}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={theme === 'light' ? 'default' : 'outline'}
                    onClick={() => setTheme('light')}
                    className="flex flex-col items-center justify-center h-20"
                  >
                    <Sun className="w-6 h-6 mb-1" />
                    <span className="text-xs">{t.settings.themeOptions.light}</span>
                  </Button>
                  <Button
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    onClick={() => setTheme('dark')}
                    className="flex flex-col items-center justify-center h-20"
                  >
                    <Moon className="w-6 h-6 mb-1" />
                    <span className="text-xs">{t.settings.themeOptions.dark}</span>
                  </Button>
                  <Button
                    variant={theme === 'system' ? 'default' : 'outline'}
                    onClick={() => setTheme('system')}
                    className="flex flex-col items-center justify-center h-20"
                  >
                    <Monitor className="w-6 h-6 mb-1" />
                    <span className="text-xs">{t.settings.themeOptions.system}</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transcoding Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{t.settings.transcoding}</CardTitle>
              <CardDescription>
                Configure default transcoding behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Default Output Path */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t.settings.defaultOutputPath}
                </label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-md bg-background"
                  value={localSettings.defaultOutputPath}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, defaultOutputPath: e.target.value })
                  }
                  placeholder="/output"
                />
              </div>

              {/* Enable GPU */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">
                    {t.settings.enableGPU}
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use GPU acceleration when available
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "text-sm font-medium transition-colors",
                    localSettings.enableGPU ? "text-primary" : "text-muted-foreground"
                  )}>
                    {localSettings.enableGPU ? 'ON' : 'OFF'}
                  </span>
                  <Switch
                    checked={localSettings.enableGPU}
                    onCheckedChange={(checked) =>
                      setLocalSettings({ ...localSettings, enableGPU: checked })
                    }
                  />
                </div>
              </div>

              {/* Max Concurrent Tasks */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t.settings.maxConcurrentTasks}
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={localSettings.maxConcurrentTasks}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        maxConcurrentTasks: parseInt(e.target.value),
                      })
                    }
                    className="flex-1"
                  />
                  <span className="text-sm font-medium w-8 text-center">
                    {localSettings.maxConcurrentTasks}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Number of videos to transcode simultaneously
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={handleSave} className="flex-1">
              {saved ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {t.settings.saved}
                </>
              ) : (
                t.settings.save
              )}
            </Button>
            <Button variant="outline" onClick={handleReset}>
              {t.settings.reset}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
