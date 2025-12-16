import { useApp } from '@/contexts/AppContext'
import TaskList from '@/components/TaskList'

export default function TasksPage() {
  const { t } = useApp()
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <h1 className="text-2xl font-bold">{t.tasks.title}</h1>
        <p className="text-sm text-muted-foreground">
          {t.tasks.subtitle}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-4">
        <TaskList />
      </div>
    </div>
  )
}




