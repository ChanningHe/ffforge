#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLATFORM="${1:-$(uname -s)}"

case "$PLATFORM" in
  Darwin|darwin|macos)
    echo "Downloading macOS FFmpeg..."
    FFMPEG_DIR="$SCRIPT_DIR/../backend/embed/ffmpeg/darwin"
    mkdir -p "$FFMPEG_DIR"
    cd "$FFMPEG_DIR"
    
    # Download and extract
    curl -L "https://github.com/jellyfin/jellyfin-ffmpeg/releases/download/v7.1.3-1/jellyfin-ffmpeg_7.1.3-1_portable_macarm64-gpl.tar.xz" \
      | tar -xJ
    
    # Make executable
    chmod +x ffmpeg ffprobe
    echo "✓ macOS FFmpeg ready"
    ls -lh ffmpeg ffprobe
    ;;
    
  Windows|windows|MINGW*|MSYS*)
    echo "Downloading Windows FFmpeg..."
    FFMPEG_DIR="$SCRIPT_DIR/../backend/embed/ffmpeg/windows"
    mkdir -p "$FFMPEG_DIR"
    cd "$FFMPEG_DIR"
    
    # Download
    curl -L -o ffmpeg.zip "https://github.com/jellyfin/jellyfin-ffmpeg/releases/download/v7.1.3-1/jellyfin-ffmpeg_7.1.3-1_portable_win64-clang-gpl.zip"
    
    # Extract
    unzip -q -j ffmpeg.zip "*.exe"
    
    # Cleanup
    rm -f ffmpeg.zip
    echo "✓ Windows FFmpeg ready"
    ls -lh *.exe
    ;;
    
  *)
    echo "Usage: $0 [darwin|windows]"
    echo "Auto-detected platform: $PLATFORM"
    exit 1
    ;;
esac

