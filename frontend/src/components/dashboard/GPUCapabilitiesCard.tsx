import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Cpu, Info, ChevronRight } from "lucide-react"
import type { GPUCapabilities } from "@/types/hardware"
import { useApp } from "@/contexts/AppContext"

interface GPUCapabilitiesCardProps {
  capabilities: GPUCapabilities | null
  loading: boolean
}

export function GPUCapabilitiesCard({ capabilities, loading }: GPUCapabilitiesCardProps) {
  const { t } = useApp()
  const [dialogOpen, setDialogOpen] = useState(false)
  
  if (loading || !capabilities) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t.home.dashboard.gpuCapabilities}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 animate-pulse bg-muted rounded-md" />
        </CardContent>
      </Card>
    )
  }

  const hasAnyGPU = capabilities.hasIntelVA || capabilities.hasNVIDIA || capabilities.hasAMD

  // Get key formats for preview (H.264, H.265, VP9, AV1, etc.)
  const getKeyFormats = (profiles: string[]) => {
    const keyWords = ['H.264', 'H.265', 'HEVC', 'VP9', 'AV1', 'JPEG']
    return profiles.filter(p => 
      keyWords.some(k => p.includes(k))
    ).slice(0, 4)
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Cpu className="h-5 w-5" />
          {t.home.dashboard.gpuCapabilities}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasAnyGPU && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Info className="h-4 w-4" />
            <span>{t.home.dashboard.noGpuDetected}</span>
          </div>
        )}
        
        {capabilities.hasIntelVA && capabilities.intelVA && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-medium text-sm">Intel VA-API</span>
              <Badge variant="outline" className="text-xs">
                {capabilities.intelVA.profileCount} Profiles
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t.home.dashboard.decodeFormats}:</span>
                <span className="font-medium">{capabilities.intelVA.decodeProfiles.length} formats</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {getKeyFormats(capabilities.intelVA.decodeProfiles).map((profile, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {profile}
                  </Badge>
                ))}
                {capabilities.intelVA.decodeProfiles.length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{capabilities.intelVA.decodeProfiles.length - 4}
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t.home.dashboard.encodeFormats}:</span>
                <span className="font-medium">{capabilities.intelVA.encodeProfiles.length} formats</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {getKeyFormats(capabilities.intelVA.encodeProfiles).map((profile, idx) => (
                  <Badge key={idx} variant="default" className="text-xs">
                    {profile}
                  </Badge>
                ))}
                {capabilities.intelVA.encodeProfiles.length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{capabilities.intelVA.encodeProfiles.length - 4}
                  </Badge>
                )}
              </div>
            </div>

            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full mt-2 h-8 text-xs"
              onClick={() => setDialogOpen(true)}
            >
              View All Capabilities
              <ChevronRight className="ml-1 h-3 w-3" />
            </Button>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogClose onClick={() => setDialogOpen(false)} />
                <DialogHeader>
                  <DialogTitle>Intel VA-API Capabilities</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <h4 className="font-medium mb-2 text-sm">{t.home.dashboard.decodeFormats}</h4>
                    <div className="flex flex-wrap gap-2">
                      {capabilities.intelVA.decodeProfiles.map((profile, idx) => (
                        <Badge key={idx} variant="secondary">
                          {profile}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2 text-sm">{t.home.dashboard.encodeFormats}</h4>
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

        {capabilities.hasNVIDIA && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4" />
            <span>NVIDIA GPU detected - capabilities check coming soon</span>
          </div>
        )}

        {capabilities.hasAMD && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4" />
            <span>AMD GPU detected - capabilities check coming soon</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

