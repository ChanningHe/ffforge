// Transcode page with file browser, config panel, and command preview
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useApp } from '@/contexts/AppContext'
import { useToast } from '@/components/ui/toast'
import FileBrowser from '@/components/FileBrowser'
import ConfigPanel from '@/components/ConfigPanel'
import { Terminal } from 'lucide-react'
import type { TranscodeConfig } from '@/types'

// Generate FFmpeg command preview based on config
function generateFFmpegCommand(config: TranscodeConfig, inputFile: string = 'input.mp4'): string {
  const parts: string[] = ['ffmpeg']
  
  // Check if using advanced mode
  if (config.mode === 'advanced' && config.customCommand) {
    // Advanced mode: use custom command with [[INPUT]] and [[OUTPUT]] placeholders
    let customCmd = config.customCommand.trim()
    const { output } = config
    const outputFile = inputFile.replace(/\.[^/.]+$/, '') + output.suffix + '.' + output.container
    
    // Replace placeholders for preview
    customCmd = customCmd.replace(/\[\[INPUT\]\]/g, inputFile)
    customCmd = customCmd.replace(/\[\[OUTPUT\]\]/g, outputFile)
    
    parts.push(customCmd)
    return parts.join(' ')
  } else {
    // Simple mode: build command from UI config
    const { encoder, hardwareAccel, video, audio } = config
    
    // IMPORTANT: Hardware acceleration flags must come BEFORE -i input file
    if (hardwareAccel === 'nvidia') {
      parts.push('-hwaccel', 'cuda', '-hwaccel_output_format', 'cuda')
    } else if (hardwareAccel === 'intel') {
      parts.push('-hwaccel', 'qsv', '-hwaccel_output_format', 'qsv')
    } else if (hardwareAccel === 'amd') {
      // AMD AMF typically doesn't need input hardware acceleration
    }
    
    // Add input file
    parts.push('-i', inputFile)
    
    // Video codec
    let videoCodec: string
    if (hardwareAccel === 'nvidia') {
      videoCodec = encoder === 'h265' ? 'hevc_nvenc' : 'av1_nvenc'
    } else if (hardwareAccel === 'intel') {
      videoCodec = encoder === 'h265' ? 'hevc_qsv' : 'av1_qsv'
    } else if (hardwareAccel === 'amd') {
      videoCodec = encoder === 'h265' ? 'hevc_amf' : 'av1_amf'
    } else {
      videoCodec = encoder === 'h265' ? 'libx265' : 'libsvtav1'
    }
    parts.push('-c:v', videoCodec)
    
    // Encoding preset
    if (video.preset) {
      if (hardwareAccel === 'amd') {
        parts.push('-quality', video.preset)
      } else {
        parts.push('-preset', video.preset)
      }
    }
    
    // CRF/Quality
    if (video.crf !== undefined) {
      if (hardwareAccel === 'nvidia') {
        parts.push('-cq', video.crf.toString())
      } else if (hardwareAccel === 'intel') {
        parts.push('-global_quality', video.crf.toString())
      } else if (hardwareAccel === 'amd') {
        parts.push('-qp_i', video.crf.toString())
      } else {
        parts.push('-crf', video.crf.toString())
      }
    }
    
    // Audio encoding
    if (audio.codec === 'copy') {
      parts.push('-c:a', 'copy')
    } else {
      parts.push('-c:a', audio.codec)
      if (audio.bitrate) {
        parts.push('-b:a', audio.bitrate)
      }
      if (audio.channels) {
        parts.push('-ac', audio.channels.toString())
      }
    }
    
    // Extra parameters
    if (config.extraParams && config.extraParams.trim()) {
      parts.push(config.extraParams.trim())
    }
  }
  
  // Output file (only for simple mode, already handled in advanced mode)
  if (config.mode !== 'advanced') {
    const { output } = config
    const outputFile = inputFile.replace(/\.[^/.]+$/, '') + output.suffix + '.' + output.container
    parts.push(outputFile)
  }
  
  return parts.join(' ')
}

export default function TranscodePage() {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [config, setConfig] = useState<TranscodeConfig>({
    mode: 'simple', // Default to simple mode
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
  })
  const queryClient = useQueryClient()
  const { t } = useApp()
  const { showToast } = useToast()

  const createTasksMutation = useMutation({
    mutationFn: () => api.createTasks(selectedFiles, undefined, config),
    onSuccess: (tasks) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setSelectedFiles([])
      showToast(t.transcode.tasksCreated.replace('{count}', tasks.length.toString()), 'success')
    },
    onError: () => {
      showToast(t.transcode.createTasksFailed, 'error')
    },
  })

  const handleTranscodeStart = () => {
    if (selectedFiles.length === 0) {
      showToast(t.transcode.noFilesSelected, 'warning')
      return
    }
    createTasksMutation.mutate()
  }

  const ffmpegCommand = generateFFmpegCommand(config)

  return (
    <div className="flex flex-1 flex-col">
      <div className="page-header">
        <h1>{t.transcode.title}</h1>
        <p>{t.transcode.subtitle}</p>
      </div>
      
      {/* FFmpeg Command Preview */}
      <div className="bg-muted/30 border rounded-lg p-3 mb-4">
        <div className="flex items-start gap-2">
          <Terminal className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-muted-foreground mb-1">
              {t.config.ffmpegCommand}
            </div>
            <code className="text-[10px] font-mono bg-background px-2 py-1 rounded border block overflow-x-auto whitespace-pre-wrap break-all">
              {ffmpegCommand}
            </code>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        <div className="h-full grid grid-cols-12 gap-4 min-w-[800px]">
          {/* Left: File Browser - 70% */}
          <div className="col-span-8 h-full overflow-hidden">
            <FileBrowser
              selectedFiles={selectedFiles}
              onFilesSelected={setSelectedFiles}
              onStartTranscode={handleTranscodeStart}
            />
          </div>

          {/* Right: Config Panel - 30% */}
          <div className="col-span-4 h-full min-w-[320px]">
            <ConfigPanel
              selectedFiles={selectedFiles}
              onTranscodeStart={handleTranscodeStart}
              onConfigChange={setConfig}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
