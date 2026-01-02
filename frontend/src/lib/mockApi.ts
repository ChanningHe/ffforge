// Mock API Client for frontend development/testing
import type { FileInfo, Task, Preset, HardwareInfo, TranscodeConfig, Settings } from '@/types'
import type { HostInfo, SystemUsage, SystemHistory } from '@/types/system'
import type { GPUCapabilities } from '@/types/hardware'
import {
    mockFiles,
    mockTasks,
    mockPresets,
    mockHostInfo,
    mockHardwareInfo,
    mockGPUCapabilities,
    mockSettings,
    generateSystemUsage,
    generateSystemHistory,
} from './mockData'

// Simulate network delay (50-200ms)
const delay = (ms: number = 100) => new Promise(resolve => setTimeout(resolve, 50 + Math.random() * ms))

// In-memory state for mutations
let tasks = [...mockTasks]
let presets = [...mockPresets]
let settings = { ...mockSettings }
let taskIdCounter = 100

// Mock API Client with same interface as real APIClient
class MockAPIClient {
    // Files
    async browseFiles(path: string = ''): Promise<FileInfo[]> {
        await delay()
        const normalizedPath = path || '/'
        return mockFiles[normalizedPath] || []
    }

    async getVideoInfo(path: string): Promise<FileInfo> {
        await delay()
        // Find the file in mock data
        for (const files of Object.values(mockFiles)) {
            const file = files.find(f => f.path === path)
            if (file) return file
        }
        throw new Error('File not found')
    }

    async getDefaultPath(): Promise<string> {
        await delay()
        return '/Videos'
    }

    // Tasks
    async getTasks(): Promise<Task[]> {
        await delay()
        // Simulate progress for running tasks
        tasks = tasks.map(task => {
            if (task.status === 'running' && task.progress < 100) {
                const newProgress = Math.min(100, task.progress + Math.random() * 2)
                if (newProgress >= 100) {
                    return {
                        ...task,
                        status: 'completed' as const,
                        progress: 100,
                        speed: 0,
                        eta: 0,
                        completedAt: new Date().toISOString(),
                        outputFileSize: Math.floor((task.sourceFileSize || 1000000) * 0.5),
                    }
                }
                return {
                    ...task,
                    progress: newProgress,
                    speed: 1.5 + Math.random() * 2,
                    eta: Math.floor((100 - newProgress) / 2 * 60),
                }
            }
            return task
        })
        return tasks
    }

    async getTask(id: string): Promise<Task> {
        await delay()
        const task = tasks.find(t => t.id === id)
        if (!task) throw new Error('Task not found')
        return task
    }

    async createTasks(sourceFiles: string[], _preset?: string, config?: TranscodeConfig): Promise<Task[]> {
        await delay(200)
        const newTasks: Task[] = sourceFiles.map(file => {
            const id = `task-mock-${++taskIdCounter}`
            // Find file info
            let fileInfo: FileInfo | undefined
            for (const files of Object.values(mockFiles)) {
                fileInfo = files.find(f => f.path === file)
                if (fileInfo) break
            }

            return {
                id,
                sourceFile: file,
                outputFile: '',
                status: 'pending' as const,
                progress: 0,
                speed: 0,
                eta: 0,
                createdAt: new Date().toISOString(),
                sourceFileSize: fileInfo?.size || 100000000,
                config: config || {
                    encoder: 'h265',
                    hardwareAccel: 'cpu',
                    video: { crf: 23, preset: 'medium' },
                    audio: { codec: 'copy' },
                    output: { container: 'mp4', suffix: '_encoded', pathType: 'default' },
                },
            }
        })

        // Start first pending task
        if (newTasks.length > 0) {
            newTasks[0].status = 'running'
            newTasks[0].startedAt = new Date().toISOString()
        }

        tasks = [...tasks, ...newTasks]
        return newTasks
    }

    async deleteTask(id: string): Promise<void> {
        await delay()
        tasks = tasks.filter(t => t.id !== id)
    }

    async cancelTask(id: string): Promise<void> {
        await delay()
        tasks = tasks.map(t =>
            t.id === id
                ? { ...t, status: 'cancelled' as const, completedAt: new Date().toISOString() }
                : t
        )
    }

