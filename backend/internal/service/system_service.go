package service

import (
	"bufio"
	"ffmpeg-web/internal/model"
	"log"
	"os"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/load"
	"github.com/shirou/gopsutil/v3/mem"
)

const (
	// Keep 24 hours of history at 1 second interval
	MaxHistoryPoints = 86400
)

type SystemService struct {
	history      []model.SystemUsage
	historyMutex sync.RWMutex
	stopChan     chan struct{}
}

func NewSystemService() *SystemService {
	return &SystemService{
		history:  make([]model.SystemUsage, 0, MaxHistoryPoints),
		stopChan: make(chan struct{}),
	}
}

// GetHostInfo returns static system information
func (s *SystemService) GetHostInfo() (*model.HostInfo, error) {
	h, err := host.Info()
	if err != nil {
		return nil, err
	}

	m, err := mem.VirtualMemory()
	if err != nil {
		return nil, err
	}

	c, err := cpu.Info()
	if err != nil {
		return nil, err
	}

	cpuModel := ""
	if len(c) > 0 {
		cpuModel = c[0].ModelName
	}

	cpuCores, _ := cpu.Counts(true)

	// Try to read OS info from /etc/os-release
	osName, osVersion := getOSInfo()
	if osName == "" {
		osName = h.Platform
	}
	if osVersion == "" {
		osVersion = h.PlatformVersion
	}

	return &model.HostInfo{
		Hostname:        h.Hostname,
		OS:              h.OS,
		Platform:        osName,
		PlatformFamily:  h.PlatformFamily,
		PlatformVersion: osVersion,
		KernelVersion:   h.KernelVersion,
		Arch:            h.KernelArch,
		CPUModel:        cpuModel,
		CPUCores:        cpuCores,
		TotalMemory:     m.Total,
	}, nil
}

// getOSInfo reads OS information from /etc/os-release
func getOSInfo() (name, version string) {
	file, err := os.Open("/etc/os-release")
	if err != nil {
		return "", ""
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "NAME=") {
			name = strings.Trim(strings.TrimPrefix(line, "NAME="), "\"")
		} else if strings.HasPrefix(line, "VERSION_ID=") {
			version = strings.Trim(strings.TrimPrefix(line, "VERSION_ID="), "\"")
		}
	}
	return name, version
}

// StartMonitoring starts collecting system metrics
func (s *SystemService) StartMonitoring() {
	ticker := time.NewTicker(1 * time.Second)
	go func() {
		for {
			select {
			case <-s.stopChan:
				ticker.Stop()
				return
			case t := <-ticker.C:
				usage, err := s.collectMetrics(t)
				if err != nil {
					log.Printf("Error collecting system metrics: %v", err)
					continue
				}
				s.addToHistory(usage)
			}
		}
	}()
}

// StopMonitoring stops the monitoring goroutine
func (s *SystemService) StopMonitoring() {
	close(s.stopChan)
}

func (s *SystemService) collectMetrics(t time.Time) (model.SystemUsage, error) {
	v, err := mem.VirtualMemory()
	if err != nil {
		return model.SystemUsage{}, err
	}

	c, err := cpu.Percent(0, false)
	if err != nil {
		return model.SystemUsage{}, err
	}
	cpuPercent := 0.0
	if len(c) > 0 {
		cpuPercent = c[0]
	}

	l, err := load.Avg()
	if err != nil {
		// Fallback for non-unix systems or errors
		if runtime.GOOS == "windows" {
			l = &load.AvgStat{Load1: 0, Load5: 0, Load15: 0}
		} else {
			return model.SystemUsage{}, err
		}
	}

	return model.SystemUsage{
		Timestamp:     t,
		CPUPercent:    cpuPercent,
		MemoryUsage:   v.Used,
		MemoryTotal:   v.Total,
		MemoryPercent: v.UsedPercent,
		Load1:         l.Load1,
		Load5:         l.Load5,
		Load15:        l.Load15,
	}, nil
}

func (s *SystemService) addToHistory(usage model.SystemUsage) {
	s.historyMutex.Lock()
	defer s.historyMutex.Unlock()

	s.history = append(s.history, usage)

	// Maintain fixed size buffer
	if len(s.history) > MaxHistoryPoints {
		// Remove oldest, keep newest
		overshoot := len(s.history) - MaxHistoryPoints
		s.history = s.history[overshoot:]
	}
}

// GetCurrentUsage returns the most recent system usage data
func (s *SystemService) GetCurrentUsage() *model.SystemUsage {
	s.historyMutex.RLock()
	defer s.historyMutex.RUnlock()

	if len(s.history) == 0 {
		return nil
	}
	// Return copy of last element
	last := s.history[len(s.history)-1]
	return &last
}

// GetHistory returns historical system usage data
func (s *SystemService) GetHistory() []model.SystemUsage {
	s.historyMutex.RLock()
	defer s.historyMutex.RUnlock()

	// Return copy of slice
	result := make([]model.SystemUsage, len(s.history))
	copy(result, s.history)
	return result
}
