package service

import (
	"bufio"
	"context"
	"ffmpeg-web/internal/model"
	"ffmpeg-web/pkg/ffprobe"
	"fmt"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
)

// FFmpegService handles FFmpeg operations
type FFmpegService struct {
	ffmpegPath  string
	ffprobePath string
	outputPath  string
}

// NewFFmpegService creates a new FFmpeg service
func NewFFmpegService(ffmpegPath, ffprobePath, outputPath string) *FFmpegService {
	return &FFmpegService{
		ffmpegPath:  ffmpegPath,
		ffprobePath: ffprobePath,
		outputPath:  outputPath,
	}
}

// ProbeFile gets video information using ffprobe
func (fs *FFmpegService) ProbeFile(filePath string) (*ffprobe.VideoInfo, error) {
	return ffprobe.Probe(fs.ffprobePath, filePath)
}

// BuildCommand builds an FFmpeg command based on configuration
// sourceVideoInfo contains metadata about the source file, used for dynamic HDR handling
func (fs *FFmpegService) BuildCommand(ctx context.Context, sourceFile, outputFile string, config *model.TranscodeConfig, sourceVideoInfo *ffprobe.VideoInfo) *exec.Cmd {
	args := []string{}

	// Check if using advanced mode (custom CLI)
	if config.Mode == "advanced" && config.CustomCommand != "" {
		// Advanced mode: use custom command parameters
		// Support [[INPUT]] and [[OUTPUT]] placeholders
		customCmd := config.CustomCommand
		customCmd = strings.ReplaceAll(customCmd, "[[INPUT]]", sourceFile)
		customCmd = strings.ReplaceAll(customCmd, "[[OUTPUT]]", outputFile)

		customArgs := parseExtraParams(customCmd)

		// If no [[INPUT]] placeholder found, add input file before custom args
		if !strings.Contains(config.CustomCommand, "[[INPUT]]") {
			args = append(args, "-i", sourceFile)
		}

		args = append(args, customArgs...)

		// If no [[OUTPUT]] placeholder found, add output file at the end
		if !strings.Contains(config.CustomCommand, "[[OUTPUT]]") {
			args = append(args, "-y") // Overwrite output file
			// Progress reporting before output file
			args = append(args, "-progress", "pipe:2")
			args = append(args, outputFile)
		}
	} else {
		// Simple mode: use UI-based configuration
		// IMPORTANT: Hardware acceleration flags must come BEFORE -i input file
		args = append(args, fs.buildHardwareAccelArgs(config.HardwareAccel)...)

		// Add input file
		args = append(args, "-i", sourceFile)
		args = append(args, "-y") // Overwrite output file

		// Map all streams by default to preserve multiple audio tracks, subtitles, attachments
		args = append(args, "-map", "0")

		// Preserve metadata from source
		args = append(args, "-map_metadata", "0")

		// Determine if source is HDR
		sourceIsHDR := sourceVideoInfo != nil && sourceVideoInfo.IsHDR

		if sourceIsHDR {
			fmt.Printf("[BuildCommand] Detected HDR source: %s, ColorSpace: %s, Transfer: %s\n",
				sourceFile, sourceVideoInfo.ColorSpace, sourceVideoInfo.ColorTransfer)
		} else if sourceVideoInfo != nil {
			fmt.Printf("[BuildCommand] Detected SDR source: %s, ColorSpace: %s, Transfer: %s\n",
				sourceFile, sourceVideoInfo.ColorSpace, sourceVideoInfo.ColorTransfer)
		}

		// Add video encoding args (with HDR handling)
		// Returns args and any encoder-specific params string (for x265-params/svtav1-params)
		videoArgs, encoderParamKey, encoderParamValue := fs.buildVideoArgs(config, sourceVideoInfo)
		args = append(args, videoArgs...)

		// Add audio encoding args
		args = append(args, fs.buildAudioArgs(&config.Audio)...)

		// Preserve subtitles (copy all subtitle streams)
		args = append(args, "-c:s", "copy")

		// Preserve attachments (fonts for subtitles, etc.)
		args = append(args, "-c:t", "copy")

		// Handle extra parameters with encoder params merging
		if config.ExtraParams != "" {
			// Try to merge encoder-specific params if both HDR and extra params have them
			mergedExtra, merged := mergeEncoderParams(config.ExtraParams, encoderParamKey, encoderParamValue)
			if merged {
				extraArgs := parseExtraParams(mergedExtra)
				args = append(args, extraArgs...)
			} else {
				// No merging needed, add HDR encoder params first, then extra params
				if encoderParamKey != "" && encoderParamValue != "" {
					args = append(args, encoderParamKey, encoderParamValue)
				}
				extraArgs := parseExtraParams(config.ExtraParams)
				args = append(args, extraArgs...)
			}
		} else {
			// No extra params, just add HDR encoder params if any
			if encoderParamKey != "" && encoderParamValue != "" {
				args = append(args, encoderParamKey, encoderParamValue)
			}
		}

		// Add progress reporting
		args = append(args, "-progress", "pipe:2")

		// Output file
		args = append(args, outputFile)
	}

	cmd := exec.CommandContext(ctx, fs.ffmpegPath, args...)
	return cmd
}

