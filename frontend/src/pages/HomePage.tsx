import { Link } from 'react-router-dom'
import { FileVideo, ListChecks, Zap, Github, ArrowRight, Sparkles, Activity, Shield } from 'lucide-react'
import { useApp } from '@/contexts/AppContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function HomePage() {
  const { t } = useApp()
  
  return (
    <div className="flex flex-1 flex-col gap-8">
      {/* Hero Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-lg -z-10" />
        <div className="py-8 px-6">
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="h-3 w-3 mr-1" />
            v1.0.0
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            {t.home.title}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            {t.home.subtitle}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="group hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/50">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <FileVideo className="h-6 w-6 text-primary" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
            <CardTitle className="text-xl">{t.home.transcode.title}</CardTitle>
            <CardDescription className="text-sm">
              {t.home.transcode.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/transcode">
              <Button className="w-full group-hover:bg-primary/90" size="lg">
                {t.home.transcode.button}
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-lg transition-all duration-200 hover:border-primary/30">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                <ListChecks className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
            <CardTitle className="text-xl">{t.home.tasks.title}</CardTitle>
            <CardDescription className="text-sm">
              {t.home.tasks.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/tasks">
              <Button variant="outline" className="w-full" size="lg">
                {t.home.tasks.button}
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-lg transition-all duration-200 hover:border-primary/30">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                <Zap className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <Badge variant="secondary" className="text-xs">Beta</Badge>
            </div>
            <CardTitle className="text-xl">{t.home.hardware.title}</CardTitle>
            <CardDescription className="text-sm">
              {t.home.hardware.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" size="lg" disabled>
              {t.home.hardware.button}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Features Grid */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold">{t.home.features.title}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="text-2xl">✨</div>
                <div>
                  <CardTitle className="text-base mb-1">Multiple Encoder Support</CardTitle>
                  <CardDescription className="text-xs">多编码器支持</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Support H.265 (HEVC) and AV1 encoding, convert from any format
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="text-2xl">🚀</div>
                <div>
                  <CardTitle className="text-base mb-1">Batch Processing</CardTitle>
                  <CardDescription className="text-xs">批量处理</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Select multiple files for simultaneous transcoding with automatic queue management
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="text-2xl">⚡</div>
                <div>
                  <CardTitle className="text-base mb-1">Hardware Acceleration</CardTitle>
                  <CardDescription className="text-xs">硬件加速</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Support for NVIDIA NVENC, Intel QSV, AMD AMF hardware acceleration
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="text-2xl">📊</div>
                <div>
                  <CardTitle className="text-base mb-1">Real-time Progress</CardTitle>
                  <CardDescription className="text-xs">实时进度</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                WebSocket live updates for progress, speed, and estimated time
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="text-2xl">🎛️</div>
                <div>
                  <CardTitle className="text-base mb-1">Flexible Configuration</CardTitle>
                  <CardDescription className="text-xs">灵活配置</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Detailed transcoding parameter configuration and preset management
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="text-2xl">💾</div>
                <div>
                  <CardTitle className="text-base mb-1">Task Persistence</CardTitle>
                  <CardDescription className="text-xs">任务持久化</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Tasks saved to database, automatically resume after restart
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer Card */}
      <Card className="border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-background">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{t.home.github}</p>
                <p className="text-sm text-muted-foreground">Open source on GitHub</p>
              </div>
            </div>
            <a 
              href="https://github.com/ChanningHe/ffforge" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="gap-2">
                <Github className="h-4 w-4" />
                View on GitHub
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
