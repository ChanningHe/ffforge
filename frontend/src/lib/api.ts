import type { FileInfo, Task, Preset, HardwareInfo, TranscodeConfig, Settings } from '@/types'
import type { HostInfo, SystemUsage, SystemHistory } from '@/types/system'
import type { GPUCapabilities } from '@/types/hardware'

const API_BASE = '/api'

// API Client
class APIClient {
  // Files
  async browseFiles(path: string = ''): Promise<FileInfo[]> {
    const response = await fetch(`${API_BASE}/files/browse?path=${encodeURIComponent(path)}`)
    if (!response.ok) throw new Error('Failed to browse files')
    return response.json()
  }

  async getVideoInfo(path: string): Promise<FileInfo> {
    const response = await fetch(`${API_BASE}/files/info?path=${encodeURIComponent(path)}`)
    if (!response.ok) throw new Error('Failed to get video info')
    return response.json()
  }

  async getDefaultPath(): Promise<string> {
    const response = await fetch(`${API_BASE}/files/default-path`)
    if (!response.ok) throw new Error('Failed to get default path')
    const data = await response.json()
    return data.defaultPath
  }

  // Tasks
  async getTasks(): Promise<Task[]> {
    const response = await fetch(`${API_BASE}/tasks`)
    if (!response.ok) throw new Error('Failed to get tasks')
    return response.json()
  }

  async getTask(id: string): Promise<Task> {
    const response = await fetch(`${API_BASE}/tasks/${id}`)
    if (!response.ok) throw new Error('Failed to get task')
    return response.json()
  }

  async createTasks(sourceFiles: string[], preset?: string, config?: TranscodeConfig): Promise<Task[]> {
    const response = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceFiles, preset, config }),
    })
    if (!response.ok) throw new Error('Failed to create tasks')
    return response.json()
  }

  async deleteTask(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error('Failed to delete task')
  }

  async cancelTask(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/tasks/${id}/cancel`, {
      method: 'PUT',
    })
    if (!response.ok) throw new Error('Failed to cancel task')
  }

  // Presets
  async getPresets(): Promise<Preset[]> {
    const response = await fetch(`${API_BASE}/presets`)
    if (!response.ok) throw new Error('Failed to get presets')
    return response.json()
  }

  async getPreset(id: string): Promise<Preset> {
    const response = await fetch(`${API_BASE}/presets/${id}`)
    if (!response.ok) throw new Error('Failed to get preset')
    return response.json()
  }

  async createPreset(name: string, description: string, config: TranscodeConfig): Promise<Preset> {
    const response = await fetch(`${API_BASE}/presets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, config }),
    })
    if (!response.ok) throw new Error('Failed to create preset')
    return response.json()
  }

  async updatePreset(id: string, name: string, description: string, config: TranscodeConfig): Promise<Preset> {
    const response = await fetch(`${API_BASE}/presets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, config }),
    })
    if (!response.ok) throw new Error('Failed to update preset')
    return response.json()
  }

  async deletePreset(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/presets/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error('Failed to delete preset')
  }

  // Hardware
  async getHardwareInfo(): Promise<HardwareInfo> {
    const response = await fetch(`${API_BASE}/hardware`)
    if (!response.ok) throw new Error('Failed to get hardware info')
    return response.json()
  }

  async getGPUCapabilities(): Promise<GPUCapabilities> {
    const response = await fetch(`${API_BASE}/hardware/capabilities`)
    if (!response.ok) throw new Error('Failed to get GPU capabilities')
    return response.json()
  }

  // System
  async getSystemHostInfo(): Promise<HostInfo> {
    const response = await fetch(`${API_BASE}/system/host`)
    if (!response.ok) throw new Error('Failed to get system host info')
    return response.json()
  }

  async getSystemUsage(): Promise<SystemUsage> {
    const response = await fetch(`${API_BASE}/system/usage`)
    if (!response.ok) throw new Error('Failed to get system usage')
    return response.json()
  }

  async getSystemHistory(): Promise<SystemHistory> {
    const response = await fetch(`${API_BASE}/system/history`)
    if (!response.ok) throw new Error('Failed to get system history')
    return response.json()
  }

  // Settings
  async getSettings(): Promise<Settings> {
    const response = await fetch(`${API_BASE}/settings`)
    if (!response.ok) throw new Error('Failed to get settings')
    return response.json()
  }

  async updateSettings(settings: Partial<Settings>): Promise<Settings> {
    const response = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    if (!response.ok) throw new Error('Failed to update settings')
    return response.json()
  }
}

export const api = new APIClient()