// mergeEncoderParams merges HDR encoder params with extra params if they contain the same param key
// Returns the merged extra params string and whether merging occurred.
// Extra params take precedence (can override HDR defaults).
func mergeEncoderParams(extraParams, hdrParamKey, hdrParamValue string) (string, bool) {
	if hdrParamKey == "" || hdrParamValue == "" {
		return extraParams, false
	}

	// Check if extraParams contains the same encoder param key (e.g., -x265-params or -svtav1-params)
	if !strings.Contains(extraParams, hdrParamKey) {
		return extraParams, false
	}

	// Parse HDR params into a map (e.g., "colorprim=bt2020:transfer=smpte2084" -> map)
	hdrMap := parseColonParams(hdrParamValue)

	// Find and extract the encoder params from extra params
	extraArgs := parseExtraParams(extraParams)
	var result []string
	merged := false

	for i := 0; i < len(extraArgs); i++ {
		if extraArgs[i] == hdrParamKey && i+1 < len(extraArgs) {
			// Found matching param key, merge values
			extraMap := parseColonParams(extraArgs[i+1])

			// HDR params as base, extra params override
			for k, v := range extraMap {
				hdrMap[k] = v
			}

			// Rebuild the merged param string
			mergedValue := buildColonParams(hdrMap)
			result = append(result, hdrParamKey, mergedValue)
			i++ // Skip the value we just processed
			merged = true
		} else {
			result = append(result, extraArgs[i])
		}
	}

	return strings.Join(result, " "), merged
}

// parseColonParams parses "key1=val1:key2=val2" format into a map
func parseColonParams(s string) map[string]string {
	result := make(map[string]string)
	pairs := strings.Split(s, ":")
	for _, pair := range pairs {
		if idx := strings.Index(pair, "="); idx > 0 {
			result[pair[:idx]] = pair[idx+1:]
		} else if pair != "" {
			// Handle flags without values (e.g., "hdr-opt=1" vs "repeat-headers")
			result[pair] = ""
		}
	}
	return result
}

// buildColonParams builds "key1=val1:key2=val2" format from a map
func buildColonParams(m map[string]string) string {
	var pairs []string
	for k, v := range m {
		if v != "" {
			pairs = append(pairs, k+"="+v)
		} else {
			pairs = append(pairs, k)
		}
	}
	return strings.Join(pairs, ":")
}

// parseExtraParams parses extra parameters string respecting quotes
func parseExtraParams(params string) []string {
	var args []string
	var current strings.Builder
	inQuote := false
	quoteChar := rune(0)

	for _, r := range params {
		switch {
		case (r == '"' || r == '\'') && !inQuote:
			inQuote = true
			quoteChar = r
		case r == quoteChar && inQuote:
			inQuote = false
			quoteChar = 0
		case r == ' ' && !inQuote:
			if current.Len() > 0 {
				args = append(args, current.String())
				current.Reset()
			}
		default:
			current.WriteRune(r)
		}
	}

	if current.Len() > 0 {
		args = append(args, current.String())
	}

	return args
}

// buildHardwareAccelArgs builds hardware acceleration arguments
func (fs *FFmpegService) buildHardwareAccelArgs(hwAccel string) []string {
	args := []string{}

	switch hwAccel {
	case "nvidia":
		args = append(args, "-hwaccel", "cuda", "-hwaccel_output_format", "cuda")
	case "intel":
		args = append(args, "-hwaccel", "qsv", "-hwaccel_output_format", "qsv")
	case "amd":
		// AMD AMF typically doesn't need input hardware acceleration
	}

	return args
}

