// Settings page for global configuration
import { useState, useEffect } from 'react'
import { useApp } from '@/contexts/AppContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Select } from '@/components/ui/select'
import { Sun, Moon, Monitor, Check, Languages, Palette, Settings2, FolderOpen, Zap, RotateCcw, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Settings as SettingsType, FilePermissionMode } from '@/types'
import { api } from '@/lib/api'

export default function SettingsPage() {
  const { t, language, setLanguage, theme, setTheme } = useApp()
  const [localSettings, setLocalSettings] = useState<Partial<SettingsType>>({})
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  // Load settings from API
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const data = await api.getSettings()
      setLocalSettings(data)
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      await api.updateSettings(localSettings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  const handleReset = async () => {
    const defaults: Partial<SettingsType> = {
      defaultOutputPath: '/output',
      enableGPU: true,
      maxConcurrentTasks: 3,
      ffmpegPath: 'ffmpeg',
      ffprobePath: 'ffprobe',
      filePermissionMode: 'same_as_source',
      filePermissionUid: 0,
      filePermissionGid: 0,
    }
    setLocalSettings(defaults)
    try {
      await api.updateSettings(defaults)
    } catch (error) {
      console.error('Failed to reset settings:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-muted-foreground">{t.common.loading}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.settings.title}</h1>
        <p className="text-muted-foreground mt-1.5">
          {t.settings.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Appearance Settings */}
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Palette className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle>{t.settings.general}</CardTitle>
                  <CardDescription className="mt-1">Customize your interface preferences</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Language */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Languages className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">{t.settings.language}</Label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={language === 'zh' ? 'default' : 'outline'}
                    onClick={() => setLanguage('zh')}
                    className="justify-start h-auto py-3"
                  >
                    <div className="flex items-center gap-2">
                      {language === 'zh' && <Check className="h-4 w-4" />}
                      <div className="text-left">
                        <div className="font-medium">中文</div>
                        <div className="text-xs opacity-70">Chinese</div>
                      </div>
                    </div>
                  </Button>
                  <Button
                    variant={language === 'en' ? 'default' : 'outline'}
                    onClick={() => setLanguage('en')}
                    className="justify-start h-auto py-3"
                  >
                    <div className="flex items-center gap-2">
                      {language === 'en' && <Check className="h-4 w-4" />}
                      <div className="text-left">
                        <div className="font-medium">English</div>
                        <div className="text-xs opacity-70">英语</div>
                      </div>
                    </div>
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Theme */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">{t.settings.theme}</Label>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    variant={theme === 'light' ? 'default' : 'outline'}
                    onClick={() => setTheme('light')}
                    className="flex flex-col items-center justify-center h-24 gap-2"
                  >
                    <Sun className="h-6 w-6" />
                    <span className="text-xs font-medium">{t.settings.themeOptions.light}</span>
                  </Button>
                  <Button
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    onClick={() => setTheme('dark')}
                    className="flex flex-col items-center justify-center h-24 gap-2"
                  >
                    <Moon className="h-6 w-6" />
                    <span className="text-xs font-medium">{t.settings.themeOptions.dark}</span>
                  </Button>
                  <Button
                    variant={theme === 'system' ? 'default' : 'outline'}
                    onClick={() => setTheme('system')}
                    className="flex flex-col items-center justify-center h-24 gap-2"
                  >
                    <Monitor className="h-6 w-6" />
                    <span className="text-xs font-medium">{t.settings.themeOptions.system}</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transcoding Settings */}
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Settings2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle>{t.settings.transcoding}</CardTitle>
                  <CardDescription className="mt-1">Configure default transcoding behavior</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Paths Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">{t.settings.paths}</Label>
                </div>
                
                {/* Default Output Path */}
                <div className="space-y-2 pl-6">
                  <Label htmlFor="output-path" className="text-xs">
                    {t.settings.defaultOutputPath}
                  </Label>
                  <Input
                    id="output-path"
                    type="text"
                    value={localSettings.defaultOutputPath || ''}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, defaultOutputPath: e.target.value })
                    }
                    placeholder="/output"
                    className="font-mono text-sm"
                  />
                </div>

                {/* FFmpeg Path */}
                <div className="space-y-2 pl-6">
                  <Label htmlFor="ffmpeg-path" className="text-xs">
                    {t.settings.ffmpegPath}
                  </Label>
                  <Input
                    id="ffmpeg-path"
                    type="text"
                    value={localSettings.ffmpegPath || ''}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, ffmpegPath: e.target.value })
                    }
                    placeholder={t.settings.pathPlaceholder}
                    className="font-mono text-sm"
                  />
                </div>

                {/* FFprobe Path */}
                <div className="space-y-2 pl-6">
                  <Label htmlFor="ffprobe-path" className="text-xs">
                    {t.settings.ffprobePath}
                  </Label>
                  <Input
                    id="ffprobe-path"
                    type="text"
                    value={localSettings.ffprobePath || ''}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, ffprobePath: e.target.value })
                    }
                    placeholder={t.settings.pathPlaceholder}
                    className="font-mono text-sm"
                  />
                </div>
              </div>

              <Separator />

              {/* File Permissions Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">{t.settings.filePermissions}</Label>
                </div>
                
                {/* Permission Mode */}
                <div className="space-y-2 pl-6">
                  <Label htmlFor="permission-mode" className="text-xs">
                    {t.settings.filePermissionMode}
                  </Label>
                  <Select
                    value={localSettings.filePermissionMode || 'same_as_source'}
                    onChange={(value: string) =>
                      setLocalSettings({ ...localSettings, filePermissionMode: value as FilePermissionMode })
                    }
                    options={[
                      {
                        value: 'same_as_source',
                        label: t.settings.filePermissionModes.sameAsSource,
                      },
                      {
                        value: 'specify',
                        label: t.settings.filePermissionModes.specify,
                      },
                      {
                        value: 'no_action',
                        label: t.settings.filePermissionModes.noAction,
                      },
                    ]}
                    placeholder={t.settings.filePermissionMode}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {localSettings.filePermissionMode === 'same_as_source' && t.settings.filePermissionModeDesc.sameAsSource}
                    {localSettings.filePermissionMode === 'specify' && t.settings.filePermissionModeDesc.specify}
                    {localSettings.filePermissionMode === 'no_action' && t.settings.filePermissionModeDesc.noAction}
                  </p>
                </div>

                {/* UID/GID inputs - only show when mode is 'specify' */}
                {localSettings.filePermissionMode === 'specify' && (
                  <div className="space-y-3 pl-6">
                    <div className="space-y-2">
                      <Label htmlFor="permission-uid" className="text-xs">
                        {t.settings.filePermissionUid}
                      </Label>
                      <Input
                        id="permission-uid"
                        type="number"
                        min="0"
                        value={localSettings.filePermissionUid ?? 0}
                        onChange={(e) =>
                          setLocalSettings({ 
                            ...localSettings, 
                            filePermissionUid: parseInt(e.target.value) || 0 
                          })
                        }
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="permission-gid" className="text-xs">
                        {t.settings.filePermissionGid}
                      </Label>
                      <Input
                        id="permission-gid"
                        type="number"
                        min="0"
                        value={localSettings.filePermissionGid ?? 0}
                        onChange={(e) =>
                          setLocalSettings({ 
                            ...localSettings, 
                            filePermissionGid: parseInt(e.target.value) || 0 
                          })
                        }
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Enable GPU */}
              <div className="flex items-center justify-between space-x-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">
                      {t.settings.enableGPU}
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use GPU acceleration when available
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "text-xs font-medium px-2 py-1 rounded-md transition-colors",
                    localSettings.enableGPU 
                      ? "bg-primary/10 text-primary" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    {localSettings.enableGPU ? 'ON' : 'OFF'}
                  </div>
                  <Switch
                    checked={localSettings.enableGPU || false}
                    onCheckedChange={(checked) =>
                      setLocalSettings({ ...localSettings, enableGPU: checked })
                    }
                  />
                </div>
              </div>

              <Separator />

              {/* Max Concurrent Tasks */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">
                    {t.settings.maxConcurrentTasks}
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-primary">
                      {localSettings.maxConcurrentTasks || 3}
                    </span>
                    <span className="text-sm text-muted-foreground">tasks</span>
                  </div>
                </div>
                <Slider
                  min={1}
                  max={10}
                  value={localSettings.maxConcurrentTasks || 3}
                  onChange={(val) =>
                    setLocalSettings({
                      ...localSettings,
                      maxConcurrentTasks: val,
                    })
                  }
                  className="py-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1 task</span>
                  <span>10 tasks</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Number of videos to transcode simultaneously
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Actions & Info */}
        <div className="space-y-6">
          {/* Actions Card */}
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={handleSave} 
                className="w-full gap-2" 
                size="lg"
                disabled={saved}
              >
                {saved ? (
                  <>
                    <Check className="h-4 w-4" />
                    {t.settings.saved}
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    {t.settings.save}
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleReset}
                className="w-full gap-2"
                size="lg"
              >
                <RotateCcw className="h-4 w-4" />
                {t.settings.reset}
              </Button>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Settings Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span className="font-medium">v1.0.0</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Language</span>
                <span className="font-medium">{language === 'zh' ? '中文' : 'English'}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Theme</span>
                <span className="font-medium capitalize">{theme}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
