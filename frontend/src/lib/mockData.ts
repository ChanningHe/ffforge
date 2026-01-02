// Mock data for frontend development/testing
import type { FileInfo, Task, Preset, HardwareInfo, Settings } from '@/types'
import type { HostInfo, SystemUsage } from '@/types/system'
import type { GPUCapabilities } from '@/types/hardware'

// Mock file system
export const mockFiles: Record<string, FileInfo[]> = {
    '': [
        { name: 'Videos', path: '/Videos', isDir: true, size: 0, modTime: '2024-01-01T00:00:00Z' },
        { name: 'Movies', path: '/Movies', isDir: true, size: 0, modTime: '2024-01-01T00:00:00Z' },
        { name: 'Downloads', path: '/Downloads', isDir: true, size: 0, modTime: '2024-01-01T00:00:00Z' },
    ],
    '/': [
        { name: 'Videos', path: '/Videos', isDir: true, size: 0, modTime: '2024-01-01T00:00:00Z' },
        { name: 'Movies', path: '/Movies', isDir: true, size: 0, modTime: '2024-01-01T00:00:00Z' },
        { name: 'Downloads', path: '/Downloads', isDir: true, size: 0, modTime: '2024-01-01T00:00:00Z' },
    ],
    '/Videos': [
        {
            name: 'sample_1080p.mp4',
            path: '/Videos/sample_1080p.mp4',
            isDir: false,
            size: 524288000, // 500MB
            modTime: '2024-06-15T10:30:00Z',
            duration: 3600,
            width: 1920,
            height: 1080,
            codec: 'h264',
            bitrate: 8000000,
            frameRate: '24000/1001',
        },
        {
            name: 'sample_4k_hdr.mkv',
            path: '/Videos/sample_4k_hdr.mkv',
            isDir: false,
            size: 2147483648, // 2GB
            modTime: '2024-06-10T14:20:00Z',
            duration: 7200,
            width: 3840,
            height: 2160,
            codec: 'hevc',
            bitrate: 25000000,
            frameRate: '30',
            isHDR: true,
        },
        {
            name: 'short_clip.mov',
            path: '/Videos/short_clip.mov',
            isDir: false,
            size: 104857600, // 100MB
            modTime: '2024-06-20T09:15:00Z',
            duration: 120,
            width: 1280,
            height: 720,
            codec: 'prores',
            bitrate: 50000000,
            frameRate: '60',
        },
    ],
    '/Movies': [
        {
            name: 'movie_2024.mkv',
            path: '/Movies/movie_2024.mkv',
            isDir: false,
            size: 4294967296, // 4GB
            modTime: '2024-05-01T00:00:00Z',
            duration: 7800,
            width: 1920,
            height: 800,
            codec: 'h264',
            bitrate: 12000000,
            frameRate: '24',
        },
    ],
    '/Downloads': [
        {
            name: 'recording.mp4',
            path: '/Downloads/recording.mp4',
            isDir: false,
            size: 209715200, // 200MB
            modTime: '2024-06-25T16:45:00Z',
            duration: 1800,
            width: 1920,
            height: 1080,
            codec: 'h264',
            bitrate: 6000000,
            frameRate: '30',
        },
    ],
}

// Mock tasks with various states
export const mockTasks: Task[] = [
    {
        id: 'task-001',
        sourceFile: '/Videos/sample_1080p.mp4',
        outputFile: '/output/sample_1080p_hevc.mp4',
        status: 'running',
        progress: 45.5,
        speed: 2.3,
        eta: 1800,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        startedAt: new Date(Date.now() - 1800000).toISOString(),
        sourceFileSize: 524288000,
        config: {
            encoder: 'h265',
            hardwareAccel: 'nvidia',
            video: { crf: 23, preset: 'medium' },
            audio: { codec: 'copy' },
            output: { container: 'mp4', suffix: '_hevc', pathType: 'default' },
        },
    },
    {
        id: 'task-002',
        sourceFile: '/Videos/sample_4k_hdr.mkv',
        outputFile: '',
        status: 'pending',
        progress: 0,
        speed: 0,
        eta: 0,
        createdAt: new Date(Date.now() - 1800000).toISOString(),
        sourceFileSize: 2147483648,
        config: {
            encoder: 'av1',
            hardwareAccel: 'cpu',
            video: { crf: 28, preset: 'slow' },
            audio: { codec: 'opus' },
            output: { container: 'mkv', suffix: '_av1', pathType: 'source' },
        },
    },
    {
        id: 'task-003',
        sourceFile: '/Movies/movie_2024.mkv',
        outputFile: '/output/movie_2024_hevc.mkv',
        status: 'completed',
        progress: 100,
        speed: 0,
        eta: 0,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        startedAt: new Date(Date.now() - 82800000).toISOString(),
        completedAt: new Date(Date.now() - 72000000).toISOString(),
        sourceFileSize: 4294967296,
        outputFileSize: 2147483648,
        config: {
            encoder: 'h265',
            hardwareAccel: 'nvidia',
            video: { crf: 20, preset: 'slow' },
            audio: { codec: 'aac', bitrate: '192k' },
            output: { container: 'mkv', suffix: '_hevc', pathType: 'default' },
        },
    },
    {
        id: 'task-004',
        sourceFile: '/Downloads/recording.mp4',
        outputFile: '/output/recording_hevc.mp4',
        status: 'failed',
        progress: 23.1,
        speed: 0,
        eta: 0,
        error: 'FFmpeg error: Encoder initialization failed',
        createdAt: new Date(Date.now() - 43200000).toISOString(),
        startedAt: new Date(Date.now() - 42000000).toISOString(),
        completedAt: new Date(Date.now() - 41500000).toISOString(),
        sourceFileSize: 209715200,
        config: {
            encoder: 'h265',
            hardwareAccel: 'intel',
            video: { crf: 25, preset: 'fast' },
            audio: { codec: 'copy' },
            output: { container: 'mp4', suffix: '_hevc', pathType: 'default' },
        },
    },
]

