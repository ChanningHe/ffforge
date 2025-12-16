# FFForge

A modern web application for video transcoding with H.265/AV1 encoding support.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](Dockerfile)

## Features

- H.264 to H.265/AV1 transcoding
- Web-based file browser
- Batch processing with real-time progress
- Hardware acceleration (NVIDIA, Intel QSV, AMD)
- Preset management
- Task queue system
- WebSocket live updates

## Quick Start

### Docker (Recommended)

```bash
# Standard version (CPU)
docker-compose up -d

# NVIDIA GPU version
docker-compose -f compose.nvidia.yaml up -d

# Access the web interface
open http://localhost:8080
```

### Local Development

```bash
# Backend
cd backend
go run cmd/server/main.go

# Frontend
cd frontend
npm install
npm run dev
```

## Configuration

Mount your video files to `/data` and set output directory to `/output`:

```yaml
volumes:
  - ./data:/data
  - ./output:/output
```

## Environment Variables

- `PORT` - Server port (default: 8080)
- `DATA_PATH` - Input files directory (default: /data)
- `OUTPUT_PATH` - Output files directory (default: /output)
- `MAX_CONCURRENT_TASKS` - Maximum concurrent transcoding tasks (default: 2)

## Hardware Acceleration

### NVIDIA GPU

Requires NVIDIA Driver and [nvidia-container-toolkit](https://github.com/NVIDIA/nvidia-container-toolkit).

```bash
docker-compose -f compose.nvidia.yaml up -d
```

See [NVIDIA_SETUP.md](NVIDIA_SETUP.md) for details.

### Intel QSV / AMD

Works out of the box with the standard Docker image.

## Tech Stack

- **Backend**: Go 1.22, Gin, SQLite
- **Frontend**: React 18, TypeScript, TailwindCSS
- **FFmpeg**: Latest with SVT-AV1 support

## License

GNU General Public License v3.0 - see [LICENSE](LICENSE) file for details.

This project uses FFmpeg, which is licensed under GPL v2 or later. The static FFmpeg binaries are provided by [BtbN/FFmpeg-Builds](https://github.com/BtbN/FFmpeg-Builds).
