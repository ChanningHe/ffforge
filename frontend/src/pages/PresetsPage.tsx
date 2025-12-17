// Preset management page - left sidebar with list, right panel with editor
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast'
import { useApp } from '@/contexts/AppContext'
import { Sparkles, Plus, Trash2, Download, Upload, Save, X } from 'lucide-react'
import type { Preset, TranscodeConfig } from '@/types'
import ConfigPanel from '@/components/ConfigPanel'

const DEFAULT_CONFIG: TranscodeConfig = {
  mode: 'simple',
  encoder: 'h265',
  hardwareAccel: 'cpu',
  video: {
    crf: 23,
    preset: 'medium',
    resolution: 'original',
    fps: 'original',
  },
  audio: {
    codec: 'copy',
    bitrate: '192k',
    channels: 2,
  },
  output: {
    container: 'mp4',
    suffix: '_transcoded',
    pathType: 'default',
    customPath: '',
  },
  extraParams: '',
  customCommand: '',
}

export default function PresetsPage() {
  const { t, language } = useApp()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null)
  const [editMode, setEditMode] = useState<'create' | 'edit' | 'view'>('view')
  const [presetName, setPresetName] = useState('')
  const [presetDescription, setPresetDescription] = useState('')
  const [presetConfig, setPresetConfig] = useState<TranscodeConfig>(DEFAULT_CONFIG)
  const [configResetTrigger, setConfigResetTrigger] = useState(0)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [presetToDelete, setPresetToDelete] = useState<Preset | null>(null)
  const [commandPreview, setCommandPreview] = useState<string>('')
  
  // Track original values to detect changes
  const [originalName, setOriginalName] = useState('')
  const [originalDescription, setOriginalDescription] = useState('')
  const [originalConfig, setOriginalConfig] = useState<TranscodeConfig>(DEFAULT_CONFIG)

  // Fetch presets
  const { data: presets, isLoading } = useQuery({
    queryKey: ['presets'],
    queryFn: () => api.getPresets(),
  })

  const selectedPreset = presets?.find(p => p.id === selectedPresetId)

  // Auto-select first preset on load
  useEffect(() => {
    if (presets && presets.length > 0 && !selectedPresetId && editMode === 'view') {
      setSelectedPresetId(presets[0].id)
    }
  }, [presets, selectedPresetId, editMode])

  // Load selected preset data when switching presets
  useEffect(() => {
    if (selectedPreset) {
      setPresetName(selectedPreset.name)
      setPresetDescription(selectedPreset.description || '')
      setPresetConfig(selectedPreset.config)
      setConfigResetTrigger(prev => prev + 1) // Trigger config reset
      
      // Store original values for change detection
      setOriginalName(selectedPreset.name)
      setOriginalDescription(selectedPreset.description || '')
      setOriginalConfig(selectedPreset.config)
    }
  }, [selectedPresetId]) // Only depend on selectedPresetId

  // Generate command preview
  useEffect(() => {
    generateCommandPreview(presetConfig)
  }, [presetConfig])

  const generateCommandPreview = (config: TranscodeConfig) => {
    const inputFile = 'input.mp4'
    const outputFile = `output${config.output.suffix}.${config.output.container}`
    
    if (config.mode === 'advanced' && config.customCommand) {
      // Advanced mode: replace [[INPUT]] and [[OUTPUT]] placeholders
      let customCmd = config.customCommand.trim()
      customCmd = customCmd.replace(/\[\[INPUT\]\]/g, inputFile)
      customCmd = customCmd.replace(/\[\[OUTPUT\]\]/g, outputFile)
      setCommandPreview(`ffmpeg ${customCmd}`)
      return
    }

    const parts: string[] = ['ffmpeg']

    // IMPORTANT: Hardware acceleration flags must come BEFORE -i input file
    if (config.hardwareAccel === 'nvidia') {
      parts.push('-hwaccel', 'cuda', '-hwaccel_output_format', 'cuda')
    } else if (config.hardwareAccel === 'intel') {
      parts.push('-hwaccel', 'qsv', '-hwaccel_output_format', 'qsv')
    } else if (config.hardwareAccel === 'amd') {
      // AMD AMF typically doesn't need input hardware acceleration
    }

    // Add input file
    parts.push('-i', inputFile)

    // Video codec
    let videoCodec: string
    if (config.hardwareAccel === 'nvidia') {
      videoCodec = config.encoder === 'h265' ? 'hevc_nvenc' : 'av1_nvenc'
    } else if (config.hardwareAccel === 'intel') {
      videoCodec = config.encoder === 'h265' ? 'hevc_qsv' : 'av1_qsv'
    } else if (config.hardwareAccel === 'amd') {
      videoCodec = config.encoder === 'h265' ? 'hevc_amf' : 'av1_amf'
    } else {
      videoCodec = config.encoder === 'h265' ? 'libx265' : 'libsvtav1'
    }
    parts.push('-c:v', videoCodec)

    // Encoding preset
    if (config.video.preset) {
      if (config.hardwareAccel === 'amd') {
        parts.push('-quality', config.video.preset)
      } else {
        parts.push('-preset', config.video.preset)
      }
    }

    // CRF/Quality
    if (config.video.crf !== undefined) {
      if (config.hardwareAccel === 'nvidia') {
        parts.push('-cq', config.video.crf.toString())
      } else if (config.hardwareAccel === 'intel') {
        parts.push('-global_quality', config.video.crf.toString())
      } else if (config.hardwareAccel === 'amd') {
        parts.push('-qp_i', config.video.crf.toString())
      } else {
        parts.push('-crf', config.video.crf.toString())
      }
    }

    // Audio
    if (config.audio.codec === 'copy') {
      parts.push('-c:a', 'copy')
    } else {
      parts.push('-c:a', config.audio.codec)
      if (config.audio.bitrate) {
        parts.push('-b:a', config.audio.bitrate)
      }
    }

    // Extra params
    if (config.extraParams) {
      parts.push(config.extraParams)
    }

    // Output
    parts.push(outputFile)

    setCommandPreview(parts.join(' '))
  }

  // Create preset mutation
  const createMutation = useMutation({
    mutationFn: (data: { name: string; description: string; config: TranscodeConfig }) =>
      api.createPreset(data.name, data.description, data.config),
    onSuccess: (newPreset) => {
      queryClient.invalidateQueries({ queryKey: ['presets'] })
      setSelectedPresetId(newPreset.id)
      setEditMode('view')
      showToast(t.presets.createSuccess, 'success')
    },
    onError: () => {
      showToast(t.common.error, 'error')
    },
  })

  // Update preset mutation
  const updateMutation = useMutation({
    mutationFn: (data: { id: string; name: string; description: string; config: TranscodeConfig }) =>
      api.updatePreset(data.id, data.name, data.description, data.config),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['presets'] })
      setEditMode('view')
      // Update original values after successful save
      setOriginalName(variables.name)
      setOriginalDescription(variables.description)
      setOriginalConfig(variables.config)
      showToast(t.presets.updateSuccess, 'success')
    },
    onError: () => {
      showToast(t.common.error, 'error')
    },
  })

  // Delete preset mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deletePreset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presets'] })
      // Select another preset after deletion
      const remainingPresets = presets?.filter(p => p.id !== presetToDelete?.id)
      if (remainingPresets && remainingPresets.length > 0) {
        setSelectedPresetId(remainingPresets[0].id)
      } else {
        setSelectedPresetId(null)
      }
      showToast(t.presets.deleteSuccess, 'success')
    },
    onError: () => {
      showToast(t.common.error, 'error')
    },
  })

  const handleCreateNew = () => {
    setEditMode('create')
    setSelectedPresetId(null)
    setPresetName('')
    setPresetDescription('')
    const newConfig = { ...DEFAULT_CONFIG }
    setPresetConfig(newConfig)
    setConfigResetTrigger(prev => prev + 1)
    setOriginalName('')
    setOriginalDescription('')
    setOriginalConfig(DEFAULT_CONFIG)
  }

  const handleSave = () => {
    if (!presetName.trim()) {
      showToast('Please enter a preset name', 'warning')
      return
    }

    if (editMode === 'create') {
      createMutation.mutate({
        name: presetName,
        description: presetDescription,
        config: presetConfig,
      })
    } else if ((editMode === 'edit' || editMode === 'view') && selectedPresetId) {
      updateMutation.mutate({
        id: selectedPresetId,
        name: presetName,
        description: presetDescription,
        config: presetConfig,
      })
    }
  }

  const handleCancel = () => {
    if (selectedPreset) {
      setEditMode('view')
      // Restore original values
      setPresetName(originalName)
      setPresetDescription(originalDescription)
      setPresetConfig(originalConfig)
      setConfigResetTrigger(prev => prev + 1)
    } else {
      setEditMode('view')
      if (presets && presets.length > 0) {
        setSelectedPresetId(presets[0].id)
      }
    }
  }

  const handleDeleteClick = (preset: Preset) => {
    if (preset.isBuiltin) {
      showToast('Cannot delete built-in presets', 'warning')
      return
    }
    setPresetToDelete(preset)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (presetToDelete) {
      deleteMutation.mutate(presetToDelete.id)
      setPresetToDelete(null)
    }
  }

  const handleExport = (presetIds?: string[]) => {
    const presetsToExport = presetIds
      ? presets?.filter(p => presetIds.includes(p.id))
      : presets

    if (!presetsToExport || presetsToExport.length === 0) {
      showToast('No presets to export', 'warning')
      return
    }

    const dataStr = JSON.stringify(presetsToExport, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
    const exportFileDefaultName = `presets_${new Date().toISOString().split('T')[0]}.json`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
    
    showToast(t.presets.exportSuccess, 'success')
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const importedPresets = JSON.parse(text) as Preset[]
        
        if (!Array.isArray(importedPresets)) {
          throw new Error('Invalid preset format')
        }

        // Create each imported preset
        for (const preset of importedPresets) {
          await api.createPreset(preset.name, preset.description || '', preset.config)
        }

        queryClient.invalidateQueries({ queryKey: ['presets'] })
        showToast(t.presets.importSuccess, 'success')
      } catch (error) {
        console.error('Import error:', error)
        showToast(t.presets.importError, 'error')
      }
    }

    input.click()
  }

  const [switchConfirmOpen, setSwitchConfirmOpen] = useState(false)
  const [pendingPresetId, setPendingPresetId] = useState<string | null>(null)

  const handleSelectPreset = (presetId: string) => {
    if (editMode !== 'view') {
      // If in edit mode, confirm before switching
      setPendingPresetId(presetId)
      setSwitchConfirmOpen(true)
      return
    }
    setSelectedPresetId(presetId)
    setEditMode('view')
  }

  const handleConfirmSwitch = () => {
    if (pendingPresetId) {
      setSelectedPresetId(pendingPresetId)
      setEditMode('view')
      setPendingPresetId(null)
    }
  }

  const isEditing = editMode === 'create' || editMode === 'edit'
  
  // Check if there are any unsaved changes
  const hasChanges = editMode === 'view' && selectedPreset && !selectedPreset.isBuiltin && (
    presetName !== originalName ||
    presetDescription !== originalDescription ||
    JSON.stringify(presetConfig) !== JSON.stringify(originalConfig)
  )

  return (
    <div className="flex flex-1 flex-col">
      <div className="page-header">
        <h1>{t.presets.title}</h1>
        <p>{t.presets.subtitle}</p>
      </div>

      <div className="flex-1 flex overflow-hidden rounded-lg border bg-card shadow-sm">
        {/* Left Sidebar - Presets List */}
        <div className="w-80 border-r bg-card flex flex-col">
          {/* Header */}
          <div className="p-4 border-b">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5" />
              <h2 className="text-lg font-bold">{language === 'zh' ? '预设列表' : 'Preset List'}</h2>
            </div>
          
          {/* Actions */}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreateNew} className="flex-1">
              <Plus className="h-4 w-4 mr-1" />
              {t.common.create}
            </Button>
            <Button size="sm" variant="outline" onClick={handleImport}>
              <Upload className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleExport()}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Presets List */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {t.common.loading}
            </div>
          ) : !presets || presets.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {t.presets.noPresets}
            </div>
          ) : (
            <div className="space-y-1">
              {/* Placeholder for create mode */}
              {editMode === 'create' && (
                <div className="px-3 py-2.5 rounded-lg border-2 border-dashed border-primary bg-primary/5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-primary truncate">
                        {presetName || t.presets.createPreset}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 h-[1.25rem] overflow-hidden truncate">
                        {presetDescription || 'New preset'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Hardware type tag */}
                      <span className="px-1.5 py-0.5 text-[10px] rounded font-medium bg-background/20 text-primary">
                        {t.presets.hardware[presetConfig.hardwareAccel]?.toUpperCase() || presetConfig.hardwareAccel.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Preset list */}
              {presets.map((preset) => {
                // Get hardware type color
                const getHardwareColor = (hw: string) => {
                  switch (hw) {
                    case 'nvidia':
                      return 'bg-green-500/10 text-green-600 dark:text-green-500'
                    case 'intel':
                      return 'bg-blue-500/10 text-blue-600 dark:text-blue-500'
                    case 'amd':
                      return 'bg-red-500/10 text-red-600 dark:text-red-500'
                    case 'cpu':
                    default:
                      return 'bg-gray-500/10 text-gray-600 dark:text-gray-500'
                  }
                }
                
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset.id)}
                    className={cn(
                      'w-full text-left px-3 py-2.5 rounded-lg transition-colors',
                      selectedPresetId === preset.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{preset.name}</div>
                        <div className="text-xs opacity-80 mt-0.5 h-[1.25rem] overflow-hidden truncate">
                          {preset.description || '\u00A0'}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Built-in tag */}
                        {preset.isBuiltin && (
                          <span className={cn(
                            'px-1.5 py-0.5 text-[10px] rounded font-medium',
                            selectedPresetId === preset.id
                              ? 'bg-background/20'
                              : 'bg-purple-500/10 text-purple-600 dark:text-purple-500'
                          )}>
                            {t.presets.builtin}
                          </span>
                        )}
                        {/* Hardware type tag */}
                        <span className={cn(
                          'px-1.5 py-0.5 text-[10px] rounded font-medium',
                          selectedPresetId === preset.id
                            ? 'bg-background/20'
                            : getHardwareColor(preset.config.hardwareAccel)
                        )}>
                          {t.presets.hardware[preset.config.hardwareAccel]?.toUpperCase() || preset.config.hardwareAccel.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedPreset && editMode === 'view' ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            {t.presets.noPresets}
          </div>
        ) : (editMode === 'create' || selectedPreset) ? (
          <>
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex-1 min-w-0">
                {editMode === 'create' ? (
                  <h2 className="text-lg font-semibold truncate">
                    {t.presets.createPreset}
                  </h2>
                ) : selectedPreset?.isBuiltin ? (
                  <>
                    <h2 className="text-lg font-semibold truncate">
                      {selectedPreset?.name}
                    </h2>
                    {selectedPreset?.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {selectedPreset.description}
                      </p>
                    )}
                  </>
                ) : null}
              </div>
              
              <div className="flex gap-2 ml-4">
                {isEditing || hasChanges ? (
                  <>
                    <Button variant="outline" size="sm" onClick={handleCancel}>
                      <X className="h-4 w-4 mr-1" />
                      {t.common.cancel}
                    </Button>
                    <Button size="sm" onClick={handleSave}>
                      <Save className="h-4 w-4 mr-1" />
                      {t.common.save}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectedPreset && handleDeleteClick(selectedPreset)}
                      disabled={selectedPreset?.isBuiltin}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {t.common.delete}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
              <div className="max-w-4xl min-w-[800px] space-y-4">
                {/* Name and Description (always shown for non-builtin presets and in create mode) */}
                {(editMode === 'create' || (selectedPreset && !selectedPreset.isBuiltin)) && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">
                        {t.presets.presetName}
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border rounded-md bg-background"
                        value={presetName}
                        onChange={(e) => setPresetName(e.target.value)}
                        placeholder="e.g., High Quality H.265"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1.5">
                        {t.presets.presetDescription}
                      </label>
                      <textarea
                        className="w-full px-3 py-2 border rounded-md bg-background"
                        value={presetDescription}
                        onChange={(e) => setPresetDescription(e.target.value)}
                        placeholder="Optional description..."
                        rows={2}
                      />
                    </div>
                  </>
                )}

                {/* Command Preview */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    {t.config.ffmpegCommand}
                  </label>
                  <div className="p-3 bg-muted rounded-md font-mono text-xs break-all">
                    {commandPreview}
                  </div>
                </div>

                {/* Configuration Panel */}
                <div>
                  {(editMode === 'create' || (selectedPreset && !selectedPreset.isBuiltin)) && (
                    <label className="block text-sm font-medium mb-2">
                      {t.presets.presetConfig}
                    </label>
                  )}
                  <Card>
                    <ConfigPanel
                      selectedFiles={[]}
                      onTranscodeStart={() => {}}
                      onConfigChange={(config) => setPresetConfig(config)}
                      initialConfig={presetConfig}
                      resetTrigger={configResetTrigger}
                    />
                  </Card>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={t.presets.deletePreset}
        description={t.presets.deleteConfirm}
        confirmText={t.common.delete}
        cancelText={t.common.cancel}
        onConfirm={handleDeleteConfirm}
        variant="destructive"
      />

      {/* Switch Confirmation Dialog */}
      <ConfirmDialog
        open={switchConfirmOpen}
        onOpenChange={setSwitchConfirmOpen}
        title={language === 'zh' ? '放弃未保存的更改？' : 'Discard unsaved changes?'}
        description={language === 'zh' ? '您有未保存的更改，切换预设将丢失这些更改。' : 'You have unsaved changes. Switching presets will discard these changes.'}
        confirmText={language === 'zh' ? '放弃' : 'Discard'}
        cancelText={t.common.cancel}
        onConfirm={handleConfirmSwitch}
        variant="destructive"
      />
      </div>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
