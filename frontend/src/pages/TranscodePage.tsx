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
  const parts: string[] = ['ffmpeg', '-i', inputFile]
  
  // Check if using advanced mode
  if (config.mode === 'advanced' && config.customCommand) {
    // Advanced mode: use custom command
    parts.push(config.customCommand.trim())
  } else {
    // Simple mode: build command from UI config
    const { encoder, hardwareAccel, video, audio } = config
    
    // Hardware acceleration
    if (hardwareAccel === 'nvidia') {
      parts.push('-hwaccel', 'cuda')
      const videoEncoder = encoder === 'h265' ? 'hevc_nvenc' : 'av1_nvenc'
      parts.push('-c:v', videoEncoder)
      if (video.preset) {
        parts.push('-preset', video.preset)
      }
    } else if (hardwareAccel === 'intel') {
      parts.push('-hwaccel', 'qsv')
      const videoEncoder = encoder === 'h265' ? 'hevc_qsv' : 'av1_qsv'
      parts.push('-c:v', videoEncoder)
      if (video.preset) {
        parts.push('-preset', video.preset)
      }
    } else if (hardwareAccel === 'amd') {
      const videoEncoder = encoder === 'h265' ? 'hevc_amf' : 'av1_amf'
      parts.push('-c:v', videoEncoder)
      if (video.preset) {
        parts.push('-quality', video.preset)
      }
    } else {
      // CPU encoding
      const videoEncoder = encoder === 'h265' ? 'libx265' : 'libsvtav1'
      parts.push('-c:v', videoEncoder)
      if (video.preset) {
        // Both libx265 and libsvtav1 use -preset parameter
        parts.push('-preset', video.preset)
      }
    }
    
    // CRF
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
  
  // Output file
  const { output } = config
  const outputFile = inputFile.replace(/\.[^/.]+$/, '') + output.suffix + '.' + output.container
  parts.push(outputFile)
  
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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-background p-4 pb-3">
        <h1 className="text-2xl font-bold">{t.transcode.title}</h1>
        <p className="text-sm text-muted-foreground mb-3">
          {t.transcode.subtitle}
        </p>
        
        {/* FFmpeg Command Preview - Always visible at top */}
        <div className="bg-muted/30 border rounded-lg p-2.5 mt-2">
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
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="h-full p-4 grid grid-cols-12 gap-4 min-w-[800px]">
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
