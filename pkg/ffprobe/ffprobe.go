package ffprobe

import (
	"encoding/json"
	"fmt"
	"os/exec"
	"strconv"
)

// VideoInfo represents information about a video file
type VideoInfo struct {
	Duration       float64 // Duration in seconds
	Width          int
	Height         int
	Codec          string
	Bitrate        int64
	FrameRate      string
	PixelFormat    string
	ColorSpace     string
	ColorTransfer  string
	ColorPrimaries string
	IsHDR          bool
	Profile        string
	Level          string
}

// Probe executes ffprobe on a video file and returns video information
func Probe(ffprobePath, filePath string) (*VideoInfo, error) {
	// Use provided ffprobe path or default to "ffprobe"
	if ffprobePath == "" {
		ffprobePath = "ffprobe"
	}
	
	// Run ffprobe with JSON output
	cmd := exec.Command(ffprobePath,
		"-v", "quiet",
		"-print_format", "json",
		"-show_format",
		"-show_streams",
		filePath,
	)

	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("ffprobe failed: %w", err)
	}

	// Parse JSON output
	var result FFprobeResult
	if err := json.Unmarshal(output, &result); err != nil {
		return nil, fmt.Errorf("failed to parse ffprobe output: %w", err)
	}

	// Extract video stream info
	var videoStream *Stream
	for i := range result.Streams {
		if result.Streams[i].CodecType == "video" {
			videoStream = &result.Streams[i]
			break
		}
	}

	if videoStream == nil {
		return nil, fmt.Errorf("no video stream found")
	}

	// Parse duration
	duration := 0.0
	if result.Format.Duration != "" {
		duration, _ = strconv.ParseFloat(result.Format.Duration, 64)
	}

	// Parse bitrate
	bitrate := int64(0)
	if result.Format.BitRate != "" {
		bitrate, _ = strconv.ParseInt(result.Format.BitRate, 10, 64)
	}

	// Detect HDR
	isHDR := false
	if videoStream.ColorTransfer == "smpte2084" || videoStream.ColorTransfer == "arib-std-b67" {
		isHDR = true
	}
	if videoStream.ColorSpace == "bt2020nc" || videoStream.ColorSpace == "bt2020c" {
		isHDR = true
	}

	info := &VideoInfo{
		Duration:       duration,
		Width:          videoStream.Width,
		Height:         videoStream.Height,
		Codec:          videoStream.CodecName,
		Bitrate:        bitrate,
		FrameRate:      videoStream.FrameRate,
		PixelFormat:    videoStream.PixelFormat,
		ColorSpace:     videoStream.ColorSpace,
		ColorTransfer:  videoStream.ColorTransfer,
		ColorPrimaries: videoStream.ColorPrimaries,
		IsHDR:          isHDR,
		Profile:        videoStream.Profile,
		Level:          strconv.Itoa(videoStream.Level),
	}

	return info, nil
}

// FFprobeResult represents the JSON output from ffprobe
type FFprobeResult struct {
	Streams []Stream `json:"streams"`
	Format  Format   `json:"format"`
}

// Stream represents a media stream
type Stream struct {
	Index          int    `json:"index"`
	CodecName      string `json:"codec_name"`
	CodecType      string `json:"codec_type"`
	Width          int    `json:"width"`
	Height         int    `json:"height"`
	FrameRate      string `json:"r_frame_rate"`
	PixelFormat    string `json:"pix_fmt"`
	ColorSpace     string `json:"color_space"`
	ColorTransfer  string `json:"color_transfer"`
	ColorPrimaries string `json:"color_primaries"`
	Profile        string `json:"profile"`
	Level          int    `json:"level"`
}

// Format represents the container format
type Format struct {
	Filename   string `json:"filename"`
	Duration   string `json:"duration"`
	BitRate    string `json:"bit_rate"`
	FormatName string `json:"format_name"`
}
