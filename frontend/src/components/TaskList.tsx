import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, CheckSquare, Square, Terminal } from 'lucide-react'
import { api } from '@/lib/api'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useApp } from '@/contexts/AppContext'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Pagination } from '@/components/ui/pagination'
import { useToast } from '@/components/ui/toast'
import { formatSpeed, formatDuration, generateFFmpegCommand } from '@/lib/utils'
import { cn } from '@/lib/utils'
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

  const toggleTaskSelection = (taskId: string) => {
    if (selectedTasks.includes(taskId)) {
      setSelectedTasks(selectedTasks.filter(id => id !== taskId))
    } else {
      setSelectedTasks([...selectedTasks, taskId])
    }
  }

  const selectAllTasks = () => {
    if (selectedTasks.length === activeTasks.length) {
      setSelectedTasks([])
    } else {
      setSelectedTasks(activeTasks.map(t => t.id))
    }
  }

  // Only show active tasks (pending and running)
  const activeTasks = tasks?.filter(t => t.status === 'running' || t.status === 'pending') || []
  const runningTasks = activeTasks.filter(t => t.status === 'running')
  const pendingTasks = activeTasks.filter(t => t.status === 'pending')

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
                                  <Badge variant={getStatusVariant(task.status)} className="flex-shrink-0">
                                    {t.tasks.status[task.status]}
                                  </Badge>
                                </div>

                                {task.status === 'running' && (
                                  <div className="space-y-1">
                                    <Progress value={task.progress} className="h-1" />
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                      <span>{task.progress.toFixed(1)}%</span>
                                      {task.speed > 0 && (
                                        <span className="flex items-center gap-2">
                                          <span>{formatSpeed(task.speed)}</span>
                                          {task.eta > 0 && (
                                            <span>· {formatDuration(task.eta)}</span>
                                          )}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {task.status === 'pending' && (
                                  <div className="space-y-1">
                                    <Progress value={0} className="h-1" />
                                    <p className="text-xs text-muted-foreground">
                                      {t.tasks.status.pending}
                                    </p>
                                  </div>
                                )}
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