// buildVideoArgs builds video encoding arguments
// Returns:
//   - args: list of ffmpeg arguments (excluding encoder-specific params that need merging)
//   - encoderParamKey: e.g., "-x265-params" or "-svtav1-params" (empty if not applicable)
//   - encoderParamValue: the param value string (empty if not applicable)
//
// Preset parameter usage varies by encoder:
//   - libx265 (H.265 CPU): uses -preset with values: ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow
//   - libsvtav1 (AV1 CPU): uses -preset with values 0-13 (0=slowest/best quality, 13=fastest/lower quality)
//   - NVIDIA NVENC: uses -preset with values: p1-p7, or quality presets (slow, medium, fast)
//   - Intel QSV: uses -preset with standard values (slow, medium, fast, etc.)
//   - AMD AMF: uses -quality with values: quality, balanced, speed
func (fs *FFmpegService) buildVideoArgs(config *model.TranscodeConfig, sourceVideoInfo *ffprobe.VideoInfo) ([]string, string, string) {
	args := []string{}
	encoderParamKey := ""
	encoderParamValue := ""

	sourceIsHDR := sourceVideoInfo != nil && sourceVideoInfo.IsHDR

	// Select codec based on encoder and hardware acceleration
	codec := fs.selectVideoCodec(config.Encoder, config.HardwareAccel)
	args = append(args, "-c:v", codec)

	// Add encoder-specific parameters
	switch config.HardwareAccel {
	case "cpu":
		// CPU encoding - both libx265 and libsvtav1 use -preset
		if config.Video.Preset != "" {
			args = append(args, "-preset", config.Video.Preset)
		} else {
			// Default presets
			if config.Encoder == "av1" {
				args = append(args, "-preset", "6") // SVT-AV1 default: balanced
			} else {
				args = append(args, "-preset", "medium") // libx265 default
			}
		}

		if config.Video.CRF > 0 {
			args = append(args, "-crf", strconv.Itoa(config.Video.CRF))
		}

	case "nvidia":
		// NVIDIA NVENC - uses p1-p7 presets or quality presets
		if config.Video.Preset != "" {
			args = append(args, "-preset", config.Video.Preset)
		} else {
			args = append(args, "-preset", "p4") // Default balanced
		}
		if config.Video.CRF > 0 {
			args = append(args, "-cq", strconv.Itoa(config.Video.CRF))
		}

	case "intel":
		// Intel QSV - uses standard preset values or quality
		if config.Video.Preset != "" {
			args = append(args, "-preset", config.Video.Preset)
		} else {
			args = append(args, "-preset", "medium")
		}
		if config.Video.CRF > 0 {
			args = append(args, "-global_quality", strconv.Itoa(config.Video.CRF))
		}

	case "amd":
		// AMD AMF - uses quality/balanced/speed
		if config.Video.Preset != "" {
			args = append(args, "-quality", config.Video.Preset)
		} else {
			args = append(args, "-quality", "balanced")
		}
		if config.Video.CRF > 0 {
			args = append(args, "-qp_i", strconv.Itoa(config.Video.CRF))
		}
	}

	// Resolution
	if config.Video.Resolution != "" && config.Video.Resolution != "original" {
		args = append(args, "-s", config.Video.Resolution)
	}

	// Frame rate
	if config.Video.FPS != "" && config.Video.FPS != "original" {
		args = append(args, "-r", config.Video.FPS)
	}

	// Bitrate (if specified)
	if config.Video.Bitrate != "" {
		args = append(args, "-b:v", config.Video.Bitrate)
	}

	// HDR handling based on source video and user preference
	// "auto" mode: preserve HDR metadata when source is HDR, otherwise passthrough
	if len(config.Video.HdrMode) > 0 && config.Video.HdrMode[0] == "auto" && sourceIsHDR {
		// HDR -> HDR: preserve HDR metadata
		args = append(args, "-pix_fmt", "yuv420p10le")

		// Determine transfer function (PQ vs HLG)
		colorTransfer := "smpte2084" // default to PQ
		transferCharacteristic := "16"
		if sourceVideoInfo.ColorTransfer == "arib-std-b67" {
			colorTransfer = "arib-std-b67"
			transferCharacteristic = "18"
		}

		// Add encoder-specific HDR parameters
		switch config.HardwareAccel {
		case "cpu":
			if config.Encoder == "h265" || config.Encoder == "hevc" {
				args = append(args, "-profile:v", "main10")
				// Build x265-params with HDR metadata
				x265Params := fmt.Sprintf("hdr-opt=1:repeat-headers=1:colorprim=bt2020:transfer=%s:colormatrix=bt2020nc", colorTransfer)
				// Add mastering display if available
				if sourceVideoInfo.MasteringDisplay != "" {
					x265Params += ":master-display=" + sourceVideoInfo.MasteringDisplay
				}
				// Add max-cll if available
				if sourceVideoInfo.MaxCLL > 0 || sourceVideoInfo.MaxFALL > 0 {
					x265Params += fmt.Sprintf(":max-cll=%d,%d", sourceVideoInfo.MaxCLL, sourceVideoInfo.MaxFALL)
				}
				encoderParamKey = "-x265-params"
				encoderParamValue = x265Params
			} else if config.Encoder == "av1" {
				// Build svtav1-params with HDR metadata
				svtav1Params := fmt.Sprintf("color-primaries=9:transfer-characteristics=%s:matrix-coefficients=9", transferCharacteristic)
				// Add mastering display if available
				if sourceVideoInfo.MasteringDisplay != "" {
					svtav1Params += ":mastering-display=" + sourceVideoInfo.MasteringDisplay
				}
				// Add content-light if available
				if sourceVideoInfo.MaxCLL > 0 || sourceVideoInfo.MaxFALL > 0 {
					svtav1Params += fmt.Sprintf(":content-light=%d,%d", sourceVideoInfo.MaxCLL, sourceVideoInfo.MaxFALL)
				}
				encoderParamKey = "-svtav1-params"
				encoderParamValue = svtav1Params
			}
		case "nvidia", "intel", "amd":
			// Hardware encoders: use profile main10 and color metadata
			args = append(args, "-profile:v", "main10")
			args = append(args, "-color_primaries", "bt2020")
			args = append(args, "-color_trc", colorTransfer) // Dynamic: smpte2084 or arib-std-b67
			args = append(args, "-colorspace", "bt2020nc")
		}
	}

	return args, encoderParamKey, encoderParamValue
}

