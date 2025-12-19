#!/usr/bin/env bash
set -euo pipefail

# Build Desktop Application for All Platforms
# Usage: ./scripts/build-desktop-all.sh

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Change to project root
cd "$PROJECT_ROOT"

echo "📦 Syncing version from package.json..."
bash scripts/sync-version.sh

echo "📋 Preparing build directory..."
mkdir -p build
cp images/icon.png build/appicon.png

echo "📦 Downloading FFmpeg for all platforms..."
bash scripts/download-ffmpeg.sh darwin
bash scripts/download-ffmpeg.sh windows

echo "🎨 Building frontend..."
cd frontend && VITE_APP_VERSION=$(node -p "require('./package.json').version") npm run build && cd ..

echo "🔨 Building for macOS (Universal)..."
~/go/bin/wails build -platform darwin/universal

echo "🔨 Building for Windows (AMD64)..."
~/go/bin/wails build -platform windows/amd64

echo "📦 Bundling FFmpeg for macOS..."
if [ -f embed/ffmpeg/darwin/ffmpeg ]; then
    mkdir -p build/bin/ffforge-desktop.app/Contents/Resources/ffmpeg
    cp embed/ffmpeg/darwin/ffmpeg embed/ffmpeg/darwin/ffprobe \
       build/bin/ffforge-desktop.app/Contents/Resources/ffmpeg/
    chmod +x build/bin/ffforge-desktop.app/Contents/Resources/ffmpeg/*
    echo "✓ macOS FFmpeg bundled"
fi

echo "📦 Bundling FFmpeg for Windows..."
if [ -f embed/ffmpeg/windows/ffmpeg.exe ]; then
    mkdir -p build/bin/ffmpeg
    cp embed/ffmpeg/windows/ffmpeg.exe embed/ffmpeg/windows/ffprobe.exe \
       build/bin/ffmpeg/
    echo "✓ Windows FFmpeg bundled"
fi

echo "✅ All builds complete!"
ls -lh build/bin/ 2>/dev/null || true

