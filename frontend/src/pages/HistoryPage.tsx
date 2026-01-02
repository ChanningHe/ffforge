import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, CheckCircle2, XCircle, CheckSquare, Square, Terminal, RotateCcw } from 'lucide-react'
import { api } from '@/lib/api'
import { useApp } from '@/contexts/AppContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Pagination } from '@/components/ui/pagination'
import { useToast } from '@/components/ui/toast'
import { formatDuration, generateFFmpegCommand, formatBytes } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Task, TaskStatus } from '@/types'

const getStatusVariant = (status: TaskStatus): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'completed':
      return 'secondary'
    case 'failed':
    case 'cancelled':
      return 'destructive'
    default:
      return 'outline'
  }
}

const getStatusIcon = (status: TaskStatus) => {
  if (status === 'completed') return <CheckCircle2 className="h-4 w-4" />
  if (status === 'failed' || status === 'cancelled') return <XCircle className="h-4 w-4" />
  return null
}

export default function HistoryPage() {
  const { t, language } = useApp()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [clearAllConfirmOpen, setClearAllConfirmOpen] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.getTasks(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      showToast(t.history.recordDeleted, 'success')
      if (selectedTask?.id === taskToDelete) {
        setSelectedTask(null)
      }
    },
    onError: () => {
      showToast(t.history.deleteFailed, 'error')
    },
  })

  const deleteMultipleMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => api.deleteTask(id)))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      showToast(t.history.recordsDeleted, 'success')
      setSelectedTasks([])
      setSelectedTask(null)
    },
    onError: () => {
      showToast(t.history.deleteFailed, 'error')
    },
  })

  const retryMutation = useMutation({
    mutationFn: (id: string) => api.retryTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      showToast(t.history.retrySuccess, 'success')
    },
    onError: () => {
      showToast(t.history.retryFailed, 'error')
    },
  })

  const retryMultipleMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => api.retryTask(id)))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      showToast(t.history.retryMultipleSuccess, 'success')
      setSelectedTasks([])
    },
    onError: () => {
      showToast(t.history.retryFailed, 'error')
    },
  })

  const handleDelete = (id: string) => {
    setTaskToDelete(id)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = () => {
    if (taskToDelete) {
      deleteMutation.mutate(taskToDelete)
      setTaskToDelete(null)
      setDeleteConfirmOpen(false)
    }
  }

  const handleClearAll = () => {
    setClearAllConfirmOpen(true)
  }

  const handleConfirmClearAll = () => {
    completedTasks.forEach(task => {
      deleteMutation.mutate(task.id)
    })
  }

  const handleDeleteSelected = () => {
    if (selectedTasks.length > 0) {
      setTaskToDelete(null) // Clear single task deletion
      setDeleteConfirmOpen(true)
    }
  }

  const handleConfirmDeleteSelected = () => {
    if (selectedTasks.length > 0) {
      deleteMultipleMutation.mutate(selectedTasks)
      setDeleteConfirmOpen(false)
    }
  }

  const toggleTaskSelection = (taskId: string) => {
    if (selectedTasks.includes(taskId)) {
      setSelectedTasks(selectedTasks.filter(id => id !== taskId))
    } else {
      setSelectedTasks([...selectedTasks, taskId])
    }
  }

  const selectAllTasks = () => {
    if (selectedTasks.length === completedTasks.length) {
      setSelectedTasks([])
    } else {
      setSelectedTasks(completedTasks.map(t => t.id))
    }
  }

  // Filter only completed, failed, and cancelled tasks
  const completedTasks = tasks?.filter(t =>
    t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled'
  ) || []

  // Pagination
  const totalItems = completedTasks.length
  const paginatedTasks = completedTasks.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handlePageSizeChange = (size: number) => {
    setPageSize(size)
    setCurrentPage(1)
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="page-header flex items-start justify-between">
        <div>
          <h1>{t.history.title}</h1>
          <p>{t.history.subtitle}</p>
        </div>
        <div className="flex gap-2">
          {selectedTasks.length > 0 && (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={() => retryMultipleMutation.mutate(selectedTasks)}
                disabled={retryMultipleMutation.isPending}
              >
                <RotateCcw className={cn("h-4 w-4 mr-1", retryMultipleMutation.isPending && "animate-spin")} />
                {t.history.retrySelected} ({selectedTasks.length})
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {t.history.deleteSelected} ({selectedTasks.length})
              </Button>
            </>
          )}
          {completedTasks.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
            >
              {t.history.clearAll}
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-secondary" />
          <span className="text-sm">{t.history.completedCount}: {completedTasks.filter(t => t.status === 'completed').length}</span>
        </div>
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm">{t.history.failedCount}: {completedTasks.filter(t => t.status === 'failed' || t.status === 'cancelled').length}</span>
        </div>
      </div>

      {/* Two column layout: History List (left) + Details (right) */}
      <div className="flex-1 min-h-0">
        <div className="h-full grid grid-cols-12 gap-4">
          {/* Left: History List - 67% */}
          <div className="col-span-8 flex flex-col border rounded-lg bg-card">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">{t.common.loading}</p>
              </div>
            ) : (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-auto p-3">
                  {/* Toolbar */}
                  {completedTasks.length > 0 && (
                    <div className="flex items-center justify-between bg-muted/40 p-2 rounded-md mb-2">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={selectAllTasks}
                          className="hover:bg-background"
                        >
                          {selectedTasks.length === completedTasks.length ? (
                            <CheckSquare className="h-4 w-4 mr-2 text-primary" />
                          ) : (
                            <Square className="h-4 w-4 mr-2 text-muted-foreground" />
                          )}
                          <span className="font-medium">{t.history.selectAll}</span>
                        </Button>
                        {selectedTasks.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {selectedTasks.length} selected
                          </span>
                        )}
                      </div>

                      <Pagination
                        currentPage={currentPage}
                        totalItems={totalItems}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={handlePageSizeChange}
                        className="gap-4 h-8"
                      />
                    </div>
                  )}

                  {completedTasks.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      {t.history.noHistory}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {paginatedTasks.map((task) => {
                        const isSelected = selectedTasks.includes(task.id)
                        const isActive = selectedTask?.id === task.id

                        return (
                          <div
                            key={task.id}
                            className={cn(
                              "p-3 rounded-md transition-colors cursor-pointer",
                              "hover:bg-accent",
                              isActive && "bg-accent",
                              isSelected && "bg-primary/5 border-l-2 border-primary"
                            )}
                            onClick={() => setSelectedTask(task)}
                          >
                            <div className="flex items-start gap-3">
                              {/* Checkbox */}
                              <div
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleTaskSelection(task.id)
                                }}
                                className="flex-shrink-0 pt-1"
                              >
                                {isSelected ? (
                                  <CheckSquare className="h-4 w-4 text-primary" />
                                ) : (
                                  <Square className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>

                              {/* Task info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <p className="font-medium text-sm truncate" title={task.sourceFile}>
                                    {task.sourceFile.split('/').pop() || task.sourceFile}
                                  </p>
                                  <Badge variant={getStatusVariant(task.status)} className="flex-shrink-0 flex items-center gap-1">
                                    {getStatusIcon(task.status)}
                                    {t.tasks.status[task.status]}
                                  </Badge>
                                </div>

                                <p className="text-xs text-muted-foreground">
                                  {task.completedAt
                                    ? new Date(task.completedAt).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US')
                                    : task.createdAt
                                      ? new Date(task.createdAt).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US')
                                      : '-'
                                  }
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: Task Details - 33% */}
          <div className="col-span-4 overflow-auto border rounded-lg bg-card">
            {selectedTask ? (
              <div className="p-4 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-4 pb-2 border-b">{t.history.taskDetails}</h3>

                  {/* Status */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.tasks.status.title}</label>
                      <div className="mt-1.5">
                        <Badge variant={getStatusVariant(selectedTask.status)} className="flex items-center gap-1 w-fit">
                          {getStatusIcon(selectedTask.status)}
                          {t.tasks.status[selectedTask.status]}
                        </Badge>
                      </div>
                    </div>

                    {/* Config details */}
                    {selectedTask.config && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.tasks.config}</label>
                        <div className="mt-1.5 space-y-2 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">{t.config.encoder}:</span>
                            <span className="font-medium">{selectedTask.config.encoder.toUpperCase()}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">{t.config.hardwareAccel}:</span>
                            <span className="font-medium">{selectedTask.config.hardwareAccel.toUpperCase()}</span>
                          </div>
                          {selectedTask.config.video?.crf && (
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">CRF:</span>
                              <span className="font-medium">{selectedTask.config.video.crf}</span>
                            </div>
                          )}
                          {selectedTask.config.video?.preset && (
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">{t.config.speed}:</span>
                              <span className="font-medium">{selectedTask.config.video.preset}</span>
                            </div>
                          )}
                          {selectedTask.config.audio?.codec && (
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">{t.config.audioCodec}:</span>
                              <span className="font-medium">{selectedTask.config.audio.codec}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* FFmpeg Command Preview */}
                    {selectedTask.config && (
                      <div className="pt-4 border-t">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                          <Terminal className="h-3 w-3" />
                          {t.config.ffmpegCommand}
                        </label>
                        <div className="mt-2 bg-muted/30 border rounded p-3">
                          <code className="text-[10px] font-mono break-all whitespace-pre-wrap text-foreground/90">
                            {generateFFmpegCommand(selectedTask.config, selectedTask.sourceFile)}
                          </code>
                        </div>
                      </div>
                    )}

                    {/* Files */}
                    <div className="pt-4 border-t space-y-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.tasks.sourceFile}</label>
                        <p className="mt-1.5 text-xs font-mono break-all bg-muted/20 p-2 rounded">{selectedTask.sourceFile}</p>
                        {selectedTask.sourceFileSize !== undefined && selectedTask.sourceFileSize > 0 && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {t.history.sourceFileSize}: <span className="font-medium">{formatBytes(selectedTask.sourceFileSize)}</span>
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.tasks.outputFile}</label>
                        <p className="mt-1.5 text-xs font-mono break-all bg-muted/20 p-2 rounded">
                          {selectedTask.outputFile || t.tasks.outputPending}
                        </p>
                        {selectedTask.outputFileSize !== undefined && selectedTask.outputFileSize > 0 && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {t.history.outputFileSize}: <span className="font-medium">{formatBytes(selectedTask.outputFileSize)}</span>
                          </p>
                        )}
                      </div>

                      {/* Compression Ratio */}
                      {selectedTask.status === 'completed' &&
                        selectedTask.sourceFileSize && selectedTask.sourceFileSize > 0 &&
                        selectedTask.outputFileSize && selectedTask.outputFileSize > 0 && (
                          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.history.compressionRatio}</label>
                            <div className="mt-2 flex items-baseline gap-2">
                              <span className="text-2xl font-bold text-primary">
                                {((1 - selectedTask.outputFileSize / selectedTask.sourceFileSize) * 100).toFixed(1)}%
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({formatBytes(selectedTask.sourceFileSize - selectedTask.outputFileSize)} saved)
                              </span>
                            </div>
                            <div className="mt-2 flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                {formatBytes(selectedTask.sourceFileSize)} → {formatBytes(selectedTask.outputFileSize)}
                              </span>
                              <span className="font-medium text-primary">
                                {(selectedTask.outputFileSize / selectedTask.sourceFileSize).toFixed(2)}x
                              </span>
                            </div>
                          </div>
                        )}
                    </div>

                    {/* Timestamps */}
                    {selectedTask.createdAt && (
                      <div className="pt-4 border-t">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.tasks.createdAt}</label>
                        <p className="mt-1.5 text-sm">
                          {new Date(selectedTask.createdAt).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US')}
                        </p>
                      </div>
                    )}

                    {selectedTask.startedAt && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.tasks.startedAt}</label>
                        <p className="mt-1.5 text-sm">
                          {new Date(selectedTask.startedAt).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US')}
                        </p>
                      </div>
                    )}

                    {selectedTask.completedAt && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.history.completedAt}</label>
                        <p className="mt-1.5 text-sm">
                          {new Date(selectedTask.completedAt).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US')}
                        </p>
                      </div>
                    )}

                    {/* Duration */}
                    {selectedTask.status === 'completed' && selectedTask.completedAt && selectedTask.startedAt && (
                      <div>
                        <label className="text-xs text-muted-foreground">{t.history.duration}</label>
                        <p className="mt-1 text-sm">
                          {formatDuration(
                            (new Date(selectedTask.completedAt).getTime() - new Date(selectedTask.startedAt).getTime()) / 1000
                          )}
                        </p>
                      </div>
                    )}

                    {/* Error */}
                    {selectedTask.error && (
                      <div>
                        <label className="text-xs text-muted-foreground text-destructive">{t.common.error}</label>
                        <p className="mt-1 text-sm text-destructive bg-destructive/10 p-2 rounded">
                          {selectedTask.error}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t space-y-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => retryMutation.mutate(selectedTask.id)}
                    disabled={retryMutation.isPending}
                    className="w-full"
                  >
                    <RotateCcw className={cn("h-4 w-4 mr-1", retryMutation.isPending && "animate-spin")} />
                    {t.history.retryTask}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(selectedTask.id)}
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {t.common.delete}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-4">
                <p className="text-sm text-muted-foreground text-center">
                  {t.history.selectTaskToView}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={taskToDelete ? t.history.deleteRecord : t.history.deleteRecords}
        description={taskToDelete ? t.history.deleteRecordConfirm : t.history.deleteRecordsConfirm.replace('{count}', selectedTasks.length.toString())}
        confirmText={t.common.delete}
        cancelText={t.common.cancel}
        onConfirm={taskToDelete ? handleConfirmDelete : handleConfirmDeleteSelected}
        variant="destructive"
      />

      {/* Clear All Confirmation Dialog */}
      <ConfirmDialog
        open={clearAllConfirmOpen}
        onOpenChange={setClearAllConfirmOpen}
        title={t.history.clearAllRecords}
        description={t.history.clearAllConfirm}
        confirmText={t.history.clearAllButton}
        cancelText={t.common.cancel}
        onConfirm={handleConfirmClearAll}
        variant="destructive"
      />
    </div>
  )
}
