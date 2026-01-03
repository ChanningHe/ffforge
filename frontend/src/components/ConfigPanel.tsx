// Configuration panel for transcoding settings - compact design
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { useApp } from '@/contexts/AppContext'
import type { TranscodeConfig, HardwareAccel, AudioCodec, OutputPathType, HdrMode } from '@/types'

interface ConfigPanelProps {
  selectedFiles: string[]
  onTranscodeStart: () => void
  onConfigChange?: (config: TranscodeConfig) => void
  initialConfig?: TranscodeConfig
  resetTrigger?: number // Add a trigger to force reset
}

export default function ConfigPanel({ selectedFiles, onConfigChange, initialConfig, resetTrigger }: ConfigPanelProps) {
  const { t, language } = useApp()

  const { data: presets } = useQuery({
    queryKey: ['presets'],
    queryFn: () => api.getPresets(),
  })

  const { data: hardware } = useQuery({
    queryKey: ['hardware'],
    queryFn: () => api.getHardwareInfo(),
  })

  const [selectedPreset, setSelectedPreset] = useState<string>('')

  // Ensure initialConfig always has mode set to 'simple' by default
  const getInitialConfig = (): TranscodeConfig => {
    const baseConfig = initialConfig || {
      mode: 'simple',
      encoder: 'h265',
      hardwareAccel: 'cpu',
      video: {
        crf: 23,
        preset: 'medium',
        resolution: 'original',
        fps: 'original',
        hdrMode: [], // Default: no selection (passthrough)
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
    // Always ensure mode is 'simple' by default
    return { ...baseConfig, mode: baseConfig.mode || 'simple' }
  }

  const [config, setConfig] = useState<TranscodeConfig>(getInitialConfig())

  // Reset config when resetTrigger changes (for external control)
  useEffect(() => {
    if (initialConfig && resetTrigger !== undefined) {
      // Always ensure mode is 'simple' when resetting
      setConfig({ ...initialConfig, mode: initialConfig.mode || 'simple' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetTrigger])

  // Initialize with initialConfig on mount
  useEffect(() => {
    if (initialConfig) {
      // Always ensure mode is 'simple' when initializing
      setConfig({ ...initialConfig, mode: initialConfig.mode || 'simple' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selectedPreset && presets) {
      const preset = presets.find(p => p.id === selectedPreset)
      if (preset) {
        // Load preset config into form, including its mode
        setConfig({
          ...preset.config,
          mode: preset.config.mode || 'simple', // Use preset's mode, default to simple
        })
      }
    }
  }, [selectedPreset, presets])

  useEffect(() => {
    if (onConfigChange) {
      onConfigChange(config)
    }
  }, [config, onConfigChange])

  const getAvailableHardwareOptions = (): { value: HardwareAccel; label: string }[] => {
    const options: { value: HardwareAccel; label: string }[] = [
      { value: 'cpu', label: 'CPU' },
    ]

    if (hardware?.nvidia) {
      options.push({ value: 'nvidia', label: `NVIDIA ${hardware.gpuName || 'GPU'}` })
    }
    if (hardware?.intel) {
      options.push({ value: 'intel', label: 'Intel QSV' })
    }
    if (hardware?.amd) {
      options.push({ value: 'amd', label: 'AMD' })
    }

    return options
  }

  // Get preset options based on encoder and hardware acceleration
  const getPresetOptions = (): { value: string; label: string }[] => {
    const { encoder, hardwareAccel } = config

    // NVIDIA NVENC presets
    if (hardwareAccel === 'nvidia') {
      return [
        { value: 'p1', label: 'P1 (Fastest)' },
        { value: 'p2', label: 'P2' },
        { value: 'p3', label: 'P3' },
        { value: 'p4', label: 'P4 (Balanced)' },
        { value: 'p5', label: 'P5' },
        { value: 'p6', label: 'P6' },
        { value: 'p7', label: 'P7 (Best Quality)' },
      ]
    }

    // Intel QSV presets
    if (hardwareAccel === 'intel') {
      return [
        { value: 'veryfast', label: language === 'zh' ? '很快' : 'Very Fast' },
        { value: 'faster', label: language === 'zh' ? '较快' : 'Faster' },
        { value: 'fast', label: language === 'zh' ? '快' : 'Fast' },
        { value: 'medium', label: language === 'zh' ? '中等' : 'Medium' },
        { value: 'slow', label: language === 'zh' ? '慢' : 'Slow' },
        { value: 'slower', label: language === 'zh' ? '较慢' : 'Slower' },
        { value: 'veryslow', label: language === 'zh' ? '很慢' : 'Very Slow' },
      ]
    }

    // AMD AMF presets
    if (hardwareAccel === 'amd') {
      return [
        { value: 'speed', label: language === 'zh' ? '速度优先' : 'Speed' },
        { value: 'balanced', label: language === 'zh' ? '平衡' : 'Balanced' },
        { value: 'quality', label: language === 'zh' ? '质量优先' : 'Quality' },
      ]
    }

    // CPU encoding presets
    if (encoder === 'av1') {
      // SVT-AV1 presets (0-13)
      return [
        { value: '0', label: '0 (Slowest, Best Quality)' },
        { value: '1', label: '1' },
        { value: '2', label: '2' },
        { value: '3', label: '3' },
        { value: '4', label: '4' },
        { value: '5', label: '5' },
        { value: '6', label: '6 (Balanced)' },
        { value: '7', label: '7' },
        { value: '8', label: '8' },
        { value: '9', label: '9' },
        { value: '10', label: '10' },
        { value: '11', label: '11' },
        { value: '12', label: '12' },
        { value: '13', label: '13 (Fastest)' },
      ]
    } else {
      // libx265 presets
      return Object.entries(t.config.speeds).map(([key, label]) => ({
        value: key,
        label
      }))
    }
  }

  // Get hardware type color helper
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

  const presetOptions = [
    { value: '', label: t.config.custom },
    ...(presets?.map(p => ({
      value: p.id,
      label: p.name,
      tags: (
        <>
          {p.isBuiltin && (
            <span className="px-1.5 py-0.5 text-[10px] rounded font-medium bg-purple-500/10 text-purple-600 dark:text-purple-500">
              {t.presets.builtin}
            </span>
          )}
          <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${getHardwareColor(p.config.hardwareAccel)}`}>
            {t.presets.hardware[p.config.hardwareAccel]?.toUpperCase() || p.config.hardwareAccel.toUpperCase()}
          </span>
        </>
      )
    })) || [])
  ]

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-2 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{t.config.title}</CardTitle>
          {/* Mode Toggle - Compact style */}
          <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
            <button
              className={cn(
                'px-2 py-0.5 text-[10px] font-medium rounded transition-colors',
                config.mode === 'simple'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setConfig({ ...config, mode: 'simple' })}
            >
              {language === 'zh' ? '简单' : 'Simple'}
            </button>
            <button
              className={cn(
                'px-2 py-0.5 text-[10px] font-medium rounded transition-colors',
                config.mode === 'advanced'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setConfig({ ...config, mode: 'advanced' })}
            >
              {language === 'zh' ? '高级' : 'Advanced'}
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto overflow-x-hidden py-2.5 space-y-2">

        {/* Preset Selection - Available in both Simple and Advanced Mode */}
        <div>
          <label className="block text-[11px] font-medium mb-1 text-muted-foreground">
            {t.config.preset}
          </label>
          <Select
            value={selectedPreset}
            onChange={setSelectedPreset}
            options={presetOptions}
          />
        </div>

        <div className="border-t pt-2" />

        {/* Simple Mode Configuration */}
        {config.mode === 'simple' && (
          <>
            {/* Encoder & Hardware Acceleration - Two columns with aligned heights */}
            <div className="grid grid-cols-2 gap-2 items-end">
              {/* Encoder */}
              <div>
                <label className="block text-[11px] font-medium mb-1 text-muted-foreground">
                  {t.config.encoder}
                </label>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    className={cn(
                      'px-1.5 py-2.5 text-[11px] font-medium border rounded transition-colors',
                      config.encoder === 'h265'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-accent'
                    )}
                    onClick={() => setConfig({ ...config, encoder: 'h265' })}
                  >
                    H.265
                  </button>
                  <button
                    className={cn(
                      'px-1.5 py-2.5 text-[11px] font-medium border rounded transition-colors',
                      config.encoder === 'av1'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-accent'
                    )}
                    onClick={() => setConfig({ ...config, encoder: 'av1' })}
                  >
                    AV1
                  </button>
                </div>
              </div>

              {/* Hardware Acceleration */}
              <div>
                <label className="block text-[11px] font-medium mb-1 text-muted-foreground">
                  {t.config.hardwareAccel}
                </label>
                <Select
                  value={config.hardwareAccel}
                  onChange={(val) => setConfig({ ...config, hardwareAccel: val as HardwareAccel })}
                  options={getAvailableHardwareOptions()}
                />
              </div>
            </div>

            {/* CRF - Full width */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">
                  {t.config.quality}
                </label>
                <span className="text-xs font-mono">{config.video.crf}</span>
              </div>
              <Slider
                min={0}
                max={51}
                value={config.video.crf || 23}
                onChange={(val) => setConfig({
                  ...config,
                  video: { ...config.video, crf: val }
                })}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                {t.config.qualityHint}
              </p>
            </div>

            {/* Encoding Speed & HDR Handling - Two columns */}
            <div className="grid grid-cols-2 gap-2 items-end">
              {/* Encoding Speed */}
              <div>
                <label className="block text-[11px] font-medium mb-1 text-muted-foreground">
                  {t.config.speed}
                </label>
                <Select
                  value={config.video.preset || (config.encoder === 'av1' && config.hardwareAccel === 'cpu' ? '6' : 'medium')}
                  onChange={(val) => setConfig({
                    ...config,
                    video: { ...config.video, preset: val }
                  })}
                  options={getPresetOptions()}
                />
              </div>

              {/* HDR Handling */}
              <div>
                <label className="block text-[11px] font-medium mb-1 text-muted-foreground">
                  {t.config.hdrMode}
                </label>
                <Select
                  value={config.video.hdrMode?.[0] || ''}
                  onChange={(val) => setConfig({
                    ...config,
                    video: { ...config.video, hdrMode: val ? [val as HdrMode] : [] }
                  })}
                  options={[
                    { value: '', label: language === 'zh' ? '不处理' : 'Passthrough' },
                    { value: 'keep', label: t.config.hdrModeOptions.keep },
                  ]}
                />
              </div>
            </div>

            {/* Audio Codec & Output Path Type - Two columns with aligned heights */}
            <div className="grid grid-cols-2 gap-2 items-end">
              {/* Audio Codec */}
              <div>
                <label className="block text-[11px] font-medium mb-1 text-muted-foreground">
                  {t.config.audioCodec}
                </label>
                <Select
                  value={config.audio.codec}
                  onChange={(val) => setConfig({
                    ...config,
                    audio: { ...config.audio, codec: val as AudioCodec }
                  })}
                  options={[
                    { value: 'copy', label: t.config.audioCopy },
                    { value: 'aac', label: 'AAC' },
                    { value: 'opus', label: 'Opus' },
                    { value: 'mp3', label: 'MP3' },
                  ]}
                />
              </div>

              {/* Output Path Type */}
              <div>
                <label className="block text-[11px] font-medium mb-1 text-muted-foreground">
                  {t.config.outputPath}
                </label>
                <Select
                  value={config.output.pathType}
                  onChange={(val) => setConfig({
                    ...config,
                    output: { ...config.output, pathType: val as OutputPathType }
                  })}
                  options={[
                    { value: 'source', label: t.config.outputPathOptions.source },
                    { value: 'custom', label: t.config.outputPathOptions.custom },
                    { value: 'default', label: t.config.outputPathOptions.default },
                    { value: 'overwrite', label: t.config.outputPathOptions.overwrite },
                  ]}
                />
              </div>
            </div>

            {/* Warning for overwrite mode */}
            {config.output.pathType === 'overwrite' && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-2">
                <p className="text-[10px] text-destructive font-medium">
                  ⚠️ {language === 'zh' ? '警告：此模式将直接覆盖源文件，无法恢复！' : 'Warning: This mode will overwrite source files permanently!'}
                </p>
              </div>
            )}

            {/* Custom Path Input */}
            {config.output.pathType === 'custom' && (
              <div>
                <input
                  type="text"
                  className="w-full px-2 py-2.5 text-xs border rounded bg-background"
                  value={config.output.customPath || ''}
                  onChange={(e) => setConfig({
                    ...config,
                    output: { ...config.output, customPath: e.target.value }
                  })}
                  placeholder="/path/to/output"
                />
              </div>
            )}

            {/* Output Format & File Suffix - Two columns with aligned heights, Hidden in overwrite mode */}
            {config.output.pathType !== 'overwrite' && (
              <div className="grid grid-cols-2 gap-2 items-end">
                {/* Output Format */}
                <div>
                  <label className="block text-[11px] font-medium mb-1 text-muted-foreground">
                    {t.config.outputFormat}
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {['mp4', 'mkv', 'webm'].map((format) => (
                      <button
                        key={format}
                        className={cn(
                          'px-1.5 py-2.5 text-[11px] font-medium border rounded transition-colors',
                          config.output.container === format
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background hover:bg-accent'
                        )}
                        onClick={() => setConfig({
                          ...config,
                          output: { ...config.output, container: format }
                        })}
                      >
                        {format.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* File Suffix */}
                <div>
                  <label className="block text-[11px] font-medium mb-1 text-muted-foreground">
                    {t.config.fileSuffix}
                  </label>
                  <input
                    type="text"
                    className="w-full px-2 py-2.5 text-xs border rounded bg-background"
                    value={config.output.suffix}
                    onChange={(e) => setConfig({
                      ...config,
                      output: { ...config.output, suffix: e.target.value }
                    })}
                    placeholder="_transcoded"
                  />
                </div>
              </div>
            )}

            {/* Extra FFmpeg Parameters */}
            <div>
              <label className="block text-[11px] font-medium mb-1 text-muted-foreground">
                {t.config.extraParams}
              </label>
              <textarea
                className="w-full px-2 py-1.5 text-xs border rounded bg-background font-mono"
                value={config.extraParams || ''}
                onChange={(e) => setConfig({
                  ...config,
                  extraParams: e.target.value
                })}
                placeholder='-svtav1-params "keyint=12s:scd=1"'
                rows={2}
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {t.config.extraParamsHint}
              </p>
            </div>
          </>
        )}

        {/* Advanced Mode Configuration */}
        {config.mode === 'advanced' && (
          <>
            {/* Custom FFmpeg Command */}
            <div>
              <label className="block text-[11px] font-medium mb-1 text-muted-foreground">
                {language === 'zh' ? '自定义 FFmpeg 命令' : 'Custom FFmpeg Command'}
              </label>
              <textarea
                className="w-full px-2 py-1.5 text-xs border rounded bg-background font-mono"
                value={config.customCommand || ''}
                onChange={(e) => setConfig({
                  ...config,
                  customCommand: e.target.value
                })}
                placeholder={language === 'zh'
                  ? "-hwaccel qsv -hwaccel_output_format qsv -i [[INPUT]] -c:v hevc_qsv -preset medium -global_quality 23 -c:a copy [[OUTPUT]]"
                  : "-hwaccel qsv -hwaccel_output_format qsv -i [[INPUT]] -c:v hevc_qsv -preset medium -global_quality 23 -c:a copy [[OUTPUT]]"
                }
                rows={8}
              />
              <div className="text-[10px] text-muted-foreground mt-0.5 space-y-1">
                <p>
                  {language === 'zh'
                    ? '💡 使用 [[INPUT]] 和 [[OUTPUT]] 作为占位符，它们会在运行时被替换为实际的文件路径。'
                    : '💡 Use [[INPUT]] and [[OUTPUT]] as placeholders, they will be replaced with actual file paths at runtime.'
                  }
                </p>
                <p className="font-medium text-primary">
                  {language === 'zh'
                    ? '⚠️ 注意：使用 GPU 时，-hwaccel 参数必须放在 -i [[INPUT]] 之前！'
                    : '⚠️ Note: When using GPU, -hwaccel parameters must come BEFORE -i [[INPUT]]!'
                  }
                </p>
                <p>
                  {language === 'zh'
                    ? '示例 NVIDIA：-hwaccel cuda -i [[INPUT]] -c:v hevc_nvenc -preset p4 -cq 23 -c:a copy [[OUTPUT]]'
                    : 'Example NVIDIA: -hwaccel cuda -i [[INPUT]] -c:v hevc_nvenc -preset p4 -cq 23 -c:a copy [[OUTPUT]]'
                  }
                </p>
                <p>
                  {language === 'zh'
                    ? '示例 Intel QSV：-hwaccel qsv -hwaccel_output_format qsv -i [[INPUT]] -c:v hevc_qsv -preset medium -global_quality 23 -c:a copy [[OUTPUT]]'
                    : 'Example Intel QSV: -hwaccel qsv -hwaccel_output_format qsv -i [[INPUT]] -c:v hevc_qsv -preset medium -global_quality 23 -c:a copy [[OUTPUT]]'
                  }
                </p>
              </div>
            </div>

            <div className="border-t pt-2" />

            {/* Output Path Type */}
            <div>
              <label className="block text-[11px] font-medium mb-1 text-muted-foreground">
                {t.config.outputPath}
              </label>
              <Select
                value={config.output.pathType}
                onChange={(val) => setConfig({
                  ...config,
                  output: { ...config.output, pathType: val as OutputPathType }
                })}
                options={[
                  { value: 'source', label: t.config.outputPathOptions.source },
                  { value: 'custom', label: t.config.outputPathOptions.custom },
                  { value: 'default', label: t.config.outputPathOptions.default },
                  { value: 'overwrite', label: t.config.outputPathOptions.overwrite },
                ]}
              />
            </div>

            {/* Warning for overwrite mode */}
            {config.output.pathType === 'overwrite' && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-2">
                <p className="text-[10px] text-destructive font-medium">
                  ⚠️ {language === 'zh' ? '警告：此模式将直接覆盖源文件，无法恢复！' : 'Warning: This mode will overwrite source files permanently!'}
                </p>
              </div>
            )}

            {/* Custom Path Input */}
            {config.output.pathType === 'custom' && (
              <div>
                <input
                  type="text"
                  className="w-full px-2 py-2.5 text-xs border rounded bg-background"
                  value={config.output.customPath || ''}
                  onChange={(e) => setConfig({
                    ...config,
                    output: { ...config.output, customPath: e.target.value }
                  })}
                  placeholder="/path/to/output"
                />
              </div>
            )}

            {/* Output Format & File Suffix - Two columns with aligned heights, Hidden in overwrite mode */}
            {config.output.pathType !== 'overwrite' && (
              <div className="grid grid-cols-2 gap-2 items-end">
                {/* Output Format */}
                <div>
                  <label className="block text-[11px] font-medium mb-1 text-muted-foreground">
                    {t.config.outputFormat}
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {['mp4', 'mkv', 'webm'].map((format) => (
                      <button
                        key={format}
                        className={cn(
                          'px-1.5 py-2.5 text-[11px] font-medium border rounded transition-colors',
                          config.output.container === format
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background hover:bg-accent'
                        )}
                        onClick={() => setConfig({
                          ...config,
                          output: { ...config.output, container: format }
                        })}
                      >
                        {format.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* File Suffix */}
                <div>
                  <label className="block text-[11px] font-medium mb-1 text-muted-foreground">
                    {t.config.fileSuffix}
                  </label>
                  <input
                    type="text"
                    className="w-full px-2 py-2.5 text-xs border rounded bg-background"
                    value={config.output.suffix}
                    onChange={(e) => setConfig({
                      ...config,
                      output: { ...config.output, suffix: e.target.value }
                    })}
                    placeholder="_transcoded"
                  />
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Fixed Footer */}
      <div className="border-t bg-muted/20 px-4 py-2.5 flex-shrink-0">
        <p className="text-[11px] font-medium text-muted-foreground">
          {t.transcode.filesSelected.replace('{count}', selectedFiles.length.toString())}
        </p>
      </div>
    </Card>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
