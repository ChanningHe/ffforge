import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, CheckCircle, Clock, XCircle, ListVideo } from "lucide-react"
import type { Task } from "@/types"
import { useApp } from "@/contexts/AppContext"

interface TaskStatusCardProps {
  tasks: Task[]
  loading: boolean
}

export function TaskStatusCard({ tasks, loading }: TaskStatusCardProps) {
  const { t } = useApp()
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t.home.dashboard.taskStats}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 animate-pulse bg-muted rounded-md" />
        </CardContent>
      </Card>
    )
  }

  const stats = {
    active: tasks.filter(t => t.status === 'running').length,
    queued: tasks.filter(t => t.status === 'pending').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    failed: tasks.filter(t => t.status === 'failed' || t.status === 'cancelled').length,
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ListVideo className="h-5 w-5" />
          {t.home.dashboard.taskStats}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col space-y-2 p-3 rounded-lg border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="h-3.5 w-3.5" />
              <span>{t.home.dashboard.active}</span>
            </div>
            <span className="text-2xl font-bold">{stats.active}</span>
          </div>

          <div className="flex flex-col space-y-2 p-3 rounded-lg border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{t.home.dashboard.queued}</span>
            </div>
            <span className="text-2xl font-bold">{stats.queued}</span>
          </div>

          <div className="flex flex-col space-y-2 p-3 rounded-lg border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>{t.home.dashboard.completed}</span>
            </div>
            <span className="text-2xl font-bold">{stats.completed}</span>
          </div>

          <div className="flex flex-col space-y-2 p-3 rounded-lg border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <XCircle className="h-3.5 w-3.5" />
              <span>{t.home.dashboard.failed}</span>
            </div>
            <span className="text-2xl font-bold">{stats.failed}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
