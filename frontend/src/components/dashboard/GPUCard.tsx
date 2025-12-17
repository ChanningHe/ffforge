import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { MonitorPlay, Check, X, ChevronRight } from "lucide-react"
import type { HardwareInfo } from "@/types"
import type { GPUCapabilities } from "@/types/hardware"
import { useApp } from "@/contexts/AppContext"

interface GPUCardProps {
  hardwareInfo: HardwareInfo | null
  capabilities: GPUCapabilities | null
  loading: boolean
}

type GPUType = 'nvidia' | 'intel' | 'amd'

export function GPUCard({ hardwareInfo, capabilities, loading }: GPUCardProps) {
  const { t } = useApp()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedGPU, setSelectedGPU] = useState<GPUType>('nvidia')
  
  // Auto-select first available GPU when hardware info loads
  useEffect(() => {
    if (hardwareInfo) {
      if (hardwareInfo.nvidia) {
        setSelectedGPU('nvidia')
      } else if (hardwareInfo.intel) {
        setSelectedGPU('intel')
      } else if (hardwareInfo.amd) {
        setSelectedGPU('amd')
      }
    }
  }, [hardwareInfo])
  
  if (loading || !hardwareInfo || !capabilities) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t.home.dashboard.gpuAndHardware}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 animate-pulse bg-muted rounded-md" />
        </CardContent>
      </Card>
    )
  }

  const hasAnyGPU = hardwareInfo.nvidia || hardwareInfo.intel || hardwareInfo.amd

  // Get key formats for preview
  const getKeyFormats = (profiles: string[]) => {
    const keyWords = ['H.264', 'H.265', 'HEVC', 'VP9', 'AV1']
    return profiles.filter(p => 
      keyWords.some(k => p.includes(k))
    ).slice(0, 4)
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg flex-shrink-0">
            <MonitorPlay className="h-5 w-5" />
            <span className="truncate">{t.home.dashboard.gpuAndHardware}</span>
          </CardTitle>
          
          {/* GPU Type Selector */}
          <div className="flex gap-1 flex-shrink-0">
            <Button
              variant={selectedGPU === 'nvidia' ? 'default' : 'outline'}
              size="sm"
              className="h-7 px-2 sm:px-3 text-xs"
              onClick={() => setSelectedGPU('nvidia')}
              disabled={!hardwareInfo.nvidia}
            >
              {t.home.dashboard.nvidia}
            </Button>
            <Button
              variant={selectedGPU === 'intel' ? 'default' : 'outline'}
              size="sm"
              className="h-7 px-2 sm:px-3 text-xs"
              onClick={() => setSelectedGPU('intel')}
              disabled={!hardwareInfo.intel}
            >
              {t.home.dashboard.intel}
            </Button>
            <Button
              variant={selectedGPU === 'amd' ? 'default' : 'outline'}
              size="sm"
              className="h-7 px-2 sm:px-3 text-xs"
              onClick={() => setSelectedGPU('amd')}
              disabled={!hardwareInfo.amd}
            >
              {t.home.dashboard.amd}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {!hasAnyGPU && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <X className="h-12 w-12 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">{t.home.dashboard.noGpuDetected}</p>
          </div>
        )}

        {/* NVIDIA Content */}
        {selectedGPU === 'nvidia' && hardwareInfo.nvidia && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Badge className="bg-green-500 w-fit">
                <Check className="h-3 w-3 mr-1" /> {t.home.dashboard.detected}
              </Badge>
              {hardwareInfo.gpuName && (
                <span className="text-sm text-muted-foreground truncate" title={hardwareInfo.gpuName}>
                  {hardwareInfo.gpuName}
                </span>
              )}
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                {t.home.dashboard.nvencAvailable}
              </p>
            </div>
          </div>
        )}

        {/* Intel Content */}
        {selectedGPU === 'intel' && hardwareInfo.intel && capabilities.hasIntelVA && capabilities.intelVA && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-green-500">
                <Check className="h-3 w-3 mr-1" /> {t.home.dashboard.detected}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {capabilities.intelVA.profileCount} {t.home.dashboard.profiles}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t.home.dashboard.decodeFormats}:</span>
                  <span className="font-medium">{capabilities.intelVA.decodeProfiles.length}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {getKeyFormats(capabilities.intelVA.decodeProfiles).map((profile, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs py-0 h-5">
                      {profile}
                    </Badge>
                  ))}
                  {capabilities.intelVA.decodeProfiles.length > 4 && (
                    <Badge variant="outline" className="text-xs py-0 h-5">
                      +{capabilities.intelVA.decodeProfiles.length - 4}
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t.home.dashboard.encodeFormats}:</span>
                  <span className="font-medium">{capabilities.intelVA.encodeProfiles.length}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {getKeyFormats(capabilities.intelVA.encodeProfiles).map((profile, idx) => (
                    <Badge key={idx} variant="default" className="text-xs py-0 h-5">
                      {profile}
                    </Badge>
                  ))}
                  {capabilities.intelVA.encodeProfiles.length > 4 && (
                    <Badge variant="outline" className="text-xs py-0 h-5">
                      +{capabilities.intelVA.encodeProfiles.length - 4}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full h-8 text-xs"
              onClick={() => setDialogOpen(true)}
            >
              {t.home.dashboard.viewFullCapabilities}
              <ChevronRight className="ml-1 h-3 w-3" />
            </Button>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogClose onClick={() => setDialogOpen(false)} />
                <DialogHeader>
                  <DialogTitle>Intel VA-API {t.home.dashboard.fullCapabilities}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <h4 className="font-medium mb-2 text-sm flex items-center gap-2">
                      {t.home.dashboard.decodeFormats}
                      <Badge variant="outline" className="text-xs">
                        {capabilities.intelVA.decodeProfiles.length}
                      </Badge>
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {capabilities.intelVA.decodeProfiles.map((profile, idx) => (
                        <Badge key={idx} variant="secondary">
                          {profile}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2 text-sm flex items-center gap-2">
                      {t.home.dashboard.encodeFormats}
                      <Badge variant="outline" className="text-xs">
                        {capabilities.intelVA.encodeProfiles.length}
                      </Badge>
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {capabilities.intelVA.encodeProfiles.map((profile, idx) => (
                        <Badge key={idx} variant="default">
                          {profile}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* AMD Content */}
        {selectedGPU === 'amd' && hardwareInfo.amd && (
          <div className="space-y-3">
            <Badge className="bg-green-500 w-fit">
              <Check className="h-3 w-3 mr-1" /> {t.home.dashboard.detected}
            </Badge>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                {t.home.dashboard.capabilitiesComingSoon}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
