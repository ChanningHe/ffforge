import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { TranscodeConfig } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Helper to compute the output file path based on config and pathType.
 * Mirrors backend GenerateOutputPath logic for accurate preview.
 */
function computeOutputFilePath(
  inputFile: string,
  output: TranscodeConfig['output'],
  defaultOutputPath?: string
): string {
  const dirPath = inputFile.substring(0, inputFile.lastIndexOf('/'))
  const dirName = dirPath.substring(dirPath.lastIndexOf('/') + 1)

  // Handle overwrite mode - return source file path directly
  if (output.pathType === 'overwrite') {
    return inputFile
  }

  // Add suffix
  const suffix = output.suffix || '_transcoded'
  // Determine output extension
  const outputExt = output.container ? `.${output.container}` : '.mp4'
  const outputFilename = inputFile.substring(inputFile.lastIndexOf('/') + 1).replace(/\.[^/.]+$/, '') + suffix + outputExt

  // Determine output directory based on PathType
  let outputDir: string
  switch (output.pathType) {
    case 'source':
      // Output to source file directory
      outputDir = dirPath
      break
    case 'custom':
      // Output to custom path
      outputDir = output.customPath || defaultOutputPath || '/output'
      break
    case 'default':
    default:
      // Output to default output directory with source folder name
      // This mirrors backend: outputDir = filepath.Join(fs.outputPath, filepath.Base(dir))
      // If dirName is empty (e.g. input file has no path), just use base output dir
      outputDir = defaultOutputPath || '/output'
      if (dirName) {
        outputDir = `${outputDir}/${dirName}`
      }
      break
  }

  // Combine and clean up overlapping slashes
  return `${outputDir}/${outputFilename}`.replace(/\/+/g, '/')
}

// Generate FFmpeg command preview based on config
export function generateFFmpegCommand(
  config: TranscodeConfig,
  inputFile: string = 'input.mp4',
  defaultOutputPath?: string
): string {
  const parts: string[] = ['ffmpeg']

  // Check if using advanced mode
  if (config.mode === 'advanced' && config.customCommand) {
    // Advanced mode: use custom command with [[INPUT]] and [[OUTPUT]] placeholders
    let customCmd = config.customCommand.trim()
    const outputFile = computeOutputFilePath(inputFile, config.output, defaultOutputPath)

    // Replace placeholders for preview
    customCmd = customCmd.replace(/\[\[INPUT\]\]/g, inputFile)
    customCmd = customCmd.replace(/\[\[OUTPUT\]\]/g, outputFile)

    parts.push(customCmd)
    return parts.join(' ')
  } else {
    // Simple mode: build command from UI config
    const { encoder, hardwareAccel, video, audio } = config

    // IMPORTANT: Hardware acceleration flags must come BEFORE -i input file
    if (hardwareAccel === 'nvidia') {
      parts.push('-hwaccel', 'cuda', '-hwaccel_output_format', 'cuda')
    } else if (hardwareAccel === 'intel') {
      parts.push('-hwaccel', 'qsv', '-hwaccel_output_format', 'qsv')
    } else if (hardwareAccel === 'amd') {
      // AMD AMF typically doesn't need input hardware acceleration
    }

    // Add input file
    parts.push('-i', inputFile)

    // Map all streams to preserve multiple audio tracks, subtitles, attachments
    parts.push('-map', '0')

    // Preserve metadata from source
    parts.push('-map_metadata', '0')

    // Video codec
    let videoCodec: string
    if (hardwareAccel === 'nvidia') {
      videoCodec = encoder === 'h265' ? 'hevc_nvenc' : 'av1_nvenc'
    } else if (hardwareAccel === 'intel') {
      videoCodec = encoder === 'h265' ? 'hevc_qsv' : 'av1_qsv'
    } else if (hardwareAccel === 'amd') {
      videoCodec = encoder === 'h265' ? 'hevc_amf' : 'av1_amf'
    } else {
      videoCodec = encoder === 'h265' ? 'libx265' : 'libsvtav1'
    }
    parts.push('-c:v', videoCodec)

    // Encoding preset
    if (video.preset) {
      if (hardwareAccel === 'amd') {
        parts.push('-quality', video.preset)
      } else {
        parts.push('-preset', video.preset)
      }
    }

    // CRF/Quality
    if (video.crf !== undefined) {
      if (hardwareAccel === 'nvidia') {
        parts.push('-cq', video.crf.toString())
      } else if (hardwareAccel === 'intel') {
        parts.push('-global_quality', video.crf.toString())
      } else if (hardwareAccel === 'amd') {
        parts.push('-qp_i', video.crf.toString())
      } else {
        parts.push('-crf', video.crf.toString())
      }
    }

    // HDR handling (only "auto" mode is supported)
    // Note: This is for preview only. Backend will:
    // 1. Check if source is actually HDR (PQ/HLG)
    // 2. Add source-specific metadata (MasteringDisplay, MaxCLL)
    // 3. Merge with any extra params containing encoder-specific params
    if (video.hdrMode && video.hdrMode.length > 0 && video.hdrMode.includes('auto')) {
      // Preserve HDR: requires 10-bit pixel format and HDR metadata parameters
      parts.push('-pix_fmt', 'yuv420p10le')

      // Add HDR metadata based on encoder type
      // Backend will dynamically use PQ (smpte2084) or HLG (arib-std-b67) based on source
      if (hardwareAccel === 'cpu') {
        if (encoder === 'h265') {
          parts.push('-profile:v', 'main10')
          // Base HDR params (backend adds master-display, max-cll if available)
          parts.push('-x265-params', 'hdr-opt=1:repeat-headers=1:colorprim=bt2020:transfer=<auto>:colormatrix=bt2020nc')
        } else if (encoder === 'av1') {
          // Base HDR params (backend adds mastering-display, content-light if available)
          parts.push('-svtav1-params', 'color-primaries=9:transfer-characteristics=<auto>:matrix-coefficients=9')
        }
      } else {
        // Hardware encoders: NVIDIA, Intel, AMD
        parts.push('-profile:v', 'main10')
        parts.push('-color_primaries', 'bt2020')
        parts.push('-color_trc', '<auto>') // Backend sets smpte2084 or arib-std-b67
        parts.push('-colorspace', 'bt2020nc')
      }
    }

    // Audio encoding
    if (audio.codec === 'copy') {
      parts.push('-c:a', 'copy')
    } else {
      parts.push('-c:a', audio.codec)
      if (audio.bitrate) {
        parts.push('-b:a', audio.bitrate)
      }
      if (audio.channels) {
        parts.push('-ac', audio.channels.toString())
      }
    }

    // Preserve subtitles
    parts.push('-c:s', 'copy')

    // Preserve attachments (fonts for subtitles, etc.)
    parts.push('-c:t', 'copy')

    // Extra parameters
    if (config.extraParams && config.extraParams.trim()) {
      parts.push(config.extraParams.trim())
    }
  }

  // Output file (only for simple mode, already handled in advanced mode)
  if (config.mode !== 'advanced') {
    const outputFile = computeOutputFilePath(inputFile, config.output, defaultOutputPath)
    parts.push(outputFile)
  }

  return parts.join(' ')
}

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * Format duration in seconds to HH:MM:SS
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  return [hours, minutes, secs]
    .map(v => v.toString().padStart(2, '0'))
    .join(':')
}

/**
 * Format speed (e.g., 2.5x)
 */
export function formatSpeed(speed: number): string {
  return `${speed.toFixed(2)}x`
}





