import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Monitor, Cpu, HardDrive, Terminal } from "lucide-react"
import type { HostInfo } from "@/types/system"
import { useApp } from "@/contexts/AppContext"

interface SystemInfoCardProps {
  info: HostInfo | null
  loading: boolean
}

export function SystemInfoCard({ info, loading }: SystemInfoCardProps) {
  const { t } = useApp()
  
  if (loading || !info) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t.home.dashboard.systemInfo}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 animate-pulse bg-muted rounded-md" />
        </CardContent>
      </Card>
    )
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Terminal className="h-5 w-5 flex-shrink-0" />
          <span className="truncate">{t.home.dashboard.systemInfo}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-3 border-b pb-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-shrink-0">
            <Monitor className="h-4 w-4 flex-shrink-0" />
            <span className="whitespace-nowrap">{t.home.dashboard.hostname}</span>
          </div>
          <span className="font-medium text-sm truncate" title={info.hostname}>{info.hostname}</span>
        </div>

        <div className="flex items-center justify-between gap-3 border-b pb-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-shrink-0">
            <HardDrive className="h-4 w-4 flex-shrink-0" />
            <span className="whitespace-nowrap">{t.home.dashboard.osKernel}</span>
          </div>
          <div className="flex flex-col items-end min-w-0">
            <span className="font-medium text-sm truncate max-w-full" title={info.os}>
              {info.os}
            </span>
            <span className="text-xs text-muted-foreground truncate max-w-full" title={info.kernelVersion}>
              {info.kernelVersion}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-b pb-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-shrink-0">
            <Cpu className="h-4 w-4 flex-shrink-0" />
            <span className="whitespace-nowrap">{t.home.dashboard.cpu}</span>
          </div>
          <div className="flex flex-col items-end min-w-0">
            <span className="font-medium text-sm truncate max-w-full" title={info.cpuModel}>{info.cpuModel}</span>
            <div className="flex gap-1.5 mt-1">
              <Badge variant="secondary" className="text-xs">{info.cpuCores} {t.home.dashboard.cores}</Badge>
              <Badge variant="secondary" className="text-xs">{info.arch}</Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-shrink-0">
            <Monitor className="h-4 w-4 flex-shrink-0" />
            <span className="whitespace-nowrap">{t.home.dashboard.memory}</span>
          </div>
          <span className="font-medium">{formatBytes(info.totalMemory)}</span>
        </div>
      </CardContent>
    </Card>
  )
}
