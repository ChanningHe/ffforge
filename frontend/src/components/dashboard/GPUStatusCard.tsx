import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MonitorPlay, Check, X } from "lucide-react"
import type { HardwareInfo } from "@/types"
import { useApp } from "@/contexts/AppContext"

interface GPUStatusCardProps {
  info: HardwareInfo | null
  loading: boolean
}

export function GPUStatusCard({ info, loading }: GPUStatusCardProps) {
  const { t } = useApp()
  
  if (loading || !info) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t.home.dashboard.hardwareAccel}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 animate-pulse bg-muted rounded-md" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MonitorPlay className="h-5 w-5" />
          {t.home.dashboard.hardwareAccel}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{t.home.dashboard.nvdiaGpu}</span>
            {info.nvidia && info.gpuName && (
              <Badge variant="outline" className="text-xs truncate max-w-[120px]" title={info.gpuName}>
                {info.gpuName}
              </Badge>
            )}
          </div>
          {info.nvidia ? (
            <Badge className="bg-green-500 flex-shrink-0">
              <Check className="h-3 w-3 mr-1" /> {t.home.dashboard.detected}
            </Badge>
          ) : (
            <Badge variant="secondary" className="flex-shrink-0">
              <X className="h-3 w-3 mr-1" /> {t.home.dashboard.notFound}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between border-b pb-2">
          <span className="font-medium text-sm">{t.home.dashboard.intelQsv}</span>
          {info.intel ? (
            <Badge className="bg-blue-500 flex-shrink-0">
              <Check className="h-3 w-3 mr-1" /> {t.home.dashboard.detected}
            </Badge>
          ) : (
            <Badge variant="secondary" className="flex-shrink-0">
              <X className="h-3 w-3 mr-1" /> {t.home.dashboard.notFound}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="font-medium text-sm">{t.home.dashboard.amdAmf}</span>
          {info.amd ? (
            <Badge className="bg-red-500 flex-shrink-0">
              <Check className="h-3 w-3 mr-1" /> {t.home.dashboard.detected}
            </Badge>
          ) : (
            <Badge variant="secondary" className="flex-shrink-0">
              <X className="h-3 w-3 mr-1" /> {t.home.dashboard.notFound}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