// buildAudioArgs builds audio encoding arguments
func (fs *FFmpegService) buildAudioArgs(audio *model.AudioConfig) []string {
	args := []string{}

	// Audio codec
	if audio.Codec == "copy" {
		args = append(args, "-c:a", "copy")
	} else {
		args = append(args, "-c:a", audio.Codec)

		// Add -strict -2 for opus encoder (experimental feature flag)
		if audio.Codec == "opus" {
			args = append(args, "-strict", "-2")
		}

		// Audio bitrate
		if audio.Bitrate != "" {
			args = append(args, "-b:a", audio.Bitrate)
		}

		// Audio channels
		if audio.Channels > 0 {
			args = append(args, "-ac", strconv.Itoa(audio.Channels))
		}
	}

	return args
}

// selectVideoCodec selects the appropriate video codec
func (fs *FFmpegService) selectVideoCodec(encoder, hwAccel string) string {
	if encoder == "h265" || encoder == "hevc" {
		switch hwAccel {
		case "nvidia":
			return "hevc_nvenc"
		case "intel":
			return "hevc_qsv"
		case "amd":
			return "hevc_amf"
		default:
			return "libx265"
		}
	}

	if encoder == "av1" {
		switch hwAccel {
		case "nvidia":
			return "av1_nvenc"
		case "intel":
			return "av1_qsv"
		default:
			// Use libsvtav1 (SVT-AV1) - faster than libaom-av1 with good quality
			return "libsvtav1"
		}
	}

	return "libx265" // Default
}

// GenerateOutputPath generates an output file path based on config
func (fs *FFmpegService) GenerateOutputPath(sourceFile string, config *model.TranscodeConfig) string {
	dir := filepath.Dir(sourceFile)
	filename := filepath.Base(sourceFile)
	ext := filepath.Ext(filename)
	nameWithoutExt := strings.TrimSuffix(filename, ext)

	// Handle overwrite mode - return source file path directly
	if config.Output.PathType == "overwrite" {
		return sourceFile
	}

	// Add suffix
	suffix := config.Output.Suffix
	if suffix == "" {
		suffix = "_transcoded"
	}

	// Determine output extension
	outputExt := "." + config.Output.Container
	if outputExt == "." {
		outputExt = ".mp4"
	}

	outputFilename := nameWithoutExt + suffix + outputExt

	// Determine output directory based on PathType
	var outputDir string
	switch config.Output.PathType {
	case "source":
		// Output to source file directory
		outputDir = dir
	case "custom":
		// Output to custom path
		if config.Output.CustomPath != "" {
			outputDir = config.Output.CustomPath
		} else {
			outputDir = fs.outputPath
		}
	case "default", "":
		// Output to default output directory
		outputDir = filepath.Join(fs.outputPath, filepath.Base(dir))
	default:
		// Fallback to default
		outputDir = filepath.Join(fs.outputPath, filepath.Base(dir))
	}

	outputPath := filepath.Join(outputDir, outputFilename)
	return outputPath
}

