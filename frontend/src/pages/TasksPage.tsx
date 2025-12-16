import { useApp } from '@/contexts/AppContext'
import TaskList from '@/components/TaskList'

export default function TasksPage() {
  const { t } = useApp()
  
  return (
    <div className="flex flex-1 flex-col">
      <div className="page-header">
        <h1>{t.tasks.title}</h1>
        <p>{t.tasks.subtitle}</p>
      </div>
      <div className="flex-1 min-h-0">
        <TaskList />
      </div>
    </div>
  )
}




