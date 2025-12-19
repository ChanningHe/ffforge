#!/usr/bin/env bash
set -euo pipefail

# Build Desktop Application
# Usage: ./scripts/build-desktop.sh [debug|release] [platform]

BUILD_MODE="${1:-release}"
PLATFORM="${2:-}"

echo "📦 Syncing version from package.json..."
./scripts/sync-version.sh

echo "📋 Preparing build directory..."
mkdir -p build
cp images/icon.png build/appicon.png

echo "🎨 Building frontend..."
cd frontend && VITE_APP_VERSION=$(node -p "require('./package.json').version") npm run build && cd ..

echo "🔨 Building desktop application (${BUILD_MODE})..."
if [ "$BUILD_MODE" = "debug" ]; then
    if [ -n "$PLATFORM" ]; then
        ~/go/bin/wails build -debug -platform "$PLATFORM"
    else
        ~/go/bin/wails build -debug
    fi
else
    if [ -n "$PLATFORM" ]; then
        ~/go/bin/wails build -platform "$PLATFORM"
    else
        ~/go/bin/wails build
    fi
fi

echo "📦 Bundling FFmpeg binaries..."
BUILD_DIR="build"
case "$(uname)" in
    Darwin)
        if [ -f embed/ffmpeg/darwin/ffmpeg ]; then
            mkdir -p ${BUILD_DIR}/bin/ffforge-desktop.app/Contents/Resources/ffmpeg
            cp embed/ffmpeg/darwin/ffmpeg embed/ffmpeg/darwin/ffprobe \
               ${BUILD_DIR}/bin/ffforge-desktop.app/Contents/Resources/ffmpeg/
            chmod +x ${BUILD_DIR}/bin/ffforge-desktop.app/Contents/Resources/ffmpeg/*
            echo "✓ macOS FFmpeg bundled"
        fi
        ;;
    MINGW*|MSYS*|CYGWIN*)
        if [ -f embed/ffmpeg/windows/ffmpeg.exe ]; then
            mkdir -p ${BUILD_DIR}/bin/ffmpeg
            cp embed/ffmpeg/windows/ffmpeg.exe embed/ffmpeg/windows/ffprobe.exe \
               ${BUILD_DIR}/bin/ffmpeg/
            echo "✓ Windows FFmpeg bundled"
        fi
        ;;
esac

echo "✅ Desktop app built at ${BUILD_DIR}/bin/"
echo "----------------------------------------"
ls -lh ${BUILD_DIR}/bin/ 2>/dev/null || true
echo "----------------------------------------"
echo "Run the following command to run the app:"
echo "open ${BUILD_DIR}/bin/ffforge-desktop.app"
echo "----------------------------------------"


