import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, CheckCircle2, XCircle } from 'lucide-react'
import { api } from '@/lib/api'
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

const getStatusText = (status: TaskStatus): string => {
  const statusMap: Record<TaskStatus, string> = {
    pending: '等待中',
    running: '转码中',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消',
  }
  return statusMap[status] || status
}

const getStatusIcon = (status: TaskStatus) => {
  if (status === 'completed') return <CheckCircle2 className="h-4 w-4" />
  if (status === 'failed' || status === 'cancelled') return <XCircle className="h-4 w-4" />
  return null
}

export default function HistoryPage() {
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
      showToast('记录已删除', 'success')
    },
    onError: () => {
      showToast('删除失败', 'error')
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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">历史记录</h1>
            <p className="text-sm text-muted-foreground">
              查看已完成和失败的转码任务
            </p>
          </div>
          {completedTasks.length > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleClearAll}
            >
              清空历史
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-4">
        <div className="h-full flex flex-col">
          <div className="mb-4 flex items-center gap-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-secondary" />
              <span className="text-sm">已完成: {completedTasks.filter(t => t.status === 'completed').length}</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm">失败: {completedTasks.filter(t => t.status === 'failed' || t.status === 'cancelled').length}</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto border rounded-lg bg-card">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">加载中...</p>
              </div>
            ) : (
              <div className="space-y-3 p-4">
                {completedTasks.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    暂无历史记录
                  </p>
                ) : (
                  completedTasks.map((task) => (
                    <Card key={task.id}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-sm">{task.sourceFile}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {task.outputFile || '输出路径待定'}
                            </p>
                            {task.completedAt && (
                              <p className="text-xs text-muted-foreground mt-1">
                                完成时间: {new Date(task.completedAt).toLocaleString('zh-CN')}
                              </p>
                            )}
                          </div>
                          <Badge variant={getStatusVariant(task.status)} className="flex items-center gap-1">
                            {getStatusIcon(task.status)}
                            {getStatusText(task.status)}
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
                                用时: {formatDuration(
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
                            删除
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
        title="删除记录"
        description="确定要删除此记录吗？"
        confirmText="删除"
        cancelText="取消"
        onConfirm={handleConfirmDelete}
        variant="destructive"
      />

      {/* Clear All Confirmation Dialog */}
      <ConfirmDialog
        open={clearAllConfirmOpen}
        onOpenChange={setClearAllConfirmOpen}
        title="清空所有历史记录"
        description="确定要清空所有历史记录吗？此操作不可恢复。"
        confirmText="清空"
        cancelText="取消"
        onConfirm={handleConfirmClearAll}
        variant="destructive"
      />
    </div>
  )
}