    async pauseTask(id: string): Promise<Task> {
        await delay()
        tasks = tasks.map(t =>
            t.id === id && t.status === 'pending'
                ? { ...t, status: 'paused' as const }
                : t
        )
        const task = tasks.find(t => t.id === id)
        if (!task) throw new Error('Task not found')
        return task
    }

    async resumeTask(id: string): Promise<Task> {
        await delay()
        tasks = tasks.map(t =>
            t.id === id && t.status === 'paused'
                ? { ...t, status: 'pending' as const }
                : t
        )
        const task = tasks.find(t => t.id === id)
        if (!task) throw new Error('Task not found')
        return task
    }

    async retryTask(id: string): Promise<Task> {
        await delay(200)
        const originalTask = tasks.find(t => t.id === id)
        if (!originalTask) throw new Error('Task not found')

        const newTask: Task = {
            id: `task-mock-${++taskIdCounter}`,
            sourceFile: originalTask.sourceFile,
            outputFile: '',
            status: 'pending' as const,
            progress: 0,
            speed: 0,
            eta: 0,
            createdAt: new Date().toISOString(),
            sourceFileSize: originalTask.sourceFileSize,
            config: originalTask.config,
        }

        tasks = [...tasks, newTask]
        return newTask
    }

    // Presets
    async getPresets(): Promise<Preset[]> {
        await delay()
        return presets
    }

    async getPreset(id: string): Promise<Preset> {
        await delay()
        const preset = presets.find(p => p.id === id)
        if (!preset) throw new Error('Preset not found')
        return preset
    }

    async createPreset(name: string, description: string, config: TranscodeConfig): Promise<Preset> {
        await delay(200)
        const newPreset: Preset = {
            id: `preset-mock-${Date.now()}`,
            name,
            description,
            config,
            isBuiltin: false,
            createdAt: new Date().toISOString(),
        }
        presets = [...presets, newPreset]
        return newPreset
    }

    async updatePreset(id: string, name: string, description: string, config: TranscodeConfig): Promise<Preset> {
        await delay(200)
        presets = presets.map(p =>
            p.id === id ? { ...p, name, description, config } : p
        )
        const updated = presets.find(p => p.id === id)
        if (!updated) throw new Error('Preset not found')
        return updated
    }

    async deletePreset(id: string): Promise<void> {
        await delay()
        presets = presets.filter(p => p.id !== id)
    }

    // Hardware
    async getHardwareInfo(): Promise<HardwareInfo> {
        await delay()
        return mockHardwareInfo
    }

    async getGPUCapabilities(): Promise<GPUCapabilities> {
        await delay()
        return mockGPUCapabilities
    }

    // System
    async getSystemHostInfo(): Promise<HostInfo> {
        await delay()
        return mockHostInfo
    }

    async getSystemUsage(): Promise<SystemUsage> {
        await delay(50)
        return generateSystemUsage()
    }

    async getSystemHistory(range: string = '1h'): Promise<SystemHistory> {
        await delay(100)
        return { data: generateSystemHistory(range) }
    }

    // Settings
    async getSettings(): Promise<Settings> {
        await delay()
        return settings
    }

    async updateSettings(newSettings: Partial<Settings>): Promise<Settings> {
        await delay(200)
        settings = { ...settings, ...newSettings, updatedAt: new Date().toISOString() }
        return settings
    }

    // Command Preview
    async previewCommand(config: TranscodeConfig, sourceFile?: string): Promise<string> {
        await delay(50)
        const input = sourceFile || 'input.mp4'
        const encoder = config.encoder === 'h265' ? 'libx265' : 'libsvtav1'
        const suffix = config.output?.suffix || '_encoded'
        const container = config.output?.container || 'mp4'
        const outputBase = input.replace(/\.[^.]+$/, '')
        const output = `${outputBase}${suffix}.${container}`

        // Build mock command
        const parts = ['ffmpeg']
        parts.push('-i', input)
        parts.push('-map', '0')
        parts.push('-map_metadata', '0')
        parts.push('-c:v', encoder)
        if (config.video?.preset) parts.push('-preset', config.video.preset)
        if (config.video?.crf) parts.push('-crf', config.video.crf.toString())
        parts.push('-c:a', config.audio?.codec || 'copy')
        parts.push('-c:s', 'copy')
        parts.push('-c:t', 'copy')
        if (config.extraParams) parts.push(config.extraParams)
        parts.push(output)

        return parts.join(' ')
    }
}

export { MockAPIClient }
