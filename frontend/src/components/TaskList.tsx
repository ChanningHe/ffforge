import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, CheckSquare, Square, Terminal } from 'lucide-react'
import { api } from '@/lib/api'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useCommandPreview } from '@/hooks/useCommandPreview'
import { useApp } from '@/contexts/AppContext'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Pagination } from '@/components/ui/pagination'
import { useToast } from '@/components/ui/toast'
import { TaskItem } from '@/components/TaskItem'
import { formatSpeed, formatDuration } from '@/lib/utils'
import type { Task, TaskStatus, ProgressUpdate } from '@/types'

const getStatusVariant = (status: TaskStatus): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'running':
      return 'default'
    case 'completed':
      return 'secondary'
    case 'failed':
    case 'cancelled':
      return 'destructive'
    default:
      return 'outline'
  }
}

export default function TaskList() {
  const { t, language } = useApp()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
  const [cancelMultipleConfirmOpen, setCancelMultipleConfirmOpen] = useState(false)
  const [taskToCancel, setTaskToCancel] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Get command preview for selected task (when actualCommand is not available)
  const { command: previewCommand } = useCommandPreview(
    selectedTask?.actualCommand ? null : selectedTask?.config || null,
    { sourceFile: selectedTask?.sourceFile }
  )

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.getTasks(),
    refetchInterval: 5000, // Refetch every 5 seconds (fallback)
  })

  // WebSocket for real-time updates
  useWebSocket({
    onMessage: (update: ProgressUpdate) => {
      // Update task in cache
      queryClient.setQueryData(['tasks'], (oldTasks: Task[] | undefined) => {
        if (!oldTasks) return oldTasks

        return oldTasks.map((task) => {
          if (task.id === update.taskId) {
            return {
              ...task,
              status: update.status || task.status,
              progress: update.progress !== undefined ? update.progress : task.progress,
              speed: update.speed !== undefined ? update.speed : task.speed,
              eta: update.eta !== undefined ? update.eta : task.eta,
              error: update.error || task.error,
            }
          }
          return task
        })
      })
    },
    onOpen: () => {
      console.log('WebSocket connected')
    },
    onClose: () => {
      console.log('WebSocket disconnected')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.cancelTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      showToast(t.tasks.taskCancelled, 'success')
    },
    onError: () => {
      showToast(t.tasks.cancelFailed, 'error')
    },
  })

  const cancelMultipleMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => api.cancelTask(id)))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      showToast(t.tasks.tasksCancelled, 'success')
      setSelectedTasks([])
      setSelectedTask(null)
    },
    onError: () => {
      showToast(t.tasks.cancelFailed, 'error')
    },
  })

  const pauseMutation = useMutation({
    mutationFn: (id: string) => api.pauseTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      showToast(t.tasks.taskPaused, 'success')
    },
    onError: () => {
      showToast(t.tasks.pauseFailed, 'error')
    },
  })

  const resumeMutation = useMutation({
    mutationFn: (id: string) => api.resumeTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      showToast(t.tasks.taskResumed, 'success')
    },
    onError: () => {
      showToast(t.tasks.resumeFailed, 'error')
    },
  })

  const handlePause = (id: string) => {
    pauseMutation.mutate(id)
  }

  const handleResume = (id: string) => {
    resumeMutation.mutate(id)
  }

  const handleCancel = (id: string) => {
    setTaskToCancel(id)
    setCancelConfirmOpen(true)
  }

  const handleConfirmCancel = () => {
    if (taskToCancel) {
      cancelMutation.mutate(taskToCancel)
      setTaskToCancel(null)
    }
  }

  const handleCancelSelected = () => {
    if (selectedTasks.length > 0) {
      setTaskToCancel(null) // Clear single task cancellation
      setCancelMultipleConfirmOpen(true)
    }
  }

  const handleConfirmCancelSelected = () => {
    if (selectedTasks.length > 0) {
      cancelMultipleMutation.mutate(selectedTasks)
      setCancelMultipleConfirmOpen(false)
    }
  }

  // ! PERF: 使用 useCallback + 函数式更新，确保引用稳定
  const toggleTaskSelection = useCallback((taskId: string) => {
    setSelectedTasks(prev => {
      if (prev.includes(taskId)) {
        return prev.filter(id => id !== taskId)
      } else {
        return [...prev, taskId]
      }
    })
  }, [])

  const selectAllTasks = () => {
    if (selectedTasks.length === activeTasks.length) {
      setSelectedTasks([])
    } else {
      setSelectedTasks(activeTasks.map(t => t.id))
    }
  }

  // Only show active tasks (pending, paused, and running)
  // Sort: running tasks first, then pending, then paused, finally by createdAt descending (newest first)
  const activeTasks = (tasks?.filter(t => t.status === 'running' || t.status === 'pending' || t.status === 'paused') || [])
    .sort((a, b) => {
      // Running tasks come first
      if (a.status === 'running' && b.status !== 'running') return -1
      if (b.status === 'running' && a.status !== 'running') return 1
      // Then pending tasks
      if (a.status === 'pending' && b.status === 'paused') return -1
      if (b.status === 'pending' && a.status === 'paused') return 1
      // Then sort by createdAt descending (newest first)
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    })
  const runningTasks = activeTasks.filter(t => t.status === 'running')
  const pendingTasks = activeTasks.filter(t => t.status === 'pending')
  const pausedTasks = activeTasks.filter(t => t.status === 'paused')

  // Pagination
  const totalItems = activeTasks.length
  const paginatedTasks = activeTasks.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Reset to first page when pageSize changes or tasks update significantly
  const handlePageSizeChange = (size: number) => {
    setPageSize(size)
    setCurrentPage(1)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with stats and actions */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-primary animate-pulse"></div>
            <span className="text-sm">{t.tasks.runningCount}: {runningTasks.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-muted"></div>
            <span className="text-sm">{t.tasks.pendingCount}: {pendingTasks.length}</span>
          </div>
          {pausedTasks.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
              <span className="text-sm">{t.tasks.pausedCount}: {pausedTasks.length}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {selectedTasks.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancelSelected}
            >
              <X className="h-4 w-4 mr-1" />
              {t.tasks.cancelSelected} ({selectedTasks.length})
            </Button>
          )}
        </div>
      </div>

      {/* Two column layout: Task List (left) + Details (right) */}
      <div className="flex-1 min-h-0">
        <div className="h-full grid grid-cols-12 gap-4">
          {/* Left: Task List - 67% */}
          <div className="col-span-8 flex flex-col border rounded-lg bg-card">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">{t.common.loading}</p>
              </div>
            ) : (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-auto p-3">
                  {/* Toolbar */}
                  {activeTasks.length > 0 && (
                    <div className="flex items-center justify-between bg-muted/40 p-2 rounded-md mb-2">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={selectAllTasks}
                          className="hover:bg-background"
                        >
                          {selectedTasks.length === activeTasks.length ? (
                            <CheckSquare className="h-4 w-4 mr-2 text-primary" />
                          ) : (
                            <Square className="h-4 w-4 mr-2 text-muted-foreground" />
                          )}
                          <span className="font-medium">{t.tasks.selectAll}</span>
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

                  {activeTasks.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      {t.tasks.noTasks}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {paginatedTasks.map((task) => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          isSelected={selectedTasks.includes(task.id)}
                          isActive={selectedTask?.id === task.id}
                          statusLabel={t.tasks.status[task.status]}
                          pendingLabel={t.tasks.status.pending}
                          onSelect={setSelectedTask}
                          onToggleSelection={toggleTaskSelection}
                        />
                      ))}
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
                  <h3 className="text-sm font-semibold text-foreground mb-4 pb-2 border-b">{t.tasks.taskDetails}</h3>

                  {/* Status and Progress */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.tasks.status.title}</label>
                      <div className="mt-1.5">
                        <Badge variant={getStatusVariant(selectedTask.status)}>
                          {t.tasks.status[selectedTask.status]}
                        </Badge>
                      </div>
                    </div>

                    {(selectedTask.status === 'running' || selectedTask.status === 'pending') && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.tasks.progress}</label>
                        <div className="mt-1.5 space-y-2">
                          <Progress value={selectedTask.progress} />
                          <div className="flex justify-between text-sm">
                            <span>{selectedTask.progress.toFixed(1)}%</span>
                            {selectedTask.speed > 0 && (
                              <span className="text-muted-foreground">
                                {formatSpeed(selectedTask.speed)}
                              </span>
                            )}
                          </div>
                          {selectedTask.eta > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {t.tasks.eta}: {formatDuration(selectedTask.eta)}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

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
                          {selectedTask.actualCommand ? "Executed Command" : t.config.ffmpegCommand}
                        </label>
                        <div className="mt-2 bg-muted/30 border rounded p-3">
                          <code className="text-[10px] font-mono break-all whitespace-pre-wrap text-foreground/90">
                            {selectedTask.actualCommand || previewCommand || 'Loading...'}
                          </code>
                        </div>
                      </div>
                    )}

                    {/* Files */}
                    <div className="pt-4 border-t space-y-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.tasks.sourceFile}</label>
                        <p className="mt-1.5 text-xs font-mono break-all bg-muted/20 p-2 rounded">{selectedTask.sourceFile}</p>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.tasks.outputFile}</label>
                        <p className="mt-1.5 text-xs font-mono break-all bg-muted/20 p-2 rounded">
                          {selectedTask.outputFile || t.tasks.outputPending}
                        </p>
                      </div>
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
                  {selectedTask.status === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePause(selectedTask.id)}
                      className="w-full"
                    >
                      {t.tasks.pause}
                    </Button>
                  )}
                  {selectedTask.status === 'paused' && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleResume(selectedTask.id)}
                      className="w-full"
                    >
                      {t.tasks.resume}
                    </Button>
                  )}
                  {selectedTask.status === 'running' && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleCancel(selectedTask.id)}
                      className="w-full"
                    >
                      <X className="h-4 w-4 mr-1" />
                      {t.tasks.cancel}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-4">
                <p className="text-sm text-muted-foreground text-center">
                  {t.tasks.selectTaskToView}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Single Task Confirmation Dialog */}
      <ConfirmDialog
        open={cancelConfirmOpen}
        onOpenChange={setCancelConfirmOpen}
        title={t.tasks.cancelTask}
        description={t.tasks.cancelTaskConfirm}
        confirmText={t.tasks.cancelTaskButton}
        cancelText={t.tasks.back}
        onConfirm={handleConfirmCancel}
        variant="destructive"
      />

      {/* Cancel Multiple Tasks Confirmation Dialog */}
      <ConfirmDialog
        open={cancelMultipleConfirmOpen}
        onOpenChange={setCancelMultipleConfirmOpen}
        title={t.tasks.cancelTasks}
        description={t.tasks.cancelTasksConfirm.replace('{count}', selectedTasks.length.toString())}
        confirmText={t.tasks.cancelTasksButton}
        cancelText={t.tasks.back}
        onConfirm={handleConfirmCancelSelected}
        variant="destructive"
      />
    </div>
  )
}
