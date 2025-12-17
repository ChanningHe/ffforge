import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Activity } from "lucide-react"
import type { SystemUsage, SystemHistory } from "@/types/system"
import { useApp } from "@/contexts/AppContext"

interface ResourceMonitorCardProps {
  current: SystemUsage | null
  history: SystemHistory | null
  onRefreshIntervalChange: (interval: number) => void
  refreshInterval: number
}

type ResourceType = 'cpu' | 'memory' | 'load'
type TimeRange = '1h' | '6h' | '12h' | '24h'

export function ResourceMonitorCard({ current, history, onRefreshIntervalChange, refreshInterval }: ResourceMonitorCardProps) {
  const { t } = useApp()
  const [resourceType, setResourceType] = useState<ResourceType>('cpu')
  const [timeRange, setTimeRange] = useState<TimeRange>('1h')

  const chartData = useMemo(() => {
    if (!history?.data) return []

    const now = new Date().getTime()
    const ranges = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
    }
    const cutoff = now - ranges[timeRange]

    return history.data
      .filter(d => new Date(d.timestamp).getTime() > cutoff)
      .map(d => ({
        time: new Date(d.timestamp).toLocaleTimeString(),
        timestamp: new Date(d.timestamp).getTime(),
        cpu: parseFloat(d.cpuPercent.toFixed(1)),
        memory: parseFloat(d.memoryPercent.toFixed(1)),
        load: parseFloat(d.load1.toFixed(2)),
      }))
  }, [history, timeRange])

  const getStrokeColor = (type: ResourceType) => {
    switch (type) {
      case 'cpu': return '#3b82f6' // blue-500
      case 'memory': return '#a855f7' // purple-500
      case 'load': return '#f59e0b' // amber-500
    }
  }

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5" />
          {t.home.dashboard.systemResources}
        </CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t.home.dashboard.update}:</span>
          <Select
            value={refreshInterval.toString()}
            onChange={(v) => onRefreshIntervalChange(parseInt(v))}
            options={[
              { value: "1000", label: "1s" },
              { value: "2000", label: "2s" },
              { value: "5000", label: "5s" },
              { value: "10000", label: "10s" },
            ]}
            className="w-[100px]"
          />
        </div>
      </CardHeader>
      <CardContent>
        {/* Real-time Stats Badges */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div 
            className={`p-3 rounded-lg border cursor-pointer transition-colors ${resourceType === 'cpu' ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800' : 'bg-muted/30 hover:bg-muted/50'}`}
            onClick={() => setResourceType('cpu')}
          >
            <div className="text-sm text-muted-foreground mb-1">{t.home.dashboard.cpuUsage}</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {current ? `${current.cpuPercent.toFixed(1)}%` : '-'}
            </div>
          </div>
          
          <div 
            className={`p-3 rounded-lg border cursor-pointer transition-colors ${resourceType === 'memory' ? 'bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800' : 'bg-muted/30 hover:bg-muted/50'}`}
            onClick={() => setResourceType('memory')}
          >
            <div className="text-sm text-muted-foreground mb-1">{t.home.dashboard.memoryUsage}</div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {current ? `${current.memoryPercent.toFixed(1)}%` : '-'}
            </div>
          </div>

          <div 
            className={`p-3 rounded-lg border cursor-pointer transition-colors ${resourceType === 'load' ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800' : 'bg-muted/30 hover:bg-muted/50'}`}
            onClick={() => setResourceType('load')}
          >
            <div className="text-sm text-muted-foreground mb-1">{t.home.dashboard.loadAverage}</div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {current ? current.load1.toFixed(2) : '-'}
            </div>
          </div>
        </div>

        {/* Chart Controls */}
        <div className="flex justify-end space-x-2 mb-4">
          {(['1h', '6h', '12h', '24h'] as TimeRange[]).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(range)}
              className="h-7 text-xs"
            >
              {range}
            </Button>
          ))}
        </div>

        {/* Chart */}
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id={`color${resourceType}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={getStrokeColor(resourceType)} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={getStrokeColor(resourceType)} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="time" 
                stroke="#888888" 
                fontSize={12} 
                tickLine={false}
                axisLine={false}
                minTickGap={30}
              />
              <YAxis 
                stroke="#888888" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
                domain={[0, resourceType === 'load' ? 'auto' : 100]}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Area 
                type="monotone" 
                dataKey={resourceType === 'load' ? 'load' : resourceType} 
                stroke={getStrokeColor(resourceType)} 
                fillOpacity={1} 
                fill={`url(#color${resourceType})`} 
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
