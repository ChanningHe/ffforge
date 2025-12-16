import { Link } from 'react-router-dom'
import { FileVideo, ListChecks, Zap } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">欢迎使用 FFmpeg 视频转码工具</h1>
        <p className="text-lg text-muted-foreground">
          强大的视频转码解决方案，支持 H.265/AV1 编码、硬件加速和批量处理
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <FileVideo className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>视频转码</CardTitle>
            <CardDescription>
              浏览服务器文件并配置转码参数
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/transcode">
              <Button className="w-full">开始转码</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <ListChecks className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>任务管理</CardTitle>
            <CardDescription>
              查看和管理转码任务进度
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/tasks">
              <Button variant="outline" className="w-full">查看任务</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Zap className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>硬件加速</CardTitle>
            <CardDescription>
              支持 CPU、NVIDIA、Intel QSV、AMD
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" disabled>
              查看硬件
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>功能特性</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">✨ 多编码器支持</h3>
              <p className="text-sm text-muted-foreground">
                支持 H.265 (HEVC) 和 AV1 编码，可从任意格式转换
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">🚀 批量处理</h3>
              <p className="text-sm text-muted-foreground">
                选择多个文件同时转码，自动队列管理
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">⚡ 硬件加速</h3>
              <p className="text-sm text-muted-foreground">
                支持 NVIDIA NVENC、Intel QSV、AMD AMF 硬件加速
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">📊 实时进度</h3>
              <p className="text-sm text-muted-foreground">
                WebSocket 实时推送进度、速度和预计剩余时间
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">🎛️ 灵活配置</h3>
              <p className="text-sm text-muted-foreground">
                详细的转码参数配置和预设管理
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">💾 任务持久化</h3>
              <p className="text-sm text-muted-foreground">
                任务保存到数据库，重启后自动恢复
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}