// ProgressUpdate represents a progress update from FFmpeg
type ProgressUpdate struct {
	Frame     int
	FPS       float64
	Bitrate   string
	TotalSize int64
	OutTime   float64 // Time in seconds
	Speed     float64
	Progress  string
}

// ParseProgress parses FFmpeg progress output
func ParseProgress(line string) (*ProgressUpdate, error) {
	update := &ProgressUpdate{}

	// FFmpeg progress format: key=value
	parts := strings.Split(line, "=")
	if len(parts) != 2 {
		return nil, fmt.Errorf("invalid progress line")
	}

	key := strings.TrimSpace(parts[0])
	value := strings.TrimSpace(parts[1])

	switch key {
	case "frame":
		update.Frame, _ = strconv.Atoi(value)
	case "fps":
		update.FPS, _ = strconv.ParseFloat(value, 64)
	case "bitrate":
		update.Bitrate = value
	case "total_size":
		update.TotalSize, _ = strconv.ParseInt(value, 10, 64)
	case "out_time_ms":
		// out_time_ms is in microseconds
		microseconds, _ := strconv.ParseInt(value, 10, 64)
		update.OutTime = float64(microseconds) / 1000000.0
	case "speed":
		// Speed format: "2.5x"
		speedStr := strings.TrimSuffix(value, "x")
		update.Speed, _ = strconv.ParseFloat(speedStr, 64)
	case "progress":
		update.Progress = value
	}

	return update, nil
}

// CalculateProgress calculates percentage and ETA
func CalculateProgress(currentTime, totalDuration, speed float64) (progress float64, eta int64) {
	if totalDuration <= 0 {
		return 0, 0
	}

	progress = (currentTime / totalDuration) * 100
	if progress > 100 {
		progress = 100
	}

	if speed > 0 {
		remainingTime := totalDuration - currentTime
		eta = int64(remainingTime / speed)
	}

	return progress, eta
}

// ParseFFmpegStderr parses FFmpeg stderr output for progress information
func ParseFFmpegStderr(line string) (time float64, speed float64, ok bool) {
	// Parse time=HH:MM:SS.MS
	timeRegex := regexp.MustCompile(`time=(\d+):(\d+):(\d+\.\d+)`)
	if matches := timeRegex.FindStringSubmatch(line); len(matches) == 4 {
		hours, _ := strconv.ParseFloat(matches[1], 64)
		minutes, _ := strconv.ParseFloat(matches[2], 64)
		seconds, _ := strconv.ParseFloat(matches[3], 64)
		time = hours*3600 + minutes*60 + seconds
		ok = true
	}

	// Parse speed=X.XXx
	speedRegex := regexp.MustCompile(`speed=\s*(\d+\.?\d*)x`)
	if matches := speedRegex.FindStringSubmatch(line); len(matches) == 2 {
		speed, _ = strconv.ParseFloat(matches[1], 64)
	}

	return time, speed, ok
}

// StreamProgress streams progress updates from FFmpeg stderr
func StreamProgress(scanner *bufio.Scanner, progressChan chan<- *ProgressUpdate) {
	currentUpdate := &ProgressUpdate{}

	for scanner.Scan() {
		line := scanner.Text()

		update, err := ParseProgress(line)
		if err != nil {
			continue
		}

		// Accumulate updates
		if update.Frame > 0 {
			currentUpdate.Frame = update.Frame
		}
		if update.FPS > 0 {
			currentUpdate.FPS = update.FPS
		}
		if update.Bitrate != "" {
			currentUpdate.Bitrate = update.Bitrate
		}
		if update.TotalSize > 0 {
			currentUpdate.TotalSize = update.TotalSize
		}
		if update.OutTime > 0 {
			currentUpdate.OutTime = update.OutTime
		}
		if update.Speed > 0 {
			currentUpdate.Speed = update.Speed
		}
		if update.Progress != "" {
			currentUpdate.Progress = update.Progress
		}

		// Send update if we have progress
		if currentUpdate.Progress == "continue" || currentUpdate.Progress == "end" {
			progressChan <- currentUpdate

			if currentUpdate.Progress == "end" {
				break
			}

			// Reset for next update
			currentUpdate = &ProgressUpdate{}
		}
	}

	close(progressChan)
}
