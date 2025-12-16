import TaskList from '@/components/TaskList'

export default function TasksPage() {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <h1 className="text-2xl font-bold">任务列表</h1>
        <p className="text-sm text-muted-foreground">
          查看和管理所有转码任务
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-4">
        <TaskList />
      </div>
    </div>
  )
}




