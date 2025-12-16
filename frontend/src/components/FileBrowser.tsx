// File browser component with video info modal
import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Folder, File, ChevronRight, ChevronDown, ArrowUp, CheckSquare, Square, Play, Info } from 'lucide-react'
import { api } from '@/lib/api'
import { useApp } from '@/contexts/AppContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { formatBytes } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface FileBrowserProps {
  onFilesSelected: (files: string[]) => void
  selectedFiles: string[]
  onStartTranscode: () => void
}

export default function FileBrowser({ onFilesSelected, selectedFiles, onStartTranscode }: FileBrowserProps) {
  const [currentPath, setCurrentPath] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['']))
  const [videoInfoDialogOpen, setVideoInfoDialogOpen] = useState(false)
  const { t } = useApp()

  const { data: files, isLoading } = useQuery({
    queryKey: ['files', currentPath],
    queryFn: () => api.browseFiles(currentPath),
  })

  const videoInfoMutation = useMutation({
    mutationFn: (path: string) => api.getVideoInfo(path),
  })

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedFolders(newExpanded)
  }

  const toggleFileSelection = (path: string) => {
    if (selectedFiles.includes(path)) {
      onFilesSelected(selectedFiles.filter(f => f !== path))
    } else {
      onFilesSelected([...selectedFiles, path])
    }
  }

  const selectAllInFolder = () => {
    if (!files) return
    const videoFiles = files.filter(f => !f.isDir).map(f => f.path)
    const allSelected = videoFiles.every(path => selectedFiles.includes(path))
    
    if (allSelected) {
      // Deselect all in this folder
      onFilesSelected(selectedFiles.filter(path => !videoFiles.includes(path)))
    } else {
      // Select all in this folder
      const newSelection = [...selectedFiles]
      videoFiles.forEach(path => {
        if (!newSelection.includes(path)) {
          newSelection.push(path)
        }
      })
      onFilesSelected(newSelection)
    }
  }

  const toggleFolderSelection = (folderPath: string) => {
    // Toggle folder selection - add or remove folder from selected files
    if (selectedFiles.includes(folderPath)) {
      onFilesSelected(selectedFiles.filter(f => f !== folderPath))
    } else {
      onFilesSelected([...selectedFiles, folderPath])
    }
  }

  const navigateUp = () => {
    const parts = currentPath.split('/').filter(Boolean)
    parts.pop()
    setCurrentPath(parts.join('/'))
  }

  const handleShowVideoInfo = (path: string) => {
    videoInfoMutation.mutate(path)
    setVideoInfoDialogOpen(true)
  }

  const allInFolderSelected = (files?.filter(f => !f.isDir).length ?? 0) > 0 && 
    (files?.filter(f => !f.isDir).every(f => selectedFiles.includes(f.path)) ?? false)

  const formatDuration = (seconds: number | undefined) => {
    if (!seconds) return 'N/A'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <>
      <Card className="h-full flex flex-col">
        {/* Header with path and actions */}
        <div className="border-b p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {currentPath && (
                <Button variant="ghost" size="sm" onClick={navigateUp} className="h-8">
                  <ArrowUp className="h-4 w-4 mr-1" />
                  {t.transcode.goUp}
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={selectAllInFolder}
                className="h-8"
              >
                {allInFolderSelected ? (
                  <CheckSquare className="h-4 w-4 mr-1" />
                ) : (
                  <Square className="h-4 w-4 mr-1" />
                )}
                {t.transcode.selectAll}
              </Button>
              <div className="h-4 w-px bg-border mx-1" />
              <Badge variant="secondary" className="text-xs">
                {t.transcode.filesSelected.replace('{count}', selectedFiles.length.toString())}
              </Badge>
            </div>
            
            <Button 
              onClick={onStartTranscode}
              disabled={selectedFiles.length === 0}
              size="sm"
              className="h-8"
            >
              <Play className="h-4 w-4 mr-1" />
              {t.transcode.startTranscode}
            </Button>
          </div>
          
          {/* Current path display */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground px-2">
            <Folder className="h-3 w-3" />
            <span className="truncate">
              {currentPath ? `/${currentPath}` : '/'}
            </span>
          </div>
        </div>
        
        <CardContent className="flex-1 overflow-auto p-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">{t.transcode.loading}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {files?.map((file) => {
                const isSelected = selectedFiles.includes(file.path)
                
                return (
                  <div
                    key={file.path}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md transition-colors group",
                      "hover:bg-accent",
                      isSelected && "bg-primary/5 border-l-2 border-primary"
                    )}
                  >
                    {file.isDir ? (
                      <>
                        {/* Checkbox for folder */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFolderSelection(file.path)
                          }}
                          className="flex-shrink-0 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                          ) : (
                            <Square className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        
                        {/* Folder icon and name */}
                        <div
                          className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                          onClick={() => {
                            toggleFolder(file.path)
                            setCurrentPath(file.path)
                          }}
                        >
                          {expandedFolders.has(file.path) ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          <span className="flex-1 truncate text-sm">{file.name}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* File checkbox and name */}
                        <div
                          className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                          onClick={() => toggleFileSelection(file.path)}
                        >
                          <div
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleFileSelection(file.path)
                            }}
                            className="flex-shrink-0"
                          >
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-primary" />
                            ) : (
                              <Square className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="flex-1 truncate text-sm">{file.name}</span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {formatBytes(file.size)}
                          </span>
                        </div>
                        
                        {/* Info button for video files */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleShowVideoInfo(file.path)
                          }}
                        >
                          <Info className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                )
              })}
              {files?.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  该目录为空
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Video Info Dialog */}
      <Dialog open={videoInfoDialogOpen} onOpenChange={setVideoInfoDialogOpen}>
        <DialogContent>
          <DialogClose onClick={() => setVideoInfoDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>{t.transcode.videoInfo}</DialogTitle>
          </DialogHeader>
          
          {videoInfoMutation.isPending ? (
            <div className="py-8 text-center text-muted-foreground">
              {t.transcode.loading}
            </div>
          ) : videoInfoMutation.isError ? (
            <div className="py-8 text-center text-destructive">
              Failed to load video information
            </div>
          ) : videoInfoMutation.data ? (
            <div className="space-y-2">
              {/* File Name - with word break */}
              <div className="py-2 border-b">
                <div className="text-xs font-medium text-muted-foreground mb-1">{t.transcode.fileName}:</div>
                <div className="text-sm break-all">{videoInfoMutation.data.name}</div>
              </div>
              
              <InfoRow label={t.transcode.fileSize} value={formatBytes(videoInfoMutation.data.size)} />
              <InfoRow label={t.transcode.duration} value={formatDuration(videoInfoMutation.data.duration)} />
              
              {videoInfoMutation.data.width && videoInfoMutation.data.height && (
                <InfoRow 
                  label={t.transcode.resolution} 
                  value={`${videoInfoMutation.data.width} x ${videoInfoMutation.data.height}`} 
                />
              )}
              
              {videoInfoMutation.data.codec && (
                <InfoRow label={t.transcode.codec} value={videoInfoMutation.data.codec.toUpperCase()} />
              )}
              
              {videoInfoMutation.data.profile && (
                <InfoRow label="Profile" value={videoInfoMutation.data.profile} />
              )}
              
              {videoInfoMutation.data.frameRate && (
                <InfoRow 
                  label={t.transcode.fps} 
                  value={parseFrameRate(videoInfoMutation.data.frameRate)} 
                />
              )}
              
              {videoInfoMutation.data.bitrate && (
                <InfoRow 
                  label={t.transcode.bitrate} 
                  value={`${(videoInfoMutation.data.bitrate / 1000000).toFixed(2)} Mbps`} 
                />
              )}
              
              {videoInfoMutation.data.pixelFormat && (
                <InfoRow label="Pixel Format" value={videoInfoMutation.data.pixelFormat} />
              )}
              
              {videoInfoMutation.data.colorSpace && (
                <InfoRow label="Color Space" value={videoInfoMutation.data.colorSpace} />
              )}
              
              {videoInfoMutation.data.isHDR !== undefined && videoInfoMutation.data.isHDR && (
                <div className="py-2 border-b">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">HDR:</span>
                    <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded">
                      ✓ HDR
                    </span>
                  </div>
                </div>
              )}
              
              {videoInfoMutation.data.colorTransfer && videoInfoMutation.data.isHDR && (
                <InfoRow label="Transfer" value={videoInfoMutation.data.colorTransfer} />
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b last:border-0">
      <span className="text-xs font-medium text-muted-foreground flex-shrink-0">{label}:</span>
      <span className="text-sm font-mono text-right break-all">{value}</span>
    </div>
  )
}

function parseFrameRate(frameRate: string): string {
  // Parse frame rate like "24000/1001" to "23.98 fps"
  if (frameRate.includes('/')) {
    const [num, den] = frameRate.split('/').map(Number)
    return `${(num / den).toFixed(2)} fps`
  }
  return `${frameRate} fps`
}
