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
func (fs *FFmpegService) BuildCommand(ctx context.Context, sourceFile, outputFile string, config *model.TranscodeConfig) *exec.Cmd {
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

		// Add video encoding args
		args = append(args, fs.buildVideoArgs(config)...)

		// Add audio encoding args
		args = append(args, fs.buildAudioArgs(&config.Audio)...)

		// Add extra parameters if specified
		if config.ExtraParams != "" {
			// Parse extra params - split by spaces but respect quotes
			extraArgs := parseExtraParams(config.ExtraParams)
			args = append(args, extraArgs...)
		}

		// Add progress reporting
		args = append(args, "-progress", "pipe:2")

		// Output file
		args = append(args, outputFile)
	}

	cmd := exec.CommandContext(ctx, fs.ffmpegPath, args...)
	return cmd
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
//
// Preset parameter usage varies by encoder:
//   - libx265 (H.265 CPU): uses -preset with values: ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow
//   - libsvtav1 (AV1 CPU): uses -preset with values 0-13 (0=slowest/best quality, 13=fastest/lower quality)
//     Common values: 2-4 (high quality), 5-7 (balanced), 8-10 (fast)
//   - NVIDIA NVENC: uses -preset with values: p1-p7, or quality presets (slow, medium, fast)
//   - Intel QSV: uses -preset with standard values (slow, medium, fast, etc.)
//   - AMD AMF: uses -quality with values: quality, balanced, speed
func (fs *FFmpegService) buildVideoArgs(config *model.TranscodeConfig) []string {
	args := []string{}

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

	return args
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
