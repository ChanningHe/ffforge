// Transcode page with file browser, config panel, and command preview
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useApp } from '@/contexts/AppContext'
import { useToast } from '@/components/ui/toast'
import { useCommandPreview } from '@/hooks/useCommandPreview'
import FileBrowser from '@/components/FileBrowser'
import ConfigPanel from '@/components/ConfigPanel'
import { Terminal, Loader2 } from 'lucide-react'
import type { TranscodeConfig } from '@/types'

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

  // Get real-time command preview from backend
  const { command: ffmpegCommand, isLoading: isCommandLoading } = useCommandPreview(config, {
    sourceFile: selectedFiles[0], // Use first selected file for preview
    debounceMs: 300,
  })

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
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">
                {t.config.ffmpegCommand}
              </span>
              {isCommandLoading && (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              )}
            </div>
            {/* Fixed height container with scroll and fade animation */}
            <div className="relative">
              <code
                className="text-[10px] font-mono bg-background px-2 py-1.5 rounded border block whitespace-pre-wrap break-all transition-opacity duration-200"
                style={{ opacity: isCommandLoading && !ffmpegCommand ? 0.5 : 1 }}
              >
                {ffmpegCommand || (
                  <span className="text-muted-foreground italic">
                    {isCommandLoading ? 'Generating preview...' : 'Configure settings to see command preview'}
                  </span>
                )}
              </code>
            </div>
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
