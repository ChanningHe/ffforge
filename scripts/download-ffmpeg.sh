#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLATFORM="${1:-$(uname -s)}"

case "$PLATFORM" in
  Darwin|darwin|macos)
    FFMPEG_DIR="$SCRIPT_DIR/../embed/ffmpeg/darwin"
    
    # Check if FFmpeg already exists
    if [ -f "$FFMPEG_DIR/ffmpeg" ] && [ -f "$FFMPEG_DIR/ffprobe" ]; then
      echo "✓ macOS FFmpeg already exists, skipping download"
      ls -lh "$FFMPEG_DIR/ffmpeg" "$FFMPEG_DIR/ffprobe"
      exit 0
    fi
    
    echo "Downloading macOS FFmpeg..."
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
    FFMPEG_DIR="$SCRIPT_DIR/../embed/ffmpeg/windows"
    
    # Check if FFmpeg already exists
    if [ -f "$FFMPEG_DIR/ffmpeg.exe" ] && [ -f "$FFMPEG_DIR/ffprobe.exe" ]; then
      echo "✓ Windows FFmpeg already exists, skipping download"
      ls -lh "$FFMPEG_DIR/ffmpeg.exe" "$FFMPEG_DIR/ffprobe.exe"
      exit 0
    fi
    
    echo "Downloading Windows FFmpeg..."
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

