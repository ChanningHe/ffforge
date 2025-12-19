package main

import (
	"embed"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Setup logging to file for Windows (no console)
	logFile := setupLogging()
	if logFile != nil {
		defer logFile.Close()
	}

	log.Println("Starting FFForge Desktop...")

	// Create an instance of the app structure
	app := NewApp()

	// Create application with options
	err := wails.Run(&options.App{
		Title:  "FFForge - Video Transcoding",
		Width:  1400,
		Height: 900,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 9, G: 9, B: 11, A: 1},
		OnStartup:        app.startup,
		OnShutdown:       app.shutdown,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		log.Printf("FATAL ERROR: %v", err)
		panic(err.Error())
	}
}

// setupLogging creates a log file in user's home directory
func setupLogging() *os.File {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return nil
	}

	logDir := filepath.Join(homeDir, ".ffforge", "logs")
	os.MkdirAll(logDir, 0755)

	logPath := filepath.Join(logDir, "ffforge-desktop.log")
	logFile, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return nil
	}

	log.SetOutput(logFile)
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	fmt.Printf("Log file: %s\n", logPath)
	return logFile
}
