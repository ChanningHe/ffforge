import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, CheckCircle2, XCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { useApp } from '@/contexts/AppContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast'
import { formatDuration } from '@/lib/utils'
import type { TaskStatus } from '@/types'

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

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.getTasks(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      showToast(t.history.recordDeleted, 'success')
    },
    onError: () => {
      showToast(t.history.deleteFailed, 'error')
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

  const handleClearAll = () => {
    setClearAllConfirmOpen(true)
  }

  const handleConfirmClearAll = () => {
    completedTasks.forEach(task => {
      deleteMutation.mutate(task.id)
    })
  }

  // Filter only completed, failed, and cancelled tasks
  const completedTasks = tasks?.filter(t => 
    t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled'
  ) || []

  return (
    <div className="flex flex-1 flex-col">
      <div className="page-header flex items-start justify-between">
        <div>
          <h1>{t.history.title}</h1>
          <p>{t.history.subtitle}</p>
        </div>
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

      <div className="flex-1 min-h-0">
        <div className="h-full flex flex-col">
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
          
          <div className="flex-1 overflow-auto border rounded-lg bg-card">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">{t.common.loading}</p>
              </div>
            ) : (
              <div className="space-y-3 p-4">
                {completedTasks.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {t.history.noHistory}
                  </p>
                ) : (
                  completedTasks.map((task) => (
                    <Card key={task.id}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-sm">{task.sourceFile}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {task.outputFile || t.history.outputPending}
                            </p>
                            {task.completedAt && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {t.history.completedAt}: {new Date(task.completedAt).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US')}
                              </p>
                            )}
                          </div>
                          <Badge variant={getStatusVariant(task.status)} className="flex items-center gap-1">
                            {getStatusIcon(task.status)}
                            {t.tasks.status[task.status]}
                          </Badge>
                        </div>

                        {task.error && (
                          <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                            {task.error}
                          </p>
                        )}

                        {task.status === 'completed' && (
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            {task.completedAt && task.startedAt && (
                              <span>
                                {t.history.duration}: {formatDuration(
                                  (new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime()) / 1000
                                )}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(task.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            {t.common.delete}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={t.history.deleteRecord}
        description={t.history.deleteRecordConfirm}
        confirmText={t.common.delete}
        cancelText={t.common.cancel}
        onConfirm={handleConfirmDelete}
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
