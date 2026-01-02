package ffprobe

import (
	"encoding/json"
	"fmt"
	"os/exec"
	"strconv"
	"strings"
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
	// HDR Static Metadata (from side_data)
	MasteringDisplay string // Format: "G(x,y)B(x,y)R(x,y)WP(x,y)L(max,min)" for x265/svtav1
	MaxCLL           int    // Maximum Content Light Level (nits)
	MaxFALL          int    // Maximum Frame-Average Light Level (nits)
}

// Probe executes ffprobe on a video file and returns video information
func Probe(ffprobePath, filePath string) (*VideoInfo, error) {
	// Use provided ffprobe path or default to "ffprobe"
	if ffprobePath == "" {
		ffprobePath = "ffprobe"
	}

	// Run ffprobe with JSON output, including side_data for HDR metadata
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

	// Extract HDR metadata from side_data
	masteringDisplay := ""
	maxCLL := 0
	maxFALL := 0

	for _, sideData := range videoStream.SideDataList {
		switch sideData.SideDataType {
		case "Mastering display metadata":
			// Build mastering display string in x265/svtav1 format
			// Format: G(x,y)B(x,y)R(x,y)WP(x,y)L(max,min)
			masteringDisplay = buildMasteringDisplayString(sideData)
		case "Content light level metadata":
			maxCLL = sideData.MaxContent
			maxFALL = sideData.MaxAverage
		}
	}

	info := &VideoInfo{
		Duration:         duration,
		Width:            videoStream.Width,
		Height:           videoStream.Height,
		Codec:            videoStream.CodecName,
		Bitrate:          bitrate,
		FrameRate:        videoStream.FrameRate,
		PixelFormat:      videoStream.PixelFormat,
		ColorSpace:       videoStream.ColorSpace,
		ColorTransfer:    videoStream.ColorTransfer,
		ColorPrimaries:   videoStream.ColorPrimaries,
		IsHDR:            isHDR,
		Profile:          videoStream.Profile,
		Level:            strconv.Itoa(videoStream.Level),
		MasteringDisplay: masteringDisplay,
		MaxCLL:           maxCLL,
		MaxFALL:          maxFALL,
	}

	return info, nil
}

// buildMasteringDisplayString converts ffprobe mastering display metadata to x265/svtav1 format
// Input format from ffprobe: "red_x": "34000/50000", "red_y": "16000/50000", etc.
// Output format: G(gx,gy)B(bx,by)R(rx,ry)WP(wpx,wpy)L(max_lum,min_lum)
func buildMasteringDisplayString(sd SideData) string {
	// Parse fractional values (e.g., "34000/50000" -> 34000)
	parseRatio := func(s string) int {
		parts := strings.Split(s, "/")
		if len(parts) >= 1 {
			val, _ := strconv.Atoi(parts[0])
			return val
		}
		return 0
	}

	gx := parseRatio(sd.GreenX)
	gy := parseRatio(sd.GreenY)
	bx := parseRatio(sd.BlueX)
	by := parseRatio(sd.BlueY)
	rx := parseRatio(sd.RedX)
	ry := parseRatio(sd.RedY)
	wpx := parseRatio(sd.WhitePointX)
	wpy := parseRatio(sd.WhitePointY)
	maxLum := parseRatio(sd.MaxLuminance)
	minLum := parseRatio(sd.MinLuminance)

	// Only return if we have valid data
	if gx == 0 && gy == 0 && rx == 0 && ry == 0 {
		return ""
	}

	return fmt.Sprintf("G(%d,%d)B(%d,%d)R(%d,%d)WP(%d,%d)L(%d,%d)",
		gx, gy, bx, by, rx, ry, wpx, wpy, maxLum, minLum)
}

// FFprobeResult represents the JSON output from ffprobe
type FFprobeResult struct {
	Streams []Stream `json:"streams"`
	Format  Format   `json:"format"`
}

// Stream represents a media stream
type Stream struct {
	Index          int        `json:"index"`
	CodecName      string     `json:"codec_name"`
	CodecType      string     `json:"codec_type"`
	Width          int        `json:"width"`
	Height         int        `json:"height"`
	FrameRate      string     `json:"r_frame_rate"`
	PixelFormat    string     `json:"pix_fmt"`
	ColorSpace     string     `json:"color_space"`
	ColorTransfer  string     `json:"color_transfer"`
	ColorPrimaries string     `json:"color_primaries"`
	Profile        string     `json:"profile"`
	Level          int        `json:"level"`
	SideDataList   []SideData `json:"side_data_list"`
}

// SideData represents HDR metadata from side_data_list
type SideData struct {
	SideDataType string `json:"side_data_type"`
	// Mastering display metadata (chromaticity coordinates as fractions, e.g., "34000/50000")
	RedX         string `json:"red_x"`
	RedY         string `json:"red_y"`
	GreenX       string `json:"green_x"`
	GreenY       string `json:"green_y"`
	BlueX        string `json:"blue_x"`
	BlueY        string `json:"blue_y"`
	WhitePointX  string `json:"white_point_x"`
	WhitePointY  string `json:"white_point_y"`
	MinLuminance string `json:"min_luminance"`
	MaxLuminance string `json:"max_luminance"`
	// Content light level metadata
	MaxContent int `json:"max_content"`
	MaxAverage int `json:"max_average"`
}

// Format represents the container format
type Format struct {
	Filename   string `json:"filename"`
	Duration   string `json:"duration"`
	BitRate    string `json:"bit_rate"`
	FormatName string `json:"format_name"`
}
