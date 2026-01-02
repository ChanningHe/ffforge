import React from 'react'
import { CheckSquare, Square } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { formatSpeed, formatDuration } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Task, TaskStatus } from '@/types'

// ! PERF: 独立组件 + React.memo，避免列表中无关任务项的重渲染
// 只有当该任务的 props 变化时才会重渲染

interface TaskItemProps {
    task: Task
    isSelected: boolean
    isActive: boolean
    statusLabel: string
    pendingLabel: string
    onSelect: (task: Task) => void
    onToggleSelection: (taskId: string) => void
}

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

export const TaskItem = React.memo(function TaskItem({
    task,
    isSelected,
    isActive,
    statusLabel,
    pendingLabel,
    onSelect,
    onToggleSelection,
}: TaskItemProps) {
    return (
        <div
            className={cn(
                "p-3 rounded-md transition-colors cursor-pointer",
                "hover:bg-accent",
                isActive && "bg-accent",
                isSelected && "bg-primary/5 border-l-2 border-primary"
            )}
            onClick={() => onSelect(task)}
        >
            <div className="flex items-start gap-3">
                {/* Checkbox */}
                <div
                    onClick={(e) => {
                        e.stopPropagation()
                        onToggleSelection(task.id)
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
                            {statusLabel}
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
                                {pendingLabel}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
})
