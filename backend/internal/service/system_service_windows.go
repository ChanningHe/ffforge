//go:build windows

package service

// getOSInfo returns empty on Windows (uses gopsutil host.Info() instead)
func getOSInfo() (name, version string) {
	// Windows doesn't use /etc/os-release
	// gopsutil's host.Info() provides OS info on Windows
	return "", ""
}

