import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, X } from 'lucide-react'
import { api } from '@/lib/api'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useApp } from '@/contexts/AppContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast'
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
  const { t } = useApp()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null)
  const [taskToCancel, setTaskToCancel] = useState<string | null>(null)

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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      showToast(t.tasks.taskDeleted, 'success')
    },
    onError: () => {
      showToast(t.tasks.deleteFailed, 'error')
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

  const handleDelete = (id: string) => {
    setTaskToDelete(id)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = () => {
    if (taskToDelete) {
      deleteMutation.mutate(taskToDelete)
      setTaskToDelete(null)
    }
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

  // Only show active tasks (pending and running)
  const activeTasks = tasks?.filter(t => t.status === 'running' || t.status === 'pending') || []
  const runningTasks = activeTasks.filter(t => t.status === 'running')
  const pendingTasks = activeTasks.filter(t => t.status === 'pending')

  return (
    <div className="h-full flex flex-col">
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
      </div>
      
      <div className="flex-1 overflow-auto border rounded-lg bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">{t.common.loading}</p>
          </div>
        ) : (
          <div className="space-y-3 p-4">
            {activeTasks.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {t.tasks.noTasks}
              </p>
            ) : (
              activeTasks.map((task) => (
                <Card key={task.id}>
                  <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{task.sourceFile}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {task.outputFile || t.tasks.outputPending}
                      </p>
                    </div>
                    <Badge variant={getStatusVariant(task.status)}>
                      {t.tasks.status[task.status]}
                    </Badge>
                  </div>

                  {(task.status === 'running' || task.status === 'pending') && (
                    <div className="space-y-2">
                      <Progress value={task.progress} />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{task.progress.toFixed(1)}%</span>
                        {task.speed > 0 && (
                          <>
                            <span>{t.tasks.speed}: {formatSpeed(task.speed)}</span>
                            {task.eta > 0 && (
                              <span>{t.tasks.eta}: {formatDuration(task.eta)}</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {task.error && (
                    <p className="text-sm text-destructive">{task.error}</p>
                  )}

                  <div className="flex gap-2">
                    {task.status === 'running' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancel(task.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        {t.tasks.cancel}
                      </Button>
                    )}
                    {(task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(task.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        {t.common.delete}
                      </Button>
                    )}
                  </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={t.tasks.deleteTask}
        description={t.tasks.deleteTaskConfirm}
        confirmText={t.common.delete}
        cancelText={t.common.cancel}
        onConfirm={handleConfirmDelete}
        variant="destructive"
      />

      {/* Cancel Confirmation Dialog */}
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
    </div>
  )
}