// Mock presets
export const mockPresets: Preset[] = [
    {
        id: 'preset-builtin-1',
        name: 'H.265 High Quality',
        description: 'High quality HEVC encoding with NVIDIA acceleration',
        isBuiltin: true,
        createdAt: '2024-01-01T00:00:00Z',
        config: {
            encoder: 'h265',
            hardwareAccel: 'nvidia',
            video: { crf: 18, preset: 'slow' },
            audio: { codec: 'aac', bitrate: '256k' },
            output: { container: 'mp4', suffix: '_hq', pathType: 'default' },
        },
    },
    {
        id: 'preset-builtin-2',
        name: 'AV1 Efficient',
        description: 'Efficient AV1 encoding for archival',
        isBuiltin: true,
        createdAt: '2024-01-01T00:00:00Z',
        config: {
            encoder: 'av1',
            hardwareAccel: 'cpu',
            video: { crf: 30, preset: 'medium' },
            audio: { codec: 'opus' },
            output: { container: 'mkv', suffix: '_av1', pathType: 'default' },
        },
    },
    {
        id: 'preset-custom-1',
        name: 'My Fast Encode',
        description: 'Fast encoding for quick previews',
        isBuiltin: false,
        createdAt: '2024-06-15T10:00:00Z',
        config: {
            encoder: 'h265',
            hardwareAccel: 'nvidia',
            video: { crf: 28, preset: 'veryfast' },
            audio: { codec: 'copy' },
            output: { container: 'mp4', suffix: '_fast', pathType: 'source' },
        },
    },
]

// Mock host info
export const mockHostInfo: HostInfo = {
    hostname: 'mock-server',
    os: 'linux',
    platform: 'Ubuntu',
    platformFamily: 'debian',
    platformVersion: '22.04',
    kernelVersion: '5.15.0-generic',
    arch: 'amd64',
    cpuModel: 'AMD Ryzen 9 5900X 12-Core Processor',
    cpuCores: 24,
    totalMemory: 34359738368, // 32GB
}

// Mock hardware info
export const mockHardwareInfo: HardwareInfo = {
    cpu: true,
    nvidia: true,
    intel: false,
    amd: false,
    gpuName: 'NVIDIA GeForce RTX 3080',
}

// Mock GPU capabilities
export const mockGPUCapabilities: GPUCapabilities = {
    hasIntelVA: false,
    hasNVIDIA: true,
    hasAMD: false,
}

// Mock settings
export const mockSettings: Settings = {
    id: 1,
    defaultOutputPath: '/output',
    enableGPU: true,
    maxConcurrentTasks: 3,
    ffmpegPath: '/usr/bin/ffmpeg',
    ffprobePath: '/usr/bin/ffprobe',
    filePermissionMode: 'same_as_source',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
}

// Generate dynamic system usage data
export function generateSystemUsage(): SystemUsage {
    return {
        timestamp: new Date().toISOString(),
        cpuPercent: 20 + Math.random() * 40, // 20-60%
        memoryUsage: 8589934592 + Math.floor(Math.random() * 8589934592), // 8-16GB
        memoryTotal: 34359738368, // 32GB
        memoryPercent: 25 + Math.random() * 25, // 25-50%
        load1: 1 + Math.random() * 3,
        load5: 1.5 + Math.random() * 2,
        load15: 2 + Math.random() * 1.5,
    }
}

// Generate system history
export function generateSystemHistory(range: string): SystemUsage[] {
    const intervals: Record<string, { duration: number; step: number }> = {
        '1h': { duration: 3600, step: 1 },
        '6h': { duration: 21600, step: 10 },
        '12h': { duration: 43200, step: 20 },
        '24h': { duration: 86400, step: 40 },
    }

    const config = intervals[range] || intervals['1h']
    const now = Date.now()
    const history: SystemUsage[] = []

    for (let i = config.duration; i >= 0; i -= config.step) {
        const timestamp = new Date(now - i * 1000).toISOString()
        const baseLoad = 30 + Math.sin(i / 300) * 15 // Simulate varying load

        history.push({
            timestamp,
            cpuPercent: Math.max(5, Math.min(95, baseLoad + Math.random() * 10)),
            memoryUsage: 8589934592 + Math.floor(Math.random() * 8589934592),
            memoryTotal: 34359738368,
            memoryPercent: 25 + Math.random() * 25,
            load1: 1 + Math.random() * 3,
            load5: 1.5 + Math.random() * 2,
            load15: 2 + Math.random() * 1.5,
        })
    }

    return history
}
