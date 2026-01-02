// File types
export interface FileInfo {
  name: string
  path: string
  isDir: boolean
  size: number
  modTime: string
  // Video specific
  duration?: number
  width?: number
  height?: number
  codec?: string
  bitrate?: number
  profile?: string
  frameRate?: string // Frame rate as string (e.g., "24000/1001" or "30")
  pixelFormat?: string
  colorSpace?: string
  colorTransfer?: string
  isHDR?: boolean
}

// Task types
export type TaskStatus = 'pending' | 'paused' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface Task {
  id: string
  sourceFile: string
  outputFile: string
  status: TaskStatus
  progress: number
  speed: number
  eta: number
  error?: string
  sourceFileSize?: number // in bytes
  outputFileSize?: number // in bytes
  createdAt: string
  startedAt?: string
  completedAt?: string
  preset?: string
  config: TranscodeConfig
  actualCommand?: string // Actual FFmpeg command executed (from backend)
}

// Transcode configuration
export type EncoderType = 'h265' | 'av1'
export type HardwareAccel = 'cpu' | 'nvidia' | 'intel' | 'amd'
export type AudioCodec = 'copy' | 'aac' | 'opus' | 'mp3'
export type OutputPathType = 'source' | 'custom' | 'default' | 'overwrite'
export type HdrMode = 'auto' // HDR handling: auto = preserve HDR when source is HDR

export interface TranscodeConfig {
  mode?: 'simple' | 'advanced' // Configuration mode (default: simple)

  // Simple mode fields (UI-based configuration)
  encoder: EncoderType
  hardwareAccel: HardwareAccel
  video: {
    crf?: number
    preset?: string
    resolution?: string
    fps?: string | number
    bitrate?: string
    hdrMode?: HdrMode[] // HDR handling modes (multi-select): keep, discard
  }
  audio: {
    codec: AudioCodec
    bitrate?: string
    channels?: number
  }
  output: {
    container: string
    suffix: string
    pathType: OutputPathType
    customPath?: string
  }
  extraParams?: string // Extra FFmpeg parameters

  // Advanced mode field (custom CLI parameters)
  customCommand?: string // Custom FFmpeg CLI parameters (between input and output)
}

// Preset types
export interface Preset {
  id: string
  name: string
  description?: string
  config: TranscodeConfig
  isBuiltin: boolean
  createdAt: string
}

// Progress update via WebSocket
export interface ProgressUpdate {
  taskId: string
  status: TaskStatus
  progress: number
  speed: number
  eta: number
  error?: string
}

// Hardware info
export interface HardwareInfo {
  cpu: boolean
  nvidia: boolean
  intel: boolean
  amd: boolean
  gpuName?: string
}

// Settings types
export type FilePermissionMode = 'same_as_source' | 'specify' | 'no_action'

export interface Settings {
  id: number
  defaultOutputPath: string
  enableGPU: boolean
  maxConcurrentTasks: number
  ffmpegPath: string
  ffprobePath: string
  filePermissionMode: FilePermissionMode
  filePermissionUid?: number
  filePermissionGid?: number
  createdAt: string
  updatedAt: string
}

