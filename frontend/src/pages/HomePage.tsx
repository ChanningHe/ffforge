import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { SystemInfoCard } from "@/components/dashboard/SystemInfoCard"
import { TaskStatusCard } from "@/components/dashboard/TaskStatusCard"
import { GPUCard } from "@/components/dashboard/GPUCard"
import { ResourceMonitorCard } from "@/components/dashboard/ResourceMonitorCard"
import type { Task, HardwareInfo } from "@/types"
import type { HostInfo, SystemUsage, SystemHistory } from "@/types/system"
import type { GPUCapabilities } from "@/types/hardware"
import { useToast } from "@/components/ui/toast"

export default function HomePage() {
  const [hostInfo, setHostInfo] = useState<HostInfo | null>(null)
  const [hardwareInfo, setHardwareInfo] = useState<HardwareInfo | null>(null)
  const [gpuCapabilities, setGpuCapabilities] = useState<GPUCapabilities | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [currentUsage, setCurrentUsage] = useState<SystemUsage | null>(null)
  const [history, setHistory] = useState<SystemHistory | null>(null)
  
  const [loading, setLoading] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(5000)
  const { showToast } = useToast()

  // Initial Data Load
  useEffect(() => {
    const loadStaticData = async () => {
      try {
        const [host, hardware, capabilities] = await Promise.all([
          api.getSystemHostInfo(),
          api.getHardwareInfo(),
          api.getGPUCapabilities()
        ])
        setHostInfo(host)
        setHardwareInfo(hardware)
        setGpuCapabilities(capabilities)
      } catch (error) {
        console.error("Failed to load system info", error)
        showToast("Failed to load system information", "error")
      } finally {
        setLoading(false)
      }
    }
    loadStaticData()
  }, [])

  // Poll tasks (less frequent)
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const data = await api.getTasks()
        setTasks(data)
      } catch (error) {
        console.error("Failed to fetch tasks", error)
      }
    }

    fetchTasks()
    const interval = setInterval(fetchTasks, 5000)
    return () => clearInterval(interval)
  }, [])

  // Poll System Usage (user configurable interval)
  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const [usage, hist] = await Promise.all([
          api.getSystemUsage(),
          api.getSystemHistory()
        ])
        setCurrentUsage(usage)
        setHistory(hist)
      } catch (error) {
        // Silently fail for polling
        console.error("Failed to poll system usage", error)
      }
    }

    fetchUsage()
    const interval = setInterval(fetchUsage, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval])

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        <SystemInfoCard info={hostInfo} loading={loading} />
        <TaskStatusCard tasks={tasks} loading={loading} />
        <GPUCard 
          hardwareInfo={hardwareInfo} 
          capabilities={gpuCapabilities} 
          loading={loading} 
        />
      </div>

      <div className="grid gap-6 grid-cols-1">
        <ResourceMonitorCard 
          current={currentUsage} 
          history={history} 
          onRefreshIntervalChange={setRefreshInterval}
          refreshInterval={refreshInterval}
        />
      </div>
    </div>
  )
}
