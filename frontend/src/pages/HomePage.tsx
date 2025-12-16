import { Link } from 'react-router-dom'
import { FileVideo, ListChecks, Zap, Github } from 'lucide-react'
import { useApp } from '@/contexts/AppContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  const { t } = useApp()
  
  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{t.home.title}</h1>
        <p className="text-lg text-muted-foreground">
          {t.home.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <FileVideo className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>{t.home.transcode.title}</CardTitle>
            <CardDescription>
              {t.home.transcode.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/transcode">
              <Button className="w-full">{t.home.transcode.button}</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <ListChecks className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>{t.home.tasks.title}</CardTitle>
            <CardDescription>
              {t.home.tasks.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/tasks">
              <Button variant="outline" className="w-full">{t.home.tasks.button}</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Zap className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>{t.home.hardware.title}</CardTitle>
            <CardDescription>
              {t.home.hardware.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" disabled>
              {t.home.hardware.button}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{t.home.features.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">✨ Multiple Encoder Support / 多编码器支持</h3>
              <p className="text-sm text-muted-foreground">
                Support H.265 (HEVC) and AV1 encoding, convert from any format<br />
                支持 H.265 (HEVC) 和 AV1 编码，可从任意格式转换
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">🚀 Batch Processing / 批量处理</h3>
              <p className="text-sm text-muted-foreground">
                Select multiple files for simultaneous transcoding with automatic queue management<br />
                选择多个文件同时转码，自动队列管理
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">⚡ Hardware Acceleration / 硬件加速</h3>
              <p className="text-sm text-muted-foreground">
                Support for NVIDIA NVENC, Intel QSV, AMD AMF hardware acceleration<br />
                支持 NVIDIA NVENC、Intel QSV、AMD AMF 硬件加速
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">📊 Real-time Progress / 实时进度</h3>
              <p className="text-sm text-muted-foreground">
                WebSocket live updates for progress, speed, and estimated time<br />
                WebSocket 实时推送进度、速度和预计剩余时间
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">🎛️ Flexible Configuration / 灵活配置</h3>
              <p className="text-sm text-muted-foreground">
                Detailed transcoding parameter configuration and preset management<br />
                详细的转码参数配置和预设管理
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">💾 Task Persistence / 任务持久化</h3>
              <p className="text-sm text-muted-foreground">
                Tasks saved to database, automatically resume after restart<br />
                任务保存到数据库，重启后自动恢复
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <a 
            href="https://github.com/ChanningHe/ffforge" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 hover:text-primary transition-colors"
          >
            <Github className="h-5 w-5" />
            <span className="font-medium">{t.home.github}</span>
          </a>
        </CardContent>
      </Card>
    </div>
  )
}




