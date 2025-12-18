# FFForge Desktop

This directory contains the desktop-specific configuration files for building FFForge as a native desktop application using Wails.

## Directory Structure

```
desktop/
├── wails.json           # Wails configuration
├── appicon.png          # Application icon
├── build-darwin/        # macOS build configuration
├── build-windows/       # Windows build configuration
└── build/              # Build output (generated)
```

## Key Points

1. **Shared Codebase**: The desktop app shares the same backend and frontend code with the web version
   - Backend: `../backend/`
   - Frontend: `../frontend/`

2. **Desktop Entry Point**: `../backend/cmd/desktop/`
   - `main.go` - Wails application entry
   - `app.go` - Application logic and HTTP server

3. **Build Commands**: Use justfile
   ```bash
   just dev-desktop        # Development mode with hot reload
   just build-desktop      # Build release version
   just build-desktop-debug # Build debug version
   just run-desktop        # Build and run
   ```

## How It Works

The desktop app:
1. Starts a Wails window with native WebView
2. Launches an embedded HTTP server (Go/Gin) on a random port
3. Loads the React frontend (same as web version)
4. Frontend connects to the local HTTP server

This architecture allows 90%+ code sharing between web and desktop versions.

## Building

### Prerequisites
- Go 1.22+
- Node.js 16+
- Wails CLI: `go install github.com/wailsapp/wails/v2/cmd/wails@latest`

### Development
```bash
cd /path/to/ffmpeg-web
just dev-desktop
```

### Production Build
```bash
cd /path/to/ffmpeg-web
just build-desktop
```

The built app will be in `desktop/build/bin/`.

## Configuration

Edit `wails.json` to customize:
- Application name and icon
- Build options
- Window size and appearance

## More Information

See the root README.md for complete documentation.

